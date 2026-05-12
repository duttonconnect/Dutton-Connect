import { useState } from "react";
import { ArrowLeft, Users, Plus, Trash2, ChevronDown, ChevronUp, UserPlus, MapPin } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAppStore, type BundleRequest, REQUEST_CATEGORIES, type RequestCategory, type Urgency } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_OPTIONS = [2, 3, 4, 5];

export default function BundleRequestsPage() {
  const { bundleRequests, addBundleRequest, joinBundleRequest, deleteBundleRequest } = useAppStore();
  const bundles = bundleRequests ?? [];

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RequestCategory>("Handyman");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(3);
  const [urgency, setUrgency] = useState<Urgency>("Normal");

  const resetForm = () => {
    setTitle(""); setDescription(""); setAddress(""); setBudget("");
    setCategory("Handyman"); setMaxParticipants(3); setUrgency("Normal");
    setShowForm(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Please enter a title."); return; }
    if (!address.trim()) { toast.error("Please enter your address."); return; }
    addBundleRequest({
      title: title.trim(),
      category,
      description: description.trim(),
      address: address.trim(),
      budget: parseFloat(budget) || 0,
      urgency,
      createdBy: "me",
      participants: ["me"],
      maxParticipants,
      status: "open",
    });
    toast.success("Neighborhood bundle created. Share it with your neighbors!");
    resetForm();
  };

  const open = bundles.filter(b => b.status === "open");
  const full = bundles.filter(b => b.status === "full");
  const closed = bundles.filter(b => b.status === "closed");

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
            <h1 className="text-2xl font-bold tracking-tight">Neighbor Bundles</h1>
            <p className="text-sm text-muted-foreground">
              Combine jobs with neighbors — pros do more stops, everyone pays less.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? <ChevronUp className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "Create Bundle"}
        </Button>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <strong>How it works:</strong> Create a bundle for a job at your address. Share the link with neighbors on the same street. When 2–5 households join, a pro can handle all stops in one trip — saving everyone time and money.
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="text-sm font-semibold">Create a Neighborhood Bundle</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input placeholder="Lawn Mowing — Oak Street" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={v => setCategory(v as RequestCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUEST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Your Address</Label>
                <Input placeholder="123 Oak St, Athens, GA" value={address} onChange={e => setAddress(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe the job. Neighbors will see this when deciding to join." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Your Budget ($)</Label>
                  <Input type="number" placeholder="150" value={budget} onChange={e => setBudget(e.target.value)} min={0} />
                </div>
                <div className="space-y-2">
                  <Label>Max Households</Label>
                  <div className="flex gap-2">
                    {MAX_OPTIONS.map(n => (
                      <button key={n} type="button" onClick={() => setMaxParticipants(n)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${maxParticipants === n ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-200 hover:border-primary"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={v => setUrgency(v as Urgency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Low","Normal","Soon","Urgent","Emergency"] as Urgency[]).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1"><Users className="mr-2 h-4 w-4" /> Create Bundle</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {bundles.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-muted-foreground">
          <Users className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No bundles yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">Create one and invite your neighbors to join for a group discount.</p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Bundle
          </Button>
        </div>
      )}

      {open.length > 0 && (
        <BundleSection title="Open — Accepting Neighbors" items={open}
          onJoin={id => { joinBundleRequest(id, "neighbor"); toast.success("Joined! The bundle organizer will be notified."); }}
          onDelete={id => { deleteBundleRequest(id); toast.success("Bundle removed."); }} />
      )}
      {full.length > 0 && (
        <BundleSection title="Full" items={full} onJoin={() => {}} onDelete={id => { deleteBundleRequest(id); toast.success("Bundle removed."); }} />
      )}
      {closed.length > 0 && (
        <BundleSection title="Closed" items={closed} onJoin={() => {}} onDelete={id => { deleteBundleRequest(id); toast.success("Bundle removed."); }} />
      )}
    </div>
  );
}

function BundleSection({ title, items, onJoin, onDelete }: { title: string; items: BundleRequest[]; onJoin: (id: string) => void; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 w-full text-left">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
        {open ? <ChevronUp className="h-3.5 w-3.5 ml-auto text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto text-gray-400" />}
      </button>
      {open && items.map(b => (
        <Card key={b.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{b.title}</span>
                  <Badge variant="secondary" className="text-xs">{b.category}</Badge>
                  {b.status === "full" && <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs">Full</Badge>}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3 shrink-0" /> {b.address}
                </div>
                {b.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{b.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{b.participants.length}</span>
                    <span className="text-muted-foreground">/ {b.maxParticipants} households</span>
                  </div>
                  {b.budget > 0 && <span className="text-xs text-muted-foreground">Your budget: ${b.budget}</span>}
                </div>
                {/* Participant slots visual */}
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: b.maxParticipants }).map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${i < b.participants.length ? "bg-primary" : "bg-gray-200"}`} />
                  ))}
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => onDelete(b.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            {b.status === "open" && !b.participants.includes("neighbor") && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => onJoin(b.id)}>
                <UserPlus className="mr-2 h-3.5 w-3.5" /> Join this Bundle
              </Button>
            )}
            {b.participants.includes("neighbor") && (
              <div className="text-xs text-green-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> You've joined this bundle
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
