'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  ListTodo,
  TrendingUp,
  Clock,
  LayoutDashboard,
  Star,
  Star as StarFilled,
  Bell,
  Plus,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tasksApi } from '@/lib/api/tasks';
import { calendarApi } from '@/lib/api/calendar';
import { chatsApi } from '@/lib/api/chats';
import { projectsApi } from '@/lib/api/projects';
import { readAuthSession } from '@/lib/auth-session';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  due_date: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const priorityConfig = {
  high: { label: 'High', color: 'text-red-600 bg-red-50 border-red-200' },
  medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  low: { label: 'Low', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

function getPriorityLevel(priority: number): 'high' | 'medium' | 'low' {
  if (priority >= 7) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return date.toLocaleDateString();
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
}

export function DashboardPanel() {
  const session = readAuthSession();
  const userEmail = session?.email;

  const { data: projects } = useQuery({
    queryKey: ['projects', userEmail],
    queryFn: () => userEmail ? projectsApi.list(userEmail) : Promise.resolve([]),
    enabled: !!userEmail,
  });

  const currentProjectId = projects?.[0]?.id;

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', currentProjectId],
    queryFn: () => tasksApi.list({ limit: 10 }),
    enabled: !!currentProjectId,
  });

  // Fetch upcoming calendar events
  const { data: calendarEvents, isLoading: calendarLoading } = useQuery({
    queryKey: ['calendar-upcoming'],
    queryFn: () => calendarApi.upcoming(7),
  });

  // Fetch favorite chats
  const { data: favoriteChats, isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', currentProjectId],
    queryFn: () => currentProjectId ? chatsApi.favorites(currentProjectId) : Promise.resolve([]),
    enabled: !!currentProjectId,
  });

  const allTasks = tasks || [];
  const pendingTasks = allTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const completedCount = allTasks.filter(t => t.status === 'COMPLETED').length;

  const highPriorityTasks = pendingTasks.filter(t => getPriorityLevel(t.priority) === 'high');
  const todayTasks = pendingTasks.filter(t => {
    if (!t.due_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(t.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  });

  const progress = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    if (newStatus === 'COMPLETED') {
      await tasksApi.complete(taskId);
    } else {
      await tasksApi.update(taskId, { status: newStatus });
    }
  };

  const handleToggleFavorite = async (chatId: string, currentFavorite: boolean) => {
    if (currentProjectId) {
      await chatsApi.setFavorite(chatId, !currentFavorite);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-slate-600" />
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide mb-2">
              <ListTodo className="h-3.5 w-3.5" />
              Total Tasks
            </div>
            <p className="text-2xl font-semibold text-slate-900">{allTasks.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </div>
            <p className="text-2xl font-semibold text-slate-900">{completedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide mb-2">
              <Circle className="h-3.5 w-3.5" />
              In Progress
            </div>
            <p className="text-2xl font-semibold text-slate-900">{pendingTasks.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide mb-2">
              <TrendingUp className="h-3.5 w-3.5" />
              Progress
            </div>
            <p className="text-2xl font-semibold text-slate-900">{progress}%</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tasks Section */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500" />
                  {highPriorityTasks.length} high
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {todayTasks.length} today
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {allTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <ListTodo className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No tasks yet</p>
                  <p className="text-xs mt-1">Add tasks to get started</p>
                </div>
              ) : (
                allTasks.slice(0, 5).map((task) => {
                  const priorityLevel = getPriorityLevel(task.priority);
                  const priority = priorityConfig[priorityLevel];
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "px-4 py-3 hover:bg-slate-50 transition-colors",
                        task.status === 'COMPLETED' && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className="shrink-0"
                          title={task.status === 'COMPLETED' ? "Mark incomplete" : "Mark complete"}
                        >
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle2 className="h-5 w-5 text-slate-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "text-sm font-medium truncate",
                            task.status === 'COMPLETED' ? "text-slate-400 line-through" : "text-slate-800"
                          )}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide border",
                              priority.color
                            )}>
                              {priority.label}
                            </span>
                            {task.due_date && (
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3" />
                                {formatDueDate(task.due_date)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Calendar Section */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Upcoming</h2>
              </div>
              <span className="text-xs text-slate-500">Next 7 days</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {!calendarEvents || calendarEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Calendar className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                  <p className="text-xs mt-1">Add events to your calendar</p>
                </div>
              ) : (
                calendarEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="shrink-0 w-1 h-10 rounded-full"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-900 truncate">{event.title}</h3>
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {formatTime(event.startTime)}
                        </div>
                        {event.location && (
                          <p className="text-xs text-slate-400 mt-1 truncate">{event.location}</p>
                        )}
                      </div>
                      {event.reminder && (
                        <Bell className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Favorite Chats Section */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900">Favorite Threads</h2>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {!favoriteChats || favoriteChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Star className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No favorites yet</p>
                  <p className="text-xs mt-1">Star important conversations</p>
                </div>
              ) : (
                favoriteChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="px-4 py-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-slate-800 truncate">{chat.title}</h3>
                        {chat.folder && (
                          <p className="text-xs text-slate-400 mt-1">{chat.folder.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleFavorite(chat.id, chat.isFavorite)}
                        className="shrink-0 opacity-60 group-hover:opacity-100"
                      >
                        {chat.isFavorite ? (
                          <StarFilled className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reminders Section */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Reminders</h2>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {!calendarEvents || calendarEvents.filter(e => e.reminder).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Bell className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">No reminders set</p>
                  <p className="text-xs mt-1">Add reminders to calendar events</p>
                </div>
              ) : (
                calendarEvents
                  .filter(e => e.reminder)
                  .slice(0, 5)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Bell className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-slate-800 truncate">{event.title}</h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            {formatTime(event.startTime)}
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1">
                            Reminder: {event.reminder} before
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>
    </div>
  );
}
