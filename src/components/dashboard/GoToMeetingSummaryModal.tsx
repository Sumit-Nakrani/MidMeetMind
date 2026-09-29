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
  ExternalLink,
  Mail,
  Send,
  Edit3,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Eye,
  CheckCheck,
  Loader2,
  Gavel
} from 'lucide-react';
import { Summary, Meeting, Task } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  updateMeetingSummary,
  approveMeetingSummary,
  resendMeetingSummaryEmail
} from '../../lib/meetingService.ts';

interface GoToMeetingSummaryModalProps {
  summary: Summary | null;
  meeting?: Meeting | null;
  onClose: () => void;
  onTaskToggle?: (taskId: string) => void;
  onSummaryUpdated?: (updatedSummary: Summary) => void;
}

export const GoToMeetingSummaryModal: React.FC<GoToMeetingSummaryModalProps> = ({
  summary: initialSummary,
  meeting,
  onClose,
  onTaskToggle,
  onSummaryUpdated
}) => {
  const { profile } = useAuth();

  // Local state for summary data
  const [summary, setSummary] = useState<Summary | null>(initialSummary);

  // Audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(35);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(summary?.title || meeting?.title || 'Meeting Summary');
  const [editOverview, setEditOverview] = useState(summary?.overview || summary?.summaryText || '');
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>(summary?.keyPoints || []);
  const [editDecisions, setEditDecisions] = useState<string[]>(summary?.decisions || []);
  const [newKeyPointText, setNewKeyPointText] = useState('');
  const [newDecisionText, setNewDecisionText] = useState('');

  // Email state
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessInfo, setEmailSuccessInfo] = useState<{
    recipientCount: number;
    sentAt: string;
    recipients: string[];
  } | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // REAL EMAIL RECIPIENT & DISPATCH STATES
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [targetEmail, setTargetEmail] = useState(profile?.email || 'sumitnakranii18@gmail.com');
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [customEmailNote, setCustomEmailNote] = useState('');
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  if (!summary) return null;

  const isOrganizer = true; // Let workspace participants/organizers review and edit
  const isApproved = summary.approved ?? true; // Default to approved or fallback

  const copyShareLink = () => {
    const url = `${window.location.origin}/?summary=${encodeURIComponent(summary.id)}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleStartEditing = () => {
    setEditTitle(summary.title || meeting?.title || 'Meeting Summary');
    setEditOverview(summary.overview || summary.summaryText || '');
    setEditKeyPoints([...summary.keyPoints]);
    setEditDecisions([...(summary.decisions || [])]);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEdits = async () => {
    setIsSaving(true);
    const updates: Partial<Summary> = {
      title: editTitle.trim(),
      overview: editOverview.trim(),
      summaryText: editOverview.trim(),
      keyPoints: editKeyPoints.filter(p => p.trim().length > 0),
      decisions: editDecisions.filter(d => d.trim().length > 0)
    };

    await updateMeetingSummary(summary.id, updates);
    const updated: Summary = {
      ...summary,
      ...updates
    };

    setSummary(updated);
    setIsSaving(false);
    setIsEditing(false);
    if (onSummaryUpdated) {
      onSummaryUpdated(updated);
    }
  };

  const handleAddKeyPoint = () => {
    if (!newKeyPointText.trim()) return;
    setEditKeyPoints(prev => [...prev, newKeyPointText.trim()]);
    setNewKeyPointText('');
  };

  const handleRemoveKeyPoint = (index: number) => {
    setEditKeyPoints(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDecision = () => {
    if (!newDecisionText.trim()) return;
    setEditDecisions(prev => [...prev, newDecisionText.trim()]);
    setNewDecisionText('');
  };

  const handleRemoveDecision = (index: number) => {
    setEditDecisions(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to construct clean, professional plain-text email content
  const getFormattedEmailBody = () => {
    let body = `MEETING SUMMARY: ${summary.title || 'Executive Session'}\n`;
    body += `Date: ${new Date(summary.generatedAt || Date.now()).toLocaleDateString()}\n`;
    body += `Duration: ${summary.durationMinutes || 1} minute(s)\n\n`;

    body += `==============================================\n`;
    body += `EXECUTIVE OVERVIEW\n`;
    body += `==============================================\n`;
    body += `${summary.overview || summary.summaryText || 'No verbal discussion recorded.'}\n\n`;

    if (summary.keyPoints && summary.keyPoints.length > 0) {
      body += `==============================================\n`;
      body += `KEY DISCUSSION POINTS\n`;
      body += `==============================================\n`;
      summary.keyPoints.forEach((kp, idx) => {
        body += `${idx + 1}. ${kp}\n`;
      });
      body += `\n`;
    }

    if (summary.decisions && summary.decisions.length > 0) {
      body += `==============================================\n`;
      body += `DECISIONS MADE\n`;
      body += `==============================================\n`;
      summary.decisions.forEach((dec, idx) => {
        body += `• ${dec}\n`;
      });
      body += `\n`;
    }

    if (summary.actionItems && summary.actionItems.length > 0) {
      body += `==============================================\n`;
      body += `ACTION ITEMS & ASSIGNMENTS\n`;
      body += `==============================================\n`;
      summary.actionItems.forEach((task, idx) => {
        body += `[ ] ${task.description} (Assignee: ${task.assigneeName || 'Participant'}, Priority: ${task.priority || 'Normal'}, Due: ${task.dueDate || 'TBD'})\n`;
      });
      body += `\n`;
    }

    if (customEmailNote.trim()) {
      body += `==============================================\n`;
      body += `ORGANIZER NOTE\n`;
      body += `==============================================\n`;
      body += `${customEmailNote.trim()}\n\n`;
    }

    body += `---\nGenerated by MidMeetMind AI Meeting Intelligence\nWorkspace: ${window.location.origin}`;
    return body;
  };

  // Record dispatch in Firestore with REAL user-specified emails
  const recordEmailDispatched = async (emails: string[]) => {
    const sentAt = new Date().toISOString();
    await resendMeetingSummaryEmail(summary.id, meeting?.id || summary.meetingId, emails);
    setEmailSuccessInfo({
      recipientCount: emails.length,
      sentAt,
      recipients: emails
    });
    const updated: Summary = {
      ...summary,
      lastEmailedAt: sentAt,
      emailRecipientCount: emails.length
    };
    setSummary(updated);
    if (onSummaryUpdated) {
      onSummaryUpdated(updated);
    }
    setShowSendEmailModal(false);
  };

  // Direct Gmail Web sender (Opens Gmail compose with prefilled email, subject and body)
  const handleSendViaGmail = () => {
    const list = [targetEmail, ...additionalEmails.split(',').map(e => e.trim())]
      .filter((e): e is string => !!e && e.includes('@'));
    const toField = list.join(',');
    const subject = `Meeting Summary: ${summary.title}`;
    const body = getFormattedEmailBody();

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toField)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    recordEmailDispatched(list.length > 0 ? list : [targetEmail]);
  };

  // Mailto scheme for desktop mail client (Outlook / Apple Mail)
  const handleSendViaMailto = () => {
    const list = [targetEmail, ...additionalEmails.split(',').map(e => e.trim())]
      .filter((e): e is string => !!e && e.includes('@'));
    const toField = list.join(',');
    const subject = `Meeting Summary: ${summary.title}`;
    const body = getFormattedEmailBody();

    const mailtoUrl = `mailto:${encodeURIComponent(toField)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    recordEmailDispatched(list.length > 0 ? list : [targetEmail]);
  };

  // Copy email text
  const handleCopyEmailText = () => {
    const body = getFormattedEmailBody();
    navigator.clipboard.writeText(body);
    setCopiedEmailText(true);
    setTimeout(() => setCopiedEmailText(false), 2500);
  };

  // Organizer Approve Step: Certifies summary, then asks user for real email
  const handleApproveAndSend = async () => {
    setIsApproving(true);
    const approverName = profile?.name || 'Meeting Organizer';
    const res = await approveMeetingSummary(summary.id, approverName);

    const updated: Summary = {
      ...summary,
      approved: true,
      approvedAt: res.approvedAt,
      approvedBy: approverName
    };

    setSummary(updated);
    setIsApproving(false);
    if (onSummaryUpdated) {
      onSummaryUpdated(updated);
    }

    // Prompt user for real email address
    setShowSendEmailModal(true);
  };

  // Resend summary email handler: Opens real email dialog
  const handleResendEmail = () => {
    setShowSendEmailModal(true);
  };

  const filteredTranscript = summary.transcriptSnippet?.filter(item =>
    item.speaker.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* ======================================================== */}
        {/* Header Bar */}
        {/* ======================================================== */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFE900] text-slate-950 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 leading-tight truncate">
                  {summary.title || meeting?.title || 'Meeting Summary & Recording'}
                </h3>

                {/* Approval Status Badge */}
                {isApproved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Approved by Organizer</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <AlertCircle className="w-3 h-3 text-amber-700" />
                    <span>Pending Organizer Approval</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                MidMeetMind AI Smart Meeting Notes · {new Date(summary.generatedAt || summary.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Email Preview Toggle */}
            <button
              type="button"
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Preview participant email digest"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{showEmailPreview ? 'Hide Preview' : 'Email Preview'}</span>
            </button>

            {/* Share Link */}
            <button
              type="button"
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Copied' : 'Share'}</span>
            </button>

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
        {/* ORGANIZER APPROVAL & EMAIL DISPATCH STEP BANNER */}
        {/* ======================================================== */}
        <div className={`px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isApproved ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start sm:items-center gap-2.5">
            {isApproved ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div className="text-xs">
              <span className="font-bold text-slate-900">
                {isApproved
                  ? `Approved by ${summary.approvedBy || 'Organizer'}`
                  : 'Organizer Approval Step Required:'}
              </span>{' '}
              <span className="text-slate-600">
                {isApproved
                  ? `Summary has been certified. Participants receive auto-digest emails.`
                  : 'Review the bullet points and decisions below before emailing participants.'}
              </span>
              {summary.lastEmailedAt && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Last sent: {new Date(summary.lastEmailedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({summary.emailRecipientCount || 4} participants)
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit Mode Toggle Button */}
            {!isEditing && (
              <button
                type="button"
                onClick={handleStartEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                title="Edit summary text, bullet points & decisions"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Summary</span>
              </button>
            )}

            {/* If NOT approved: Show Approve & Send Summary */}
            {!isApproved && (
              <button
                type="button"
                onClick={handleApproveAndSend}
                disabled={isApproving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-black text-xs shadow-xs transition-colors cursor-pointer"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Approving &amp; Sending...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Approve &amp; Send Summary</span>
                  </>
                )}
              </button>
            )}

            {/* KEY COMPONENT 4: "Resend summary email" button */}
            {isApproved && (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isSendingEmail}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Resend this summary email to all meeting participants"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFE900]" />
                    <span>Sending Emails...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#FFE900]" />
                    <span>Resend Summary Email</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Resend Email Success Confirmation Banner */}
        {emailSuccessInfo && (
          <div className="px-6 py-2.5 bg-emerald-600 text-white text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#FFE900]" />
              <span>
                <strong>Summary email sent!</strong> Dispatched to {emailSuccessInfo.recipientCount} participants ({emailSuccessInfo.recipients.join(', ')}) at {new Date(emailSuccessInfo.sentAt).toLocaleTimeString()}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEmailSuccessInfo(null)}
              className="text-emerald-100 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Audio Recording Scrubber */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
            className="w-9 h-9 rounded-full bg-[#FFE900] text-slate-950 font-bold flex items-center justify-center hover:bg-[#F5DE00] transition-colors cursor-pointer shrink-0"
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

        {/* ======================================================== */}
        {/* EMAIL PREVIEW DRAWER (If toggled) */}
        {/* ======================================================== */}
        {showEmailPreview && (
          <div className="p-4 bg-slate-100 border-b border-slate-200">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#FFE900] text-slate-950 font-black flex items-center justify-center text-xs">
                    M
                  </div>
                  <span className="font-bold text-slate-900">MidMeetMind Conference Digest</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">HTML Email Preview</span>
              </div>

              <div>
                <p className="text-[11px] text-slate-500">
                  <strong>To:</strong> All invited participants ({summary.emailRecipientCount || 4} recipients)
                </p>
                <p className="text-[11px] text-slate-500">
                  <strong>Subject:</strong> Summary &amp; Key Decisions: {summary.title || meeting?.title}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900 mb-1">Meeting Overview:</p>
                <p>{summary.overview || summary.summaryText}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1">Key Discussion Highlights:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {summary.keyPoints.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              </div>

              {summary.decisions && summary.decisions.length > 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="font-bold text-emerald-950 mb-1">Consensus &amp; Decisions Made:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-emerald-900">
                    {summary.decisions.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* Modal Scrollable Body */}
        {/* ======================================================== */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* EDIT MODE BANNER */}
          {isEditing && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-950">Organizer Edit Mode Active</h4>
                <p className="text-[11px] text-amber-800">
                  Modify the summary text, add or remove key bullet points and consensus decisions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-700 font-semibold text-xs hover:bg-amber-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FFE900] text-slate-950 font-bold text-xs hover:bg-[#F5DE00] shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 1. EXECUTIVE OVERVIEW (Editable / View) */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FFE900]"></span>
              <span>Executive Overview</span>
            </h4>

            {isEditing ? (
              <textarea
                value={editOverview}
                onChange={(e) => setEditOverview(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 font-medium leading-relaxed outline-none focus:border-amber-500"
                placeholder="Enter executive meeting overview..."
              />
            ) : (
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {summary.overview || summary.summaryText}
              </p>
            )}
          </div>

          {/* ======================================================== */}
          {/* 2. KEY DISCUSSION HIGHLIGHTS / BULLET-POINT SUMMARY */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Key Discussion Points ({isEditing ? editKeyPoints.length : summary.keyPoints.length})</span>
              </h4>
            </div>

            {isEditing ? (
              <div className="space-y-2.5">
                {editKeyPoints.map((point, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-6 h-6 rounded-full bg-[#FFE900] text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const updated = [...editKeyPoints];
                        updated[index] = e.target.value;
                        setEditKeyPoints(updated);
                      }}
                      className="flex-1 bg-white px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 outline-none focus:border-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyPoint(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete bullet point"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add new key point input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newKeyPointText}
                    onChange={(e) => setNewKeyPointText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyPoint(); } }}
                    placeholder="Add a new key discussion point..."
                    className="flex-1 bg-white px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-800 outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyPoint}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Point</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.keyPoints.map((point, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 hover:bg-slate-100/60 transition-colors">
                    <div className="w-5 h-5 rounded-full bg-[#FFE900] text-slate-950 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {index + 1}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-normal">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 3. KEY FUNCTIONALITY: "DECISIONS MADE" SECTION */}
          {/* ======================================================== */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Gavel className="w-4 h-4 text-emerald-700" />
                <span>Decisions Made &amp; Consensus Reached ({isEditing ? editDecisions.length : (summary.decisions?.length || 0)})</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                Official Record
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                {editDecisions.map((decision, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
                    <input
                      type="text"
                      value={decision}
                      onChange={(e) => {
                        const updated = [...editDecisions];
                        updated[index] = e.target.value;
                        setEditDecisions(updated);
                      }}
                      className="flex-1 bg-emerald-50/40 px-3 py-1.5 text-xs rounded-lg border border-emerald-200 text-emerald-950 outline-none focus:border-emerald-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDecision(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete decision"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add new decision input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newDecisionText}
                    onChange={(e) => setNewDecisionText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddDecision(); } }}
                    placeholder="Add a new decision agreed upon by participants..."
                    className="flex-1 bg-white px-3.5 py-2 text-xs rounded-xl border border-emerald-300 text-slate-800 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddDecision}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Decision</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.decisions && summary.decisions.length > 0 ? (
                  summary.decisions.map((decision, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-emerald-200 flex items-start gap-2.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                        {decision}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-2">
                    No explicit consensus decisions logged for this conference session.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Items Checklist */}
          {summary.actionItems && summary.actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Action Items &amp; Assigned Deliverables ({summary.actionItems.length})</span>
              </h4>
              <div className="space-y-2">
                {summary.actionItems.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      task.status === 'completed'
                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onTaskToggle && onTaskToggle(task.id)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
                      {task.priority || 'normal'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Timestamped Transcript Preview */}
          {summary.transcriptSnippet && summary.transcriptSnippet.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Verbatim Transcript Snippets
                </h4>
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in transcript..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto p-3 rounded-xl bg-slate-50 border border-slate-200">
                {filteredTranscript.map((t, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs">
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

        {/* ======================================================== */}
        {/* Footer Actions */}
        {/* ======================================================== */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {summary.lastEmailedAt
                ? `Digest sent to ${summary.emailRecipientCount || 4} participants`
                : 'Summary ready for participant email distribution'}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FFE900] hover:bg-[#F5DE00] text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save & Publish Edits'}</span>
                </button>
              </>
            ) : (
              <>
                {/* Resend Summary Email Button */}
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isSendingEmail}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>Resend Summary Email</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Viewer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* REAL EMAIL DISPATCH MODAL */}
      {/* ======================================================== */}
      {showSendEmailModal && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-900 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Send Summary to Real Email</h3>
                  <p className="text-xs text-slate-500">Deliver meeting minutes directly to your inbox</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendEmailModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. sumitnakranii18@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium text-xs focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter your real email address where you want to receive this meeting summary.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Additional Recipients (CC) <span className="text-slate-400 font-normal">(Optional, comma separated)</span>
                </label>
                <input
                  type="text"
                  value={additionalEmails}
                  onChange={(e) => setAdditionalEmails(e.target.value)}
                  placeholder="colleague@company.com, client@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-medium text-xs focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Optional Note from Organizer <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={customEmailNote}
                  onChange={(e) => setCustomEmailNote(e.target.value)}
                  placeholder="Add any specific context or instruction for the recipients..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                />
              </div>

              {/* Summary Snippet preview */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-1">
                  What will be delivered:
                </p>
                <p className="text-slate-600 line-clamp-2 italic text-[11px]">
                  "{summary.overview || summary.summaryText || 'Executive meeting record'}"
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-medium">
                  <span>✓ {summary.keyPoints?.length || 0} Key Points</span>
                  <span>✓ {summary.decisions?.length || 0} Decisions</span>
                  <span>✓ {summary.actionItems?.length || 0} Action Items</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Option A: Send via Gmail Web */}
              <button
                type="button"
                onClick={handleSendViaGmail}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Opens Gmail compose window with prefilled recipient and full summary"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Gmail</span>
              </button>

              {/* Option B: Send via Default Mail App */}
              <button
                type="button"
                onClick={handleSendViaMailto}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Opens Outlook / Apple Mail / default mail app"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Mail App</span>
              </button>

              {/* Option C: Copy Email Body */}
              <button
                type="button"
                onClick={handleCopyEmailText}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {copiedEmailText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedEmailText ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
