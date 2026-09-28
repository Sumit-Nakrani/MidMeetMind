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
  Sparkles,
  Check
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
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [newTaskAssignee, setNewTaskAssignee] = useState(profile?.name || 'Self');
  const [savingTask, setSavingTask] = useState(false);

  // Toggle task status
  const handleToggleTask = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    // Optimistic UI update
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
        meetingTitle: 'Ad-hoc Organization Task',
        assignedTo: profile?.id || 'user',
        assigneeName: newTaskAssignee.trim() || profile?.name || 'Team Member',
        assigneeEmail: profile?.email || '',
        description: newTaskDesc.trim(),
        dueDate: new Date(newTaskDue).toISOString(),
        status: 'pending'
      });

      onTasksUpdated([created, ...tasks]);
      setNewTaskDesc('');
      setShowAddForm(false);
    } catch (err) {
      console.warn('Could not add task:', err);
    } finally {
      setSavingTask(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (filterMode === 'mine') {
      const isMyId = t.assignedTo === profile?.id;
      const isMyEmail = t.assigneeEmail === profile?.email;
      const isMyName = profile?.name && t.assigneeName?.toLowerCase().includes(profile.name.toLowerCase().split(' ')[0]);
      return isMyId || isMyEmail || isMyName;
    }
    return true;
  });

  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const overdueCount = tasks.filter(t => {
    return t.status !== 'completed' && new Date(t.dueDate).getTime() < Date.now();
  }).length;

  const formatDue = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diffHours = Math.round((d.getTime() - now) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return { label: `Overdue by ${Math.abs(Math.round(diffHours / 24))}d`, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
    } else if (diffHours < 24) {
      return { label: 'Due today', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    } else {
      const days = Math.round(diffHours / 24);
      return { label: `Due in ${days}d`, color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900/70 backdrop-blur-md border border-slate-800/80 shadow-xl flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Pending Tasks &amp; Action Items</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                {pendingCount} open
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Extracted automatically from meeting agendas &amp; summaries</p>
          </div>
        </div>

        {/* Add Task Button */}
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Add Action Item"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs & Quick Alert */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex p-0.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Team Tasks ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('mine')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              filterMode === 'mine'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Assigned
          </button>
        </div>

        {overdueCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>{overdueCount} overdue</span>
          </span>
        )}
      </div>

      {/* Quick Add Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateTask} className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-2.5 animate-fadeIn">
          <span className="text-xs font-semibold text-indigo-300 block">Add Quick Action Item</span>
          <input
            type="text"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            placeholder="Action item description..."
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 outline-none focus:border-indigo-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 outline-none"
            />
            <input
              type="text"
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              placeholder="Assignee name..."
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingTask || !newTaskDesc.trim()}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow"
            >
              {savingTask ? 'Adding...' : 'Save Task'}
            </button>
          </div>
        </form>
      )}

      {/* Tasks List */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No tasks found for this view.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const dueInfo = formatDue(task.dueDate);

            return (
              <div
                key={task.id}
                className={`p-3 rounded-2xl border transition-all flex items-start gap-3 ${
                  isCompleted
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Interactive Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggleTask(task)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 mt-0.5 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-600 hover:border-indigo-400 bg-slate-900'
                  }`}
                  title={isCompleted ? 'Mark as incomplete' : 'Mark as done'}
                >
                  {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Task Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className={`text-xs leading-snug ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}>
                    {task.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                    {/* Assignee */}
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <User className="w-3 h-3 text-indigo-400" />
                      <span>{task.assigneeName || 'Assigned'}</span>
                    </span>

                    {/* Due Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${dueInfo.color}`}>
                      <Clock className="w-3 h-3" />
                      <span>{dueInfo.label}</span>
                    </span>

                    {/* Meeting Title Source */}
                    {task.meetingTitle && (
                      <span className="text-[10px] text-slate-500 truncate max-w-[140px]" title={task.meetingTitle}>
                        &bull; {task.meetingTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Quiet automated follow-ups active</span>
        <span className="text-emerald-400 font-medium">Auto-Sync</span>
      </div>
    </div>
  );
};
