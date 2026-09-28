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
  Maximize2,
  Volume2,
  ChevronDown,
  Settings,
  Send,
  FileText,
  Loader2,
  Square
} from 'lucide-react';
import { Meeting } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { completeMeetingWithSummary } from '../../lib/meetingService.ts';
import { transcribeAudioWithGemini } from '../../lib/geminiService.ts';

interface GoToLiveMeetingModalProps {
  meeting: Meeting | null;
  onClose: () => void;
  onMeetingCompleted?: (meetingId: string) => void;
}

export const GoToLiveMeetingModal: React.FC<GoToLiveMeetingModalProps> = ({
  meeting,
  onClose,
  onMeetingCompleted
}) => {
  const { profile } = useAuth();

  // Media states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(145); // simulated active time

  // Drawers & Panes
  const [activePanel, setActivePanel] = useState<'notes' | 'chat' | 'participants' | null>('notes');
  const [copiedLink, setCopiedLink] = useState(false);

  // Live notes / transcripts simulation
  const [liveTranscript, setLiveTranscript] = useState<Array<{ speaker: string; text: string; time: string }>>([
    { speaker: 'Prof. Priya Sharma', text: 'Welcome everyone to today\'s session. Let us review the syllabus and milestones.', time: '00:15' },
    { speaker: 'Rahul Verma', text: 'Good morning! Yes, I have prepared the quarterly progress update on slide 4.', time: '00:42' },
    { speaker: 'You', text: 'Thanks Rahul. We also need to confirm the deadline for next week\'s deliverables.', time: '01:10' }
  ]);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'Prof. Priya Sharma', text: 'I have attached the review document in the org drive.', time: '10:02 AM' },
    { sender: 'Rahul Verma', text: 'Got it, reviewing now.', time: '10:04 AM' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Video Stream reference
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);

  // Format recording timer
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Live microphone transcription via gemini-3.5-transcribe
  const [isTranscribingMic, setIsTranscribingMic] = useState(false);
  const [micRecording, setMicRecording] = useState(false);
  const liveMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveChunksRef = useRef<Blob[]>([]);

  const startLiveMicTranscribe = async () => {
    try {
      liveChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      liveMediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) liveChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(liveChunksRef.current, { type: 'audio/webm' });
        setIsTranscribingMic(true);
        try {
          const res = await transcribeAudioWithGemini(blob, meeting?.title);
          if (res.text) {
            setLiveTranscript(prev => [
              ...prev,
              {
                speaker: profile?.name || 'You',
                text: res.text,
                time: formatTimer(recordingSeconds)
              }
            ]);
          }
        } finally {
          setIsTranscribingMic(false);
        }
      };
      mr.start();
      setMicRecording(true);
    } catch (e) {
      console.error('Live mic transcribe error:', e);
    }
  };

  const stopLiveMicTranscribe = () => {
    if (liveMediaRecorderRef.current && liveMediaRecorderRef.current.state !== 'inactive') {
      liveMediaRecorderRef.current.stop();
      liveMediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setMicRecording(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Try activating webcam if enabled
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isVideoOn) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            setWebcamActive(true);
          }
        })
        .catch(() => {
          setWebcamActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isVideoOn]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        sender: profile?.name || 'You',
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  const handleEndMeeting = async () => {
    if (meeting?.id) {
      await completeMeetingWithSummary(meeting.id);
      if (onMeetingCompleted) {
        onMeetingCompleted(meeting.id);
      }
    }
    onClose();
  };

  const copyMeetingUrl = () => {
    const url = window.location.origin + `/meet/${meeting?.id || 'demo-room'}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const participantsList = [
    { name: profile?.name || 'You (Host)', role: 'Host', isMuted, isSpeaking: !isMuted },
    { name: 'Prof. Priya Sharma', role: 'Organizer', isMuted: false, isSpeaking: true },
    { name: 'Rahul Verma', role: 'Participant', isMuted: true, isSpeaking: false },
    { name: 'Aarav Patel', role: 'Participant', isMuted: true, isSpeaking: false }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top GoTo Meeting Header Bar */}
      <div className="h-14 px-4 bg-[#111625] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* MidMeetMind Signature Emblem */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFE900] text-slate-950 font-black text-sm flex items-center justify-center shadow-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm tracking-tight">
                  {meeting?.title || 'MidMeet Conference Room'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FFE900]/15 text-[#FFE900] border border-[#FFE900]/30 uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                ID: {meeting?.id ? meeting.id.substring(0, 11).toUpperCase() : 'GOTO-892-411'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Recording Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
          {isRecording ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="font-mono text-slate-200 text-xs font-semibold">{formatTimer(recordingSeconds)}</span>
              <span className="text-[11px] text-slate-400">· AI Live Captions ON</span>
            </>
          ) : (
            <span className="text-slate-400 text-xs">Recording Paused</span>
          )}
        </div>

        {/* Right: Meeting Info & Invite Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyMeetingUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
            <span>{copiedLink ? 'Copied Link' : 'Copy Invite Link'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Video Grid + Collapsible Drawer) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Video Grid Area */}
        <div className="flex-1 p-4 flex flex-col justify-center items-center overflow-y-auto bg-[#0B0F19]">
          <div className="w-full max-w-6xl h-full flex flex-col justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 h-full max-h-[70vh]">
              {/* Tile 1: Primary User (You) */}
              <div className={`relative rounded-2xl bg-[#161D2F] border-2 overflow-hidden flex items-center justify-center transition-all ${
                !isMuted ? 'border-[#FFE900] shadow-[0_0_20px_rgba(255,233,0,0.15)]' : 'border-slate-800'
              }`}>
                {isVideoOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div className="w-20 h-20 rounded-full bg-slate-800 text-[#FFE900] font-bold text-2xl flex items-center justify-center border-2 border-slate-700 shadow-inner">
                      {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-300">{profile?.name || 'You'}</p>
                    <span className="text-[11px] text-slate-500">Camera Off</span>
                  </div>
                )}

                {/* Participant Overlay Tag */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
                  <span>{profile?.name || 'You (Host)'}</span>
                  {isMuted ? (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-2.5 bg-[#FFE900] rounded-full animate-pulse"></span>
                      <span className="w-1 h-3.5 bg-[#FFE900] rounded-full animate-pulse"></span>
                      <span className="w-1 h-2 bg-[#FFE900] rounded-full animate-pulse"></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tile 2: Speaker 2 (Prof. Priya Sharma) */}
              <div className="relative rounded-2xl bg-[#161D2F] border-2 border-[#FFE900] shadow-[0_0_20px_rgba(255,233,0,0.15)] overflow-hidden flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-indigo-950 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#FFE900]/20 text-[#FFE900] font-bold text-2xl flex items-center justify-center border-2 border-[#FFE900]/40">
                    PS
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">Prof. Priya Sharma</p>
                  <p className="text-[11px] text-[#FFE900] font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFE900] animate-ping"></span>
                    Speaking...
                  </p>
                </div>

                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium text-white border border-white/10">
                  <span>Prof. Priya Sharma</span>
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-3 bg-[#FFE900] rounded-full animate-pulse"></span>
                    <span className="w-1 h-4 bg-[#FFE900] rounded-full animate-pulse"></span>
                    <span className="w-1 h-2 bg-[#FFE900] rounded-full animate-pulse"></span>
                  </div>
                </div>
              </div>

              {/* Tile 3: Participant 3 (Rahul Verma) */}
              <div className="relative rounded-2xl bg-[#161D2F] border-2 border-slate-800 overflow-hidden flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 font-bold text-xl flex items-center justify-center border border-slate-700">
                    RV
                  </div>
                  <p className="mt-2.5 text-xs font-semibold text-slate-300">Rahul Verma</p>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium text-slate-300 border border-white/10">
                  <span>Rahul Verma</span>
                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* Tile 4: Participant 4 (Aarav Patel) */}
              <div className="relative rounded-2xl bg-[#161D2F] border-2 border-slate-800 overflow-hidden flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 font-bold text-xl flex items-center justify-center border border-slate-700">
                    AP
                  </div>
                  <p className="mt-2.5 text-xs font-semibold text-slate-300">Aarav Patel</p>
                </div>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs font-medium text-slate-300 border border-white/10">
                  <span>Aarav Patel</span>
                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Collapsible Drawer (Live AI Notes, Chat, Participants) */}
        {activePanel && (
          <div className="w-80 md:w-96 bg-[#111625] border-l border-slate-800 flex flex-col shrink-0">
            {/* Panel Tabs */}
            <div className="h-12 border-b border-slate-800 flex items-center justify-around px-2 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setActivePanel('notes')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  activePanel === 'notes' ? 'bg-[#FFE900] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                AI Smart Notes
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('chat')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  activePanel === 'chat' ? 'bg-[#FFE900] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                In-Call Chat
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('participants')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  activePanel === 'participants' ? 'bg-[#FFE900] text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                People ({participantsList.length})
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activePanel === 'notes' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FFE900] animate-ping"></span>
                        Real-time AI Audio Stream
                      </span>
                      <span className="text-[10px] text-[#FFE900] font-mono">LIVE SPEECH</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed italic bg-black/40 p-2.5 rounded-lg border border-slate-800">
                      "Rahul, please coordinate with Aarav to verify the project milestone report by Friday morning..."
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Live Transcript Feed
                      </h4>

                      {/* Mic Transcribe Action Button */}
                      {!micRecording ? (
                        <button
                          type="button"
                          onClick={startLiveMicTranscribe}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold transition-all cursor-pointer"
                          title="Record your speech and transcribe via gemini-3.5-transcribe"
                        >
                          <Mic className="w-3 h-3 text-indigo-400" />
                          <span>Speak &amp; Transcribe</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopLiveMicTranscribe}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold animate-pulse transition-all cursor-pointer"
                        >
                          <Square className="w-2.5 h-2.5 fill-white" />
                          <span>Stop &amp; Transcribe</span>
                        </button>
                      )}
                    </div>

                    {/* Transcribing Indicator */}
                    {isTranscribingMic && (
                      <div className="p-2 mb-2 rounded-lg bg-indigo-950/60 border border-indigo-800 text-[11px] text-indigo-300 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Transcribing audio via gemini-3.5-transcribe...</span>
                      </div>
                    )}

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {liveTranscript.map((t, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white">{t.speaker}</span>
                            <span className="text-[10px] font-mono text-slate-500">{t.time}</span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{t.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FFE900]/10 border border-[#FFE900]/20">
                    <p className="text-xs font-semibold text-[#FFE900] mb-1">
                      Automated Executive Summary Ready
                    </p>
                    <p className="text-[11px] text-slate-300">
                      When you click "End Meeting", AI will instantly compile key takeaways, decisions, and action items for all participants.
                    </p>
                  </div>
                </div>
              )}

              {activePanel === 'chat' && (
                <div className="h-full flex flex-col justify-between">
                  <div className="space-y-3 overflow-y-auto mb-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white">{msg.sender}</span>
                          <span className="text-[10px] text-slate-500">{msg.time}</span>
                        </div>
                        <p className="text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Send message to everyone..."
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-[#FFE900]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-lg bg-[#FFE900] text-slate-950 font-bold hover:bg-[#F5DE00] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {activePanel === 'participants' && (
                <div className="space-y-2">
                  {participantsList.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.role}</p>
                        </div>
                      </div>
                      <div>
                        {p.isMuted ? (
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom GoTo Meeting Control Dock Bar */}
      <div className="h-20 bg-[#111625] border-t border-slate-800 px-6 flex items-center justify-between shrink-0">
        {/* Left: Audio/Video device controls */}
        <div className="flex items-center gap-2">
          {/* Mute Button */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              isMuted
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[10px] font-medium mt-1">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              !isVideoOn
                ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {!isVideoOn ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="text-[10px] font-medium mt-1">{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>
        </div>

        {/* Center: In-call features (Share Screen, Record, Notes, Chat) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Screen Share */}
          <button
            type="button"
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              isScreenSharing
                ? 'bg-[#FFE900] text-slate-950 font-bold shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <Share2 className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">Share</span>
          </button>

          {/* Recording Toggle */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              isRecording
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <Circle className={`w-5 h-5 ${isRecording ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="text-[10px] font-medium mt-1">{isRecording ? 'Recording' : 'Record'}</span>
          </button>

          {/* AI Smart Notes Drawer */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'notes' ? null : 'notes')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              activePanel === 'notes'
                ? 'bg-[#FFE900] text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">AI Notes</span>
          </button>

          {/* In-Call Chat Drawer */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              activePanel === 'chat'
                ? 'bg-[#FFE900] text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">Chat</span>
          </button>

          {/* Participants */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${
              activePanel === 'participants'
                ? 'bg-[#FFE900] text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">People</span>
          </button>
        </div>

        {/* Right: End / Leave Meeting Button (Signature GoTo Red Button) */}
        <div>
          <button
            type="button"
            onClick={handleEndMeeting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Meeting</span>
          </button>
        </div>
      </div>
    </div>
  );
};
