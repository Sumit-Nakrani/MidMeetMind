import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Users,
  Search,
  Filter,
  Plus,
  Play,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  User,
  ArrowUpDown,
  X,
  Share2,
  ChevronDown
} from 'lucide-react';
import { Meeting, MeetingStatus, Summary } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface MyMeetingsScreenProps {
  meetings: Meeting[];
  onOpenScheduleModal: () => void;
  onStartMeeting: (meeting: Meeting) => void;
  onViewSummary?: (meeting: Meeting) => void;
  onViewTranscript?: (meeting: Meeting) => void;
  onOpenMeetingDetail?: (meeting: Meeting) => void;
  onOpenProcessingStatus?: (meeting: Meeting) => void;
}

export const MyMeetingsScreen: React.FC<MyMeetingsScreenProps> = ({
  meetings,
  onOpenScheduleModal,
  onStartMeeting,
  onViewSummary,
  onViewTranscript,
  onOpenMeetingDetail,
  onOpenProcessingStatus
}) => {
  const { profile } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MeetingStatus>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past' | 'this_week'>('all');
  const [organizerFilter, setOrganizerFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to extract organizer display name
  const getOrganizerName = (m: Meeting): string => {
    // If current user is organizer
    if (profile && (m.organizerId === profile.id || m.organizerId === 'admin-organizer' && profile.role === 'admin')) {
      return `${profile.name} (You)`;
    }
    // Try to find in participants with role 'organizer'
    const orgPart = m.participants.find(p => p.role === 'organizer' || p.userId === m.organizerId);
    if (orgPart?.name) return orgPart.name;
    if (m.organizerId === 'admin-organizer') return 'Dr. Priya Sharma';
    if (m.organizerId === 'prof-ananya') return 'Prof. Ananya Sen';
    if (m.organizerId === 'demo-member-uid') return 'Rahul Verma';
    return 'Workspace Organizer';
  };

  // Distinct list of organizers for the dropdown
  const uniqueOrganizers = useMemo(() => {
    const map = new Map<string, string>();
    meetings.forEach(m => {
      const name = getOrganizerName(m);
      map.set(name, name);
    });
    return Array.from(map.values());
  }, [meetings, profile]);

  // Filtered & Searched Meetings
  const filteredMeetings = useMemo(() => {
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

    return meetings.filter(meeting => {
      // 1. Search Query (Title, agenda, ID, organizer, participants)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const orgName = getOrganizerName(meeting).toLowerCase();
        const titleMatch = meeting.title.toLowerCase().includes(query);
        const agendaMatch = meeting.agenda?.toLowerCase().includes(query) || false;
        const idMatch = meeting.id.toLowerCase().includes(query);
        const orgMatch = orgName.includes(query);
        const partMatch = meeting.participants.some(p =>
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.email && p.email.toLowerCase().includes(query))
        );

        if (!titleMatch && !agendaMatch && !idMatch && !orgMatch && !partMatch) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (meeting.status !== statusFilter) {
          return false;
        }
      }

      // 3. Date Filter
      const meetTime = new Date(meeting.scheduledAt).getTime();
      const meetDate = new Date(meeting.scheduledAt);

      if (dateFilter === 'today') {
        if (meetTime < today.getTime() || meetTime > endOfToday.getTime()) {
          return false;
        }
      } else if (dateFilter === 'upcoming') {
        if (meetTime < now && meeting.status !== 'scheduled' && meeting.status !== 'in_progress') {
          return false;
        }
      } else if (dateFilter === 'past') {
        if (meetTime >= now && meeting.status !== 'completed') {
          return false;
        }
      } else if (dateFilter === 'this_week') {
        if (meetTime < today.getTime() || meetTime > endOfWeek.getTime()) {
          return false;
        }
      }

      // 4. Organizer Filter
      if (organizerFilter !== 'all') {
        const orgName = getOrganizerName(meeting);
        if (organizerFilter === 'me') {
          if (!orgName.includes('(You)')) return false;
        } else if (organizerFilter === 'others') {
          if (orgName.includes('(You)')) return false;
        } else if (orgName !== organizerFilter) {
          return false;
        }
      }

      return true;
    });
  }, [meetings, searchQuery, statusFilter, dateFilter, organizerFilter, profile]);

  // Counts for tabs
  const scheduledCount = meetings.filter(m => m.status === 'scheduled').length;
  const processingCount = meetings.filter(m => m.status === 'processing').length;
  const completedCount = meetings.filter(m => m.status === 'completed').length;
  const liveCount = meetings.filter(m => m.status === 'in_progress').length;

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || dateFilter !== 'all' || organizerFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFilter('all');
    setOrganizerFilter('all');
  };

  const copyMeetingLink = (m: Meeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const link = `${window.location.origin}/meet/${m.id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER SECTION (Clean GoTo SaaS Visuals) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Meetings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {meetings.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            List view of every upcoming, processing, and past conference meeting you are part of.
          </p>
        </div>

        {/* Action: Schedule Session Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenScheduleModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SEARCH & FILTER CONTROLS BAR */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Search Bar + Filter Dropdowns */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings by title, agenda, organizer, participant..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdown 1: Date Filter */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                aria-label="Filter meetings by date"
                className="w-full pl-8.5 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer appearance-none hover:bg-slate-100 transition-colors"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="this_week">This Week</option>
                <option value="past">Past Meetings</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Filter Dropdown 2: Organizer Filter */}
            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <select
                value={organizerFilter}
                onChange={(e) => setOrganizerFilter(e.target.value)}
                aria-label="Filter meetings by organizer"
                className="w-full pl-8.5 pr-8 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer appearance-none hover:bg-slate-100 transition-colors"
              >
                <option value="all">All Organizers</option>
                <option value="me">Organized by Me</option>
                <option value="others">Organized by Others</option>
                {uniqueOrganizers.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Status Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {/* Tab: All */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              All ({meetings.length})
            </button>

            {/* Tab: Scheduled */}
            <button
              type="button"
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'scheduled'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Scheduled ({scheduledCount})</span>
            </button>

            {/* Tab: Processing */}
            <button
              type="button"
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'processing'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Processing ({processingCount})</span>
            </button>

            {/* Tab: Completed */}
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'completed'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Completed ({completedCount})</span>
            </button>

            {/* Tab: Live In Progress (if any) */}
            {liveCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'in_progress'
                    ? 'bg-[#FFE900] text-slate-950 shadow-xs'
                    : 'text-amber-800 hover:text-amber-950'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                <span>Live Now ({liveCount})</span>
              </button>
            )}
          </div>

          {/* Reset Filters Link */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MEETING CARDS LIST (Key Component of Screen 5) */}
      {/* ======================================================== */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No meetings match your criteria</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Try adjusting your search keywords, status filter, or organizer selection to see results.'
              : 'You do not have any meetings registered under this workspace yet.'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
            <button
              type="button"
              onClick={onOpenScheduleModal}
              className="px-4 py-2 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              + Schedule a Meeting
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => {
            const dateObj = new Date(meeting.scheduledAt);
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const organizerName = getOrganizerName(meeting);
            const isLive = meeting.status === 'in_progress';
            const isProcessing = meeting.status === 'processing';
            const isCompleted = meeting.status === 'completed';
            const isScheduled = meeting.status === 'scheduled';

            return (
              <div
                key={meeting.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
              >
                {/* Left: Date Badge + Title + Details */}
                <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
                  {/* GoTo Calendar Date Badge */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0 shadow-2xs group-hover:bg-slate-100 transition-colors">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      {dateObj.toLocaleDateString([], { month: 'short' })}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-950 leading-none mt-0.5">
                      {dateObj.getDate()}
                    </span>
                  </div>

                  {/* Meeting Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3
                        onClick={() => onOpenMeetingDetail && onOpenMeetingDetail(meeting)}
                        className="text-base sm:text-lg font-bold text-slate-950 tracking-tight leading-snug hover:text-blue-600 transition-colors cursor-pointer"
                        title="Click to view full meeting context & details"
                      >
                        {meeting.title}
                      </h3>

                      {/* Status Tag (Scheduled / Processing / Completed / Live) */}
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#FFE900] text-slate-950 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                          LIVE NOW
                        </span>
                      )}

                      {isScheduled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          Scheduled
                        </span>
                      )}

                      {isProcessing && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                          Processing Notes &amp; Transcripts
                        </span>
                      )}

                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Completed &amp; Summarized
                        </span>
                      )}
                    </div>

                    {/* Metadata Line: Date, Time, Organizer, Participant Count */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                      <div className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{timeStr}</span>
                        <span className="text-slate-400 font-normal">({dateStr})</span>
                      </div>

                      <span aria-hidden="true" className="text-slate-300">·</span>

                      {/* Organizer tag */}
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center">
                          {organizerName.charAt(0)}
                        </div>
                        <span>Organizer: <strong className="text-slate-900 font-semibold">{organizerName}</strong></span>
                      </div>

                      <span aria-hidden="true" className="text-slate-300">·</span>

                      {/* Participant Count */}
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{meeting.participants?.length || 1} Participants</span>
                      </div>
                    </div>

                    {/* Agenda Snippet */}
                    {meeting.agenda && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-700 font-semibold">Agenda:</strong> {meeting.agenda}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 w-full lg:w-auto justify-end">
                  {/* View Details Button */}
                  <button
                    type="button"
                    onClick={() => onOpenMeetingDetail && onOpenMeetingDetail(meeting)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    title="View full meeting context, agenda, participants & recording"
                  >
                    Details
                  </button>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={(e) => copyMeetingLink(meeting, e)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Copy Meeting Link"
                  >
                    {copiedId === meeting.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {/* Primary Action Button Based on Status */}
                  {isLive && (
                    <button
                      type="button"
                      onClick={() => onStartMeeting(meeting)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Join Live Meeting</span>
                    </button>
                  )}

                  {isScheduled && (
                    <button
                      type="button"
                      onClick={() => onStartMeeting(meeting)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Start Room</span>
                    </button>
                  )}

                  {isProcessing && (
                    <button
                      type="button"
                      onClick={() => onOpenProcessingStatus && onOpenProcessingStatus(meeting)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Click to view live AI pipeline processing screen"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      <span>Live AI Pipeline...</span>
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => onViewSummary && onViewSummary(meeting)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#FFE900]" />
                      <span>View Summary &amp; Notes</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
