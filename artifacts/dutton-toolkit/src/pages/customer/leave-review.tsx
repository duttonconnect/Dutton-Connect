import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Star, Loader2, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  loadJobRequestsForCustomer,
  loadExistingReview,
  saveReview,
  loadProProfile,
  type FirestoreJobRequest,
  type ProProfile,
} from "@/lib/matching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function LeaveReview() {
  const params = useParams<{ jobId: string; proId: string }>();
  const jobId = params.jobId;
  const proId = params.proId;
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [job, setJob] = useState<FirestoreJobRequest | null>(null);
  const [proProfile, setProProfile] = useState<ProProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user?.uid || !jobId || !proId) return;
    setLoading(true);
    Promise.all([
      loadJobRequestsForCustomer(user.uid),
      loadExistingReview(jobId, user.uid),
      loadProProfile(proId),
    ]).then(([allJobs, existing, profile]) => {
      const found = allJobs.find((j) => j.id === jobId) ?? null;
      setJob(found);
      setProProfile(profile);
      if (existing) setAlreadyReviewed(true);
    }).finally(() => setLoading(false));
  }, [user?.uid, jobId, proId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const id = await saveReview({
      jobRequestId: jobId,
      customerId: user.uid,
      proId,
      rating,
      text: reviewText.trim(),
    });
    setSubmitting(false);
    if (id) {
      toast.success("Review submitted!");
      setSubmitted(true);
    } else {
      toast.error("Could not submit review. Check your connection.");
    }
  };

  const proName =
    proProfile?.businessName || proProfile?.displayName || "this pro";

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/my-jobs">
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave a Review</h1>
          {job && (
            <p className="text-sm text-muted-foreground truncate">{job.title}</p>
          )}
        </div>
      </div>

      {submitted || alreadyReviewed ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
            <p className="text-base font-semibold text-gray-800">
              {alreadyReviewed && !submitted
                ? "You already reviewed this job."
                : "Review submitted!"}
            </p>
            <p className="text-sm mt-1">Thank you for your feedback.</p>
            <Button className="mt-6" onClick={() => navigate("/my-jobs")}>
              Back to My Jobs
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">
              Rate your experience with {proName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Star picker */}
              <div className="flex flex-col items-center gap-2">
                <StarPicker value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="text-sm font-medium text-gray-700">
                    {STAR_LABELS[rating]}
                  </p>
                )}
              </div>

              {/* Written review */}
              <div>
                <Label htmlFor="review-text">
                  Your review{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="review-text"
                  placeholder="Describe your experience — quality of work, communication, punctuality…"
                  rows={4}
                  className="mt-1"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/my-jobs")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || rating === 0}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
