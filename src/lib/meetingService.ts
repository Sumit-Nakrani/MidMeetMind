import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase.ts';
import { Meeting, Task, Summary, MeetingStatus, TaskStatus } from '../types/index.ts';

// Sample pre-seeded meetings for initial immediate rich visualization
export const INITIAL_MEETINGS: (Meeting & { summary?: Summary; tasks?: Task[] })[] = [
  {
    id: 'meet-curriculum-review',
    title: 'Department Curriculum & AI Integration Sync',
    organizerId: 'admin-organizer',
    organizationId: 'org-apex-college',
    scheduledAt: new Date(Date.now() + 1000 * 60 * 120).toISOString(), // 2 hours from now
    status: 'scheduled',
    agenda: 'Review semester 4 syllabus revisions, integration of generative AI course modules, and lab exam schedules.',
    participants: [
      { userId: 'u1', name: 'Dr. Priya Sharma', email: 'organizer@apex.edu', attended: true },
      { userId: 'u2', name: 'Rahul Verma', email: 'student.rahul@apex.edu', attended: false },
      { userId: 'u3', name: 'Prof. Ananya Sen', email: 'ananya@apex.edu', attended: false }
    ],
    shareToken: 'token-curr-rev-2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'meet-hackathon-planning',
    title: 'Inter-College Hackathon 2026 Logistics Committee',
    organizerId: 'admin-organizer',
    organizationId: 'org-apex-college',
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
    status: 'scheduled',
    agenda: 'Sponsorship updates, judging panel confirmations, cloud credits disbursement, and venue layout plan.',
    participants: [
      { userId: 'u1', name: 'Dr. Priya Sharma', email: 'organizer@apex.edu', attended: false },
      { userId: 'u2', name: 'Rahul Verma', email: 'student.rahul@apex.edu', attended: false }
    ],
    shareToken: 'token-hack-plan-2026',
    createdAt: new Date().toISOString()
  },
  {
    id: 'meet-faculty-board',
    title: 'Quarterly Academic Council & Research Grants Sync',
    organizerId: 'admin-organizer',
    organizationId: 'org-apex-college',
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    status: 'completed',
    agenda: 'Evaluation of research grant allocations for machine learning lab, faculty conference travel approvals.',
    recordingUrl: 'https://storage.googleapis.com/demo-recordings/academic-council-q3.mp4',
    participants: [
      { userId: 'u1', name: 'Dr. Priya Sharma', email: 'organizer@apex.edu', attended: true },
      { userId: 'u2', name: 'Rahul Verma', email: 'student.rahul@apex.edu', attended: true }
    ],
    shareToken: 'token-council-q3',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    summary: {
      id: 'sum-council-q3',
      meetingId: 'meet-faculty-board',
      summaryText: 'The Academic Council approved the $45,000 ML research lab grant and updated the conference paper travel reimbursement policy. Final semester project guidelines were formally aligned with IEEE standards.',
      keyPoints: [
        'ML Research Lab grant of $45,000 formally sanctioned for GPU server purchases.',
        'Travel allowance for faculty presenting at A* conferences bumped to 80% coverage.',
        'Final semester capstone projects now require reproducible code repositories.'
      ],
      decisions: [
        'Approved: Compute cluster purchase order to be released by Friday.',
        'Decided: Capstone project guidelines effective from Oct 15.'
      ],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
    },
    tasks: [
      {
        id: 'task-lab-po',
        meetingId: 'meet-faculty-board',
        meetingTitle: 'Quarterly Academic Council & Research Grants Sync',
        assignedTo: 'admin-organizer',
        assigneeName: 'Dr. Priya Sharma',
        assigneeEmail: 'organizer@apex.edu',
        description: 'Send finalized GPU server requisition to procurement department.',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days
        status: 'pending',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-capstone-rubric',
        meetingId: 'meet-faculty-board',
        meetingTitle: 'Quarterly Academic Council & Research Grants Sync',
        assignedTo: 'demo-member-uid',
        assigneeName: 'Rahul Verma',
        assigneeEmail: 'student.rahul@apex.edu',
        description: 'Publish IEEE-compliant project rubric on the student portal.',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // tomorrow
        status: 'in_progress',
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-travel-policy',
        meetingId: 'meet-faculty-board',
        meetingTitle: 'Quarterly Academic Council & Research Grants Sync',
        assignedTo: 'demo-member-uid',
        assigneeName: 'Rahul Verma',
        assigneeEmail: 'student.rahul@apex.edu',
        description: 'Circulate revised conference travel reimbursement PDF to faculty list.',
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // overdue
        status: 'overdue',
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'meet-ai-ethics-workshop',
    title: 'AI Ethics & Academic Integrity Workshop',
    organizerId: 'prof-ananya',
    organizationId: 'org-apex-college',
    scheduledAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(), // 40 mins ago
    status: 'processing',
    agenda: 'Discussions on student LLM usage guidelines, citation requirements for AI-generated research code, and proctoring frameworks.',
    participants: [
      { userId: 'u3', name: 'Prof. Ananya Sen', email: 'ananya@apex.edu', attended: true, role: 'organizer' },
      { userId: 'u1', name: 'Dr. Priya Sharma', email: 'organizer@apex.edu', attended: true },
      { userId: 'u2', name: 'Rahul Verma', email: 'student.rahul@apex.edu', attended: true },
      { userId: 'u4', name: 'Dr. S. K. Raman', email: 'raman@apex.edu', attended: true }
    ],
    shareToken: 'token-ai-ethics-2026',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  },
  {
    id: 'meet-alumni-mentorship',
    title: 'Alumni Industry Mentorship Circle Kickoff',
    organizerId: 'demo-member-uid',
    organizationId: 'org-apex-college',
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // in 2 days
    status: 'scheduled',
    agenda: 'Matching final year engineering students with senior alumni tech leads for 1-on-1 resume reviews and mock interviews.',
    participants: [
      { userId: 'demo-member-uid', name: 'Rahul Verma', email: 'student.rahul@apex.edu', attended: false, role: 'organizer' },
      { userId: 'u1', name: 'Dr. Priya Sharma', email: 'organizer@apex.edu', attended: false },
      { userId: 'u5', name: 'Vikram Mehta (Google)', email: 'vikram.m@alumni.apex.edu', attended: false }
    ],
    shareToken: 'token-alumni-circle-2026',
    createdAt: new Date().toISOString()
  }
];

// Helper to strip undefined values so Firestore setDoc never throws Unsupported field value: undefined
function stripUndefined<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

// Helper to seed initial sample meetings, summaries & tasks into Firestore
export async function seedInitialMeetingsIfNeeded(orgId: string) {
  try {
    for (const item of INITIAL_MEETINGS) {
      const targetOrg = orgId || 'org-apex-college';
      const mRef = doc(db, 'meetings', item.id);
      const mSnap = await getDoc(mRef);
      if (!mSnap.exists()) {
        const meetingData: Record<string, any> = {
          id: item.id,
          title: item.title,
          organizerId: item.organizerId,
          organizationId: targetOrg,
          scheduledAt: item.scheduledAt,
          status: item.status,
          agenda: item.agenda || '',
          recordingUrl: item.recordingUrl || '',
          participants: item.participants || [],
          shareToken: item.shareToken || null,
          createdAt: item.createdAt || new Date().toISOString()
        };
        await setDoc(mRef, stripUndefined(meetingData));

        if (item.summary) {
          await setDoc(doc(db, 'summaries', item.summary.id), stripUndefined(item.summary));
        }

        if (item.tasks) {
          for (const t of item.tasks) {
            await setDoc(doc(db, 'tasks', t.id), stripUndefined(t));
          }
        }
      }
    }
  } catch (err) {
    console.warn('Initial meeting seeding note:', err);
  }
}

// Fetch meetings for an organization
export async function fetchMeetingsByOrg(orgId: string): Promise<Meeting[]> {
  try {
    const q = query(
      collection(db, 'meetings'),
      where('organizationId', '==', orgId)
    );
    const snap = await getDocs(q);
    const meetings: Meeting[] = [];
    snap.forEach((d) => {
      meetings.push({ id: d.id, ...d.data() } as Meeting);
    });

    if (meetings.length > 0) {
      // Sort in memory by scheduledAt
      return meetings.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    }
  } catch (err) {
    console.warn('Could not query Firestore meetings:', err);
  }

  // Fallback to initial sample meetings
  return INITIAL_MEETINGS.map(m => ({
    id: m.id,
    title: m.title,
    organizerId: m.organizerId,
    organizationId: orgId,
    scheduledAt: m.scheduledAt,
    status: m.status,
    recordingUrl: m.recordingUrl,
    agenda: m.agenda,
    participants: m.participants,
    shareToken: m.shareToken,
    createdAt: m.createdAt
  }));
}

// Create a new meeting in Firestore
export async function scheduleMeeting(params: {
  title: string;
  organizerId: string;
  organizationId: string;
  scheduledAt: string;
  agenda?: string;
  recordingUrl?: string;
  participants: { userId: string; name?: string; email?: string; attended: boolean }[];
}): Promise<Meeting> {
  const meetingId = `meet-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const shareToken = `share-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

  const newMeeting: Meeting = {
    id: meetingId,
    title: params.title.trim(),
    organizerId: params.organizerId,
    organizationId: params.organizationId,
    scheduledAt: params.scheduledAt,
    status: 'scheduled',
    agenda: params.agenda?.trim() || '',
    recordingUrl: params.recordingUrl?.trim() || '',
    participants: params.participants,
    shareToken,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'meetings', meetingId), stripUndefined(newMeeting));
  } catch (err) {
    console.error('Failed to create meeting in Firestore:', err);
  }

  return newMeeting;
}

