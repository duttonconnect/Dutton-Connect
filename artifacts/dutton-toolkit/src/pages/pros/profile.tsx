import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Hammer,
  MapPin,
  Star,
  MessageSquare,
  Loader2,
  User,
  CheckCircle2,
  Inbox,
  Zap,
  ShieldCheck,
  Clock,
  BadgeCheck,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/role";
import {
  loadProProfile,
  loadReviewsForPro,
  saveReview,
  sendQuoteRequest,
  type ProProfile,
  type Review,
} from "@/lib/matching";
import { getOrCreateConversation } from "@/lib/messaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sz} ${n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 hover:text-yellow-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ProProfilePage() {
  const params = useParams<{ proId: string }>();
  const proId = params.proId;
  const { user } = useAuth();
  const { role } = useRole();
  const [, navigate] = useLocation();

  const [profile, setProfile] = useState<ProProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  useEffect(() => {
    if (!proId) return;
    setLoadingProfile(true);
    setLoadingReviews(true);
    loadProProfile(proId)
      .then(setProfile)
      .finally(() => setLoadingProfile(false));
    loadReviewsForPro(proId)
      .then((r) =>
        setReviews(r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
      )
      .finally(() => setLoadingReviews(false));
  }, [proId]);

  const handleMessage = async () => {
    if (!user) { navigate("/login"); return; }
    setMessaging(true);
    try {
      const convId = await getOrCreateConversation(
        [user.uid, proId],
        proId,
        profile?.businessName ?? profile?.displayName ?? "Pro",
      );
      if (convId) navigate(`/messages/${convId}`);
      else toast.error("Could not open conversation. Try again.");
    } finally {
      setMessaging(false);
    }
  };

  const handleRequestQuote = async () => {
    if (!user) { navigate("/login"); return; }
    setRequesting(true);
    try {
      const id = await sendQuoteRequest({
        proId,
        customerId: user.uid,
        service: profile?.services?.[0] ?? "General",
        message: "I'd like to request a quote.",
      });
      if (id) {
        setRequested(true);
        toast.success("Quote request sent!");
        navigate("/messages");
      } else {
        toast.error("Could not send request. Try again.");
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) { navigate("/login"); return; }
    if (reviewRating === 0) { toast.error("Please select a star rating."); return; }
    setSubmittingReview(true);
    try {
      const id = await saveReview({
        jobRequestId: "direct",
        customerId: user.uid,
        proId,
        rating: reviewRating,
        text: reviewText.trim(),
      });
      if (id) {
        toast.success("Review submitted. Thank you!");
        const newReview: Review = {
          id,
          jobRequestId: "direct",
          customerId: user.uid,
          proId,
          rating: reviewRating,
          text: reviewText.trim(),
          createdAt: new Date().toISOString(),
        };
        setReviews((prev) => [newReview, ...prev]);
        setReviewRating(0);
        setReviewText("");
      } else {
        toast.error("Could not submit review. Try again.");
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const name = profile?.businessName || profile?.displayName || "Pro";
  const myReview = reviews.find(
    (r) => r.customerId === user?.uid && r.jobRequestId === "direct",
  );
  const canLeaveReview =
    role === "customer" && user?.uid !== proId && !myReview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{name}</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Avatar + name */}
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-primary text-white flex items-center justify-center shrink-0">
              {profile?.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Hammer className="h-8 w-8" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xl">{name}</span>
                {profile?.verifiedPro && (
                  <BadgeCheck className="h-5 w-5 text-primary shrink-0" aria-label="Verified Pro" />
                )}
              </div>
              {profile?.displayName && profile.businessName && (
                <p className="text-sm text-muted-foreground">{profile.displayName}</p>
              )}
              {avgRating !== null ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRating rating={avgRating} size="sm" />
                  <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No reviews yet</p>
              )}
              {/* Stats */}
              {(profile?.completedJobsCount ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile?.completedJobsCount} jobs completed
                </p>
              )}
            </div>
          </div>

          {/* Trust Badges */}
          {(profile?.verifiedPro || profile?.fastResponder || profile?.topRated) && (
            <div className="flex flex-wrap gap-2">
              {profile.verifiedPro && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified Pro
                </span>
              )}
              {profile.fastResponder && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-semibold text-green-700">
                  <Zap className="h-3.5 w-3.5" />
                  Fast Responder
                </span>
              )}
              {profile.topRated && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  Top Rated
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Background Check — Coming Soon
              </span>
            </div>
          )}

          {/* Services */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Services
            </p>
            {profile?.services && profile.services.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.services.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Services not added yet</p>
            )}
          </div>

          {/* Service area */}
          {(profile?.serviceArea || profile?.serviceRadiusMiles) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span>
                {profile.serviceArea ?? ""}
                {profile.serviceRadiusMiles ? ` · serves ${profile.serviceRadiusMiles} mi radius` : ""}
              </span>
            </div>
          )}

          {/* About */}
          {profile?.about ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                About
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.about}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                About
              </p>
              <p className="text-sm text-muted-foreground">No description added yet</p>
            </div>
          )}

          {/* Public phone — only shown if the pro explicitly added it */}
          {profile?.publicPhone && (
            <div className="text-sm">
              <a href={`tel:${profile.publicPhone.replace(/[^0-9]/g, "")}`} className="text-primary hover:underline">
                {profile.publicPhone}
              </a>
            </div>
          )}

          {/* Action buttons */}
          {user?.uid !== proId && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleMessage}
                disabled={messaging}
              >
                {messaging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                Message
              </Button>
              <Button
                className="flex-1"
                onClick={handleRequestQuote}
                disabled={requesting || requested}
              >
                {requesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : requested ? (
                  "Request Sent"
                ) : (
                  "Request Quote"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" />
            Reviews
            {reviews.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm">
                ({reviews.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingReviews ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="flex flex-col gap-1.5 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  {review.text && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Write a Review — only customers who haven't reviewed yet */}
      {canLeaveReview && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4" />
              Write a Review
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Your Rating</Label>
              <StarPicker value={reviewRating} onChange={setReviewRating} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewText">Your Review (optional)</Label>
              <Textarea
                id="reviewText"
                placeholder="Share your experience with this pro…"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                maxLength={600}
              />
              <p className="text-xs text-muted-foreground text-right">
                {reviewText.length}/600
              </p>
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={submittingReview || reviewRating === 0}
              className="w-full sm:w-auto"
            >
              {submittingReview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show customer's own direct review if already submitted */}
      {myReview && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-4 w-4 ${n <= myReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-green-700 font-medium">
                Your review
              </span>
            </div>
            {myReview.text && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {myReview.text}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
