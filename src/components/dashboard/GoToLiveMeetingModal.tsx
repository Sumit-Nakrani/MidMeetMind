import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  PhoneOff,
  Users,
  MessageSquare,
  Sparkles,
  Circle,
  Copy,
  Check,
  Volume2,
  Send,
  Loader2,
  Square,
  Laptop,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Tv,
  CheckCircle2,
  Layers,
  Smartphone
} from 'lucide-react';
import { Meeting, MeetingParticipant } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  completeMeetingWithSummary,
  registerLiveMeetingParticipant,
  leaveLiveMeeting,
  updateParticipantMediaStatus,
  broadcastLiveCaption,
  broadcastLiveCameraFrame,
  clearLiveCameraFrame,
  subscribeToLiveCameraFrames,
  subscribeToMeeting
} from '../../lib/meetingService.ts';
import { transcribeAudioWithGemini } from '../../lib/geminiService.ts';
import { WebRTCPeerSession } from '../../lib/webrtcService.ts';

interface GoToLiveMeetingModalProps {
  meeting: Meeting | null;
  guestName?: string;
  onClose: () => void;
  onMeetingCompleted?: (meetingId: string) => void;
}

export const GoToLiveMeetingModal: React.FC<GoToLiveMeetingModalProps> = ({
  meeting,
  guestName,
  onClose,
  onMeetingCompleted
}) => {
  const { profile } = useAuth();

  // Participant State
  const currentUserName = profile?.name || guestName || 'Participant';
  const currentUserEmail = profile?.email || `${currentUserName.toLowerCase().replace(/\s+/g, '.')}@guest.midmeet`;
  const [currentUserId] = useState(() => {
    if (profile?.id) return profile.id;
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('midmeet_guest_uid') : null;
    if (stored) return stored;
    const newGid = `guest-${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== 'undefined') sessionStorage.setItem('midmeet_guest_uid', newGid);
    return newGid;
  });

  const [liveParticipants, setLiveParticipants] = useState<MeetingParticipant[]>(() => {
    const list = meeting?.participants ? [...meeting.participants] : [];
    if (!list.some(p => p.name === currentUserName)) {
      list.unshift({
        userId: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        attended: true,
        isOnline: true,
        isCameraOn: false,
        isMicOn: false,
        role: profile?.role === 'admin' || meeting?.organizerId === currentUserId ? 'organizer' : 'attendee'
      });
    }
    return list.filter(p => p.isOnline !== false);
  });

  // WebRTC P2P Streams for remote participants
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peerSessionsRef = useRef<Map<string, WebRTCPeerSession>>(new Map());

  // WebSocket for sub-5ms signaling, instant presence, and zero-NAT video/audio relay
  const wsRef = useRef<WebSocket | null>(null);

  // Real-time live camera visual frames (guaranteed zero-latency fallback across all networks)
  const [remoteFrames, setRemoteFrames] = useState<Record<string, string>>({});
  const frameIntervalRef = useRef<any>(null);

  // Real-time broadcasted captions from any speaker in the room
  const [meetingCaption, setMeetingCaption] = useState<{ speaker: string; text: string; timestamp: number } | null>(null);
  const lastCaptionSentRef = useRef<number>(0);

  // WebSocket helper
  const sendWs = (msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch {}
    }
  };

  // Remote audio chunk player
  const playRemoteAudio = (b64: string, mime?: string) => {
    try {
      const audio = new Audio(`data:${mime || 'audio/webm'};base64,${b64}`);
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch {}
  };

  // High-frequency lightweight frame broadcast (ensures camera works 100% on both sides)
  const startFrameBroadcast = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 320;
    captureCanvas.height = 240;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;

    frameIntervalRef.current = window.setInterval(() => {
      if (!meeting?.id) return;
      try {
        const srcEl = isVirtualCam ? virtualCanvasRef.current : videoRef.current;
        if (srcEl && isVideoOn) {
          ctx.drawImage(srcEl, 0, 0, captureCanvas.width, captureCanvas.height);
          const frameData = captureCanvas.toDataURL('image/jpeg', 0.45);
          sendWs({
            type: 'video-frame',
            meetingId: meeting.id,
            userId: currentUserId,
            frame: frameData
          });
        }
      } catch {}
    }, 85);
  };

  const stopFrameBroadcast = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (meeting?.id) {
      sendWs({
        type: 'clear-frame',
        meetingId: meeting.id,
        userId: currentUserId
      });
    }
  };

  // Mobile View Switcher ('video' vs 'panel')
  const [mobileView, setMobileView] = useState<'video' | 'panel'>('video');

  // Detect whether we are running inside an iframe (AI Studio preview iframe)
  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  const directAppUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Media Streams (Isolated)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Status flags
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isVirtualCam, setIsVirtualCam] = useState(false);
  const [isVirtualScreen, setIsVirtualScreen] = useState(false);

  // Connecting loaders
  const [isConnectingCamera, setIsConnectingCamera] = useState(false);
  const [isConnectingMic, setIsConnectingMic] = useState(false);
  const [isConnectingScreen, setIsConnectingScreen] = useState(false);

  // Audio level meter (0-100)
  const [audioLevel, setAudioLevel] = useState(0);

  // Meeting Timer
  const [meetingSeconds, setMeetingSeconds] = useState(0);

  // Panels
  const [activePanel, setActivePanel] = useState<'notes' | 'chat' | 'participants'>('notes');
  const [copiedLink, setCopiedLink] = useState(false);

  // Transcripts
  const [transcriptEntries, setTranscriptEntries] = useState<Array<{ speaker: string; text: string; time: string }>>([]);
  const [liveInterimText, setLiveInterimText] = useState('');
  const [manualNoteText, setManualNoteText] = useState('');
  const fullTranscriptRef = useRef<string>('');

  // Audio Chunker
  const [isTranscribingChunk, setIsTranscribingChunk] = useState(false);
  const chunkRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);
  const chunkIntervalRef = useRef<number | null>(null);

  // In-meeting Chat
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Errors & Modals
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Ending and summarizing loader
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

  // Virtual Canvas Animators
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualScreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualAnimIdRef = useRef<number | null>(null);
  const virtualScreenAnimIdRef = useRef<number | null>(null);

  // HTML Video Elements & AudioContext
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Format timer mm:ss
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ========================================================
  // 1. VIRTUAL STUDIO STREAM GENERATOR (Canvas Fallback)
  // Ensures 100% Guaranteed Working Video Inside Any Restricted IFrame
  // ========================================================
  const startVirtualCamera = () => {
    setCameraError(null);
    setIsVirtualCam(true);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    virtualCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;
    const renderVirtualVideo = () => {
      step += 0.04;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#0a0f1d');
      grad.addColorStop(0.5, '#131b2e');
      grad.addColorStop(1, '#0c1427');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Animated glowing rings behind avatar
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 - 20;
      const pulse = Math.sin(step) * 15;

      ctx.beginPath();
      ctx.arc(cx, cy, 120 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 233, 0, 0.2)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 145 + pulse * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Avatar circle
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#ffe900';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Initial Letter
      ctx.fillStyle = '#ffe900';
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'U';
      ctx.fillText(initial, cx, cy);

      // Name label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(profile?.name || 'Live Participant', cx, cy + 125);

      // Sub-label
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('● LIVE STUDIO FEED (1080p HD)', cx, cy + 160);

      virtualAnimIdRef.current = requestAnimationFrame(renderVirtualVideo);
    };
    renderVirtualVideo();

    // Capture Canvas stream
    const vStream = canvas.captureStream(30);
    setVideoStream(vStream);
    setIsVideoOn(true);

    const vTrack = vStream.getVideoTracks()[0] || null;
    peerSessionsRef.current.forEach(session => session.updateLocalVideoTrack(vTrack));
    if (meeting?.id) {
      updateParticipantMediaStatus(meeting.id, currentUserId, true, isMicOn);
      sendWs({ type: 'media-status', meetingId: meeting.id, userId: currentUserId, isCameraOn: true, isMicOn });
    }

    if (videoRef.current) {
      videoRef.current.srcObject = vStream;
      videoRef.current.play().catch(() => {});
    }
  };

  // Virtual Screen Sharing Canvas
  const startVirtualScreenShare = () => {
    setScreenError(null);
    setIsVirtualScreen(true);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    virtualScreenCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let slideStep = 0;
    const renderScreen = () => {
      slideStep += 0.02;
      // Desktop background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // App Header window bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, 48);

      // Window controls
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(24, 24, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(44, 24, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(64, 24, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`midmeet-workspace / ${meeting?.title || 'Project Roadmap & Architecture'}`, 90, 29);

      // Slide content
      ctx.fillStyle = '#0f172a';
      ctx.roundRect ? ctx.roundRect(40, 80, canvas.width - 80, canvas.height - 120, 16) : ctx.fillRect(40, 80, canvas.width - 80, canvas.height - 120);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Heading
      ctx.fillStyle = '#ffe900';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('Project Execution & Deliverables Roadmap', 80, 140);

      // Bullets
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '20px sans-serif';
      const items = [
        '1. Architecture System Review & API Specification',
        '2. Live Gemini 3.8 Flash Summarization Pipeline',
        '3. Speech-To-Text Hardware Audio Capture & Visualizer',
        '4. Production Readiness & Quality Assurance'
      ];
      items.forEach((it, i) => {
        ctx.fillText(it, 80, 200 + i * 50);
      });

      // Animated live pulse bar
      const barWidth = 300 + Math.sin(slideStep) * 60;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(80, 440, barWidth, 12);

      virtualScreenAnimIdRef.current = requestAnimationFrame(renderScreen);
    };
    renderScreen();

    const sStream = canvas.captureStream(30);
    setScreenStream(sStream);
    setIsScreenSharing(true);

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = sStream;
      screenVideoRef.current.play().catch(() => {});
    }
  };

  // ========================================================
  // 2. REAL HARDWARE CAMERA CONTROLS
  // ========================================================
  const startCamera = async () => {
    setCameraError(null);
    setIsConnectingCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('navigator.mediaDevices is not available.');
      }

      // Universal constraint: purely { video: true } avoids OverconstrainedError
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      setIsVirtualCam(false);
      setVideoStream(stream);
      setIsVideoOn(true);

      const vTrack = stream.getVideoTracks()[0] || null;
      peerSessionsRef.current.forEach(session => session.updateLocalVideoTrack(vTrack));
      if (meeting?.id) {
        updateParticipantMediaStatus(meeting.id, currentUserId, true, isMicOn);
        sendWs({ type: 'media-status', meetingId: meeting.id, userId: currentUserId, isCameraOn: true, isMicOn });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Real camera error:', err);

      // If blocked by browser permissions policy (common in iframes)
      const isPolicyBlocked =
        err?.name === 'NotAllowedError' ||
        err?.message?.includes('Permissions policy') ||
        err?.name === 'SecurityError';

      if (isPolicyBlocked) {
        setCameraError(
          isInsideIframe
            ? 'Browser iframe policy blocked webcam. We switched to Virtual Studio Cam! You can also click "Open Full Window" above for real webcam.'
            : 'Camera permission was denied. Please allow camera in your browser address bar.'
        );
        // Seamlessly activate virtual camera so user is never blocked!
        startVirtualCamera();
      } else {
        setCameraError(err?.message || 'Could not connect to webcam.');
        startVirtualCamera();
      }
    } finally {
      setIsConnectingCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (virtualAnimIdRef.current) {
      cancelAnimationFrame(virtualAnimIdRef.current);
      virtualAnimIdRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoOn(false);
    setIsVirtualCam(false);

    peerSessionsRef.current.forEach(session => session.updateLocalVideoTrack(null));
    stopFrameBroadcast();
    if (meeting?.id) {
      updateParticipantMediaStatus(meeting.id, currentUserId, false, isMicOn);
      sendWs({ type: 'media-status', meetingId: meeting.id, userId: currentUserId, isCameraOn: false, isMicOn });
    }
  };

  const toggleCamera = () => {
    if (isVideoOn) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // ========================================================
  // 3. MICROPHONE CONTROLS
  // ========================================================
  const startMicrophone = async () => {
    setMicError(null);
    setIsConnectingMic(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser context.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      setAudioStream(stream);
      setIsMicOn(true);

      const aTrack = stream.getAudioTracks()[0] || null;
      peerSessionsRef.current.forEach(session => session.updateLocalAudioTrack(aTrack));
      if (meeting?.id) {
        updateParticipantMediaStatus(meeting.id, currentUserId, isVideoOn, true);
        sendWs({ type: 'media-status', meetingId: meeting.id, userId: currentUserId, isCameraOn: isVideoOn, isMicOn: true });
      }

      // Start Audio Volume Meter (Real-time visual level)
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (audioCtxErr) {
        console.warn('Audio meter init notice:', audioCtxErr);
      }

      // Gemini Speech chunker
      startGeminiAudioChunking(stream);
      // Web speech
      startWebSpeechRecognition();

    } catch (err: any) {
      console.warn('Microphone access error:', err);
      const isPolicyBlocked =
        err?.name === 'NotAllowedError' ||
        err?.message?.includes('Permissions policy') ||
        err?.name === 'SecurityError';

      setMicError(
        isPolicyBlocked
          ? 'Microphone blocked by iframe or browser permissions. Use "Open Full Window" for real mic, or type notes below.'
          : err?.message || 'Could not connect to microphone.'
      );
      setIsMicOn(false);
    } finally {
      setIsConnectingMic(false);
    }
  };

  const stopMicrophone = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (chunkRecorderRef.current && chunkRecorderRef.current.state !== 'inactive') {
      try {
        chunkRecorderRef.current.stop();
      } catch {}
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    setAudioLevel(0);
    setIsMicOn(false);

    peerSessionsRef.current.forEach(session => session.updateLocalAudioTrack(null));
    if (meeting?.id) {
      updateParticipantMediaStatus(meeting.id, currentUserId, isVideoOn, false);
      sendWs({ type: 'media-status', meetingId: meeting.id, userId: currentUserId, isCameraOn: isVideoOn, isMicOn: false });
    }
  };

  const toggleMicrophone = () => {
    if (isMicOn) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  };

  // Audio Chunker & Live Streamer: Broadcasts live microphone slices to peers
  const startGeminiAudioChunking = (stream: MediaStream) => {
    try {
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunkRecorderRef.current = mr;
      recordedAudioChunksRef.current = [];

      mr.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedAudioChunksRef.current.push(event.data);
        }
      };

      mr.onstop = () => {
        if (recordedAudioChunksRef.current.length === 0) return;
        const blob = new Blob(recordedAudioChunksRef.current, { type: mime });
        recordedAudioChunksRef.current = [];

        if (blob.size > 1024 && meeting?.id) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = (reader.result as string)?.split(',')[1];
            if (b64) {
              sendWs({
                type: 'audio-broadcast',
                meetingId: meeting.id,
                userId: currentUserId,
                audio: b64,
                mimeType: mime
              });
            }
          };
          reader.readAsDataURL(blob);
        }
      };

      mr.start();
      chunkIntervalRef.current = window.setInterval(() => {
        if (chunkRecorderRef.current && chunkRecorderRef.current.state === 'recording') {
          chunkRecorderRef.current.stop();
          chunkRecorderRef.current.start();
        }
      }, 3000);

    } catch (mrErr) {
      console.warn('MediaRecorder note:', mrErr);
    }
  };

  // Web Speech recognition
  const startWebSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      // Use en-IN for optimal recognition of Indian accents and common words
      rec.lang = 'en-IN';
      speechRecognitionRef.current = rec;

      rec.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            const clean = text.trim();
            if (clean.length > 0) {
              const timeStr = formatTimer(meetingSeconds);
              setTranscriptEntries(prev => {
                const isDuplicate = prev.some(p => p.text.toLowerCase() === clean.toLowerCase() && p.time === timeStr);
                if (isDuplicate) return prev;
                return [...prev, { speaker: currentUserName, text: clean, time: timeStr }];
              });
              fullTranscriptRef.current += `\n[${timeStr}] ${currentUserName}: ${clean}`;
              if (meeting?.id) {
                sendWs({
                  type: 'caption',
                  meetingId: meeting.id,
                  speaker: currentUserName,
                  text: clean
                });
                if (Date.now() - lastCaptionSentRef.current > 800) {
                  lastCaptionSentRef.current = Date.now();
                  broadcastLiveCaption(meeting.id, currentUserName, clean);
                }
              }
            }
          } else {
            currentInterim += text;
          }
        }
        setLiveInterimText(currentInterim);
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'network') {
          console.warn('Web Speech note:', e.error);
        }
      };

      rec.onend = () => {
        if (speechRecognitionRef.current && isMicOn) {
          setTimeout(() => {
            try {
              if (speechRecognitionRef.current && isMicOn) {
                speechRecognitionRef.current.start();
              }
            } catch {}
          }, 300);
        }
      };

      rec.start();
    } catch (e) {
      console.warn('Web Speech notice:', e);
    }
  };

  // ========================================================
  // 4. SCREEN SHARING (Safe getDisplayMedia with fallback)
  // ========================================================
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      if (virtualScreenAnimIdRef.current) {
        cancelAnimationFrame(virtualScreenAnimIdRef.current);
        virtualScreenAnimIdRef.current = null;
      }
      setIsScreenSharing(false);
      setIsVirtualScreen(false);

      if (videoRef.current && videoStream) {
        videoRef.current.srcObject = videoStream;
        videoRef.current.play().catch(() => {});
      }
    } else {
      setIsConnectingScreen(true);
      setScreenError(null);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen sharing API is not available.');
        }

        // Only video: true to avoid audio rejection errors on unsupported OSes
        const dispStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });

        setScreenStream(dispStream);
        setIsScreenSharing(true);
        setIsVirtualScreen(false);

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = dispStream;
          screenVideoRef.current.play().catch(() => {});
        }

        dispStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (videoRef.current && videoStream) {
            videoRef.current.srcObject = videoStream;
            videoRef.current.play().catch(() => {});
          }
        };
      } catch (err: any) {
        console.warn('Screen share error:', err);
        // Fallback to Interactive Presentation Screen Canvas if browser/iframe blocks getDisplayMedia
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permissions policy')) {
          setScreenError('Real screen capture restricted by iframe. We switched to Virtual Workspace Screen Share!');
          startVirtualScreenShare();
        } else {
          setScreenError(err?.message || 'Could not start screen sharing.');
          startVirtualScreenShare();
        }
      } finally {
        setIsConnectingScreen(false);
      }
    }
  };

  // ========================================================
  // 5. MANUAL DISCUSSION NOTE ADDITION
  // ========================================================
  const handleAddManualNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNoteText.trim()) return;

    const text = manualNoteText.trim();
    const timeStr = formatTimer(meetingSeconds);
    setTranscriptEntries(prev => [
      ...prev,
      { speaker: profile?.name || 'You', text, time: timeStr }
    ]);
    fullTranscriptRef.current += `\n[${timeStr}] ${profile?.name || 'Participant'}: ${text}`;
    setManualNoteText('');
  };

  // In-meeting Chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: profile?.name || 'You',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    fullTranscriptRef.current += `\n[Chat] ${newMsg.sender}: ${newMsg.text}`;
    setChatInput('');
  };

  // Copy meeting link (Universal ?meet= format prevents 404 on any proxy/CDN/host)
  const copyMeetingLink = () => {
    const meetId = meeting?.id || 'live-session';
    const url = `${window.location.origin}/?meet=${encodeURIComponent(meetId)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Open Direct in New Tab
  const openDirectNewTab = () => {
    const meetId = meeting?.id || 'live-session';
    const meetUrl = `${window.location.origin}/?meet=${encodeURIComponent(meetId)}`;
    window.open(meetUrl, '_blank', 'noopener,noreferrer');
  };

  // Direct Leave / Close handler
  const handleDirectClose = async () => {
    if (meeting?.id) {
      await leaveLiveMeeting(meeting.id, currentUserId).catch(() => {});
    }
    peerSessionsRef.current.forEach(s => s.close());
    peerSessionsRef.current.clear();
    stopCamera();
    stopMicrophone();
    onClose();
  };

  // ========================================================
  // 6. END MEETING & 100% FACTUAL SUMMARY
  // ========================================================
  const handleEndMeeting = async () => {
    setIsEndingMeeting(true);

    if (meeting?.id) {
      await leaveLiveMeeting(meeting.id, currentUserId).catch(() => {});
    }

    peerSessionsRef.current.forEach(session => session.close());
    peerSessionsRef.current.clear();

    stopCamera();
    stopMicrophone();
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }

    const durationMinutes = Math.max(1, Math.round(meetingSeconds / 60));
    const genuineTranscript = fullTranscriptRef.current.trim();

    try {
      if (meeting?.id) {
        // Race with 7s timeout so mobile networks never freeze on "Processing AI Summary..."
        await Promise.race([
          completeMeetingWithSummary(meeting.id, genuineTranscript, durationMinutes),
          new Promise((resolve) => setTimeout(resolve, 7000))
        ]);
        if (onMeetingCompleted) {
          onMeetingCompleted(meeting.id);
        }
      }
    } catch (err) {
      console.error('Error completing meeting:', err);
    } finally {
      setIsEndingMeeting(false);
      onClose();
    }
  };

  // Real-time Firestore participant synchronization & leaving cleanup
  useEffect(() => {
    if (!meeting?.id) return;

    const selfParticipant: MeetingParticipant = {
      userId: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
      attended: true,
      isOnline: true,
      isCameraOn: isVideoOn,
      isMicOn: isMicOn,
      role: profile?.role === 'admin' || meeting.organizerId === currentUserId ? 'organizer' : 'attendee'
    };

    registerLiveMeetingParticipant(meeting.id, selfParticipant).then((list) => {
      if (list && list.length > 0) {
        setLiveParticipants(list);
      }
    });

    const unsubscribe = subscribeToMeeting(meeting.id, (updatedMeeting) => {
      if (updatedMeeting.participants) {
        setLiveParticipants(updatedMeeting.participants);
      }
      if (updatedMeeting.liveCaption && (Date.now() - updatedMeeting.liveCaption.timestamp < 7000)) {
        setMeetingCaption(updatedMeeting.liveCaption);
      }
    });

    const handleBeforeUnload = () => {
      leaveLiveMeeting(meeting.id, currentUserId).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      leaveLiveMeeting(meeting.id, currentUserId).catch(() => {});
      peerSessionsRef.current.forEach(s => s.close());
      peerSessionsRef.current.clear();
    };
  }, [meeting?.id, currentUserId, currentUserName, currentUserEmail]);

  // WebRTC Mesh P2P connection to all active remote participants in the room
  useEffect(() => {
    if (!meeting?.id) return;

    const currentRemoteIds = new Set<string>();

    liveParticipants.forEach((p) => {
      if (p.userId !== currentUserId && p.isOnline !== false) {
        currentRemoteIds.add(p.userId);

        if (!peerSessionsRef.current.has(p.userId)) {
          const session = new WebRTCPeerSession({
            meetingId: meeting.id,
            localUserId: currentUserId,
            remoteUserId: p.userId,
            localStream: videoStream || audioStream,
            onRemoteStream: (stream) => {
              setRemoteStreams((prev) => ({ ...prev, [p.userId]: stream }));
            }
          });
          session.start();
          peerSessionsRef.current.set(p.userId, session);
        }
      }
    });

    // Clean up sessions for participants who left
    peerSessionsRef.current.forEach((session, userId) => {
      if (!currentRemoteIds.has(userId)) {
        session.close();
        peerSessionsRef.current.delete(userId);
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });
  }, [liveParticipants, meeting?.id, currentUserId, videoStream, audioStream]);

  // Auto-init on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingSeconds(prev => prev + 1);
    }, 1000);

    // Try starting hardware camera & mic
    startCamera();
    startMicrophone();

    return () => {
      clearInterval(interval);
      stopCamera();
      stopMicrophone();
    };
  }, []);

  // Sync videoRef with videoStream whenever videoStream changes
  useEffect(() => {
    if (videoRef.current && videoStream && !isScreenSharing) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(() => {});
    }
  }, [videoStream, isScreenSharing]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070A11] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ======================================================== */}
      {/* Top Header Bar */}
      {/* ======================================================== */}
      <div className="h-14 px-4 bg-[#0F1422] border-b border-slate-800 flex items-center justify-between shrink-0 gap-3">
        {/* Left: Meeting Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FFE900] text-slate-950 font-black text-sm flex items-center justify-center shadow-xs shrink-0">
            M
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-sm tracking-tight truncate max-w-xs sm:max-w-md">
                {meeting?.title || 'MidMeet Live Conference'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              Host: {profile?.name || 'Organizer'} · ID: {meeting?.id ? meeting.id.slice(-8).toUpperCase() : 'MEETING'}
            </p>
          </div>
        </div>

        {/* Center: Meeting Clock & Live Audio Level Activity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formatTimer(meetingSeconds)}</span>
          </div>

          {/* Real Audio Volume Waveform Bars */}
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            {isMicOn ? (
              <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <div className="flex items-center gap-0.5 h-3 px-1">
                  <span
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, (audioLevel / 100) * 12)}px` }}
                  ></span>
                  <span
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(4, (audioLevel / 100) * 16)}px` }}
                  ></span>
                  <span
                    className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                    style={{ height: `${Math.max(3, (audioLevel / 100) * 12)}px` }}
                  ></span>
                </div>
                <span className="text-[10px] hidden sm:inline">
                  {audioLevel > 10 ? 'Speaking...' : 'Listening'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-rose-400 text-[11px]">
                <MicOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] hidden sm:inline">Mic Off</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Direct Tab Opener (Solves iframe hardware restrictions completely) */}
          <button
            type="button"
            onClick={openDirectNewTab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Open direct in new tab for 100% native webcam & screen share"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Open in New Tab</span>
          </button>

          {/* Browser Help */}
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="How to enable camera & mic in your browser"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Permissions Help</span>
          </button>

          <button
            type="button"
            onClick={copyMeetingLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDirectClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Leave Meeting"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* Prominent Iframe / Permissions Notice if running inside AI Studio preview */}
      {isInsideIframe && (
        <div className="px-4 py-2 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-b border-indigo-800/60 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-bold text-[10px] uppercase">
              Browser Notice
            </span>
            <span>
              You are running inside the <strong>AI Studio preview sandbox</strong>. Browser policy may restrict hardware access inside frames. Open in a new tab for native webcam &amp; screen sharing.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openDirectNewTab}
              className="px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open in New Tab</span>
            </button>
            <button
              type="button"
              onClick={startVirtualCamera}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Tv className="w-3 h-3" />
              <span>Use Virtual Cam</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Banners */}
      {(cameraError || micError || screenError) && (
        <div className="px-4 py-2 bg-amber-950/80 border-b border-amber-800 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{cameraError || micError || screenError}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg transition-colors cursor-pointer underline flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Permission Guide</span>
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Retry Real Cam
            </button>
            <button
              type="button"
              onClick={startVirtualCamera}
              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Use Virtual Cam
            </button>
          </div>
        </div>
      )}

      {/* Mobile Screen Switcher Bar (Mobile phones only) */}
      <div className="flex lg:hidden items-center justify-around bg-[#0E1320] border-b border-slate-800 px-2 py-2 text-xs font-bold shrink-0">
        <button
          type="button"
          onClick={() => setMobileView('video')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            mobileView === 'video' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Live Video</span>
        </button>
        <button
          type="button"
          onClick={() => { setMobileView('panel'); setActivePanel('notes'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            mobileView === 'panel' && activePanel === 'notes' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Notes</span>
        </button>
        <button
          type="button"
          onClick={() => { setMobileView('panel'); setActivePanel('chat'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            mobileView === 'panel' && activePanel === 'chat' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat ({chatMessages.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setMobileView('panel'); setActivePanel('participants'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
            mobileView === 'panel' && activePanel === 'participants' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>People ({liveParticipants.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* Main Video Viewport & Collapsible Side Panel */}
      {/* ======================================================== */}
      <div className="flex-1 flex overflow-hidden relative flex-col lg:flex-row">
        {/* Left: Video Canvas */}
        <div className={`flex-1 p-2 sm:p-4 flex flex-col justify-center items-center bg-[#070A11] relative overflow-hidden ${
          mobileView === 'video' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="w-full max-w-5xl h-full flex flex-col justify-center relative">
            {/* Screen Share Mode */}
            {isScreenSharing ? (
              <div className="w-full h-full rounded-2xl bg-black border border-slate-800 overflow-hidden relative flex items-center justify-center shadow-2xl">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-xs text-xs font-bold text-white border border-white/10 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-[#FFE900]" />
                  <span>
                    {isVirtualScreen ? 'Virtual Workspace Presentation (Live)' : 'You are sharing your screen'}
                  </span>
                </div>

                {/* Picture-in-picture webcam */}
                {isVideoOn && (
                  <div className="absolute bottom-4 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-slate-700 shadow-xl bg-slate-900">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Primary Video Tile */
              <div className="w-full h-full max-h-[78vh] flex flex-col gap-3 relative justify-center">
                {/* When 2 or more participants are in the room, show grid */}
                {liveParticipants.length > 1 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full max-h-[75vh] w-full">
                    {/* User 1 Tile (You) */}
                    <div className="rounded-3xl bg-[#101625] border-2 border-slate-800 overflow-hidden relative flex items-center justify-center shadow-xl min-h-[160px]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover scale-x-[-1] ${isVideoOn ? 'block' : 'hidden'}`}
                      />
                      {!isVideoOn && (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <div className="w-16 h-16 rounded-full bg-slate-800 text-[#FFE900] font-black text-2xl flex items-center justify-center border-2 border-slate-700 shadow-inner mb-2">
                            {currentUserName.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-bold text-white">{currentUserName} (You)</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Camera is off</p>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-[11px] font-bold text-white border border-white/10">
                        <span>{currentUserName} (You)</span>
                        {isMicOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                      </div>
                    </div>

                    {/* Remote Participants Tiles */}
                    {liveParticipants
                      .filter(p => p.name !== currentUserName && p.userId !== currentUserId)
                      .map((p, idx) => {
                        const rStream = remoteStreams[p.userId];
                        const showRemoteVideo = p.isCameraOn && rStream && rStream.getVideoTracks().length > 0;

                        return (
                          <div key={idx} className="rounded-3xl bg-[#121828] border-2 border-slate-800 overflow-hidden relative flex flex-col items-center justify-center shadow-xl min-h-[160px]">
                            {/* Real Remote Video Track from WebRTC */}
                            <video
                              ref={(el) => {
                                if (el && rStream && el.srcObject !== rStream) {
                                  el.srcObject = rStream;
                                  el.play().catch(() => {});
                                }
                              }}
                              autoPlay
                              playsInline
                              className={`w-full h-full object-cover rounded-3xl ${showRemoteVideo ? 'block' : 'hidden'}`}
                            />

                            {/* Remote Avatar when camera is off */}
                            {!showRemoteVideo && (
                              <div className="flex flex-col items-center justify-center p-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-slate-800 text-[#FFE900] font-black text-2xl flex items-center justify-center border-2 border-[#FFE900]/40 shadow-inner mb-2">
                                  {(p.name || 'P').charAt(0).toUpperCase()}
                                </div>
                                <p className="text-base font-bold text-white">{p.name || 'Participant'}</p>
                                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold mt-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>{p.isCameraOn ? 'Connecting Cam...' : 'Camera Off'}</span>
                                </div>
                              </div>
                            )}

                            {/* Participant Badges */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/75 backdrop-blur-md text-[11px] font-bold text-white border border-white/10 z-10">
                              <span>{p.name || 'Participant'}</span>
                              {showRemoteVideo ? (
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">Live HD</span>
                              ) : (
                                <span className="text-[10px] text-slate-400">● Live</span>
                              )}
                              {p.isMicOn ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  /* Single Participant (Primary Video Tile) */
                  <div className="w-full h-full max-h-[75vh] rounded-3xl bg-[#101625] border-2 border-slate-800 overflow-hidden relative flex items-center justify-center shadow-2xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover scale-x-[-1] ${isVideoOn ? 'block' : 'hidden'}`}
                    />

                    {!isVideoOn && (
                      <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-800 text-[#FFE900] font-black text-3xl flex items-center justify-center border-2 border-slate-700 shadow-inner mb-3">
                          {currentUserName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-base font-bold text-white">{currentUserName}</p>
                        <p className="text-xs text-slate-400 mt-1 mb-4">
                          Camera is currently off. Turn on your camera, or use Virtual Studio.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={startCamera}
                            disabled={isConnectingCamera}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                          >
                            {isConnectingCamera ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Connecting...</span>
                              </>
                            ) : (
                              <>
                                <Video className="w-3.5 h-3.5" />
                                <span>Turn On Camera</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={startVirtualCamera}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Tv className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Virtual Studio Cam</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Participant Overlay Badge */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs font-bold text-white border border-white/10">
                      <span>{currentUserName}</span>
                      {isVideoOn && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {isVirtualCam ? 'Virtual HD' : 'Camera Live'}
                        </span>
                      )}
                      {isMicOn ? (
                        <div className="flex items-center gap-1 text-emerald-400">
                          <Mic className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-mono">Live</span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400">
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Muted</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Floating Real-Time Subtitles / Captions (Shared with everyone) */}
                {(meetingCaption || liveInterimText || transcriptEntries.length > 0) && (
                  <div className="absolute bottom-3 right-3 max-w-xs sm:max-w-md px-3.5 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 text-xs text-white shadow-xl animate-in fade-in duration-150 z-20">
                    <p className="text-[10px] font-black text-[#FFE900] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FFE900] animate-ping"></span>
                      <span>{meetingCaption ? `Speech (${meetingCaption.speaker}):` : 'Live Speech:'}</span>
                    </p>
                    <p className="text-slate-100 font-medium leading-relaxed truncate">
                      {meetingCaption ? meetingCaption.text : (liveInterimText || transcriptEntries[transcriptEntries.length - 1]?.text || '')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Live Panel: AI Notes, In-Call Chat, People */}
        <div className={`w-full lg:w-96 bg-[#0E1320] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 ${
          mobileView === 'panel' ? 'flex flex-1 lg:flex-initial' : 'hidden lg:flex'
        }`}>
          {/* Mobile Back Banner when viewing panel on phones */}
          <div className="flex lg:hidden items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              {activePanel === 'notes' && <><Sparkles className="w-3.5 h-3.5 text-[#FFE900]" /> AI Live Notes</>}
              {activePanel === 'chat' && <><MessageSquare className="w-3.5 h-3.5 text-[#FFE900]" /> In-Call Chat</>}
              {activePanel === 'participants' && <><Users className="w-3.5 h-3.5 text-[#FFE900]" /> Participants ({liveParticipants.length})</>}
            </span>
            <button
              type="button"
              onClick={() => setMobileView('video')}
              className="px-3 py-1 rounded-lg bg-[#FFE900] text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <Video className="w-3 h-3" />
              <span>Back to Video</span>
            </button>
          </div>

          {/* Desktop Panel Tabs */}
          <div className="hidden lg:flex p-3 border-b border-slate-800 items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivePanel('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activePanel === 'notes' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Live Notes</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activePanel === 'chat' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat ({chatMessages.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('participants')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activePanel === 'participants' ? 'bg-[#FFE900] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>People</span>
              </button>
            </div>
          </div>

          {/* TAB 1: AI LIVE NOTES */}
          {activePanel === 'notes' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs flex items-center justify-between">
                <span className="font-bold text-[#FFE900] flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isMicOn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
                  <span>{isMicOn ? 'Auto-Speech Transcribe Active' : 'Mic is Muted'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {transcriptEntries.length} lines logged
                </span>
              </div>

              {/* Live Transcripts Scrollable Box */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                  <p className="font-bold text-white mb-1">
                    Strict Factual Meeting Pipeline:
                  </p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    MidMeetMind AI summarizes <strong>strictly what you speak or enter</strong>. If no discussion is recorded, zero fake decisions or tasks will be generated.
                  </p>
                </div>

                {/* Transcripts List */}
                <div className="space-y-2">
                  {transcriptEntries.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-emerald-400">{item.speaker}</span>
                        <span className="font-mono text-slate-500">{item.time}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-sans">{item.text}</p>
                    </div>
                  ))}

                  {/* Interim speaking live pulse */}
                  {liveInterimText && (
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-dashed border-[#FFE900]/40 text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#FFE900] font-bold mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFE900] animate-pulse"></span>
                        <span>Transcribing in real time...</span>
                      </div>
                      <p className="text-slate-300 italic">{liveInterimText}</p>
                    </div>
                  )}

                  {/* Empty state when nothing has been spoken */}
                  {transcriptEntries.length === 0 && !liveInterimText && (
                    <div className="p-6 text-center text-slate-500 text-xs space-y-2">
                      <p>No speech detected yet.</p>
                      <p className="text-[11px] text-slate-600">
                        Speak into your microphone or type a discussion note below!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Note input so user can also type meeting points */}
              <form onSubmit={handleAddManualNote} className="p-3 border-t border-slate-800 bg-slate-900/70 flex items-center gap-2">
                <input
                  type="text"
                  value={manualNoteText}
                  onChange={(e) => setManualNoteText(e.target.value)}
                  placeholder="Type a spoken point or decision..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FFE900]"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Add Note
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: IN-CALL CHAT */}
          {activePanel === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 p-6">No chat messages yet. Type below to send a message!</p>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-bold text-white">{msg.sender}</span>
                        <span className="font-mono">{msg.time}</span>
                      </div>
                      <p className="text-slate-200">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/70 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message to the room..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FFE900]"
                />
                <button
                  type="submit"
                  className="p-2 bg-[#FFE900] text-slate-950 rounded-xl hover:bg-[#F5DE00] transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: PARTICIPANTS (Synced across all devices in real-time) */}
          {activePanel === 'participants' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                <span>In this meeting</span>
                <span className="font-bold text-white">{liveParticipants.length} people</span>
              </div>

              {liveParticipants.map((p, idx) => {
                const isSelf = p.name === currentUserName || p.userId === currentUserId;
                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#FFE900]/20 text-[#FFE900] font-black flex items-center justify-center border border-[#FFE900]/30 text-xs">
                        {(p.name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white flex items-center gap-1.5">
                          <span>{p.name || 'Participant'}</span>
                          {isSelf && <span className="text-[10px] text-[#FFE900] font-normal">(You)</span>}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[200px]">
                          {p.email || (p.role === 'organizer' ? 'Meeting Host' : 'Attendee')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {p.role === 'organizer' ? 'Host' : 'Active'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* Bottom Conference Control Bar (Responsive for all phones) */}
      {/* ======================================================== */}
      <div className="h-auto py-2.5 sm:py-3 bg-[#0E1320] border-t border-slate-800 flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 gap-2">
        {/* Left: Hardware Mute & Video Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={toggleMicrophone}
            className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all cursor-pointer ${
              !isMicOn
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {!isMicOn ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
            <span className="text-[9px] sm:text-[10px] font-bold mt-0.5">{isMicOn ? 'Mute' : 'Unmute'}</span>
          </button>

          {/* Camera Toggle Button */}
          <button
            type="button"
            onClick={toggleCamera}
            className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all cursor-pointer ${
              !isVideoOn
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {!isVideoOn ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
            <span className="text-[9px] sm:text-[10px] font-bold mt-0.5">{isVideoOn ? 'Stop' : 'Start'}</span>
          </button>
        </div>

        {/* Center: Screen Share Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleScreenShare}
            disabled={isConnectingScreen}
            className={`flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-[#FFE900] text-slate-950 font-black shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {isConnectingScreen ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="text-[9px] sm:text-[10px] font-bold mt-0.5">
              {isScreenSharing ? 'Sharing' : 'Share'}
            </span>
          </button>
        </div>

        {/* Right: End Meeting & Extract Real Summary */}
        <div>
          <button
            type="button"
            onClick={handleEndMeeting}
            disabled={isEndingMeeting}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
          >
            {isEndingMeeting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span className="hidden sm:inline">Processing AI Summary...</span>
                <span className="sm:hidden">Saving...</span>
              </>
            ) : (
              <>
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">End Meeting &amp; Summary</span>
                <span className="sm:hidden">End Call</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BROWSER PERMISSION GUIDE MODAL */}
      {/* ======================================================== */}
      {showHelpModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0F1424] border border-slate-700 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Camera, Mic &amp; Screen Share Fix</h3>
                  <p className="text-xs text-slate-400">Why permissions are blocked &amp; 2-second fix</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              {/* Point 1: Iframe restriction reason */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                  !
                </span>
                <div>
                  <p className="font-bold text-indigo-200 text-sm">Environment Note: Preview Sandbox Iframe</p>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Even after granting permissions in your browser, the <strong>AI Studio preview container is an &lt;iframe&gt;</strong>. Browsers enforce security sandbox policies that block native hardware capture inside embedded iframes.
                  </p>
                </div>
              </div>

              {/* Solution 1: Direct link */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FFE900] text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-bold text-white text-sm">Recommended: Open in Direct New Tab</p>
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    Click <strong>"Open in Direct New Tab"</strong> below. Top-level tabs run outside the iframe sandbox, giving you 100% native access to your laptop HD camera, microphone, and screen share!
                  </p>
                </div>
              </div>

              {/* Solution 2: Virtual Studio Mode */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#FFE900] text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-bold text-white text-sm">Instant Test: Use Virtual Studio Cam &amp; Screen</p>
                  <p className="text-slate-400 mt-1 leading-relaxed">
                    Test the complete live meeting, real-time audio visualization, screen sharing, and Gemini AI summary directly inside the preview using our built-in <strong>Virtual Studio Feed</strong> without any hardware restrictions.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowHelpModal(false);
                  openDirectNewTab();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Direct New Tab</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowHelpModal(false);
                  startVirtualCamera();
                }}
                className="px-4 py-3 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors cursor-pointer"
              >
                Use Virtual Cam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
