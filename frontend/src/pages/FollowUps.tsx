import React, { useState, useEffect } from 'react';
import { CalendarCheck2, CheckCircle2, Clock, Check, Loader2 } from 'lucide-react';
import { FollowUpTask } from '../types';
import { followUpService } from '../services/api';

export const FollowUps: React.FC = () => {
  const [tasks, setTasks] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (task: FollowUpTask) => {
    try {
      await followUpService.toggleComplete(task.id, !task.is_completed);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-emerald-400" />
            Follow-up Task Tracker
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Over 70% of web development deals close on the 2nd or 3rd follow-up. Never let a warm lead go cold.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              showCompleted
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {showCompleted ? 'Showing Completed' : 'Show Pending Tasks'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
          <span>Loading tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850/40 border border-slate-800">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <p className="text-slate-300 font-medium">All caught up!</p>
          <p className="text-xs text-slate-500 mt-1">
            No follow-ups due. Schedule reminders from the Lead Pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isOverdue = new Date(task.due_date) < new Date(new Date().toDateString());
            return (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggle(task)}
                    className="mt-0.5 w-5 h-5 rounded border border-slate-600 hover:border-emerald-400 flex items-center justify-center text-emerald-400 transition-colors"
                  >
                    {task.is_completed && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.task_note}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span
                        className={`flex items-center gap-1 font-semibold ${
                          isOverdue && !task.is_completed ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        Due: {task.due_date} {isOverdue && !task.is_completed ? '(Overdue)' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(task)}
                  className="text-xs px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium"
                >
                  {task.is_completed ? 'Mark Pending' : 'Done'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
