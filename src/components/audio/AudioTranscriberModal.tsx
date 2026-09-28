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
  AlertCircle
} from 'lucide-react';
import { transcribeAudioWithGemini } from '../../lib/geminiService.ts';

interface AudioTranscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptGenerated?: (transcript: string) => void;
  meetingTitle?: string;
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
      console.error('Microphone access denied:', err);
      setMicPermissionError(
        'Microphone access was denied or is not supported. Please allow microphone permissions in your browser.'
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
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Permission Error Banner */}
          {micPermissionError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Microphone Permission Required</p>
                <p className="mt-0.5">{micPermissionError}</p>
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
                  {audioUrl ? 'Recording Complete · Click to Record Again' : 'Ready to record microphone audio'}
                </div>
              )}

              <span className="font-mono text-lg font-bold text-[#FFE900]">
                {formatTimer(recordingDuration)}
              </span>
            </div>

            {/* Record / Stop Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-black text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>{audioUrl ? 'Record New Audio' : 'Start Speaking'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecordingSession}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop &amp; Transcribe</span>
              </button>
            )}
          </div>

          {/* Audio Player Preview */}
          {audioUrl && !isRecording && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <span>Recorded Audio Preview</span>
              </div>
              <audio src={audioUrl} controls className="h-8 max-w-xs" />
            </div>
          )}

          {/* Transcription Processing Loader */}
          {isTranscribing && (
            <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-indigo-700 font-bold text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Transcribing via gemini-3.5-transcribe...</span>
              </div>
              <p className="text-xs text-indigo-600 max-w-sm mx-auto">
                Extracting verbatim speech, punctuation, and discussion markers from your microphone audio.
              </p>
            </div>
          )}

          {/* Transcribed Text Output */}
          {transcription && !isTranscribing && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>AI Generated Transcript</span>
                </span>
                <button
                  type="button"
                  onClick={copyTranscript}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {transcription}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Powered by Gemini Audio Intelligence
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopRecordingSession();
                onClose();
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
