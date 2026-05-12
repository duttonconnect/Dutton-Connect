import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  parseISO,
} from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Trash2,
  Loader2,
  Clock,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useAppStore } from "@/lib/store";
import {
  CALENDAR_EVENT_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  loadCalendarEvents,
  saveCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const TYPE_COLORS: Record<CalendarEventType, string> = {
  Job: "bg-blue-100 text-blue-800",
  "Quote Follow-up": "bg-amber-100 text-amber-800",
  "Payment Reminder": "bg-red-100 text-red-800",
  "Personal Note": "bg-gray-100 text-gray-700",
};

const TYPE_DOT: Record<CalendarEventType, string> = {
  Job: "bg-blue-500",
  "Quote Follow-up": "bg-amber-500",
  "Payment Reminder": "bg-red-500",
  "Personal Note": "bg-gray-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user } = useAuth();
  const { jobs, customers } = useAppStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<CalendarEventType>("Personal Note");
  const [formDate, setFormDate] = useState(toDateKey(new Date()));
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formJobId, setFormJobId] = useState("none");
  const [formCustomerId, setFormCustomerId] = useState("none");

  // Load user's events from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadCalendarEvents(user.uid)
      .then(setEvents)
      .catch((err) => console.error("[Calendar] load error:", err))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  // Build the calendar grid days (fills partial first/last weeks)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [currentMonth]);

  // Index Firestore events by date key
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [events]);

  // Index jobs by date key (jobs use scheduledDate: "YYYY-MM-DD" or ISO)
  const jobsByDate = useMemo(() => {
    const map: Record<string, typeof jobs> = {};
    for (const job of jobs) {
      const key = job.scheduledDate.slice(0, 10);
      (map[key] ??= []).push(job);
    }
    return map;
  }, [jobs]);

  // Everything on the selected date
  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const selectedJobs = jobsByDate[selectedDate] ?? [];

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function openAddDialog(date?: string) {
    setFormTitle("");
    setFormType("Personal Note");
    setFormDate(date ?? selectedDate);
    setFormTime("");
    setFormNotes("");
    setFormJobId("none");
    setFormCustomerId("none");
    setAddDialogOpen(true);
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!formDate) {
      toast.error("Date is required.");
      return;
    }
    if (!user?.uid) {
      toast.error("You must be signed in to save events.");
      return;
    }
    setSavingEvent(true);
    const id = await saveCalendarEvent({
      userId: user.uid,
      title: formTitle.trim(),
      type: formType,
      date: formDate,
      time: formTime,
      notes: formNotes.trim(),
      jobId: formJobId !== "none" ? formJobId : undefined,
      customerId: formCustomerId !== "none" ? formCustomerId : undefined,
    });
    setSavingEvent(false);
    if (id) {
      const newEvent: CalendarEvent = {
        id,
        userId: user.uid,
        title: formTitle.trim(),
        type: formType,
        date: formDate,
        time: formTime,
        notes: formNotes.trim(),
        jobId: formJobId !== "none" ? formJobId : undefined,
        customerId: formCustomerId !== "none" ? formCustomerId : undefined,
        createdAt: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, newEvent]);
      setSelectedDate(formDate);
      toast.success("Event saved");
      setAddDialogOpen(false);
    } else {
      toast.error("Could not save event. Check your connection and try again.");
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Delete this event?")) return;
    setDeletingId(eventId);
    await deleteCalendarEvent(eventId);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    setDeletingId(null);
    toast.success("Event deleted");
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-gray-500">
            Scheduled jobs and custom events in one view.
          </p>
        </div>
        <Button onClick={() => openAddDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Calendar card */}
      <Card>
        {/* Month navigation */}
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
              {calendarDays.map((day) => {
                const key = toDateKey(day);
                const dayEvents = eventsByDate[key] ?? [];
                const dayJobs = jobsByDate[key] ?? [];
                const isSelected = key === selectedDate;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDay = isToday(day);
                const hasItems = dayEvents.length > 0 || dayJobs.length > 0;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    className={[
                      "min-h-[56px] sm:min-h-[72px] p-1 sm:p-1.5 flex flex-col items-start text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary",
                      isSelected
                        ? "bg-primary/10"
                        : isCurrentMonth
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100",
                    ].join(" ")}
                    aria-label={format(day, "MMMM d, yyyy")}
                    aria-pressed={isSelected}
                  >
                    {/* Day number */}
                    <span
                      className={[
                        "text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5",
                        isTodayDay
                          ? "bg-primary text-white"
                          : isSelected
                            ? "text-primary font-bold"
                            : isCurrentMonth
                              ? "text-gray-900"
                              : "text-gray-400",
                      ].join(" ")}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Event pills (desktop) / dots (mobile) */}
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                      {/* Jobs */}
                      {dayJobs.slice(0, 2).map((job) => (
                        <span
                          key={job.id}
                          className="hidden sm:block truncate text-[10px] font-medium rounded px-1 bg-blue-100 text-blue-800 leading-tight py-0.5"
                          title={job.title}
                        >
                          {job.title}
                        </span>
                      ))}
                      {/* Custom events */}
                      {dayEvents.slice(0, 2).map((ev) => (
                        <span
                          key={ev.id}
                          className={`hidden sm:block truncate text-[10px] font-medium rounded px-1 leading-tight py-0.5 ${TYPE_COLORS[ev.type]}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </span>
                      ))}
                      {/* Mobile: show dots */}
                      {hasItems && (
                        <div className="flex gap-0.5 sm:hidden mt-0.5 flex-wrap">
                          {dayJobs.slice(0, 3).map((j) => (
                            <span key={j.id} className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                          ))}
                          {dayEvents.slice(0, 3).map((ev) => (
                            <span key={ev.id} className={`h-1.5 w-1.5 rounded-full inline-block ${TYPE_DOT[ev.type]}`} />
                          ))}
                        </div>
                      )}
                      {/* Overflow indicator */}
                      {dayJobs.length + dayEvents.length > 2 && (
                        <span className="hidden sm:block text-[10px] text-muted-foreground pl-1">
                          +{dayJobs.length + dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected day detail */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {selectedDate
                ? format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")
                : "Select a date"}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAddDialog(selectedDate)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {selectedJobs.length === 0 && selectedEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-25" />
              <p className="text-sm">Nothing scheduled for this day.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs text-primary"
                onClick={() => openAddDialog(selectedDate)}
              >
                Add an event
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Jobs for this day */}
              {selectedJobs.map((job) => {
                const customer = customers.find((c) => c.id === job.customerId);
                return (
                  <div
                    key={job.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-blue-50 border-blue-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          Job
                        </span>
                        <span className="font-medium text-sm truncate">{job.title}</span>
                      </div>
                      {customer && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {customer.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{job.address}</p>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 capitalize">
                      {job.status.replace("_", " ")}
                    </div>
                  </div>
                );
              })}

              {/* Custom events for this day */}
              {selectedEvents
                .slice()
                .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[ev.type]}`}
                        >
                          {ev.type}
                        </span>
                        <span className="font-medium text-sm truncate">{ev.title}</span>
                      </div>
                      {ev.time && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {ev.time}
                        </p>
                      )}
                      {ev.notes && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                          {ev.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      disabled={deletingId === ev.id}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Delete event"
                    >
                      {deletingId === ev.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Event Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(o) => { if (!o) setAddDialogOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-4 py-1">
            <div>
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                placeholder="Event title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as CalendarEventType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ev-date">Date</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="ev-time">Time (optional)</Label>
                <Input
                  id="ev-time"
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ev-notes">Notes (optional)</Label>
              <Textarea
                id="ev-notes"
                placeholder="Any details or reminders…"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Related Job — only available in Pro mode where jobs exist */}
            {jobs.length > 0 && (
              <div>
                <Label>Related Job (optional)</Label>
                <Select value={formJobId} onValueChange={setFormJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Related Customer */}
            {customers.length > 0 && (
              <div>
                <Label>Related Customer (optional)</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={savingEvent}
              >
                <X className="mr-1.5 h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={savingEvent}>
                {savingEvent ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  "Save Event"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
