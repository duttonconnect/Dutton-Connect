import { useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

import {
  REQUEST_CATEGORIES,
  useAppStore,
  type RequestCategory,
  type Urgency,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { postJobRequestToFirestore } from "@/lib/matching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const URGENCY_OPTIONS: Urgency[] = ["Low", "Normal", "Urgent"];

async function fileToCompressedDataUrl(
  file: File,
  maxEdge = 1200,
  quality = 0.75,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported.");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read image"));
      i.src = url;
    });
    const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PostJobRequest() {
  const { addJobRequest } = useAppStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RequestCategory>("Handyman");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredDate, setPreferredDate] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  );
  const [urgency, setUrgency] = useState<Urgency>("Normal");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image too large. Please choose one under 15 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Job title is required.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please add a short description.");
      return;
    }
    if (!address.trim()) {
      toast.error("Address or location is required.");
      return;
    }
    const budgetNum = parseFloat(budget);
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      toast.error("Enter a valid budget.");
      return;
    }

    const sharedId = Math.random().toString(36).slice(2, 11);
    const createdAt = new Date().toISOString();
    const customerId = user?.uid ?? "";

    const requestData = {
      id: sharedId,
      title: title.trim(),
      category,
      description: description.trim(),
      address: address.trim(),
      budget: budgetNum,
      preferredDate: new Date(preferredDate).toISOString(),
      urgency,
      photoDataUrl,
      customerId,
      status: "open" as const,
    };

    setSubmitting(true);
    try {
      addJobRequest(requestData);
      postJobRequestToFirestore(sharedId, {
        title: requestData.title,
        category: requestData.category,
        description: requestData.description,
        address: requestData.address,
        budget: requestData.budget,
        preferredDate: requestData.preferredDate,
        urgency: requestData.urgency,
        customerId,
      }, createdAt);
      toast.success("Job posted");
      setLocation("/my-requests");
    } catch (err) {
      toast.error(
        "Couldn't save — your device storage may be full. Try removing the photo.",
      );
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Post a Job
          </h1>
          <p className="text-gray-500 text-sm">
            Tell local pros what you need done.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g. Fix leaky kitchen faucet"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as RequestCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Urgency</Label>
                <Select
                  value={urgency}
                  onValueChange={(v) => setUrgency(v as Urgency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the work — size, materials, anything special pros should know."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Address / Location</Label>
              <Input
                id="address"
                placeholder="123 Main St, Athens, GA"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  placeholder="e.g. 250"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="preferredDate">Preferred Date</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Photo (optional)</Label>
              {photoDataUrl ? (
                <div className="relative mt-2 rounded-md border overflow-hidden bg-gray-50">
                  <img
                    src={photoDataUrl}
                    alt="Job preview"
                    className="w-full max-h-72 object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => {
                      setPhotoDataUrl(undefined);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isUploading ? "Processing…" : "Tap to upload a photo of the job"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <ImageIcon className="inline h-3 w-3 mr-1" />
                    Helps pros give an accurate quote
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…</>
                ) : (
                  "Post Request"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
