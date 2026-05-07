import { useState } from "react";
import { ArrowLeft, Bell, Plus, Trash2, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format, addDays, isPast, isWithinInterval } from "date-fns";

import { useAppStore, type ServiceReminder } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PRESETS = [
  { title: "HVAC Filter Change", category: "HVAC", intervalDays: 90 },
  { title: "Gutter Cleaning", category: "Exterior", intervalDays: 180 },
  { title: "Lawn Mowing", category: "Yard", intervalDays: 7 },
  { title: "AC Tune-Up", category: "HVAC", intervalDays: 365 },
  { title: "Chimney Inspection", category: "Safety", intervalDays: 365 },
  { title: "Dryer Vent Cleaning", category: "Safety", intervalDays: 365 },
  { title: "Pest Inspection", category: "Pest Control", intervalDays: 180 },
  { title: "Water Heater Flush", category: "Plumbing", intervalDays: 365 },
  { title: "Smoke Detector Test", category: "Safety", intervalDays: 30 },
  { title: "Pressure Washing", category: "Exterior", intervalDays: 365 },
];

const INTERVALS = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Every 3 months", days: 90 },
  { label: "Every 6 months", days: 180 },
  { label: "Yearly", days: 365 },
  { label: "Custom", days: 0 },
];

function reminderStatus(r: ServiceReminder): "overdue" | "soon" | "ok" {
  const due = new Date(r.nextDue);
  if (isPast(due)) return "overdue";
  if (isWithinInterval(due, { start: new Date(), end: addDays(new Date(), 14) })) return "soon";
  return "ok";
}

