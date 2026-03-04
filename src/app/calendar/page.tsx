'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarApi, type CalendarEvent, type CreateEventInput } from '@/lib/api/calendar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarPlus, Calendar as CalendarIcon, Clock, MapPin, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
};

// Date formatting helpers
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

function formatShortDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [view, setView] = useState<'upcoming' | 'all'>('upcoming');

  // Form state
  const [formData, setFormData] = useState<CreateEventInput>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    reminder: '30min',
    location: '',
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar', view],
    queryFn: () => view === 'upcoming' ? calendarApi.upcoming(7) : calendarApi.list({ status: 'scheduled' }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateEventInput) => calendarApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsAddDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        reminder: '30min',
        location: '',
      });
      toast.success('Event added to calendar');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add event');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: string }) =>
      calendarApi.update(eventId, { status: status as 'scheduled' | 'completed' | 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Event updated');
    },
    onError: () => {
      toast.error('Failed to update event');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => calendarApi.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Event deleted');
    },
    onError: () => {
      toast.error('Failed to delete event');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startTime) {
      toast.error('Please fill in title and start time');
      return;
    }
    createMutation.mutate(formData);
  };

  const upcomingEvents = events?.filter(e => e.status === 'scheduled') || [];
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = upcomingEvents.filter(e => e.startTime.startsWith(today));
  const laterEvents = upcomingEvents.filter(e => !e.startTime.startsWith(today));

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/70">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Calendar</p>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            My Events
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button
              variant={view === 'upcoming' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('upcoming')}
              className="rounded-none border-0"
            >
              Upcoming
            </Button>
            <Button
              variant={view === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('all')}
              className="rounded-none border-0"
            >
              All Events
            </Button>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 text-slate-50 hover:bg-slate-800">
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="text-sm font-medium text-slate-700">Title *</label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Event title"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="text-sm font-medium text-slate-700">Start Time *</label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="text-sm font-medium text-slate-700">End Time</label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="location" className="text-sm font-medium text-slate-700">Location</label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Event location"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="text-sm font-medium text-slate-700">Description</label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Event details..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-slate-900 text-slate-50 hover:bg-slate-800"
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Event'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading events...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-8 py-12 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No upcoming events</h3>
              <p className="text-sm text-slate-600 mb-4">
                You don't have any events scheduled. Click "Add Event" to create one.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {todayEvents.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Today</h2>
                  <div className="space-y-2">
                    {todayEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onComplete={() => updateStatusMutation.mutate({ eventId: event.id, status: 'completed' })}
                        onCancel={() => updateStatusMutation.mutate({ eventId: event.id, status: 'cancelled' })}
                        onDelete={() => deleteMutation.mutate(event.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {laterEvents.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Upcoming</h2>
                  <div className="space-y-2">
                    {laterEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onComplete={() => updateStatusMutation.mutate({ eventId: event.id, status: 'completed' })}
                        onCancel={() => updateStatusMutation.mutate({ eventId: event.id, status: 'cancelled' })}
                        onDelete={() => deleteMutation.mutate(event.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function EventCard({
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
  const isToday = event.startTime.startsWith(new Date().toISOString().split('T')[0]);

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all hover:shadow-md',
      statusColors[event.status] || statusColors.scheduled
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{event.title}</h3>
          {event.description && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{event.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
            {isToday ? (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <Clock className="h-4 w-4" />
                Today at {formatTime(event.startTime)}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {formatShortDate(event.startTime)}
              </span>
            )}
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {event.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onComplete}
            className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
            title="Mark complete"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-100"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
