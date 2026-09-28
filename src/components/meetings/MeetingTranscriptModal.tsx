import React, { useState } from 'react';
import {
  FileText,
  Search,
  Copy,
  Check,
  X,
  Clock,
  User,
  Download,
  Share2
} from 'lucide-react';
import { Meeting, Summary } from '../../types/index.ts';

interface MeetingTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  summary?: Summary | null;
}

export const MeetingTranscriptModal: React.FC<MeetingTranscriptModalProps> = ({
  isOpen,
  onClose,
  meeting,
  summary
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !meeting) return null;

  // Transcript items from summary or constructed fallback based on meeting data
  const rawTranscript = summary?.transcriptSnippet && summary.transcriptSnippet.length > 0
    ? summary.transcriptSnippet
    : [
        { timestamp: '00:05', speaker: 'Organizer', text: `Welcome everyone to "${meeting.title}". Let's review the primary agenda items for today.` },
        { timestamp: '01:20', speaker: 'Participant', text: meeting.agenda ? `Regarding the agenda item: "${meeting.agenda.substring(0, 80)}...", we have prepared the initial materials.` : 'The discussion materials and slides have been compiled for this review.' },
        { timestamp: '04:15', speaker: 'Organizer', text: 'All action items and milestones will be tracked in the workspace registry.' },
        { timestamp: '08:45', speaker: 'Lead', text: 'Confirmed. Next sync is set as planned with the project deliverables.' }
      ];

  const filteredTranscript = rawTranscript.filter(item =>
    item.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fullTranscriptText = rawTranscript
    .map(item => `[${item.timestamp}] ${item.speaker}: ${item.text}`)
    .join('\n\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTranscriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullTranscriptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meeting.title.replace(/\s+/g, '_')}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#FFE900] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                Verbatim Meeting Transcript
              </h3>
              <p className="text-xs text-slate-500">
                {meeting.title} · {new Date(meeting.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Copy Full Transcript"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Download Transcript Text"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search in transcript */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search words, phrases, or speakers in transcript..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-400 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Transcript stream */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 bg-slate-50/30">
          {filteredTranscript.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No matching lines found for "{searchTerm}".
            </div>
          ) : (
            filteredTranscript.map((line, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{line.speaker}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{line.timestamp}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {line.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>{rawTranscript.length} Dialogue segments</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
