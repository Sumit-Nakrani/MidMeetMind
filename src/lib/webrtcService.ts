import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase.ts';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

export interface WebRTCConnectionOptions {
  meetingId: string;
  localUserId: string;
  remoteUserId: string;
  localStream?: MediaStream | null;
  videoTrack?: MediaStreamTrack | null;
  audioTrack?: MediaStreamTrack | null;
  sendWsSignal?: (message: any) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export class WebRTCPeerSession {
  private meetingId: string;
  private localUserId: string;
  private remoteUserId: string;
  private pairId: string;
  private isCaller: boolean;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private audioTrack: MediaStreamTrack | null = null;
  private sendWsSignal?: (message: any) => void;
  private onRemoteStream: (stream: MediaStream) => void;
  private onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  private unsubSignal: (() => void) | null = null;
  private isClosed = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(options: WebRTCConnectionOptions) {
    this.meetingId = options.meetingId;
    this.localUserId = options.localUserId;
    this.remoteUserId = options.remoteUserId;
    this.localStream = options.localStream || null;
    this.videoTrack = options.videoTrack || null;
    this.audioTrack = options.audioTrack || null;
    this.sendWsSignal = options.sendWsSignal;
    this.onRemoteStream = options.onRemoteStream;
    this.onConnectionStateChange = options.onConnectionStateChange;

    const sorted = [this.localUserId, this.remoteUserId].sort();
    this.pairId = `${sorted[0]}__${sorted[1]}`;
    this.isCaller = this.localUserId === sorted[0];
  }

  public async start(): Promise<void> {
    if (this.isClosed) return;

    try {
      this.pc = new RTCPeerConnection(ICE_SERVERS);

      // Add transceivers so video/audio can be bidirectional
      this.pc.addTransceiver('video', { direction: 'sendrecv' });
      this.pc.addTransceiver('audio', { direction: 'sendrecv' });

      // Add explicit tracks if available
      const stream = this.localStream || new MediaStream();
      if (this.videoTrack) {
        stream.addTrack(this.videoTrack);
      }
      if (this.audioTrack) {
        stream.addTrack(this.audioTrack);
      }

      stream.getTracks().forEach((track) => {
        if (!this.pc) return;
        const sender = this.pc.getSenders().find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          this.pc.addTrack(track, stream);
        }
      });

      // Handle incoming remote media tracks
      this.pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onRemoteStream(event.streams[0]);
        } else if (event.track) {
          const remoteStream = new MediaStream([event.track]);
          this.onRemoteStream(remoteStream);
        }
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc && this.onConnectionStateChange) {
          this.onConnectionStateChange(this.pc.connectionState);
        }
      };

      // Handle ICE Candidates
      const signalDocRef = doc(db, 'meetings', this.meetingId, 'webrtc', this.pairId);
      const candidateField = this.isCaller ? 'candidatesCaller' : 'candidatesCallee';

      this.pc.onicecandidate = async (event) => {
        if (event.candidate && !this.isClosed) {
          // Send via WebSocket if available (0 latency)
          if (this.sendWsSignal) {
            this.sendWsSignal({
              type: 'webrtc-ice',
              meetingId: this.meetingId,
              toUserId: this.remoteUserId,
              fromUserId: this.localUserId,
              candidate: event.candidate.toJSON()
            });
          }

          // Also write to Firestore as reliable fallback
          try {
            await updateDoc(signalDocRef, {
              [candidateField]: arrayUnion(event.candidate.toJSON())
            }).catch(async () => {
              await setDoc(signalDocRef, {
                [candidateField]: [event.candidate!.toJSON()]
              }, { merge: true });
            });
          } catch (e) {
            console.warn('ICE candidate send notice:', e);
          }
        }
      };

      // Caller creates Offer
      if (this.isCaller) {
        const offer = await this.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await this.pc.setLocalDescription(offer);

        if (this.sendWsSignal) {
          this.sendWsSignal({
            type: 'webrtc-offer',
            meetingId: this.meetingId,
            toUserId: this.remoteUserId,
            fromUserId: this.localUserId,
            offer: { sdp: offer.sdp, type: offer.type }
          });
        }

        await setDoc(signalDocRef, {
          pairId: this.pairId,
          callerId: this.localUserId,
          calleeId: this.remoteUserId,
          offer: {
            sdp: offer.sdp,
            type: offer.type
          },
          candidatesCaller: [],
          candidatesCallee: [],
          updatedAt: Date.now()
        }, { merge: true });
      }

      // Listen to signaling changes in Firestore as fallback
      let lastRemoteCandidateIndex = 0;
      this.unsubSignal = onSnapshot(signalDocRef, async (snap) => {
        if (!snap.exists() || !this.pc || this.isClosed) return;
        const data = snap.data();

        // Callee receives Offer and responds with Answer
        if (!this.isCaller && data.offer && !this.pc.currentRemoteDescription) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            // Drain any pending candidates
            while (this.pendingCandidates.length > 0) {
              const c = this.pendingCandidates.shift();
              if (c) await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }

            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);

            if (this.sendWsSignal) {
              this.sendWsSignal({
                type: 'webrtc-answer',
                meetingId: this.meetingId,
                toUserId: this.remoteUserId,
                fromUserId: this.localUserId,
                answer: { sdp: answer.sdp, type: answer.type }
              });
            }

            await updateDoc(signalDocRef, {
              answer: {
                sdp: answer.sdp,
                type: answer.type
              }
            });
          } catch (err) {
            console.warn('Callee answer error:', err);
          }
        }

        // Caller receives Answer
        if (this.isCaller && data.answer && !this.pc.currentRemoteDescription) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            while (this.pendingCandidates.length > 0) {
              const c = this.pendingCandidates.shift();
              if (c) await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
          } catch (err) {
            console.warn('Caller setRemoteDescription error:', err);
          }
        }

        // Process incoming remote ICE candidates
        const remoteCandidatesKey = this.isCaller ? 'candidatesCallee' : 'candidatesCaller';
        const remoteCandidates = data[remoteCandidatesKey] || [];
        if (Array.isArray(remoteCandidates) && remoteCandidates.length > lastRemoteCandidateIndex) {
          for (let i = lastRemoteCandidateIndex; i < remoteCandidates.length; i++) {
            try {
              if (this.pc.remoteDescription) {
                await this.pc.addIceCandidate(new RTCIceCandidate(remoteCandidates[i]));
              } else {
                this.pendingCandidates.push(remoteCandidates[i]);
              }
            } catch (iceErr) {
              console.warn('Add ICE candidate note:', iceErr);
            }
          }
          lastRemoteCandidateIndex = remoteCandidates.length;
        }
      });

    } catch (err) {
      console.warn('WebRTC peer session error:', err);
    }
  }

  // Handle direct WebSocket signaling message
  public async handleRemoteSignal(msg: any): Promise<void> {
    if (!this.pc || this.isClosed) return;

    try {
      if (msg.type === 'webrtc-offer' && !this.isCaller && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
        while (this.pendingCandidates.length > 0) {
          const c = this.pendingCandidates.shift();
          if (c) await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);

        if (this.sendWsSignal) {
          this.sendWsSignal({
            type: 'webrtc-answer',
            meetingId: this.meetingId,
            toUserId: this.remoteUserId,
            fromUserId: this.localUserId,
            answer: { sdp: answer.sdp, type: answer.type }
          });
        }
      } else if (msg.type === 'webrtc-answer' && this.isCaller && !this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        while (this.pendingCandidates.length > 0) {
          const c = this.pendingCandidates.shift();
          if (c) await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
      } else if (msg.type === 'webrtc-ice' && msg.candidate) {
        if (this.pc.remoteDescription) {
          await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
        } else {
          this.pendingCandidates.push(msg.candidate);
        }
      }
    } catch (err) {
      console.warn('handleRemoteSignal error:', err);
    }
  }

  // Live track hot-swapping when user toggles camera on/off
  public updateLocalVideoTrack(newTrack: MediaStreamTrack | null): void {
    if (!this.pc) return;
    this.videoTrack = newTrack;
    try {
      const transceivers = this.pc.getTransceivers();
      const videoTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'video' || t.sender?.track?.kind === 'video');
      if (videoTransceiver && videoTransceiver.sender) {
        videoTransceiver.sender.replaceTrack(newTrack).catch(err => {
          console.warn('videoSender.replaceTrack error:', err);
        });
        videoTransceiver.direction = newTrack ? 'sendrecv' : 'recvonly';
      } else if (newTrack) {
        this.pc.addTrack(newTrack);
      }
    } catch (e) {
      console.warn('updateLocalVideoTrack error:', e);
    }
  }

  public updateLocalAudioTrack(newTrack: MediaStreamTrack | null): void {
    if (!this.pc) return;
    this.audioTrack = newTrack;
    try {
      const transceivers = this.pc.getTransceivers();
      const audioTransceiver = transceivers.find(t => t.receiver?.track?.kind === 'audio' || t.sender?.track?.kind === 'audio');
      if (audioTransceiver && audioTransceiver.sender) {
        audioTransceiver.sender.replaceTrack(newTrack).catch(err => {
          console.warn('audioSender.replaceTrack error:', err);
        });
        audioTransceiver.direction = newTrack ? 'sendrecv' : 'recvonly';
      } else if (newTrack) {
        this.pc.addTrack(newTrack);
      }
    } catch (e) {
      console.warn('updateLocalAudioTrack error:', e);
    }
  }

  public close(): void {
    this.isClosed = true;
    if (this.unsubSignal) {
      this.unsubSignal();
      this.unsubSignal = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    // Clean up signaling document
    try {
      const signalDocRef = doc(db, 'meetings', this.meetingId, 'webrtc', this.pairId);
      deleteDoc(signalDocRef).catch(() => {});
    } catch {}
  }
}
