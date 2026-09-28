import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Play,
  Calendar,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { Summary, Meeting } from '../../types/index.ts';

interface RecentSummariesFeedProps {
  summaries: { summary: Summary; meeting?: Meeting }[];
  onSelectSummary?: (summary: Summary, meeting?: Meeting) => void;
}

export const RecentSummariesFeed: React.FC<RecentSummariesFeedProps> = ({
  summaries,
  onSelectSummary
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySummaryText = (item: { summary: Summary; meeting?: Meeting }, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Meeting: ${item.meeting?.title || 'Meeting Summary'}
Executive Summary:
${item.summary.overview || item.summary.summaryText}

Key Points:
${item.summary.keyPoints.map(p => `• ${p}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.summary.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            Conference Recordings &amp; AI Summaries
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Executive takeaways, decision logs, and full timestamped transcripts
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-600">
          {summaries.length} Recordings Available
        </span>
      </div>

      {/* Summaries list */}
      <div className="divide-y divide-slate-100">
        {summaries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No conference recordings or transcripts processed yet. Complete a meeting to view its summary here.
          </div>
        ) : (
          summaries.map((item) => {
            const dateStr = new Date(item.summary.generatedAt || item.summary.createdAt || Date.now()).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={item.summary.id}
                onClick={() => onSelectSummary && onSelectSummary(item.summary, item.meeting)}
                className="p-4 sm:p-5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  {/* Play icon badge */}
                  <div className="w-12 h-12 rounded-xl bg-[#FFE900]/20 text-slate-950 flex items-center justify-center shrink-0 border border-[#FFE900]/30 mt-0.5">
                    <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                      {item.summary.title || item.meeting?.title || 'Conference Discussion'}
                    </h3>

                    {/* Metadata line with typographic separators */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.summary.durationMinutes || 45} mins</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.summary.keyPoints.length} key points</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.summary.actionItems?.length || 0} action items</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 max-w-2xl leading-relaxed">
                      {item.summary.overview || item.summary.summaryText}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => copySummaryText(item, e)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                    title="Copy Summary"
                  >
                    {copiedId === item.summary.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                  >
                    <span>View Transcript</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
