'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Home,
  LayoutDashboard,
  ListTodo,
  MapPin,
  Star,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tasksApi } from '@/lib/api/tasks';
import { calendarApi, type CalendarEvent, type CreateEventInput } from '@/lib/api/calendar';
import { chatsApi } from '@/lib/api/chats';
import { projectsApi } from '@/lib/api/projects';
import { readAuthSession } from '@/lib/auth-session';
import { useUIStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getPriorityLevel(priority: number): 'high' | 'medium' | 'low' {
  if (priority >= 7) return 'high';
  if (priority >= 4) return 'medium';
  return 'low';
}

const priorityConfig = {
  high: { label: 'High', color: 'text-red-600 bg-red-50 border-red-200' },
  medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  low: { label: 'Low', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

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

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimestamp(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  // Previous month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, inMonth: false });
  }
  // Current month
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Next month padding to fill 6 rows (42 cells) or at least complete the last row
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }
  return cells;
}

const EVENT_DOT_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function dotColorForEvent(event: CalendarEvent, index: number): string {
  if (event.color) {
    return ''; // we'll use inline style
  }
  return EVENT_DOT_COLORS[index % EVENT_DOT_COLORS.length];
}

// Mock inbox items until backend inbox exists
const mockInboxItems = [
  {
    id: '1',
    title: 'Reminder: Meeting Tomorrow',
    message: "Don't forget about the project review meeting at 10am tomorrow.",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: '2',
    title: 'Task Completed',
    message: 'Your task "Review documentation" has been marked as complete.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: true,
  },
  {
    id: '3',
    title: 'Welcome to Starbot',
    message: "Welcome! This is your inbox where you'll find reminders and updates from Starbot.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
];

type HomeTab = 'dashboard' | 'calendar';

// ── Main Component ───────────────────────────────────────

export function HomePanel() {
  const queryClient = useQueryClient();
  const { setSelectedChatId, setSelectedView } = useUIStore();
  const session = readAuthSession();
  const userEmail = session?.email;

  const [activeTab, setActiveTab] = useState<HomeTab>('dashboard');

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(toDateKey(now));

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminder: '30min',
    location: '',
  });

  // Month navigation
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };
  const goToToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    setSelectedDay(toDateKey(t));
  };

  // Calendar grid cells
  const gridCells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Date range for API query (covers padding days too)
  const rangeStart = gridCells[0].date.toISOString();
  const rangeEnd = new Date(gridCells[gridCells.length - 1].date.getTime() + 86400000 - 1).toISOString();

  // ── Queries ──

  const { data: projects } = useQuery({
    queryKey: ['projects', userEmail],
    queryFn: () => (userEmail ? projectsApi.list(userEmail) : Promise.resolve([])),
    enabled: !!userEmail,
  });
  const currentProjectId = projects?.[0]?.id;

  const { data: tasks } = useQuery({
    queryKey: ['tasks', currentProjectId],
    queryFn: () => tasksApi.list({ limit: 10 }),
    enabled: !!currentProjectId,
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ['calendar-month', viewYear, viewMonth],
    queryFn: () =>
      calendarApi.list({ startDate: rangeStart, endDate: rangeEnd }),
  });

  const { data: favoriteChats } = useQuery({
    queryKey: ['favorites', currentProjectId],
    queryFn: () => (currentProjectId ? chatsApi.favorites(currentProjectId) : Promise.resolve([])),
    enabled: !!currentProjectId,
  });

  // ── Mutations ──

  const createEventMutation = useMutation({
    mutationFn: (data: CreateEventInput) => calendarApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      setIsAddEventOpen(false);
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        reminder: '30min',
        location: '',
      });
      toast.success('Event added');
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : 'Failed to add event'),
  });

  const updateEventStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) =>
      calendarApi.update(eventId, {
        status: status as 'scheduled' | 'completed' | 'cancelled',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      toast.success('Event updated');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => calendarApi.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      toast.success('Event deleted');
    },
  });

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime) {
      toast.error('Please fill in title and start time');
      return;
    }
    createEventMutation.mutate(formData);
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (currentStatus === 'COMPLETED') {
      await tasksApi.update(taskId, { status: 'PENDING' });
    } else {
      await tasksApi.complete(taskId);
    }
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // ── Derived data ──

  const allTasks = tasks || [];
  const pendingTasks = allTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  );
  const completedCount = allTasks.filter((t) => t.status === 'COMPLETED').length;
  const progress =
    allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

  // Group events by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (calendarEvents || []).forEach((ev) => {
      const key = ev.startTime.substring(0, 10); // YYYY-MM-DD
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    });
    return map;
  }, [calendarEvents]);

  const selectedDayEvents = selectedDay ? eventsByDate.get(selectedDay) || [] : [];
  const todayKey = toDateKey(new Date());
  const unreadCount = mockInboxItems.filter((i) => !i.read).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-slate-600" />
            <h1 className="text-lg font-semibold text-slate-900">Home</h1>
          </div>
          {activeTab === 'calendar' && (
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-slate-900 text-slate-50 hover:bg-slate-800">
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="evt-title" className="text-sm font-medium text-slate-700">
                      Title *
                    </label>
                    <Input
                      id="evt-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Event title"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="evt-start" className="text-sm font-medium text-slate-700">
                        Start *
                      </label>
                      <Input
                        id="evt-start"
                        type="datetime-local"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({ ...formData, startTime: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="evt-end" className="text-sm font-medium text-slate-700">
                        End
                      </label>
                      <Input
                        id="evt-end"
                        type="datetime-local"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="evt-loc" className="text-sm font-medium text-slate-700">
                      Location
                    </label>
                    <Input
                      id="evt-loc"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Event location"
                    />
                  </div>
                  <div>
                    <label htmlFor="evt-desc" className="text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <Textarea
                      id="evt-desc"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Event details..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddEventOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createEventMutation.isPending}
                      className="bg-slate-900 text-slate-50 hover:bg-slate-800"
                    >
                      {createEventMutation.isPending ? 'Adding...' : 'Add Event'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard'
              ? 'rounded-xl border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white'
              : 'rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveTab('calendar')}
            className={activeTab === 'calendar'
              ? 'rounded-xl border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white'
              : 'rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={ListTodo} label="Tasks" value={allTasks.length} />
              <StatCard icon={CheckCircle2} label="Completed" value={completedCount} />
              <StatCard icon={TrendingUp} label="Progress" value={`${progress}%`} />
              <StatCard icon={Bell} label="Unread" value={unreadCount} />
            </div>

            {/* ── Cards Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ── Tasks ── */}
              <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-slate-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
                  </div>
                  <span className="text-xs text-slate-500">{pendingTasks.length} pending</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {allTasks.length === 0 ? (
                    <EmptyState icon={ListTodo} text="No tasks yet" />
                  ) : (
                    allTasks.slice(0, 8).map((task) => {
                      const level = getPriorityLevel(task.priority);
                      const config = priorityConfig[level];
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            'px-4 py-3 hover:bg-slate-50 transition-colors',
                            task.status === 'COMPLETED' && 'opacity-60',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleTaskStatus(task.id, task.status)}
                              className="shrink-0"
                            >
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-5 w-5 text-slate-400" />
                              ) : (
                                <Circle className="h-5 w-5 text-slate-400" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h3
                                className={cn(
                                  'text-sm font-medium truncate',
                                  task.status === 'COMPLETED'
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-800',
                                )}
                              >
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={cn(
                                    'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide border',
                                    config.color,
                                  )}
                                >
                                  {config.label}
                                </span>
                                {task.due_date && (
                                  <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="h-3 w-3" />
                                    {formatDueDate(task.due_date)}
                                  </span>
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

              {/* ── Inbox ── */}
              <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-slate-600" />
                    <h2 className="text-sm font-semibold text-slate-900">Inbox</h2>
                  </div>
                  <span className="text-xs text-slate-500">{unreadCount} unread</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {mockInboxItems.length === 0 ? (
                    <EmptyState icon={Bell} text="No messages" />
                  ) : (
                    mockInboxItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer',
                          !item.read && 'bg-blue-50/50',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-1 h-2 w-2 rounded-full shrink-0',
                              item.read ? 'bg-slate-300' : 'bg-blue-500',
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3
                                className={cn(
                                  'text-sm font-medium truncate',
                                  item.read ? 'text-slate-700' : 'text-slate-900',
                                )}
                              >
                                {item.title}
                              </h3>
                              {!item.read && (
                                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-100 text-blue-700 rounded-full shrink-0">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-1">{item.message}</p>
                            <span className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                              <Clock className="h-3 w-3" />
                              {formatTimestamp(item.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Favorite Threads ── */}
              <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200/80 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-900">Favorite Threads</h2>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {!favoriteChats || favoriteChats.length === 0 ? (
                    <EmptyState icon={Star} text="No favorites yet" />
                  ) : (
                    favoriteChats.map((chat) => (
                      <div
                        key={chat.id}
                        className="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedChatId(chat.id);
                          setSelectedView('chat');
                        }}
                      >
                        <h3 className="text-sm font-medium text-slate-800 truncate">
                          {chat.title}
                        </h3>
                        {chat.folder && (
                          <p className="text-xs text-slate-400 mt-1">{chat.folder.name}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── Reminders ── */}
              <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200/80 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-900">Reminders</h2>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {!calendarEvents ||
                  calendarEvents.filter((e) => e.reminder).length === 0 ? (
                    <EmptyState icon={Bell} text="No reminders set" />
                  ) : (
                    calendarEvents
                      .filter((e) => e.reminder)
                      .slice(0, 5)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Bell className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-slate-800 truncate">
                                {event.title}
                              </h3>
                              <span className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                <Clock className="h-3 w-3" />
                                {formatEventTime(event.startTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <div className="rounded-xl border border-slate-200/80 bg-white/80 shadow-sm">
            {/* Calendar header */}
            <div className="px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToToday}
                  className="text-xs h-7 px-2"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {gridCells.map((cell, i) => {
                const key = toDateKey(cell.date);
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;
                const dayEvents = eventsByDate.get(key) || [];
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    className={cn(
                      'relative flex flex-col items-center py-2 px-1 min-h-[3.5rem] border-b border-r border-slate-100 transition-colors',
                      'hover:bg-slate-50',
                      !cell.inMonth && 'text-slate-300',
                      cell.inMonth && 'text-slate-700',
                      isSelected && 'bg-slate-100 ring-1 ring-inset ring-slate-300',
                      isToday && !isSelected && 'bg-blue-50/60',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm leading-none font-medium',
                        isToday &&
                          'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs',
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                    {/* Event dots */}
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                        {dayEvents.slice(0, 3).map((ev, ei) => (
                          <span
                            key={ev.id}
                            className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              !ev.color && dotColorForEvent(ev, ei),
                            )}
                            style={ev.color ? { backgroundColor: ev.color } : undefined}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] leading-none text-slate-400">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day detail panel */}
            {selectedDay && (
              <div className="border-t border-slate-200/80 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedDayEvents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No events on this day
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((event) => (
                      <DayEventCard
                        key={event.id}
                        event={event}
                        onComplete={() =>
                          updateEventStatusMutation.mutate({
                            eventId: event.id,
                            status: 'completed',
                          })
                        }
                        onCancel={() =>
                          updateEventStatusMutation.mutate({
                            eventId: event.id,
                            status: 'cancelled',
                          })
                        }
                        onDelete={() => deleteEventMutation.mutate(event.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wide mb-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Icon className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function DayEventCard({
  event,
  onComplete,
  onCancel,
  onDelete,
}: {
  event: CalendarEvent;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const statusStyle: Record<string, string> = {
    scheduled: 'border-l-blue-500 bg-blue-50/50',
    completed: 'border-l-green-500 bg-green-50/50',
    cancelled: 'border-l-slate-400 bg-slate-50/50 opacity-60',
  };
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200/80 border-l-[3px] p-3 transition-all hover:shadow-sm',
        statusStyle[event.status] || statusStyle.scheduled,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-900 truncate">{event.title}</h4>
          {event.description && (
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
              {event.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(event.startTime)}
              {event.endTime && ` - ${formatTime(event.endTime)}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        {event.status === 'scheduled' && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onComplete}
              className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
              title="Complete"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-7 w-7 p-0 text-slate-500 hover:bg-slate-100"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
