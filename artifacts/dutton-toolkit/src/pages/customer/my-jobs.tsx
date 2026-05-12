import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Briefcase,
  Plus,
  MapPin,
  Calendar,
  AlertCircle,
  MessageSquare,
  DollarSign,
  Loader2,
  Star,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  loadJobRequestsForCustomer,
  loadQuotesForRequest,
  loadExistingReview,
  type FirestoreJobRequest,
} from "@/lib/matching";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-600",
  accepted: "bg-emerald-100 text-emerald-800",
  scheduled: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  accepted: "Quote Accepted",
  scheduled: "Scheduled",
  completed: "Completed",
};

const URGENCY_STYLE: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Normal: "bg-blue-100 text-blue-800",
  Soon: "bg-yellow-100 text-yellow-800",
  Urgent: "bg-amber-100 text-amber-800",
  Emergency: "bg-red-100 text-red-800",
};

function canReview(status: string) {
  return status === "accepted" || status === "scheduled" || status === "completed";
}

export default function MyJobs() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [jobs, setJobs] = useState<FirestoreJobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) { setLoading(false); return; }
    setLoading(true);
    loadJobRequestsForCustomer(user.uid)
      .then((results) => {
        const sorted = results.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setJobs(sorted);
        // Load quote counts in parallel
        sorted.forEach((job) => {
          loadQuotesForRequest(job.id).then((quotes) => {
            setQuoteCounts((prev) => ({ ...prev, [job.id]: quotes.length }));
          });
          // Check if already reviewed
          if (canReview(job.status) && job.acceptedProId) {
            loadExistingReview(job.id, user.uid).then((existing) => {
              if (existing) {
                setReviewedIds((prev) => new Set(prev).add(job.id));
              }
            });
          }
        });
      })
      .finally(() => setLoading(false));
  }, [user?.uid, authLoading]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Work</h1>
            <p className="text-gray-500 text-sm">
              {loading ? "Loading…" : `${jobs.length} service request${jobs.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <Link href="/post-request">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Request Service
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-14 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-sm">Loading your jobs…</span>
          </CardContent>
        </Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No service requests yet.</p>
            <p className="text-xs mt-1">Request a service and local pros will send you quotes.</p>
            <Link href="/post-request">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Request Your First Service
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const qCount = quoteCounts[job.id] ?? 0;
            const reviewed = reviewedIds.has(job.id);
            const reviewable = canReview(job.status) && !!job.acceptedProId;

            return (
              <Card key={job.id} className="overflow-hidden rounded-2xl border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col gap-3">
                  {/* Header row */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-lg truncate" title={job.title}>
                        {job.title}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {job.category}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUS_STYLE[job.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {STATUS_LABEL[job.status] ?? job.status}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${URGENCY_STYLE[job.urgency] ?? ""}`}
                        >
                          {job.urgency === "Urgent" && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {job.urgency}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">Budget</div>
                      <div className="font-bold text-lg flex items-center justify-end gap-0.5">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        {job.budget.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {job.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Wanted by{" "}
                      {format(new Date(job.preferredDate), "MMM d, yyyy")}
                    </span>
                    {job.scheduledDate && (
                      <span className="flex items-center gap-1 text-purple-700 font-medium">
                        <Calendar className="h-3.5 w-3.5" /> Scheduled{" "}
                        {format(new Date(job.scheduledDate), "MMM d, yyyy")}
                        {job.scheduledTime && ` at ${job.scheduledTime}`}
                      </span>
                    )}
                  </div>

                  {/* Quote count */}
                  {qCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {qCount} quote{qCount > 1 ? "s" : ""} received
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <Button
                      className="flex-1"
                      onClick={() => navigate(`/my-jobs/${job.id}/quotes`)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      View Quotes
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </Button>

                    {reviewable && (
                      reviewed ? (
                        <Button variant="outline" className="flex-1" disabled>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                          Review Submitted
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            navigate(`/my-jobs/${job.id}/review/${job.acceptedProId}`)
                          }
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Leave Review
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
