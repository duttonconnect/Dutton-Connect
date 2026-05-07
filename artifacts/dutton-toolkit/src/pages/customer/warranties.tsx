import { useState } from "react";
import { ArrowLeft, ShieldCheck, Plus, Trash2, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format, isPast, isWithinInterval, addDays, differenceInDays } from "date-fns";

import { useAppStore, type Warranty } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WARRANTY_PERIODS = [
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "6 months", days: 180 },
  { label: "1 year", days: 365 },
  { label: "2 years", days: 730 },
  { label: "Custom", days: 0 },
];

function warrantyStatus(w: Warranty): "expired" | "expiring" | "active" {
  const exp = new Date(w.expiresAt);
  if (isPast(exp)) return "expired";
  if (isWithinInterval(exp, { start: new Date(), end: addDays(new Date(), 30) })) return "expiring";
  return "active";
}

export default function WarrantiesPage() {
  const { warranties, addWarranty, deleteWarranty } = useAppStore();
  const all = warranties ?? [];

  const [showForm, setShowForm] = useState(false);
  const [serviceDesc, setServiceDesc] = useState("");
  const [proName, setProName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [completedDate, setCompletedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [warrantyDays, setWarrantyDays] = useState(90);
  const [useCustom, setUseCustom] = useState(false);
  const [customDays, setCustomDays] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setServiceDesc(""); setProName(""); setPropertyAddress("");
    setCompletedDate(format(new Date(), "yyyy-MM-dd"));
    setWarrantyDays(90); setUseCustom(false); setCustomDays(""); setNotes("");
    setShowForm(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceDesc.trim()) { toast.error("Please describe the service."); return; }
    const days = useCustom ? (parseInt(customDays) || 90) : warrantyDays;
    const completed = new Date((completedDate || format(new Date(), "yyyy-MM-dd")) + "T12:00:00");
    const expiresAt = addDays(completed, days).toISOString();
    addWarranty({
      jobRequestId: "",
      proId: "",
      proName: proName.trim(),
      serviceDescription: serviceDesc.trim(),
      propertyAddress: propertyAddress.trim() || "My Property",
      completedDate: completed.toISOString(),
      warrantyDays: days,
      expiresAt,
      notes: notes.trim(),
    });
    toast.success("Warranty saved.");
    resetForm();
  };

  const active = all.filter(w => warrantyStatus(w) === "active");
  const expiring = all.filter(w => warrantyStatus(w) === "expiring");
  const expired = all.filter(w => warrantyStatus(w) === "expired");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Job Warranties</h1>
            <p className="text-sm text-muted-foreground">Track guarantees on work done at your property.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <ChevronUp className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "Add Warranty"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="text-sm font-semibold">Add a Warranty</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Description</Label>
                  <Input placeholder="Roof repair, HVAC install…" value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Pro / Company Name</Label>
                  <Input placeholder="ABC Roofing" value={proName} onChange={e => setProName(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Address</Label>
                  <Input placeholder="123 Main St" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date Completed</Label>
                  <Input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Warranty Period</Label>
                <div className="flex flex-wrap gap-2">
                  {WARRANTY_PERIODS.map(p => (
                    <button key={p.label} type="button"
                      onClick={() => { if (p.days === 0) { setUseCustom(true); } else { setUseCustom(false); setWarrantyDays(p.days); } }}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                        (p.days === 0 && useCustom) || (p.days !== 0 && !useCustom && warrantyDays === p.days)
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-700 border-gray-200 hover:border-primary"
                      }`}
                    >{p.label}</button>
                  ))}
                </div>
                {useCustom && (
                  <Input type="number" placeholder="Custom days" value={customDays} onChange={e => setCustomDays(e.target.value)} min={1} className="mt-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea placeholder="What's covered, contact info, claim instructions…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1"><ShieldCheck className="mr-2 h-4 w-4" /> Save Warranty</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {all.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-muted-foreground">
          <ShieldCheck className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No warranties tracked yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">Any time a pro guarantees their work, save it here so you know exactly when it expires.</p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add First Warranty
          </Button>
        </div>
      )}

      {expiring.length > 0 && <WarrantySection title="Expiring Soon" items={expiring} status="expiring" onDelete={id => { deleteWarranty(id); toast.success("Warranty removed."); }} />}
      {active.length > 0 && <WarrantySection title="Active" items={active} status="active" onDelete={id => { deleteWarranty(id); toast.success("Warranty removed."); }} />}
      {expired.length > 0 && <WarrantySection title="Expired" items={expired} status="expired" onDelete={id => { deleteWarranty(id); toast.success("Warranty removed."); }} />}
    </div>
  );
}

function WarrantySection({ title, items, status, onDelete }: { title: string; items: Warranty[]; status: "active"|"expiring"|"expired"; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  const dot = status === "expired" ? "bg-gray-400" : status === "expiring" ? "bg-amber-400" : "bg-green-400";
  const color = status === "expired" ? "text-gray-500" : status === "expiring" ? "text-amber-600" : "text-green-700";
  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left">
        <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
        <span className={`text-sm font-semibold ${color}`}>{title}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto text-gray-400" />}
      </button>
      {open && items.map(w => <WarrantyCard key={w.id} warranty={w} status={status} onDelete={() => onDelete(w.id)} />)}
    </div>
  );
}

function WarrantyCard({ warranty: w, status, onDelete }: { warranty: Warranty; status: "active"|"expiring"|"expired"; onDelete: () => void }) {
  const daysLeft = differenceInDays(new Date(w.expiresAt), new Date());
  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{w.serviceDescription}</span>
            {status === "expiring" && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">
                <AlertCircle className="h-3 w-3 mr-1" /> Expires in {daysLeft}d
              </Badge>
            )}
            {status === "active" && (
              <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active · {daysLeft}d left
              </Badge>
            )}
            {status === "expired" && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" /> Expired
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            {w.proName && <div>By: {w.proName}</div>}
            <div>Completed {format(new Date(w.completedDate), "MMM d, yyyy")} · Expires {format(new Date(w.expiresAt), "MMM d, yyyy")}</div>
            {w.propertyAddress && <div>{w.propertyAddress}</div>}
            {w.notes && <div className="text-gray-500 truncate">{w.notes}</div>}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