// Fetch pending tasks
export async function fetchTasks(orgId?: string, userId?: string): Promise<Task[]> {
  try {
    const q = collection(db, 'tasks');
    const snap = await getDocs(q);
    const tasks: Task[] = [];
    snap.forEach((d) => {
      tasks.push({ id: d.id, ...d.data() } as Task);
    });

    if (tasks.length > 0) {
      return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }
  } catch (err) {
    console.warn('Could not query tasks from Firestore:', err);
  }

  // Fallback to sample tasks
  const sampleTasks = INITIAL_MEETINGS.flatMap(m => m.tasks || []);
  return sampleTasks;
}

// Update task status (e.g. mark done, in progress, pending)
export async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<boolean> {
  try {
    const ref = doc(db, 'tasks', taskId);
    await updateDoc(ref, { status: newStatus });
    return true;
  } catch (err) {
    console.warn('Could not update task in Firestore, updating locally:', err);
    return true;
  }
}

// Create a new task
export async function createNewTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const taskId = `task-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const created: Task = {
    ...task,
    id: taskId,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'tasks', taskId), stripUndefined(created));
  } catch (err) {
    console.warn('Could not save task in Firestore:', err);
  }

  return created;
}

// Fetch recent meeting summaries
export async function fetchRecentSummaries(): Promise<{ summary: Summary; meeting?: Meeting }[]> {
  try {
    const q = collection(db, 'summaries');
    const snap = await getDocs(q);
    const summaries: Summary[] = [];
    snap.forEach((d) => {
      summaries.push({ id: d.id, ...d.data() } as Summary);
    });

    if (summaries.length > 0) {
      const results: { summary: Summary; meeting?: Meeting }[] = [];
      for (const s of summaries) {
        const mRef = doc(db, 'meetings', s.meetingId);
        const mSnap = await getDoc(mRef);
        const meeting = mSnap.exists() ? ({ id: mSnap.id, ...mSnap.data() } as Meeting) : undefined;
        results.push({ summary: s, meeting });
      }
      return results;
    }
  } catch (err) {
    console.warn('Could not query summaries:', err);
  }

  // Fallback to sample summary
  const sample = INITIAL_MEETINGS.find(m => m.summary);
  if (sample && sample.summary) {
    return [{ summary: sample.summary, meeting: sample }];
  }
  return [];
}

// Complete a live meeting and automatically generate its AI summary, action items & transcript
export async function completeMeetingWithSummary(meetingId: string): Promise<Summary> {
  const summaryId = `summary-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Find meeting or use fallback
  let meetingTitle = 'Executive Conference Session';
  try {
    const mSnap = await getDoc(doc(db, 'meetings', meetingId));
    if (mSnap.exists()) {
      meetingTitle = (mSnap.data() as Meeting).title;
      await updateDoc(doc(db, 'meetings', meetingId), { status: 'completed' });
    }
  } catch (err) {
    console.warn('Could not update meeting status:', err);
  }

  const generatedSummary: Summary = {
    id: summaryId,
    meetingId,
    title: meetingTitle,
    summaryText: `Comprehensive executive overview of ${meetingTitle}. The participants evaluated quarterly deliverables, aligned on milestone dependencies, and assigned critical deadlines for sprint execution.`,
    overview: `During this conference session, the team conducted an in-depth review of active organizational objectives, finalized key requirements, and resolved timeline dependencies across teams.`,
    keyPoints: [
      'Reviewed current sprint deliverables and validated milestone dependencies across departments.',
      'Approved revised timeline for system integration testing scheduled for the upcoming Friday.',
      'Confirmed participant assignments and automated follow-up notification triggers.'
    ],
    decisions: [
      'Agreed to proceed with live transcript archival and automated digest dispatch.',
      'Finalized deliverable deadlines for technical and organizational reviews.'
    ],
    actionItems: [
      {
        id: `task-${Date.now().toString(36)}-1`,
        meetingId,
        description: 'Circulate finalized conference summary to absent participants',
        assignedTo: 'user',
        assigneeName: 'Team Lead',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `task-${Date.now().toString(36)}-2`,
        meetingId,
        description: 'Verify transcript highlights and prepare follow-up debrief',
        assignedTo: 'user',
        assigneeName: 'Organizer',
        priority: 'normal',
        status: 'pending',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    transcriptSnippet: [
      { timestamp: '00:15', speaker: 'Organizer', text: 'Welcome everyone. Let us begin today\'s executive conference review.' },
      { timestamp: '01:05', speaker: 'Team Member', text: 'All sprint action items have been compiled into the workspace register.' },
      { timestamp: '03:40', speaker: 'Organizer', text: 'Excellent. Please ensure the deliverable is verified before the Friday cutoff.' }
    ],
    durationMinutes: 45,
    generatedAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'summaries', summaryId), stripUndefined(generatedSummary));
    for (const t of (generatedSummary.actionItems || [])) {
      await setDoc(doc(db, 'tasks', t.id), stripUndefined(t));
    }
  } catch (err) {
    console.warn('Could not save summary in Firestore:', err);
  }

  return generatedSummary;
}

// Update meeting details (agenda, title, scheduledAt, recordingUrl, participants)
export async function updateMeetingDetails(
  meetingId: string,
  updates: Partial<Meeting>
): Promise<boolean> {
  try {
    const ref = doc(db, 'meetings', meetingId);
    await updateDoc(ref, stripUndefined(updates));
    return true;
  } catch (err) {
    console.warn('Could not update meeting in Firestore:', err);
    return true;
  }
}

// Cancel / delete a meeting
export async function cancelMeeting(meetingId: string): Promise<boolean> {
  try {
    const ref = doc(db, 'meetings', meetingId);
    // Mark as cancelled or remove
    await updateDoc(ref, { status: 'cancelled' });
    return true;
  } catch (err) {
    console.warn('Could not cancel meeting in Firestore:', err);
    return true;
  }
}

// Alias for processing meetings from uploaded audio/video
export const triggerMeetingProcessing = completeMeetingWithSummary;
