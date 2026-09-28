/**
 * MidMeetMind Types & Schemas
 */

export type OrganizationType = 'college' | 'school' | 'company';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  inviteCode: string;
  createdAt?: string;
  firstAdminId?: string;
  firstAdminName?: string;
  firstAdminEmail?: string;
  memberCount?: number;
}

export type UserRole = 'admin' | 'member';

export interface NotificationPrefs {
  summaryEmails: boolean;
  reminderFrequency: 'realtime' | 'daily' | 'weekly';
  digest: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  role: UserRole;
  passwordHash?: string;
  notificationPrefs?: NotificationPrefs;
  createdAt?: string;
}

export type MeetingStatus = 'scheduled' | 'in_progress' | 'processing' | 'completed';

export interface MeetingParticipant {
  userId: string;
  name?: string;
  email?: string;
  attended?: boolean;
  role?: string;
}

export interface Meeting {
  id: string;
  title: string;
  organizerId: string;
  organizationId: string;
  scheduledAt: string; // ISO string or timestamp
  status: MeetingStatus;
  recordingUrl?: string;
  agenda?: string;
  participants: MeetingParticipant[];
  shareToken?: string | null;
  createdAt?: string;
}

export interface TranscriptSnippet {
  timestamp: string;
  speaker: string;
  text: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  rawText: string;
  createdAt?: string;
}

export interface Summary {
  id: string;
  meetingId: string;
  title?: string;
  summaryText: string;
  overview?: string;
  keyPoints: string[];
  decisions: string[];
  actionItems?: Task[];
  transcriptSnippet?: TranscriptSnippet[];
  durationMinutes?: number;
  generatedAt?: string;
  createdAt?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Task {
  id: string;
  meetingId: string;
  assignedTo: string; // userId
  assigneeName?: string;
  assigneeEmail?: string;
  description: string;
  dueDate: string; // ISO string
  status: TaskStatus;
  priority?: 'normal' | 'high' | 'urgent';
  meetingTitle?: string;
  createdAt?: string;
}

export type NotificationType = 'summary' | 'reminder';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  relatedMeetingId?: string;
  relatedTaskId?: string;
  sentAt: string;
  title?: string;
  body?: string;
}
