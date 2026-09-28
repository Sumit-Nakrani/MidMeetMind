import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Plus,
  Play,
  CheckCircle2
} from 'lucide-react';
import { Meeting } from '../../types/index.ts';

interface UpcomingMeetingsListProps {
  meetings: Meeting[];
  onOpenScheduleModal: () => void;
}

export const UpcomingMeetingsList: React.FC<UpcomingMeetingsListProps> = ({
  meetings,
  onOpenScheduleModal
}) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  const now = Date.now();

  const filteredMeetings = meetings.filter(m => {
    const meetTime = new Date(m.scheduledAt).getTime();
    if (filter === 'today') {
      const today = new Date();
      const d = new Date(m.scheduledAt);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    }
    if (filter === 'upcoming') {
      return meetTime >= now || m.status === 'scheduled';
    }
    return true;
  });

  const formatScheduledTime = (iso: string) => {
    const d = new Date(iso);
    const diffHours = (d.getTime() - now) / (1000 * 60 * 60);

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let relativeBadge = '';
    let badgeColor = 'bg-slate-800 text-slate-300';

    if (diffHours < 0 && diffHours > -2) {
      relativeBadge = 'Happening Now';
      badgeColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse';
    } else if (diffHours >= 0 && diffHours <= 3) {
      relativeBadge = `In ${Math.ceil(diffHours)}h`;
      badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    } else if (diffHours > 3 && diffHours <= 24) {
      relativeBadge = 'Tomorrow';
      badgeColor = 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    } else {
      relativeBadge = dateStr;
      badgeColor = 'bg-slate-800 text-slate-400 border border-slate-700';
    }

    return { timeStr, dateStr, relativeBadge, badgeColor };
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/70 backdrop-blur-md border border-slate-800/80 shadow-xl space-y-4">
      {/* Header with Title and "Schedule New Meeting" CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Upcoming Meetings</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                {meetings.filter(m => m.status === 'scheduled').length} Scheduled
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Scoped to your active organization</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div className="flex p-0.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('today')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === 'today'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setFilter('upcoming')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filter === 'upcoming'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Upcoming
            </button>
          </div>

          {/* Schedule button */}
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* Meetings List */}
      <div className="space-y-3">
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-3">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-300">No scheduled meetings</h4>
              <p className="text-[11px] text-slate-500">Plan a new sync and MidMeetMind will record, transcribe and summarize it.</p>
            </div>
            <button
              type="button"
              onClick={onOpenScheduleModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule First Meeting</span>
            </button>
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            const timeInfo = formatScheduledTime(meeting.scheduledAt);
            const isCompleted = meeting.status === 'completed';

            return (
              <div
                key={meeting.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Meeting Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${timeInfo.badgeColor}`}>
                      {timeInfo.relativeBadge}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {timeInfo.dateStr} at {timeInfo.timeStr}
                    </span>
                    {isCompleted && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                        Completed
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-white tracking-tight leading-snug">
                    {meeting.title}
                  </h4>

                  {meeting.agenda && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {meeting.agenda}
                    </p>
                  )}

                  {/* Attendees & Recording Indicator */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{meeting.participants?.length || 1} Participants</span>
                    </span>

                    {meeting.recordingUrl && (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Video className="w-3.5 h-3.5" />
                        <span>Recording Attached</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {!isCompleted ? (
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Join / Start</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Summary Ready</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
