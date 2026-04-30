import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  DollarSign,
  Calendar,
  Inbox,
  MessageSquare,
  FileText,
  ThumbsDown,
  AlertTriangle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  loadOpenJobRequests,
  loadDeclinedLeadIds,
  loadQuotesByPro,
  loadConversationIdsByPro,
  declineLead,
  sendMatchQuote,
  type FirestoreJobRequest,
  type MatchQuote,
} from "@/lib/matching";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LeadTab = "new" | "quoted" | "messaged" | "accepted" | "declined";

function urgencyBadge(urgency: string) {
  if (urgency === "Emergency") {
    return (
      <Badge className="bg-red-600 text-white text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Emergency
      </Badge>
    );
  }
  if (urgency === "Urgent") {
    return <Badge className="bg-orange-500 text-white text-xs">Urgent</Badge>;
  }
  if (urgency === "Soon") {
    return <Badge variant="outline" className="text-xs">Soon</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">{urgency}</Badge>;
}

type LeadCardProps = {
  lead: FirestoreJobRequest;
  tab: LeadTab;
  onDecline: (id: string) => void;
  onSendQuote: (lead: FirestoreJobRequest) => void;
  onMessage: (lead: FirestoreJobRequest) => void;
  declining: string | null;
};

function LeadCard({ lead, tab, onDecline, onSendQuote, onMessage, declining }: LeadCardProps) {
  return (
    <Card key={lead.id}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-snug">{lead.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <Badge variant="secondary" className="text-xs">{lead.category}</Badge>
              {urgencyBadge(lead.urgency)}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2">{lead.description}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lead.address}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 shrink-0" />
            Budget: ${lead.budget}
          </span>
          <span className="flex items-center gap-1.5 col-span-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Posted {format(new Date(lead.createdAt), "MMM d, yyyy")}
          </span>
        </div>

        {tab === "new" && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onSendQuote(lead)}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Send Quote
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onMessage(lead)}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Message
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-500"
              disabled={declining === lead.id}
              onClick={() => onDecline(lead.id)}
            >
              {declining === lead.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ThumbsDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LeadInbox() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<LeadTab>("new");
  const [loading, setLoading] = useState(true);

  const [allLeads, setAllLeads] = useState<FirestoreJobRequest[]>([]);
  const [declinedIds, setDeclinedIds] = useState<Set<string>>(new Set());
  const [quotedIds, setQuotedIds] = useState<Set<string>>(new Set());
  const [messagedIds, setMessagedIds] = useState<Set<string>>(new Set());
  const [proQuotes, setProQuotes] = useState<MatchQuote[]>([]);
  const [declining, setDeclining] = useState<string | null>(null);

  const [quoteDialog, setQuoteDialog] = useState<FirestoreJobRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [submittingQuote, setSubmittingQuote] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      loadOpenJobRequests(),
      loadDeclinedLeadIds(user.uid),
      loadQuotesByPro(user.uid),
      loadConversationIdsByPro(user.uid),
    ])
      .then(([leads, declined, quotes, convoJobIds]) => {
        setAllLeads(leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setDeclinedIds(new Set(declined));
        setProQuotes(quotes);
        setQuotedIds(new Set(quotes.map((q) => q.jobRequestId)));
        setMessagedIds(new Set(convoJobIds));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDecline = async (jobRequestId: string) => {
    if (!user) return;
    setDeclining(jobRequestId);
    try {
      await declineLead(user.uid, jobRequestId);
      setDeclinedIds((prev) => new Set(prev).add(jobRequestId));
      toast.success("Lead declined");
    } catch {
      toast.error("Could not decline lead");
    } finally {
      setDeclining(null);
    }
  };

  const handleSendQuote = async () => {
    if (!user || !quoteDialog) return;
    const amount = parseFloat(quoteAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSubmittingQuote(true);
    try {
      const id = await sendMatchQuote({
        jobRequestId: quoteDialog.id,
        jobRequestTitle: quoteDialog.title,
        proId: user.uid,
        customerId: quoteDialog.customerId,
        amount,
        message: quoteMessage.trim() || `Quote for "${quoteDialog.title}"`,
      });
      if (id) {
        setQuotedIds((prev) => new Set(prev).add(quoteDialog.id));
        setProQuotes((prev) => [
          ...prev,
          {
            id,
            jobRequestId: quoteDialog.id,
            jobRequestTitle: quoteDialog.title,
            proId: user.uid,
            customerId: quoteDialog.customerId,
            amount,
            message: quoteMessage,
            status: "sent",
            createdAt: new Date().toISOString(),
          },
        ]);
        toast.success("Quote sent");
        setQuoteDialog(null);
        setQuoteAmount("");
        setQuoteMessage("");
      } else {
        toast.error("Could not send quote. Check your connection.");
      }
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleMessage = (lead: FirestoreJobRequest) => {
    navigate(`/messages?jobRequestId=${lead.id}&proId=${user?.uid ?? ""}`);
  };

  const newLeads = allLeads.filter(
    (l) =>
      l.status === "open" &&
      !declinedIds.has(l.id) &&
      !quotedIds.has(l.id) &&
      !messagedIds.has(l.id),
  );
  const quotedLeads = allLeads.filter((l) => quotedIds.has(l.id));
  const messagedLeads = allLeads.filter(
    (l) => messagedIds.has(l.id) && !quotedIds.has(l.id),
  );
  const acceptedLeads = allLeads.filter(
    (l) => l.acceptedProId === user?.uid,
  );
  const declinedLeads = allLeads.filter((l) => declinedIds.has(l.id));

  function tabCount(leads: FirestoreJobRequest[]) {
    return leads.length > 0 ? ` (${leads.length})` : "";
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Service Requests</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Firebase is not configured. Connect Firebase to use the Service Requests.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            Service Requests
          </h1>
          <p className="text-gray-500 text-sm">Job requests matching your services.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as LeadTab)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="new">New{tabCount(newLeads)}</TabsTrigger>
            <TabsTrigger value="quoted">Quoted{tabCount(quotedLeads)}</TabsTrigger>
            <TabsTrigger value="messaged">Messaged{tabCount(messagedLeads)}</TabsTrigger>
            <TabsTrigger value="accepted">Accepted{tabCount(acceptedLeads)}</TabsTrigger>
            <TabsTrigger value="declined">Declined{tabCount(declinedLeads)}</TabsTrigger>
          </TabsList>

          {(
            [
              ["new", newLeads],
              ["quoted", quotedLeads],
              ["messaged", messagedLeads],
              ["accepted", acceptedLeads],
              ["declined", declinedLeads],
            ] as [LeadTab, FirestoreJobRequest[]][]
          ).map(([t, leads]) => (
            <TabsContent key={t} value={t} className="space-y-3 mt-4">
              {leads.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No {t} leads.
                </div>
              ) : (
                leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    tab={t}
                    onDecline={handleDecline}
                    onSendQuote={setQuoteDialog}
                    onMessage={handleMessage}
                    declining={declining}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <Dialog open={!!quoteDialog} onOpenChange={(o) => { if (!o) setQuoteDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {quoteDialog && (
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {quoteDialog.title} — Budget: ${quoteDialog.budget}
              </p>
            )}
            <div>
              <Label>Your Quote Amount ($)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                placeholder="e.g. 350"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Introduce yourself and describe your approach..."
                value={quoteMessage}
                onChange={(e) => setQuoteMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSendQuote}
                disabled={submittingQuote}
              >
                {submittingQuote ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  "Send Quote"
                )}
              </Button>
              <Button variant="outline" onClick={() => setQuoteDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
