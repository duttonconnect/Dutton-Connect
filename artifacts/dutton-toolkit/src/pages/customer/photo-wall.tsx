import { useState, useRef } from "react";
import { ArrowLeft, Camera, ImagePlus, Trash2, Plus, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";

import { useAppStore, type JobPhoto } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PhotoWallPage() {
  const { jobPhotos, addJobPhoto, deleteJobPhoto, homeProfile } = useAppStore();
  const photos = jobPhotos ?? [];

  const [showForm, setShowForm] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [propertyAddress, setPropertyAddress] = useState(homeProfile?.address ?? "");
  const [proName, setProName] = useState("");
  const [completedDate, setCompletedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [beforeDataUrl, setBeforeDataUrl] = useState<string | undefined>();
  const [afterDataUrl, setAfterDataUrl] = useState<string | undefined>();

  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleBeforeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFile(file);
    setBeforeDataUrl(url);
  };

  const handleAfterFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFile(file);
    setAfterDataUrl(url);
  };

  const resetForm = () => {
    setServiceType("");
    setPropertyAddress(homeProfile?.address ?? "");
    setProName("");
    setCompletedDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setBeforeDataUrl(undefined);
    setAfterDataUrl(undefined);
    setShowForm(false);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType.trim()) {
      toast.error("Please enter the type of service.");
      return;
    }
    if (!beforeDataUrl && !afterDataUrl) {
      toast.error("Please upload at least one photo.");
      return;
    }
    addJobPhoto({
      jobRequestId: "",
      propertyAddress: propertyAddress.trim() || "My Property",
      beforeDataUrl,
      afterDataUrl,
      proName: proName.trim(),
      serviceType: serviceType.trim(),
      completedDate: completedDate ? new Date(completedDate + "T12:00:00").toISOString() : new Date().toISOString(),
      notes: notes.trim(),
    });
    toast.success("Photos saved to your home history.");
    resetForm();
  };

  // Group by property address
  const grouped = photos.reduce<Record<string, JobPhoto[]>>((acc, p) => {
    const key = p.propertyAddress || "My Property";
    acc[key] = acc[key] ? [...acc[key], p] : [p];
    return acc;
  }, {});

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
            <h1 className="text-2xl font-bold tracking-tight">Before &amp; After Wall</h1>
            <p className="text-sm text-muted-foreground">
              A visual history of every job done on your property.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? <ChevronUp className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "Add Photos"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="p-5">
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="text-sm font-semibold">Add Job Photos</div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="svc">Service Type</Label>
                  <Input
                    id="svc"
                    placeholder="Lawn Mowing, Roof Repair…"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pro">Pro Name (optional)</Label>
                  <Input
                    id="pro"
                    placeholder="John's Handyman Service"
                    value={proName}
                    onChange={(e) => setProName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addr">Property Address</Label>
                  <Input
                    id="addr"
                    placeholder="123 Main St"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date Completed</Label>
                  <Input
                    id="date"
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Photo upload pair */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Before
                  </Label>
                  <input
                    ref={beforeRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBeforeFile}
                  />
                  {beforeDataUrl ? (
                    <div className="relative group">
                      <img src={beforeDataUrl} className="w-full h-36 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => setBeforeDataUrl(undefined)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => beforeRef.current?.click()}
                      className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Upload before</span>
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> After
                  </Label>
                  <input
                    ref={afterRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAfterFile}
                  />
                  {afterDataUrl ? (
                    <div className="relative group">
                      <img src={afterDataUrl} className="w-full h-36 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => setAfterDataUrl(undefined)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => afterRef.current?.click()}
                      className="w-full h-36 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-xs">Upload after</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="What was done, materials used, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  <Plus className="mr-2 h-4 w-4" /> Save to History
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {photos.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center text-muted-foreground">
          <Camera className="h-9 w-9 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No photos yet</p>
          <p className="text-xs mt-1 max-w-xs mx-auto">
            Add before and after photos for any job done on your property. Great for home records and resale value.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add First Job Photos
          </Button>
        </div>
      )}

      {Object.entries(grouped).map(([address, items]) => (
        <div key={address} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Home className="h-4 w-4 text-primary shrink-0" />
            {address}
            <Badge variant="secondary" className="ml-1">{items.length} job{items.length !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {items.sort((a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()).map((p) => (
              <PhotoCard key={p.id} photo={p} onDelete={() => { deleteJobPhoto(p.id); toast.success("Photo entry removed."); }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoCard({ photo: p, onDelete }: { photo: JobPhoto; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-sm">{p.serviceType}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(p.completedDate), "MMM d, yyyy")}
              {p.proName && <> · {p.proName}</>}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {(p.beforeDataUrl || p.afterDataUrl) && (
          <div className="grid grid-cols-2 gap-2">
            {p.beforeDataUrl ? (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Before</span>
                <img src={p.beforeDataUrl} className="w-full h-28 object-cover rounded-md border" />
              </div>
            ) : <div />}
            {p.afterDataUrl ? (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">After</span>
                <img src={p.afterDataUrl} className="w-full h-28 object-cover rounded-md border" />
              </div>
            ) : <div />}
          </div>
        )}

        {p.notes && (
          <p className="text-xs text-muted-foreground leading-relaxed">{p.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}
