import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  MapPin,
  Calendar,
  AlertCircle,
  Send,
  Filter,
  Inbox,
  Loader2,
  DollarSign,
  MessageSquare,
} from "lucide-react";

import { type RequestCategory, type Urgency } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import {
  loadOpenJobRequests,
  sendMatchQuote,
  type FirestoreJobRequest,
} from "@/lib/matching";
import { getOrCreateConversation } from "@/lib/messaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type FeedRequest = FirestoreJobRequest & {
  distanceMiles: number;
  isSample?: boolean;
};

const SAMPLE_FEED: FeedRequest[] = [
  {
    id: "sr-1",
    title: "Replace porch light fixture",
    category: "Handyman",
    description:
      "Old fixture stopped working. Need a similar style replaced. I'll provide the new fixture from Lowe's.",
    address: "311 Hill St, Athens, GA",
    budget: 120,
    preferredDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Normal",
    customerId: "sample",
    status: "open",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 2.4,
    isSample: true,
  },
  {
    id: "sr-2",
    title: "Kitchen sink leaking under cabinet",
    category: "Plumbing",
    description:
      "Slow drip from the P-trap. Cabinet floor getting damp. Need this fixed before it gets worse.",
    address: "1024 Prince Ave, Athens, GA",
    budget: 200,
    preferredDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Urgent",
    customerId: "sample",
    status: "open",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 4.1,
    isSample: true,
  },
  {
    id: "sr-3",
    title: "Pressure wash driveway and walkway",
    category: "Pressure Washing",
    description:
      "Two-car driveway plus the walkway up to the front porch. Lots of mildew on the north side.",
    address: "55 Gaines School Rd, Athens, GA",
    budget: 275,
    preferredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Low",
    customerId: "sample",
    status: "open",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 7.8,
    isSample: true,
  },
  {
    id: "sr-4",
    title: "Install new dishwasher",
    category: "Appliance Installation",
    description:
      "New Bosch dishwasher arriving Tuesday. Need the old one removed and the new one installed and tested.",
    address: "412 Riverbend Pkwy, Watkinsville, GA",
    budget: 180,
    preferredDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Normal",
    customerId: "sample",
    status: "open",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 12.6,
    isSample: true,
  },
  {
    id: "sr-5",
    title: "Spring yard cleanup, half acre",
    category: "Yard Work",
    description:
      "Leaf cleanup, hedge trim along the front, mulch refresh on three beds. Materials provided.",
    address: "88 Hampton Park Dr, Bogart, GA",
    budget: 425,
    preferredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Low",
    customerId: "sample",
    status: "open",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 18.3,
    isSample: true,
  },
  {
    id: "sr-6",
    title: "Replace alternator on '12 F-150",
    category: "Automotive",
    description:
      "Battery light came on yesterday and dies if it sits overnight. Have the part already.",
    address: "147 Mars Hill Rd, Watkinsville, GA",
    budget: 320,
    preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    urgency: "Urgent",
    customerId: "sample",
    status: "open",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    distanceMiles: 32.1,
    isSample: true,
  },
];

function mockDistanceFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h % 480) / 10 + 0.5;
}

const urgencyStyle: Record<string, string> = {
  Low: "bg-gray-100 text-gray-700",
  Normal: "bg-blue-100 text-blue-800",
  Urgent: "bg-red-100 text-red-800",
};

const ALL_CATEGORIES: (RequestCategory | "All")[] = [
  "All",
  "Handyman",
  "Plumbing",
  "Automotive",
  "Pressure Washing",
  "Yard Work",
  "Appliance Installation",
  "Other",
];

const DISTANCE_OPTIONS = [10, 25, 50] as const;

