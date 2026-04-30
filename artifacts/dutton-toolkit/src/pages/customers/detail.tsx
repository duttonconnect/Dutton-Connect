import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Hammer,
  FileText,
  Pencil,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CustomerDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { customers, jobs, quotes, payments, deleteCustomer, updateCustomer } = useAppStore();

  const customer = customers.find((c) => c.id === id);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const openEdit = () => {
    if (!customer) return;
    setForm({
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!form.name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    setSaving(true);
    try {
      updateCustomer(customer.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      toast.success("Customer updated");
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!customer) {
    return <div className="p-8 text-center text-muted-foreground">Customer not found</div>;
  }

  const customerJobs = jobs.filter((j) => j.customerId === customer.id);
  const customerQuotes = quotes.filter((q) => q.customerId === customer.id);
  const customerPayments = payments.filter(
    (p) => p.jobId && customerJobs.some((j) => j.id === p.jobId),
  );
  const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this customer?")) {
      deleteCustomer(customer.id);
      setLocation("/customers");
      toast.success("Customer deleted");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}>
            <Pencil className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="ghost" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-1">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name or company name"
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, City, GA"
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Anything helpful to remember about this customer."
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-muted-foreground">{customer.address}</div>
                </div>
              )}
              {customer.notes && (
                <div className="pt-4 border-t mt-4">
                  <div className="font-medium mb-1">Notes</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {customer.notes}
                  </div>
                </div>
              )}
              <div className="pt-4 border-t mt-4 text-xs text-muted-foreground">
                Customer since {format(new Date(customer.createdAt), "MMM yyyy")}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalPaid.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Across {customerPayments.length} payment{customerPayments.length === 1 ? "" : "s"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hammer className="h-5 w-5 text-muted-foreground" /> Jobs
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/jobs/new">
                  <Plus className="h-4 w-4 mr-1" /> New Job
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerJobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No jobs for this customer
                  </div>
                ) : (
                  customerJobs
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                    .map((job) => (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors gap-2 cursor-pointer">
                          <div>
                            <div className="font-medium">{job.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(job.scheduledDate), "MMM d, yyyy")}
                            </div>
                          </div>
                          <Badge
                            variant={job.status === "completed" ? "default" : "secondary"}
                            className="w-fit text-xs"
                          >
                            {job.status.replace("_", " ").toUpperCase()}
                          </Badge>
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" /> Quotes
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/quotes/new">
                  <Plus className="h-4 w-4 mr-1" /> New Quote
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerQuotes.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No quotes for this customer
                  </div>
                ) : (
                  customerQuotes
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                    .map((quote) => {
                      const subtotal = quote.lineItems.reduce(
                        (acc, item) => acc + item.qty * item.unitPrice,
                        0,
                      );
                      const total = subtotal * (1 + quote.taxRate / 100);
                      return (
                        <Link key={quote.id} href={`/quotes/${quote.id}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors gap-2 cursor-pointer">
                            <div>
                              <div className="font-medium">
                                Quote #{quote.id.toUpperCase()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(quote.createdAt), "MMM d, yyyy")}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-sm font-medium">
                                ${total.toFixed(2)}
                              </span>
                              <Badge variant="outline" className="w-fit text-xs uppercase">
                                {quote.status}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
