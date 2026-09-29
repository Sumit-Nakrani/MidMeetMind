import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Copy,
  Check,
  Sparkles,
  Loader2,
  X,
  Volume2,
  RefreshCw,
  FileText,
  AlertCircle,
  Upload,
  Music
} from 'lucide-react';
import { transcribeAudioWithGemini } from '../../lib/geminiService.ts';

interface AudioTranscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptGenerated?: (transcript: string) => void;
  meetingTitle?: string;
}

// Generates a valid PCM WAV audio sample for testing Gemini transcription
// when browser or iframe environment blocks microphone hardware access
function createSyntheticAudioSampleBlob(): Blob {
  const sampleRate = 16000;
  const duration = 2.5;
  const numChannels = 1;
  const totalSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + totalSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // 'WAVE'
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // 'data'
  view.setUint32(40, totalSamples * 2, true);

  // Write speech formant simulation frequencies (vocal resonance 300Hz, 800Hz)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const formant1 = Math.sin(2 * Math.PI * 300 * t);
    const formant2 = 0.5 * Math.sin(2 * Math.PI * 800 * t);
    const envelope = Math.sin(Math.PI * (i / totalSamples)); // fade envelope
    const sample = (formant1 + formant2) * 0.3 * envelope;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const AudioTranscriberModal: React.FC<AudioTranscriberModalProps> = ({
  isOpen,
  onClose,
  onTranscriptGenerated,
  meetingTitle
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopRecordingSession();
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionError(null);
    setTranscription('');
    setAudioUrl(null);
    setAudioBlob(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser context.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up AudioContext for live waveform visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      // Start canvas waveform visualizer
      drawWaveform();

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);

        // Auto transcribe after recording stops
        await processTranscription(audioBlob);
      };

      mediaRecorder.start(250); // chunk every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission info:', err?.message || err);
      setMicPermissionError(
        'Microphone access is blocked by browser permissions or running in a restricted sandbox. You can click the lock icon in the address bar to allow Microphone, or use the Demo Voice Sample or Audio File Upload below.'
      );
    }
  };

  const stopRecordingSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    setIsRecording(false);
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        // GoTo Signature yellow & dark slate wave colors
        ctx.fillStyle = i % 2 === 0 ? '#FFE900' : '#0F172A';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    render();
  };

  const processTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const context = meetingTitle ? `Meeting: ${meetingTitle}` : 'MidMeetMind live discussion session';
      const result = await transcribeAudioWithGemini(blob, context);
      setTranscription(result.text);
      if (onTranscriptGenerated && result.text) {
        onTranscriptGenerated(result.text);
      }
    } catch (err) {
      console.warn('Transcription warning:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUseDemoAudio = async () => {
    setMicPermissionError(null);
    setTranscription('');
    const sampleBlob = createSyntheticAudioSampleBlob();
    setAudioBlob(sampleBlob);
    const url = URL.createObjectURL(sampleBlob);
    setAudioUrl(url);
    await processTranscription(sampleBlob);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMicPermissionError(null);
    setTranscription('');
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    await processTranscription(file);
  };

  const copyTranscript = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Hidden file input for audio upload fallback */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="audio/*,video/*"
          className="hidden"
        />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFE900] text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Microphone Audio Transcriber</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  gemini-3.5-transcribe
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Speak into your mic to generate instant verbatim meeting transcripts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRecordingSession();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Permission Info & Fallbacks Banner */}
          {micPermissionError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Microphone Access Notice</p>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">{micPermissionError}</p>
                </div>
              </div>

              {/* Instant Action Fallbacks */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleUseDemoAudio}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5 text-[#FFE900]" />
                  <span>Use Demo Audio Sample</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Audio File</span>
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Retry Mic
                </button>
              </div>
            </div>
          )}

          {/* Live Recording Area & Waveform */}
          <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            {/* Visualizer Canvas */}
            <canvas
              ref={canvasRef}
              width={400}
              height={80}
              className="w-full h-20 mb-4 opacity-90 rounded-lg"
            />

            {/* Timer & Live Status */}
            <div className="flex items-center gap-3 mb-5">
              {isRecording ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span>RECORDING LIVE</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium">
                  {audioUrl ? 'Audio Buffer Ready · Click to Record Again' : 'Ready to record microphone audio'}
                </div>
              )}

              <span className="font-mono text-lg font-bold text-[#FFE900]">
                {formatTimer(recordingDuration)}
              </span>
            </div>

            {/* Record / Stop Button */}
            {!isRecording ? (
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-black text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                  <span>{audioUrl ? 'Record New Audio' : 'Start Speaking'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseDemoAudio}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  title="Test Gemini speech transcription with a synthesized sample"
                >
                  <Music className="w-3.5 h-3.5 text-[#FFE900]" />
                  <span>Test Audio Sample</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={stopRecordingSession}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop &amp; Transcribe</span>
              </button>
            )}
          </div>

          {/* Audio Player playback preview if available */}
          {audioUrl && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span>Captured Audio Buffer</span>
              </div>
              <audio src={audioUrl} controls className="h-8 max-w-xs" />
            </div>
          )}

          {/* Transcribing Loader */}
          {isTranscribing && (
            <div className="p-5 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
              <div>
                <p className="text-xs font-bold text-indigo-900">
                  Transcribing with Gemini Speech Model...
                </p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Analyzing acoustic waveform, speaker frequency, and verbal semantics.
                </p>
              </div>
            </div>
          )}

          {/* Result: Live Transcript Box */}
          {transcription && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Generated Transcript</span>
                </span>
                <button
                  type="button"
                  onClick={copyTranscript}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                {transcription}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Model: gemini-3.5-transcribe</span>
          <button
            type="button"
            onClick={() => {
              stopRecordingSession();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
