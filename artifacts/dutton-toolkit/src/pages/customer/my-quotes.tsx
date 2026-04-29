import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Inbox, DollarSign, Loader2, Calendar } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { loadQuotesForCustomer, type MatchQuote } from "@/lib/matching";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MyQuotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<MatchQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    loadQuotesForCustomer(user.uid)
      .then((results) => {
        setQuotes(
          results.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Received Quotes
          </h1>
          <p className="text-gray-500 text-sm">
            Quotes from pros on your job requests
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-sm">Loading quotes…</span>
          </CardContent>
        </Card>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No quotes yet.</p>
            <p className="text-xs mt-1">
              Post a job request and pros in your area will send quotes.
            </p>
            <Link href="/post-request">
              <Button variant="outline" size="sm" className="mt-4">
                Post a Job
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div
                      className="font-semibold text-base truncate"
                      title={q.jobRequestTitle}
                    >
                      {q.jobRequestTitle}
                    </div>
                    {q.message && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {q.message}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(q.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          q.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800 text-xs"
                            : q.status === "declined"
                              ? "bg-red-100 text-red-800 text-xs"
                              : "bg-blue-100 text-blue-800 text-xs"
                        }
                      >
                        {q.status === "sent"
                          ? "New"
                          : q.status === "accepted"
                            ? "Accepted"
                            : "Declined"}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">Quote</div>
                    <div className="flex items-center gap-1 font-bold text-xl">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      {q.amount.toFixed(0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
