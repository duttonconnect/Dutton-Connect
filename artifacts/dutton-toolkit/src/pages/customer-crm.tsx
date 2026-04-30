import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Users,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  StickyNote,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
  loadCRMCustomers,
  loadCustomerNote,
  saveCustomerNote,
  loadProfileForUser,
} from "@/lib/crm";
import { type FirestoreJobRequest } from "@/lib/matching";
import { isFirebaseConfigured } from "@/lib/firebase";

type CRMEntry = {
  customerId: string;
  displayName: string;
  email: string;
  jobs: FirestoreJobRequest[];
  notes: string;
  savedNoteId?: string;
};

export default function CustomerCRM() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<CRMEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadCRMCustomers(user.uid)
      .then(async (rows) => {
        const enriched = await Promise.all(
          rows.map(async ({ customerId, jobs }) => {
            const [profile, noteData] = await Promise.all([
              loadProfileForUser(customerId),
              loadCustomerNote(user.uid, customerId),
            ]);
            return {
              customerId,
              displayName: profile?.displayName ?? profile?.businessName ?? "Unknown Customer",
              email: profile?.email ?? "",
              jobs,
              notes: noteData?.notes ?? "",
            };
          }),
        );
        setEntries(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleSaveNote = async (customerId: string) => {
    if (!user) return;
    setSavingNote(customerId);
    try {
      await saveCustomerNote(
        user.uid,
        customerId,
        editedNotes[customerId] ?? "",
      );
      setEntries((prev) =>
        prev.map((e) =>
          e.customerId === customerId
            ? { ...e, notes: editedNotes[customerId] ?? "" }
            : e,
        ),
      );
      toast.success("Note saved");
    } catch {
      toast.error("Could not save note");
    } finally {
      setSavingNote(null);
    }
  };

  const totalEarned = (jobs: FirestoreJobRequest[]) =>
    jobs.reduce((sum, j) => sum + (j.budget ?? 0), 0);

  const lastJobDate = (jobs: FirestoreJobRequest[]) => {
    if (!jobs.length) return null;
    return jobs.reduce((latest, j) =>
      j.createdAt > latest.createdAt ? j : latest,
    ).createdAt;
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Customer CRM</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Firebase is not configured. Connect Firebase to use the Customer CRM.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Customer CRM
          </h1>
          <p className="text-gray-500 text-sm">
            Customers from your accepted and completed jobs.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-400">
            No customers yet. Accept your first job to start building your CRM.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isOpen = expanded === entry.customerId;
            const last = lastJobDate(entry.jobs);
            return (
              <Card key={entry.customerId}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg">
                        {entry.displayName}
                      </div>
                      {entry.email && (
                        <div className="text-sm text-gray-500">{entry.email}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded(isOpen ? null : entry.customerId)
                      }
                    >
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {entry.jobs.length} job{entry.jobs.length !== 1 ? "s" : ""}
                    </span>
                    {last && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        Last: {format(new Date(last), "MMM d, yyyy")}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      ~${totalEarned(entry.jobs).toLocaleString()} quoted
                    </span>
                  </div>

                  {isOpen && (
                    <div className="border-t pt-3 space-y-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Jobs</div>
                        <div className="space-y-2">
                          {entry.jobs.map((j) => (
                            <div
                              key={j.id}
                              className="flex items-center justify-between gap-3 text-sm bg-gray-50 rounded-md px-3 py-2"
                            >
                              <span className="font-medium truncate">{j.title}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="secondary" className="text-xs">
                                  {j.status}
                                </Badge>
                                {j.address && (
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    <span className="max-w-[100px] truncate">{j.address}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                          <StickyNote className="h-3.5 w-3.5" /> Private Notes
                        </div>
                        <Textarea
                          rows={3}
                          placeholder="Add private notes about this customer..."
                          value={
                            editedNotes[entry.customerId] !== undefined
                              ? editedNotes[entry.customerId]
                              : entry.notes
                          }
                          onChange={(e) =>
                            setEditedNotes((prev) => ({
                              ...prev,
                              [entry.customerId]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          className="mt-2"
                          disabled={savingNote === entry.customerId}
                          onClick={() => handleSaveNote(entry.customerId)}
                        >
                          {savingNote === entry.customerId ? (
                            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…</>
                          ) : (
                            "Save Note"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
