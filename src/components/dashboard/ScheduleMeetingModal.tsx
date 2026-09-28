import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Calendar,
  Clock,
  FileText,
  Users,
  Video,
  X,
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
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
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
      setError('Please provide a meeting title.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const orgId = organization?.id || 'org-apex-college';
      const created = await scheduleMeeting({
        title: title.trim(),
        organizationId: orgId,
        organizerId: profile?.id || 'admin',
        scheduledAt: new Date(scheduledDate).toISOString(),
        agenda: agenda.trim() || undefined,
        recordingUrl: recordingUrl.trim() || undefined,
        participants: participants.map(email => ({
          userId: email,
          name: email.split('@')[0],
          email: email,
          role: 'participant',
          attended: false
        }))
      });

      onMeetingScheduled(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule meeting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFE900] text-slate-950 font-bold flex items-center justify-center text-sm">
              G
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Schedule a Meeting
              </h3>
              <p className="text-xs text-slate-500">
                Plan a video conference with automatic AI recording &amp; transcript
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Executive Sprint Review"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 outline-none focus:border-slate-500 text-slate-900 bg-white"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Scheduled Date &amp; Time *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 text-slate-900 bg-white"
            />
          </div>

          {/* Agenda */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agenda &amp; Discussion Topics (Optional)
            </label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Review quarterly KPIs&#10;2. Architecture updates&#10;3. Assign deliverables"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 text-slate-900 bg-white"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invite Attendees (Email Addresses)
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
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 text-slate-900 bg-white"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors"
              >
                Add
              </button>
            </div>

            {/* List of added participants */}
            <div className="flex flex-wrap gap-1.5">
              {participants.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(email)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {submitting ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
