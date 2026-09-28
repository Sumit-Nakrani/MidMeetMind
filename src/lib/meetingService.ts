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
  }
];

// Helper to seed initial sample meetings, summaries & tasks into Firestore
export async function seedInitialMeetingsIfNeeded(orgId: string) {
  try {
    for (const item of INITIAL_MEETINGS) {
      const targetOrg = orgId || 'org-apex-college';
      const mRef = doc(db, 'meetings', item.id);
      const mSnap = await getDoc(mRef);
      if (!mSnap.exists()) {
        const meetingData: Meeting = {
          id: item.id,
          title: item.title,
          organizerId: item.organizerId,
          organizationId: targetOrg,
          scheduledAt: item.scheduledAt,
          status: item.status,
          agenda: item.agenda,
          recordingUrl: item.recordingUrl,
          participants: item.participants,
          shareToken: item.shareToken,
          createdAt: item.createdAt
        };
        await setDoc(mRef, meetingData);

        if (item.summary) {
          await setDoc(doc(db, 'summaries', item.summary.id), item.summary);
        }

        if (item.tasks) {
          for (const t of item.tasks) {
            await setDoc(doc(db, 'tasks', t.id), t);
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
    await setDoc(doc(db, 'meetings', meetingId), newMeeting);
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
    await setDoc(doc(db, 'tasks', taskId), created);
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
