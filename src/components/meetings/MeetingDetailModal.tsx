import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Users,
  User,
  FileText,
  Play,
  Copy,
  Check,
  Edit3,
  Trash2,
  ExternalLink,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Link as LinkIcon,
  Shield,
  Save,
  Volume2,
  Upload
} from 'lucide-react';
import { Meeting, MeetingParticipant, Summary } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { updateMeetingDetails, cancelMeeting } from '../../lib/meetingService.ts';

interface MeetingDetailModalProps {
  isOpen: boolean;
  meeting: Meeting | null;
  summary?: Summary | null;
  onClose: () => void;
  onStartMeeting?: (meeting: Meeting) => void;
  onViewSummary?: (meeting: Meeting) => void;
  onViewTranscript?: (meeting: Meeting) => void;
  onMeetingUpdated?: (updatedMeeting: Meeting) => void;
  onMeetingCancelled?: (meetingId: string) => void;
  onOpenUploadRecording?: (meeting: Meeting) => void;
}

export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  isOpen,
  meeting,
  summary,
  onClose,
  onStartMeeting,
  onViewSummary,
  onViewTranscript,
  onMeetingUpdated,
  onMeetingCancelled,
  onOpenUploadRecording
}) => {
  const { profile } = useAuth();

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAgenda, setEditAgenda] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editRecordingUrl, setEditRecordingUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Participant adding state
  const [newPartName, setNewPartName] = useState('');
  const [newPartEmail, setNewPartEmail] = useState('');
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // Copy feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !meeting) return null;

  // Initialize edit fields when opening edit mode
  const handleStartEdit = () => {
    setEditTitle(meeting.title);
    setEditAgenda(meeting.agenda || '');
    // Convert ISO to datetime-local format
    const d = new Date(meeting.scheduledAt);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditScheduledAt(localIso);
    setEditRecordingUrl(meeting.recordingUrl || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<Meeting> = {
        title: editTitle.trim() || meeting.title,
        agenda: editAgenda.trim(),
        scheduledAt: editScheduledAt ? new Date(editScheduledAt).toISOString() : meeting.scheduledAt,
        recordingUrl: editRecordingUrl.trim()
      };

      await updateMeetingDetails(meeting.id, updates);

      const updatedMeeting: Meeting = {
        ...meeting,
        ...updates
      };

      if (onMeetingUpdated) {
        onMeetingUpdated(updatedMeeting);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save meeting updates:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelMeetingConfirm = async () => {
    setIsCancelling(true);
    try {
      await cancelMeeting(meeting.id);
      if (onMeetingCancelled) {
        onMeetingCancelled(meeting.id);
      }
      setShowCancelConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to cancel meeting:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  // Toggle participant attendance
  const toggleAttendance = async (userId: string) => {
    const updatedParticipants = meeting.participants.map(p => {
      if (p.userId === userId) {
        return { ...p, attended: !p.attended };
      }
      return p;
    });

    try {
      await updateMeetingDetails(meeting.id, { participants: updatedParticipants });
      if (onMeetingUpdated) {
        onMeetingUpdated({ ...meeting, participants: updatedParticipants });
      }
    } catch (err) {
      console.error('Failed to update attendance:', err);
    }
  };

  // Add participant
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartEmail.trim()) return;

    const newPart: MeetingParticipant = {
      userId: `user-${Date.now()}`,
      name: newPartName.trim() || newPartEmail.split('@')[0],
      email: newPartEmail.trim().toLowerCase(),
      attended: false,
      role: 'participant'
    };

    const updatedParticipants = [...(meeting.participants || []), newPart];

    try {
      await updateMeetingDetails(meeting.id, { participants: updatedParticipants });
      if (onMeetingUpdated) {
        onMeetingUpdated({ ...meeting, participants: updatedParticipants });
      }
      setNewPartName('');
      setNewPartEmail('');
      setShowAddParticipant(false);
    } catch (err) {
      console.error('Failed to add participant:', err);
    }
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/meet/${meeting.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meeting.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Check if current user is organizer or admin
  const isOrganizer =
    (profile && profile.id === meeting.organizerId) ||
    meeting.organizerId === 'admin-organizer' ||
    profile?.role === 'admin';

  const dateObj = new Date(meeting.scheduledAt);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const isCompleted = meeting.status === 'completed';
  const isProcessing = meeting.status === 'processing';
  const isLive = meeting.status === 'in_progress';
  const isScheduled = meeting.status === 'scheduled';
  const isCancelled = (meeting.status as string) === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* ======================================================== */}
        {/* Header Bar */}
        {/* ======================================================== */}
        <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FFE900] text-slate-950 font-black flex items-center justify-center text-base shrink-0 shadow-xs">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Meeting Overview &amp; Context
                </span>

                {/* Status Badges */}
                {isCompleted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed &amp; Processed
                  </span>
                )}
                {isProcessing && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing Transcripts
                  </span>
                )}
                {isLive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFE900] text-slate-950 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                    Live Now
                  </span>
                )}
                {isScheduled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Scheduled
                  </span>
                )}
                {isCancelled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                    Cancelled
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                {meeting.title}
              </h2>
            </div>
          </div>

          {/* Organizer action buttons (Edit & Close) */}
          <div className="flex items-center gap-2 shrink-0">
            {isOrganizer && !isEditing && !isCancelled && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                title="Edit meeting details"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Content Body (Scrollable) */}
        {/* ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Cancel Confirmation Prompt */}
          {showCancelConfirm && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Are you sure you want to cancel this meeting?</p>
                  <p className="text-red-700 mt-0.5">
                    Participants will be notified and this session will be marked as cancelled.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Keep Meeting
                </button>
                <button
                  type="button"
                  onClick={handleCancelMeetingConfirm}
                  disabled={isCancelling}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* EDIT FORM (If organizer toggled Edit Mode) */}
          {isEditing ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Meeting Details</span>
                </h3>
                <span className="text-[11px] text-slate-500">Organizer Mode</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meeting Agenda &amp; Discussion Goals
                </label>
                <textarea
                  rows={3}
                  value={editAgenda}
                  onChange={(e) => setEditAgenda(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-500 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scheduled Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recording URL / Media Link
                  </label>
                  <input
                    type="url"
                    value={editRecordingUrl}
                    onChange={(e) => setEditRecordingUrl(e.target.value)}
                    placeholder="https://storage.googleapis.com/...mp4"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Updates'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* VIEW MODE: Meeting Overview Banner */
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Date Badge */}
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center text-center shrink-0 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {dateObj.toLocaleDateString([], { month: 'short' })}
                  </span>
                  <span className="text-xl font-black text-slate-950 leading-none">
                    {dateObj.getDate()}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dateStr}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{timeStr}</span>
                  </div>

                  {/* ID and Copy link */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-slate-500">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                      ID: {meeting.id}
                    </span>
                    <button
                      type="button"
                      onClick={copyMeetingId}
                      className="text-slate-500 hover:text-slate-900 transition-colors"
                      title="Copy ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={copyMeetingLink}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-950 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Shareable Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Start / Join Live Meeting Button */}
              {!isCancelled && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onStartMeeting && onStartMeeting(meeting)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{isLive ? 'Join Live Conference' : 'Start Room Now'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* Key Functionality 1: Agenda Display */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Meeting Agenda &amp; Discussion Scope</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
              {meeting.agenda ? (
                <p className="whitespace-pre-wrap">{meeting.agenda}</p>
              ) : (
                <p className="text-slate-400 italic">No specific agenda provided for this meeting session.</p>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* Key Functionality 2: Participant List with Attendance Status */}
          {/* ======================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Participants ({meeting.participants?.length || 0})</span>
              </h3>

              {isOrganizer && !isCancelled && (
                <button
                  type="button"
                  onClick={() => setShowAddParticipant(!showAddParticipant)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Invitee</span>
                </button>
              )}
            </div>

            {/* Add Invitee Inline Form */}
            {showAddParticipant && (
              <form onSubmit={handleAddParticipant} className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Participant Name (e.g. Dr. Verma)"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none"
                />
                <input
                  type="email"
                  placeholder="email@organization.edu"
                  required
                  value={newPartEmail}
                  onChange={(e) => setNewPartEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Invite
                </button>
              </form>
            )}

            {/* Participants Table/List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {(meeting.participants || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No participants registered yet.
                </div>
              ) : (
                meeting.participants.map((part) => {
                  const isPartOrganizer = part.role === 'organizer' || part.userId === meeting.organizerId;

                  return (
                    <div
                      key={part.userId}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {part.name ? part.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {part.name || 'Workspace Member'}
                            </span>
                            {isPartOrganizer && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFE900] text-slate-950">
                                Organizer
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {part.email || 'No email provided'}
                          </p>
                        </div>
                      </div>

                      {/* Attendance Status & Toggle */}
                      <div className="flex items-center gap-2 shrink-0">
                        {part.attended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Attended</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{isCompleted ? 'Absent' : 'Invited'}</span>
                          </span>
                        )}

                        {/* Interactive toggle if organizer */}
                        {isOrganizer && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => toggleAttendance(part.userId)}
                            className="text-[10px] font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title="Toggle attendance status"
                          >
                            Mark {part.attended ? 'Absent' : 'Present'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* Key Functionality 3: Recording Link Field & Preview */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-slate-500" />
              <span>Meeting Recording &amp; Media Storage</span>
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-700 flex-1 min-w-0">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] truncate text-slate-600">
                    {meeting.recordingUrl || 'No external recording attached yet.'}
                  </span>
                </div>

                {/* Action buttons (Copy, Open, and Upload Recording) */}
                <div className="flex items-center gap-2 flex-wrap">
                  {meeting.recordingUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(meeting.recordingUrl || '');
                          alert('Recording URL copied to clipboard');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy URL</span>
                      </button>
                      <a
                        href={meeting.recordingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Media</span>
                      </a>
                    </>
                  )}

                  {isOrganizer && !isCancelled && onOpenUploadRecording && (
                    <button
                      type="button"
                      onClick={() => onOpenUploadRecording(meeting)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Upload recorded audio/video file for AI transcription and summarization"
                    >
                      <Upload className="w-3 h-3 text-indigo-600" />
                      <span>{meeting.recordingUrl ? 'Replace Recording' : 'Upload Recording'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* In-line media preview player if URL is provided */}
              {meeting.recordingUrl && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Volume2 className="w-4 h-4 text-slate-500" />
                    <span>Embedded Session Audio Player</span>
                  </div>
                  <audio src={meeting.recordingUrl} controls className="h-8 max-w-xs" />
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* Key Functionality 4: "View Summary" and "View Transcript" Buttons Once Ready */}
          {/* ======================================================== */}
          <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Meeting Intelligence Artifacts</span>
              </h4>
              <p className="text-xs text-indigo-800/80 mt-0.5 max-w-md">
                {isCompleted
                  ? 'Meeting notes, key decisions, action deliverables, and speaker transcripts are ready for review.'
                  : isProcessing
                  ? 'AI is analyzing transcripts and extracting action items. Ready in seconds.'
                  : 'Executive summaries and verbatim transcripts will be automatically generated once this meeting concludes.'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* View Summary Button */}
              <button
                type="button"
                onClick={() => onViewSummary && onViewSummary(meeting)}
                disabled={!isCompleted && !summary}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                  isCompleted || summary
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#FFE900]" />
                <span>View Summary</span>
              </button>

              {/* View Transcript Button */}
              <button
                type="button"
                onClick={() => onViewTranscript && onViewTranscript(meeting)}
                disabled={!isCompleted && !summary}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isCompleted || summary
                    ? 'border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>View Transcript</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Footer Bar */}
        {/* ======================================================== */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            {isOrganizer && !isCancelled && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel Meeting</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
