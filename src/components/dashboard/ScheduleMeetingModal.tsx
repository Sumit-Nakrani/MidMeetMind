import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  Video,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { scheduleMeeting } from '../../lib/meetingService.ts';
import { Meeting } from '../../types/index.ts';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingScheduled: (meeting: Meeting) => void;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  onMeetingScheduled
}) => {
  const { profile, organization } = useAuth();

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    // Default to tomorrow 10:00 AM in local timezone format for input[type=datetime-local]
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [agenda, setAgenda] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState<string[]>([
    'organizer@apex.edu',
    'student.rahul@apex.edu'
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddParticipant = () => {
    const email = participantInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid participant email address.');
      return;
    }
    if (participants.includes(email)) {
      setError('Participant is already added.');
      return;
    }
    setParticipants([...participants, email]);
    setParticipantInput('');
    setError(null);
  };

  const handleRemoveParticipant = (email: string) => {
    setParticipants(participants.filter(p => p !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting title is required.');
      return;
    }
    if (!scheduledDate) {
      setError('Scheduled date & time is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const scheduledIso = new Date(scheduledDate).toISOString();
      const participantObjects = participants.map(email => ({
        userId: email.split('@')[0],
        name: email.split('@')[0].replace('.', ' '),
        email,
        attended: false
      }));

      // Add organizer as attendee
      if (profile?.email && !participants.includes(profile.email)) {
        participantObjects.unshift({
          userId: profile.id,
          name: profile.name,
          email: profile.email,
          attended: true
        });
      }

      const newMeeting = await scheduleMeeting({
        title: title.trim(),
        organizerId: profile?.id || 'organizer',
        organizationId: organization?.id || 'org-apex-college',
        scheduledAt: scheduledIso,
        agenda: agenda.trim(),
        recordingUrl: recordingUrl.trim(),
        participants: participantObjects
      });

      onMeetingScheduled(newMeeting);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8 animate-fadeIn">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Schedule New Meeting</h3>
            <p className="text-xs text-slate-400">
              For <strong>{organization?.name || 'Organization'}</strong> workspace
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI Curriculum Committee Review, Q3 Product Sprint"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Scheduled Date &amp; Time <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-sm outline-none transition-all"
              />
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Agenda &amp; Objectives
            </label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Topics to discuss, expected outcomes, key questions..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs placeholder-slate-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Invite Participants (Email Addresses)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                placeholder="colleague@apex.edu"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Participant Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {participants.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(email)}
                    className="text-indigo-400 hover:text-rose-400 ml-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Recording Link (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Video / Audio Recording Link (Optional)
            </label>
            <input
              type="url"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              placeholder="e.g. Zoom cloud link, Google Meet recording or Drive URL"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs placeholder-slate-500 outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              AI will transcribe and summarize this recording once the meeting concludes.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Confirm Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
