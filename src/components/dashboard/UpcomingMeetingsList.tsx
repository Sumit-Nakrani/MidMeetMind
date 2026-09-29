import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Users,
  ExternalLink,
  Plus,
  Play,
  Copy,
  Check,
  MoreVertical,
  Search,
  X,
  Loader2,
  Cpu
} from 'lucide-react';
import { Meeting } from '../../types/index.ts';

interface UpcomingMeetingsListProps {
  meetings: Meeting[];
  onOpenScheduleModal: () => void;
  onStartMeeting?: (meeting: Meeting) => void;
  onViewAll?: () => void;
  onOpenMeetingDetail?: (meeting: Meeting) => void;
  onOpenProcessingStatus?: (meeting: Meeting) => void;
}

export const UpcomingMeetingsList: React.FC<UpcomingMeetingsListProps> = ({
  meetings,
  onOpenScheduleModal,
  onStartMeeting,
  onViewAll,
  onOpenMeetingDetail,
  onOpenProcessingStatus
}) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const now = Date.now();

  const getOrganizerName = (m: Meeting): string => {
    const orgPart = m.participants?.find(p => p.role === 'organizer' || p.userId === m.organizerId);
    if (orgPart?.name) return orgPart.name;
    if (m.organizerId === 'admin-organizer') return 'Dr. Priya Sharma';
    if (m.organizerId === 'prof-ananya') return 'Prof. Ananya Sen';
    if (m.organizerId === 'demo-member-uid') return 'Rahul Verma';
    return 'Workspace Organizer';
  };

  const filteredMeetings = meetings.filter(m => {
    // Search query filter: check title and organizer name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = m.title.toLowerCase().includes(q);
      const orgName = getOrganizerName(m).toLowerCase();
      const organizerMatch = orgName.includes(q);
      const agendaMatch = m.agenda?.toLowerCase().includes(q) || false;

      if (!titleMatch && !organizerMatch && !agendaMatch) {
        return false;
      }
    }

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

  const copyMeetingLink = (m: Meeting) => {
    const link = `${window.location.origin}/?meet=${encodeURIComponent(m.id)}`;
    navigator.clipboard.writeText(link);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Video className="w-4 h-4 text-slate-700" />
            Scheduled Conferences &amp; Meetings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Join active video rooms or manage scheduled organizer sessions
          </p>
        </div>

        {/* Filter Controls & Schedule Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({meetings.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('today')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filter === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filter === 'upcoming' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming
            </button>
          </div>

          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline px-2 py-1"
            >
              View All →
            </button>
          )}

          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* Search Bar for Dashboard Meetings Section */}
      <div className="px-5 py-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title or organizer name..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchQuery && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Found <strong>{filteredMeetings.length}</strong> matching {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}</span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Meetings List */}
      <div className="divide-y divide-slate-100">
        {filteredMeetings.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {searchQuery ? `No meetings match "${searchQuery}"` : 'No meetings found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching with a different meeting title or organizer name.'
                : 'There are no upcoming meetings scheduled under this filter. You can schedule one now.'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
              <button
                type="button"
                onClick={onOpenScheduleModal}
                className="px-4 py-2 rounded-lg bg-[#FFE900] text-slate-950 font-bold text-xs hover:bg-[#F5DE00] transition-colors"
              >
                + Schedule a Meeting
              </button>
            </div>
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            const dateObj = new Date(meeting.scheduledAt);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const organizerName = getOrganizerName(meeting);
            const isLive = meeting.status === 'in_progress';

            return (
              <div
                key={meeting.id}
                className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Time & Details */}
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {dateObj.toLocaleDateString([], { month: 'short' })}
                    </span>
                    <span className="text-lg font-black text-slate-900 leading-tight">
                      {dateObj.getDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => onOpenMeetingDetail && onOpenMeetingDetail(meeting)}
                        className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Click to view meeting details & agenda"
                      >
                        {meeting.title}
                      </h3>
                      {isLive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFE900] text-slate-950">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                          IN PROGRESS
                        </span>
                      )}
                      {meeting.status === 'processing' && (
                        <button
                          type="button"
                          onClick={() => onOpenProcessingStatus && onOpenProcessingStatus(meeting)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer"
                          title="Click to view live AI pipeline processing status"
                        >
                          <Loader2 className="w-3 h-3 animate-spin text-amber-700" />
                          <span>AI PROCESSING</span>
                        </button>
                      )}
                    </div>

                    {/* Metadata line with organizer name and typographic separators */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="font-semibold text-slate-700">{timeStr}</span>
                      <span aria-hidden="true">·</span>
                      <span>{dateStr}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-600 font-medium">
                        Organizer: <strong className="text-slate-800 font-semibold">{organizerName}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-slate-400">ID: {meeting.id.substring(0, 10)}</span>
                    </div>

                    {meeting.agenda && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-1">
                        {meeting.agenda}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Details + Start / Join + Copy Link */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onOpenMeetingDetail && onOpenMeetingDetail(meeting)}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    title="View details, agenda, and participants"
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={() => copyMeetingLink(meeting)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Copy Meeting Link"
                  >
                    {copiedId === meeting.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {meeting.status === 'processing' ? (
                    <button
                      type="button"
                      onClick={() => onOpenProcessingStatus && onOpenProcessingStatus(meeting)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      title="View live AI pipeline progress"
                    >
                      <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                      <span>View AI Status</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartMeeting && onStartMeeting(meeting)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{isLive ? 'Join Meeting' : 'Start Meeting'}</span>
                    </button>
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
