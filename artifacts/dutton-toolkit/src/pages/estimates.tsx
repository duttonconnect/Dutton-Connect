import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ArrowRight,
} from "lucide-react";

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
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  loadEstimates,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  calcTotal,
  type Estimate,
  type EstimateStatus,
  ESTIMATE_STATUSES,
} from "@/lib/estimates";
import { isFirebaseConfigured } from "@/lib/firebase";

const STATUS_LABELS: Record<EstimateStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  paid: "Paid",
};

const STATUS_COLORS: Record<EstimateStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  paid: "bg-emerald-600 text-white",
};

type FormState = {
  type: "estimate" | "invoice";
  customerName: string;
  customerEmail: string;
  serviceDescription: string;
  laborAmount: string;
  materialsAmount: string;
  taxAmount: string;
  discount: string;
  notes: string;
  dueDate: string;
};

const EMPTY_FORM: FormState = {
  type: "estimate",
  customerName: "",
  customerEmail: "",
  serviceDescription: "",
  laborAmount: "",
  materialsAmount: "",
  taxAmount: "",
  discount: "",
  notes: "",
  dueDate: "",
};

function n(s: string): number {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

export default function Estimates() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Estimate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  const reload = () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    loadEstimates(user.uid)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    reload();
  }, [user, authLoading]);

  const totalPreview = calcTotal(
    n(form.laborAmount),
    n(form.materialsAmount),
    n(form.taxAmount),
    n(form.discount),
  );

  const handleCreate = async () => {
    if (!user) return;
    if (!form.customerName.trim()) { toast.error("Customer name is required"); return; }
    if (!form.serviceDescription.trim()) { toast.error("Service description is required"); return; }
    if (!form.dueDate) { toast.error("Due date is required"); return; }

    setSubmitting(true);
    try {
      const id = await createEstimate({
        proId: user.uid,
        type: form.type,
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        serviceDescription: form.serviceDescription.trim(),
        laborAmount: n(form.laborAmount),
        materialsAmount: n(form.materialsAmount),
        taxAmount: n(form.taxAmount),
        discount: n(form.discount),
        totalAmount: totalPreview,
        status: "draft",
        notes: form.notes.trim(),
        dueDate: form.dueDate,
      });
      if (id) {
        toast.success(`${form.type === "estimate" ? "Estimate" : "Invoice"} created`);
        setShowDialog(false);
        setForm(EMPTY_FORM);
        reload();
      } else {
        toast.error("Could not save. Check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (item: Estimate, status: EstimateStatus) => {
    setUpdatingStatus(item.id);
    try {
      await updateEstimate(item.id, { status });
      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status } : x));
      toast.success(`Marked as ${STATUS_LABELS[status]}`);
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleConvertToInvoice = async (item: Estimate) => {
    setConverting(item.id);
    try {
      await updateEstimate(item.id, { type: "invoice" });
      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, type: "invoice" } : x));
      toast.success("Converted to Invoice");
    } catch {
      toast.error("Could not convert");
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteEstimate(id);
    setItems((prev) => prev.filter((x) => x.id !== id));
    toast.success("Deleted");
    if (expanded === id) setExpanded(null);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Estimates & Invoices</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Firebase is not configured. Connect Firebase to use Estimates & Invoices.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Estimates & Invoices
            </h1>
            <p className="text-gray-500 text-sm">Create and manage quotes for customers.</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> New
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-400">
            No estimates or invoices yet. Create your first one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isOpen = expanded === item.id;
            return (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{item.customerName}</span>
                        <Badge
                          className={`text-xs ${STATUS_COLORS[item.status]}`}
                          variant="outline"
                        >
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.type === "invoice" ? (
                            <><Receipt className="h-3 w-3 mr-1" />Invoice</>
                          ) : (
                            <><FileText className="h-3 w-3 mr-1" />Estimate</>
                          )}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {item.serviceDescription}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-lg text-gray-900">
                        ${item.totalAmount.toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setExpanded(isOpen ? null : item.id)}
                      >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Labor: ${item.laborAmount.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      Materials: ${item.materialsAmount.toFixed(2)}
                    </span>
                    <span>
                      Due: {item.dueDate ? format(new Date(item.dueDate + "T12:00:00"), "MMM d, yyyy") : "—"}
                    </span>
                  </div>

                  {isOpen && (
                    <div className="border-t pt-3 space-y-3">
                      {item.customerEmail && (
                        <div className="text-sm text-gray-600">
                          Email: {item.customerEmail}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                          {item.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Created {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {item.status !== "sent" && item.status !== "accepted" && item.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingStatus === item.id}
                            onClick={() => handleStatusUpdate(item, "sent")}
                          >
                            Mark Sent
                          </Button>
                        )}
                        {item.status === "sent" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingStatus === item.id}
                            onClick={() => handleStatusUpdate(item, "accepted")}
                          >
                            Mark Accepted
                          </Button>
                        )}
                        {(item.status === "sent" || item.status === "accepted") && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={updatingStatus === item.id}
                            onClick={() => handleStatusUpdate(item, "paid")}
                          >
                            Mark Paid
                          </Button>
                        )}
                        {item.type === "estimate" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={converting === item.id}
                            onClick={() => handleConvertToInvoice(item)}
                          >
                            {converting === item.id ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Convert to Invoice
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 ml-auto"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
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

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Estimate / Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as "estimate" | "invoice" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimate">Estimate</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Customer Name</Label>
                <Input
                  placeholder="Jane Smith"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Customer Email (optional)</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={form.customerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Service Description</Label>
              <Textarea
                placeholder="Describe the work..."
                rows={3}
                value={form.serviceDescription}
                onChange={(e) => setForm((f) => ({ ...f, serviceDescription: e.target.value }))}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Labor ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.laborAmount}
                  onChange={(e) => setForm((f) => ({ ...f, laborAmount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Materials ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.materialsAmount}
                  onChange={(e) => setForm((f) => ({ ...f, materialsAmount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tax ($, optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.taxAmount}
                  onChange={(e) => setForm((f) => ({ ...f, taxAmount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Discount ($, optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.discount}
                  onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-3 flex items-center justify-between">
              <span className="font-medium text-gray-700">Total</span>
              <span className="text-xl font-bold">${totalPreview.toFixed(2)}</span>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  "Create"
                )}
              </Button>
              <Button variant="outline" onClick={() => { setShowDialog(false); setForm(EMPTY_FORM); }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
