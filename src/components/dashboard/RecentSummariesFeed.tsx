import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Summary, Meeting } from '../../types/index.ts';

interface RecentSummariesFeedProps {
  summaries: { summary: Summary; meeting?: Meeting }[];
}

export const RecentSummariesFeed: React.FC<RecentSummariesFeedProps> = ({ summaries }) => {
  const [expandedId, setExpandedId] = useState<string | null>(summaries[0]?.summary.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySummaryText = (item: { summary: Summary; meeting?: Meeting }) => {
    const text = `Meeting: ${item.meeting?.title || 'Meeting Summary'}
Executive Summary:
${item.summary.summaryText}

Key Points:
${item.summary.keyPoints.map(p => `• ${p}`).join('\n')}

Decisions:
${item.summary.decisions.map(d => `✓ ${d}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.summary.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/70 backdrop-blur-md border border-slate-800/80 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Recent Meeting Summaries</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300">
                AI Extracted
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Structured briefs, key discussions &amp; actionable decisions</p>
          </div>
        </div>

        <span className="text-xs text-slate-400">
          {summaries.length} available
        </span>
      </div>

      {/* Feed List */}
      <div className="space-y-3.5">
        {summaries.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No meeting summaries generated yet. Once a meeting concludes, its AI summary will appear here.</p>
          </div>
        ) : (
          summaries.map((item) => {
            const isExpanded = expandedId === item.summary.id;
            const isCopied = copiedId === item.summary.id;

            return (
              <div
                key={item.summary.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3"
              >
                {/* Meeting Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      <span>{item.meeting?.title || 'Council Meeting Summary'}</span>
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {item.meeting?.scheduledAt
                          ? new Date(item.meeting.scheduledAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Recent'}
                      </span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-medium">Delivered to participants</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => copySummaryText(item)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                      title="Copy full summary"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.summary.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'Expand full summary'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Executive Summary Brief */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  {item.summary.summaryText}
                </p>

                {/* Key Points & Decisions (Always or Expanded) */}
                <div className="space-y-2 pt-1">
                  {/* Key Points Snippet */}
                  {item.summary.keyPoints && item.summary.keyPoints.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-indigo-400" /> Key Discussion Points:
                      </span>
                      <ul className="text-xs text-slate-300 space-y-1 pl-1">
                        {(isExpanded ? item.summary.keyPoints : item.summary.keyPoints.slice(0, 2)).map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Decisions Extracted */}
                  {item.summary.decisions && item.summary.decisions.length > 0 && isExpanded && (
                    <div className="space-y-1 pt-2 border-t border-slate-800/60">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Formal Decisions Made:
                      </span>
                      <ul className="text-xs text-slate-300 space-y-1 pl-1">
                        {item.summary.decisions.map((decision, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                            <span>{decision}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Share Link Preview */}
                {item.meeting?.shareToken && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Public Guest Link Available</span>
                    <span className="text-indigo-400 font-mono text-[10px]">
                      Token: {item.meeting.shareToken.substring(0, 12)}...
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
