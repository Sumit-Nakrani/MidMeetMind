import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Download,
  Share2,
  X,
  Search,
  Copy,
  Check,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Summary, Meeting, Task } from '../../types/index.ts';

interface GoToMeetingSummaryModalProps {
  summary: Summary | null;
  meeting?: Meeting | null;
  onClose: () => void;
  onTaskToggle?: (taskId: string) => void;
}

export const GoToMeetingSummaryModal: React.FC<GoToMeetingSummaryModalProps> = ({
  summary,
  meeting,
  onClose,
  onTaskToggle
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  if (!summary) return null;

  const copyShareLink = () => {
    const url = window.location.origin + `/summary/${summary.id}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const filteredTranscript = summary.transcriptSnippet?.filter(item =>
    item.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FFE900] text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {summary.title || meeting?.title || 'Meeting Summary & Recording'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Processed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                MidMeetMind AI Smart Meeting Notes · {new Date(summary.generatedAt || summary.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Copied' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audio Recording Scrubber */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            className="w-9 h-9 rounded-full bg-[#FFE900] text-slate-950 font-bold flex items-center justify-center hover:bg-[#F5DE00] transition-colors"
          >
            {isPlayingAudio ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1 font-mono">
              <span>{isPlayingAudio ? '14:20' : '00:00'}</span>
              <span>Recording Duration: {summary.durationMinutes || 45} mins</span>
            </div>
            <div
              className="w-full h-2 bg-slate-800 rounded-full cursor-pointer overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = ((e.clientX - rect.left) / rect.width) * 100;
                setAudioProgress(Math.min(100, Math.max(0, pos)));
              }}
            >
              <div
                className="h-full bg-[#FFE900] rounded-full transition-all duration-150"
                style={{ width: `${audioProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Executive Overview */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFE900]"></span>
              Executive Overview
            </h4>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {summary.overview}
            </p>
          </div>

          {/* Key Discussion Topics */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Key Discussion Highlights ({summary.keyPoints.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {summary.keyPoints.map((point, index) => (
                <div key={index} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FFE900] text-slate-950 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items Checklist */}
          {summary.actionItems && summary.actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Action Items & Assigned Deliverables
              </h4>
              <div className="space-y-2">
                {summary.actionItems.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      task.status === 'completed'
                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onTaskToggle && onTaskToggle(task.id)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <div>
                        <p className={`text-xs font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          <span>Assignee: <strong>{task.assigneeName || task.assignedTo || 'Team Member'}</strong></span>
                          <span>·</span>
                          <span>Due: <strong>{task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Next Friday'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Timestamped Transcript */}
          {summary.transcriptSnippet && summary.transcriptSnippet.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Full Timestamped Transcript
                </h4>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in transcript..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-slate-50 border border-slate-200">
                {filteredTranscript.map((t, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-800">{t.speaker}</span>
                      <span className="text-[10px] font-mono text-slate-400">{t.timestamp}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Automated transcription with mid-meeting sentiment tracking
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
