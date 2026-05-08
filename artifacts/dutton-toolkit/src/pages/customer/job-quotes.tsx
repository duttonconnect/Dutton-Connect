import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  User,
  Inbox,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  loadQuotesForRequest,
  loadJobRequestsForCustomer,
  acceptQuote,
  scheduleJobRequest,
  loadProProfile,
  type MatchQuote,
  type FirestoreJobRequest,
  type ProProfile,
} from "@/lib/matching";
import { notifyQuoteAccepted } from "@/lib/notifications";
import { saveCalendarEvent } from "@/lib/calendar";
import { getOrCreateConversation } from "@/lib/messaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const QUOTE_STATUS_STYLE: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};
const QUOTE_STATUS_LABEL: Record<string, string> = {
  sent: "New",
  accepted: "Accepted",
  declined: "Declined",
};

export default function JobQuotes() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [job, setJob] = useState<FirestoreJobRequest | null>(null);
  const [quotes, setQuotes] = useState<MatchQuote[]>([]);
  const [proProfiles, setProProfiles] = useState<Record<string, ProProfile>>({});
  const [loading, setLoading] = useState(true);

  const [accepting, setAccepting] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedNotes, setSchedNotes] = useState("");
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    if (!user?.uid || !jobId) return;
    setLoading(true);

    Promise.all([
      loadJobRequestsForCustomer(user.uid),
      loadQuotesForRequest(jobId),
    ]).then(([allJobs, fetchedQuotes]) => {
      const found = allJobs.find((j) => j.id === jobId) ?? null;
      setJob(found);
      const sorted = fetchedQuotes.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setQuotes(sorted);
      // Load pro profiles
      const proIds = [...new Set(sorted.map((q) => q.proId))];
      proIds.forEach((pid) => {
        loadProProfile(pid).then((profile) => {
          if (profile) {
            setProProfiles((prev) => ({ ...prev, [pid]: profile }));
          }
        });
      });
    }).finally(() => setLoading(false));
  }, [user?.uid, jobId]);

  const handleAccept = async (quote: MatchQuote) => {
    if (!job || !user) return;
    setAccepting(quote.id);
    const ok = await acceptQuote(jobId, quote.id, quote.proId);
    setAccepting(null);
    if (ok) {
      toast.success("Job booked! You can now schedule a date.");
      setJob((prev) => prev ? { ...prev, status: "accepted", acceptedProId: quote.proId, acceptedQuoteId: quote.id } : prev);
      setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, status: "accepted" } : q));
      void notifyQuoteAccepted(
        quote.proId,
        user.displayName ?? "A customer",
        job.title,
        jobId,
      );
    } else {
      toast.error("Could not accept quote. Check your connection.");
    }
  };

  const handleMessagePro = async (quote: MatchQuote) => {
    if (!user || !job) return;
    setMessagingId(quote.id);
    try {
      const convId = await getOrCreateConversation(
        [user.uid, quote.proId],
        jobId,
        job.title,
      );
      if (convId) navigate(`/messages/${convId}`);
      else toast.error("Could not open conversation. Try again.");
    } finally {
      setMessagingId(null);
    }
  };

  const handleSchedule = async () => {
    if (!schedDate) {
      toast.error("Please pick a date.");
      return;
    }
    if (!job?.acceptedProId || !user) return;
    setScheduling(true);
    const ok = await scheduleJobRequest(jobId, schedDate, schedTime, schedNotes.trim());
    if (ok) {
      // Create calendar events for both customer and pro
      const title = `Job: ${job.title}`;
      await saveCalendarEvent({
        userId: user.uid,
        title,
        type: "Job",
        date: schedDate,
        time: schedTime,
        notes: schedNotes.trim(),
        jobId: jobId,
      });
      await saveCalendarEvent({
        userId: job.acceptedProId,
        title,
        type: "Job",
        date: schedDate,
        time: schedTime,
        notes: schedNotes.trim(),
        jobId: jobId,
      });
      toast.success("Job scheduled!");
      setJob((prev) => prev ? { ...prev, status: "scheduled", scheduledDate: schedDate, scheduledTime: schedTime, scheduleNotes: schedNotes.trim() } : prev);
      setScheduleOpen(false);
    } else {
      toast.error("Could not schedule job. Check your connection.");
    }
    setScheduling(false);
  };

  const acceptedQuote = quotes.find((q) => q.id === job?.acceptedQuoteId);
  const isAccepted = job?.status === "accepted" || job?.status === "scheduled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/my-jobs">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
            {job ? job.title : "Quotes"}
          </h1>
          <p className="text-gray-500 text-sm">
            {loading ? "Loading…" : `${quotes.length} quote${quotes.length !== 1 ? "s" : ""} received`}
          </p>
        </div>
      </div>

      {/* Accepted / Scheduled banner */}
      {job && isAccepted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold text-sm">
                {job.status === "scheduled" ? "Job Scheduled" : "Quote Accepted"}
              </div>
              {job.scheduledDate && (
                <div className="text-xs mt-0.5">
                  {format(new Date(job.scheduledDate), "EEEE, MMMM d, yyyy")}
                  {job.scheduledTime && ` at ${job.scheduledTime}`}
                </div>
              )}
            </div>
          </div>
          {job.status === "accepted" && (
            <Button size="sm" onClick={() => setScheduleOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" /> Schedule Job
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-sm">Loading quotes…</span>
          </CardContent>
        </Card>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No quotes yet.</p>
            <p className="text-xs mt-1">Pros in your area will send quotes soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => {
            const pro = proProfiles[quote.proId];
            const isThisAccepted = quote.id === job?.acceptedQuoteId;
            return (
              <Card
                key={quote.id}
                className={isThisAccepted ? "border-emerald-300 ring-1 ring-emerald-200" : ""}
              >
                <CardContent className="p-5 flex flex-col gap-3">
                  {/* Pro info + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {pro?.businessName || pro?.displayName || "Pro"}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${QUOTE_STATUS_STYLE[quote.status] ?? ""}`}
                          >
                            {QUOTE_STATUS_LABEL[quote.status] ?? quote.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(quote.createdAt), "MMM d")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-muted-foreground">Quote</div>
                      <div className="flex items-center gap-0.5 font-bold text-xl">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        {quote.amount.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Pro services */}
                  {pro?.services && pro.services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pro.services.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Message */}
                  {quote.message && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border">
                      {quote.message}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    {/* Accept */}
                    {!isAccepted && (
                      <Button
                        className="flex-1"
                        disabled={accepting === quote.id}
                        onClick={() => handleAccept(quote)}
                      >
                        {accepting === quote.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Accept Quote
                      </Button>
                    )}

                    {isThisAccepted && job?.status === "accepted" && (
                      <Button className="flex-1" onClick={() => setScheduleOpen(true)}>
                        <Calendar className="mr-2 h-4 w-4" /> Schedule Job
                      </Button>
                    )}

                    {/* Message pro */}
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={messagingId === quote.id}
                      onClick={() => handleMessagePro(quote)}
                    >
                      {messagingId === quote.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="mr-2 h-4 w-4" />
                      )}
                      Message Pro
                    </Button>

                    {/* View pro profile */}
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => navigate(`/pros/${quote.proId}`)}
                    >
                      <User className="mr-2 h-4 w-4" /> View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={(o) => { if (!o) setScheduleOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="sched-date">Date</Label>
                <Input
                  id="sched-date"
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="sched-time">Time (optional)</Label>
                <Input
                  id="sched-time"
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sched-notes">Notes (optional)</Label>
              <Textarea
                id="sched-notes"
                placeholder="Access instructions, gate codes, special requests…"
                rows={3}
                value={schedNotes}
                onChange={(e) => setSchedNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={scheduling || !schedDate}>
              {scheduling ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling…</>
              ) : (
                <><Calendar className="mr-2 h-4 w-4" /> Confirm Schedule</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
