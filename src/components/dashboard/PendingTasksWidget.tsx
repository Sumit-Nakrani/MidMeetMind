import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Calendar,
  Check,
  Circle
} from 'lucide-react';
import { Task, TaskStatus } from '../../types/index.ts';
import { updateTaskStatus, createNewTask } from '../../lib/meetingService.ts';

interface PendingTasksWidgetProps {
  tasks: Task[];
  onTasksUpdated: (updated: Task[]) => void;
}

export const PendingTasksWidget: React.FC<PendingTasksWidgetProps> = ({
  tasks,
  onTasksUpdated
}) => {
  const { profile } = useAuth();
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDue, setNewTaskDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [newTaskAssignee, setNewTaskAssignee] = useState(profile?.name || 'Self');
  const [savingTask, setSavingTask] = useState(false);

  // Toggle task status
  const handleToggleTask = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updated = tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t);
    onTasksUpdated(updated);
    await updateTaskStatus(task.id, nextStatus);
  };

  // Add custom action item
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskDesc.trim()) return;

    setSavingTask(true);
    try {
      const created = await createNewTask({
        meetingId: 'custom-task',
        meetingTitle: 'Workspace Action Item',
        assignedTo: profile?.id || 'user',
        assigneeName: newTaskAssignee.trim() || profile?.name || 'Team Member',
        assigneeEmail: profile?.email || '',
        description: newTaskDesc.trim(),
        dueDate: newTaskDue,
        priority: 'high',
        status: 'pending'
      });
      onTasksUpdated([created, ...tasks]);
      setNewTaskDesc('');
      setShowAddForm(false);
    } finally {
      setSavingTask(false);
    }
  };

  const displayedTasks = tasks.filter(t => {
    if (filterMode === 'mine') {
      return t.assignedTo === profile?.id || t.assigneeEmail === profile?.email;
    }
    return true;
  });

  const pendingCount = displayedTasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-slate-700" />
            Meeting Action Items
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-assigned follow-ups extracted from conference transcripts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pill */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('mine')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                filterMode === 'mine' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assigned to Me
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Quick Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Action Item / Deliverable Description
            </label>
            <input
              type="text"
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              placeholder="e.g. Circulate Q3 financial forecast & schedule debrief..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assignee Name
              </label>
              <input
                type="text"
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none focus:border-slate-500 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingTask}
              className="px-4 py-1.5 bg-[#FFE900] text-slate-950 font-bold text-xs rounded-lg hover:bg-[#F5DE00] transition-colors"
            >
              {savingTask ? 'Saving...' : 'Add Action Item'}
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-96">
        {displayedTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No action items found for this selection.
          </div>
        ) : (
          displayedTasks.map((t) => {
            const isCompleted = t.status === 'completed';
            return (
              <div
                key={t.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(t)}
                    className="mt-0.5 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <div>
                    <p className={`text-xs font-medium leading-relaxed ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {t.description}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>Assigned to: <strong>{t.assigneeName || t.assignedTo || 'Team Member'}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Due: <strong>{t.dueDate ? new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Next Week'}</strong></span>
                    </div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                  t.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-700'
                    : t.priority === 'high'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {t.priority}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
