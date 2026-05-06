import { useEffect, useMemo, useState } from "react";
import { calculateDistanceMiles } from "@/lib/distance";
import { matchesKeyword } from "@/lib/search";
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
  Search,
  LocateFixed,
  X,
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
};

function mockDistanceFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h % 480) / 10 + 0.5;
}

const urgencyStyle: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Normal: "bg-blue-100 text-blue-800",
  Soon: "bg-yellow-100 text-yellow-800",
  Urgent: "bg-amber-100 text-amber-800",
  Emergency: "bg-red-100 text-red-800",
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

const DISTANCE_OPTIONS = [5, 10, 25, 50, 100] as const;

export default function NearbyJobs() {
  const { user } = useAuth();
  const [maxDistance, setMaxDistance] = useState<number>(25);
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | "All">("All");
  const [firestoreRequests, setFirestoreRequests] = useState<FeedRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [keywordInput, setKeywordInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Send Quote dialog state
  const [quoting, setQuoting] = useState<FeedRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const handleKeywordSearch = () => {
    setAppliedKeyword(keywordInput.trim());
  };

  const handleClearKeyword = () => {
    setKeywordInput("");
    setAppliedKeyword("");
  };

  const handleSearch = () => {
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    setSelectedLocation(trimmed);
  };

  const handleClearLocation = () => {
    setSelectedLocation("");
    setSearchInput("");
    setUserCoords(null);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Current Location";
          const state = data.address?.state_code ?? "";
          const label = state ? `${city}, ${state}` : city;
          setSearchInput(label);
          setSelectedLocation(label);
        } catch {
          setSearchInput("Current Location");
          setSelectedLocation("Current Location");
        } finally {
          setLocating(false);
        }
      },
      () => {
        toast.error("Could not get your location. Please enter it manually.");
        setLocating(false);
      },
    );
  };

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
    return [...firestoreRequests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [firestoreRequests]);

  const visible = useMemo(
    () =>
      allRequests.filter((r) => {
        // --- Category filter ---
        if (categoryFilter !== "All" && r.category !== categoryFilter) return false;

        // --- Keyword filter ---
        if (
          appliedKeyword &&
          !matchesKeyword(appliedKeyword, [
            r.title,
            r.category,
            r.description,
            r.address,
          ])
        ) {
          return false;
        }

        // --- Location / distance filter ---
        if (userCoords) {
          if (r.latitude != null && r.longitude != null) {
            const d = calculateDistanceMiles(userCoords.lat, userCoords.lng, r.latitude, r.longitude);
            return d <= maxDistance;
          }
          return (
            selectedLocation === "" ||
            r.address.toLowerCase().includes(selectedLocation.toLowerCase())
          );
        }

        // No user coords — legacy distanceMiles + optional text match
        return (
          r.distanceMiles <= maxDistance &&
          (selectedLocation === "" ||
            r.address.toLowerCase().includes(selectedLocation.toLowerCase()))
        );
      }),
    [allRequests, maxDistance, categoryFilter, userCoords, selectedLocation, appliedKeyword],
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
          <h1 className="text-3xl font-bold tracking-tight">Nearby Service Requests</h1>
          <p className="text-gray-500">
            Open requests in your service area. Send a quote to win the job.
          </p>
        </div>
      </div>

      {/* Keyword search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Search by service, keyword, or location"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleKeywordSearch()}
          />
          {keywordInput && (
            <button
              onClick={handleClearKeyword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear keyword"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleKeywordSearch}>
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      {/* Active keyword badge */}
      {appliedKeyword && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-semibold text-gray-900">{visible.length}</span>{" "}
            {visible.length === 1 ? "result" : "results"} matching{" "}
            <span className="font-medium text-gray-700">"{appliedKeyword}"</span>
          </span>
          <button
            onClick={handleClearKeyword}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <X className="h-3.5 w-3.5" /> Clear search
          </button>
        </div>
      )}

      {/* Location search bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 pr-9"
            placeholder="Enter city or zip code"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {searchInput && (
            <button
              onClick={handleClearLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={!searchInput.trim()}>
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
        <Button variant="outline" onClick={handleUseMyLocation} disabled={locating}>
          {locating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="mr-2 h-4 w-4" />
          )}
          Use my location
        </Button>
      </div>

      {/* Active location banner */}
      {selectedLocation && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5 text-sm text-blue-800">
          <span>
            {userCoords ? (
              <>
                Showing{" "}
                <span className="font-semibold">{visible.length}</span>{" "}
                {visible.length === 1 ? "result" : "results"} within{" "}
                <span className="font-semibold">{maxDistance} miles</span> of{" "}
                <span className="font-semibold">{selectedLocation}</span>
              </>
            ) : (
              <>
                Showing results near{" "}
                <span className="font-semibold">{selectedLocation}</span>
                {" "}— {visible.length} {visible.length === 1 ? "result" : "results"}
              </>
            )}
          </span>
          <button
            onClick={handleClearLocation}
            className="ml-3 text-blue-500 hover:text-blue-700 shrink-0"
            aria-label="Clear location"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="rounded-2xl border-gray-100">
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
                    <span className="font-bold text-gray-900">{visible.length}</span>
                    {" "}of {allRequests.length} requests
                    {appliedKeyword && (
                      <span className="block text-xs mt-0.5">
                        Keyword: <span className="font-medium">"{appliedKeyword}"</span>
                      </span>
                    )}
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
            <Card key={r.id} className="flex flex-col rounded-2xl border-gray-100 hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col gap-3 flex-1">
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
