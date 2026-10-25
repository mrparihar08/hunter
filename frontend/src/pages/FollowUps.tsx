import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Check,
  Loader2,
  Search,
  Filter,
  Calendar,
} from 'lucide-react';
import { FollowUpTask } from '../types';
import { followUpService } from '../services/api';
import { useToast } from '../components/Toast';

export const FollowUps: React.FC = () => {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, [showCompleted]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await followUpService.list(showCompleted);
      setTasks(data);
    } catch (err) {
      console.error(err);
      toast('Failed to load follow-up tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (task: FollowUpTask) => {
    const nextState = !task.is_completed;
    try {
      await followUpService.toggleComplete(task.id, nextState);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      toast(
        nextState ? 'Follow-up marked as completed!' : 'Follow-up moved back to pending',
        'success'
      );
    } catch (err) {
      console.error(err);
      toast('Failed to update task status', 'error');
    }
  };

  const filteredTasks = tasks.filter((t) =>
    !searchTerm.trim() || t.task_note.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CalendarCheck2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Follow-up Cadence & Outreach Tracker
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Over 70% of web development deals close on the 2nd or 3rd follow-up. Keep your communication momentum alive.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showCompleted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-glow-emerald'
                : 'bg-slate-800/80 text-slate-300 border-white/[0.08] hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showCompleted ? 'Viewing Completed Tasks' : 'Show Completed'}</span>
          </button>
        </div>

        {/* Ambient accent */}
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl glass-card">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search notes or tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/[0.08] focus:border-emerald-500/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end">
          <span className="font-semibold text-slate-300">{filteredTasks.length}</span>
          <span>{filteredTasks.length === 1 ? 'task listed' : 'tasks listed'}</span>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 glass-panel rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
          <span className="text-sm font-medium">Fetching scheduled follow-ups...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-16 text-center rounded-2xl glass-panel space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-glow-emerald">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-slate-200 font-bold text-base">
            {showCompleted ? 'No completed tasks found' : 'All caught up! Zero pending follow-ups'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {showCompleted
              ? 'Complete tasks from the pending list to view them here.'
              : 'You have no outstanding follow-up reminders. When reviewing leads in the Lead Pipeline, schedule new follow-ups to keep prospects warm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isOverdue = task.due_date < todayStr;
            const isDueToday = task.due_date === todayStr;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card ${
                  task.is_completed
                    ? 'opacity-60 border-white/[0.04]'
                    : isOverdue
                    ? 'border-rose-500/30 bg-rose-950/10 hover:border-rose-500/50'
                    : isDueToday
                    ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
                    : 'border-white/[0.08] hover:border-emerald-500/30'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      task.is_completed
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                        : 'border-slate-600 hover:border-emerald-400 bg-slate-900/80 text-emerald-400'
                    }`}
                    title={task.is_completed ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {task.is_completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <p
                      className={`text-sm font-semibold leading-snug break-words ${
                        task.is_completed ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {task.task_note}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* Urgency Badge */}
                      {!task.is_completed && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : isDueToday
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Upcoming'}</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {task.due_date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      task.is_completed
                        ? 'bg-slate-800 text-slate-300 border-white/[0.08] hover:bg-slate-700'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white border-transparent shadow-md shadow-emerald-500/20'
                    }`}
                  >
                    {task.is_completed ? 'Mark Pending' : 'Mark Done'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