export default function NearbyJobs() {
  const { user } = useAuth();
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | "All">("All");
  const [firestoreRequests, setFirestoreRequests] = useState<FeedRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Send Quote dialog state
  const [quoting, setQuoting] = useState<FeedRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleMessageCustomer = async (r: FeedRequest) => {
    if (!user) return;
    setMessagingId(r.id);
    try {
      const convId = await getOrCreateConversation(
        [user.uid, r.customerId],
        r.id,
        r.title,
      );
      if (convId) navigate(`/messages/${convId}`);
      else toast.error("Could not start conversation. Try again.");
    } finally {
      setMessagingId(null);
    }
  };

  useEffect(() => {
    setLoadingRequests(true);
    loadOpenJobRequests()
      .then((results) => {
        const mapped: FeedRequest[] = results
          .filter((r) => r.customerId !== user?.uid)
          .map((r) => ({ ...r, distanceMiles: mockDistanceFor(r.id) }));
        setFirestoreRequests(mapped);
      })
      .finally(() => setLoadingRequests(false));
  }, [user?.uid]);

  const allRequests: FeedRequest[] = useMemo(() => {
    const firestoreIds = new Set(firestoreRequests.map((r) => r.id));
    const samples = SAMPLE_FEED.filter((s) => !firestoreIds.has(s.id));
    return [...firestoreRequests, ...samples].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [firestoreRequests]);

  const visible = useMemo(
    () =>
      allRequests.filter(
        (r) =>
          r.distanceMiles <= maxDistance &&
          (categoryFilter === "All" || r.category === categoryFilter),
      ),
    [allRequests, maxDistance, categoryFilter],
  );

  const openQuoteDialog = (r: FeedRequest) => {
    setQuoting(r);
    setQuoteAmount("");
    setQuoteMessage("");
  };

  const handleSendQuote = async () => {
    if (!quoting || !user) return;
    const amount = parseFloat(quoteAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid quote amount.");
      return;
    }
    setSending(true);
    const id = await sendMatchQuote({
      jobRequestId: quoting.id,
      jobRequestTitle: quoting.title,
      proId: user.uid,
      customerId: quoting.customerId,
      amount,
      message: quoteMessage.trim(),
    });
    setSending(false);
    if (id) {
      setSentIds((prev) => new Set(prev).add(quoting.id));
      toast.success("Quote sent");
    } else {
      toast.error("Could not send quote. Check your connection and try again.");
    }
    setQuoting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nearby Jobs</h1>
          <p className="text-gray-500">
            Customer requests in your service area. Send a quote to get the work.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Distance
              </label>
              <Select
                value={String(maxDistance)}
                onValueChange={(v) => setMaxDistance(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCE_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Within {d} miles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <Select
                value={categoryFilter}
                onValueChange={(v) =>
                  setCategoryFilter(v as RequestCategory | "All")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                {loadingRequests ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </span>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-bold text-gray-900">{visible.length}</span>{" "}
                    of {allRequests.length} requests
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 && !loadingRequests ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">No matching requests in this area.</div>
            <div className="text-xs mt-1">
              Try widening the distance or changing the category.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-lg truncate" title={r.title}>
                      {r.title}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {r.category}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${urgencyStyle[r.urgency] ?? ""}`}
                      >
                        {r.urgency === "Urgent" && (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {r.urgency}
                      </Badge>
                      {!r.isSample && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-emerald-100 text-emerald-800"
                        >
                          Live request
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="font-bold text-lg">${r.budget.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">
                      ~{r.distanceMiles.toFixed(1)} mi
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                  {r.description}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {r.address}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Wanted by{" "}
                    {format(new Date(r.preferredDate), "MMM d")}
                  </span>
                </div>

                <div className="mt-auto pt-3 border-t space-y-2">
                  {sentIds.has(r.id) ? (
                    <Button className="w-full" variant="outline" disabled>
                      Quote sent
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => openQuoteDialog(r)}
                    >
                      <Send className="mr-2 h-4 w-4" /> Send Quote
                    </Button>
                  )}
                  {!r.isSample && (
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={messagingId === r.id}
                      onClick={() => handleMessageCustomer(r)}
                    >
                      {messagingId === r.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquare className="mr-2 h-4 w-4" />
                      )}
                      Message Customer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send Quote Dialog */}
      <Dialog open={!!quoting} onOpenChange={(open) => { if (!open) setQuoting(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send a Quote</DialogTitle>
            <DialogDescription className="truncate">
              {quoting?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="quote-amount">Your Quote Amount ($)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="quote-amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  placeholder="e.g. 175"
                  className="pl-8"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  autoFocus
                />
              </div>
              {quoting && (
                <p className="text-xs text-muted-foreground mt-1">
                  Customer budget: ${quoting.budget.toFixed(0)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="quote-message">Message (optional)</Label>
              <Textarea
                id="quote-message"
                placeholder="Briefly describe your approach, availability, or any questions."
                rows={3}
                className="mt-1"
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuoting(null)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSendQuote} disabled={sending}>
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Quote</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