export default function RemindersPage() {
  const { serviceReminders, addServiceReminder, updateServiceReminder, deleteServiceReminder } =
    useAppStore();

  const reminders = serviceReminders ?? [];

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [intervalDays, setIntervalDays] = useState(90);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [lastDone, setLastDone] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setIntervalDays(90);
    setCustomDays("");
    setUseCustom(false);
    setLastDone(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setShowForm(false);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setTitle(p.title);
    setCategory(p.category);
    setIntervalDays(p.intervalDays);
    setUseCustom(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a reminder title.");
      return;
    }
    const days = useCustom ? parseInt(customDays) || 30 : intervalDays;
    const lastDate = lastDone ? new Date(lastDone + "T12:00:00") : new Date();
    const nextDue = addDays(lastDate, days).toISOString();
    addServiceReminder({
      title: title.trim(),
      category: category.trim() || "General",
      intervalDays: days,
      lastDone: lastDate.toISOString(),
      nextDue,
      notes: notes.trim(),
    });
    toast.success("Reminder added.");
    resetForm();
  };

  const handleMarkDone = (r: ServiceReminder) => {
    const now = new Date();
    const nextDue = addDays(now, r.intervalDays).toISOString();
    updateServiceReminder(r.id, { lastDone: now.toISOString(), nextDue });
    toast.success(`Marked done — next due ${format(addDays(now, r.intervalDays), "MMM d, yyyy")}.`);
  };

  const overdue = reminders.filter((r) => reminderStatus(r) === "overdue");
  const soon = reminders.filter((r) => reminderStatus(r) === "soon");
  const ok = reminders.filter((r) => reminderStatus(r) === "ok");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Reminders</h1>
            <p className="text-sm text-muted-foreground">
              Never miss routine home maintenance again.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          {showForm ? <ChevronUp className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "Add Reminder"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-5">
            <div className="text-sm font-semibold">New Reminder</div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick-pick a common task</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                      title === p.title
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="r-title">Task Name</Label>
                  <Input
                    id="r-title"
                    placeholder="HVAC Filter Change"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-cat">Category</Label>
                  <Input
                    id="r-cat"
                    placeholder="HVAC, Plumbing, Yard…"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>How often?</Label>
                <div className="flex flex-wrap gap-2">
                  {INTERVALS.map((iv) => (
                    <button
                      key={iv.label}
                      type="button"
                      onClick={() => {
                        if (iv.days === 0) {
                          setUseCustom(true);
                        } else {
                          setUseCustom(false);
                          setIntervalDays(iv.days);
                        }
                      }}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        (iv.days === 0 && useCustom) ||
                        (iv.days !== 0 && !useCustom && intervalDays === iv.days)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                      }`}
                    >
                      {iv.label}
                    </button>
                  ))}
                </div>
                {useCustom && (
                  <Input
                    type="number"
                    placeholder="Custom interval in days"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    min={1}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="r-last">Last completed</Label>
                <Input
                  id="r-last"
                  type="date"
                  value={lastDone}
                  onChange={(e) => setLastDone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  We'll calculate when it's next due from this date.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="r-notes">Notes (optional)</Label>
                <Textarea
                  id="r-notes"
                  placeholder="e.g. Use 16x20x1 filter, stored in garage."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  <Plus className="mr-2 h-4 w-4" /> Add Reminder
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {reminders.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-muted-foreground">
          <Bell className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No reminders yet</p>
          <p className="text-xs mt-1">Add your first home maintenance reminder above.</p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Reminder
          </Button>
        </div>
      )}

      {overdue.length > 0 && (
        <ReminderSection
          title="Overdue"
          reminders={overdue}
          status="overdue"
          onMarkDone={handleMarkDone}
          onDelete={deleteServiceReminder}
        />
      )}

      {soon.length > 0 && (
        <ReminderSection
          title="Due Soon"
          reminders={soon}
          status="soon"
          onMarkDone={handleMarkDone}
          onDelete={deleteServiceReminder}
        />
      )}

      {ok.length > 0 && (
        <ReminderSection
          title="Upcoming"
          reminders={ok}
          status="ok"
          onMarkDone={handleMarkDone}
          onDelete={deleteServiceReminder}
        />
      )}
    </div>
  );
}

function ReminderSection({
  title,
  reminders,
  status,
  onMarkDone,
  onDelete,
}: {
  title: string;
  reminders: ServiceReminder[];
  status: "overdue" | "soon" | "ok";
  onMarkDone: (r: ServiceReminder) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const statusColor = {
    overdue: "text-red-600",
    soon: "text-amber-600",
    ok: "text-gray-500",
  }[status];

  const dotColor = {
    overdue: "bg-red-500",
    soon: "bg-amber-400",
    ok: "bg-green-400",
  }[status];

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
        <span className={`text-sm font-semibold ${statusColor}`}>{title}</span>
        <span className="text-xs text-muted-foreground">({reminders.length})</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto text-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto text-gray-400" />
        )}
      </button>

      {expanded &&
        reminders.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            status={status}
            onMarkDone={onMarkDone}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

function ReminderCard({
  reminder: r,
  status,
  onMarkDone,
  onDelete,
}: {
  reminder: ServiceReminder;
  status: "overdue" | "soon" | "ok";
  onMarkDone: (r: ServiceReminder) => void;
  onDelete: (id: string) => void;
}) {
  const badgeMap = {
    overdue: (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        <AlertCircle className="h-3 w-3 mr-1" /> Overdue
      </Badge>
    ),
    soon: (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        <Clock className="h-3 w-3 mr-1" /> Due soon
      </Badge>
    ),
    ok: (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" /> Upcoming
      </Badge>
    ),
  }[status];

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{r.title}</span>
            {badgeMap}
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <div>
              Due:{" "}
              <span className={status === "overdue" ? "text-red-600 font-medium" : ""}>
                {format(new Date(r.nextDue), "MMM d, yyyy")}
              </span>
              {r.lastDone && (
                <span className="ml-2 text-gray-400">
                  · Last done {format(new Date(r.lastDone), "MMM d, yyyy")}
                </span>
              )}
            </div>
            {r.category && <div>Category: {r.category}</div>}
            {r.notes && <div className="text-gray-500 truncate">{r.notes}</div>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => onMarkDone(r)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Done
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              onDelete(r.id);
              toast.success("Reminder removed.");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
