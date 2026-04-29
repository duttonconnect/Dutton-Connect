import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Receipt as ReceiptIcon,
  Plus,
  Upload,
  Trash2,
  X,
  Image as ImageIcon,
  DollarSign,
} from "lucide-react";

import {
  RECEIPT_CATEGORIES,
  useAppStore,
  type ReceiptCategory,
} from "@/lib/store";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Downscale image client-side so localStorage stays small.
async function fileToCompressedDataUrl(
  file: File,
  maxEdge = 1400,
  quality = 0.78,
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

export default function ReceiptTracker() {
  const { receipts, addReceipt, deleteReceipt } = useAppStore();
  const list = receipts ?? [];

  const [isOpen, setIsOpen] = useState(false);
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ReceiptCategory>("Materials");
  const [notes, setNotes] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalExpenses = useMemo(
    () => list.reduce((sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0), 0),
    [list],
  );

  const totalsByCategory = useMemo(() => {
    const totals: Record<string, { total: number; count: number }> = {};
    for (const cat of RECEIPT_CATEGORIES) totals[cat] = { total: 0, count: 0 };
    for (const r of list) {
      const bucket = totals[r.category] ?? { total: 0, count: 0 };
      bucket.total += r.amount || 0;
      bucket.count += 1;
      totals[r.category] = bucket;
    }
    return totals;
  }, [list]);

  const sortedReceipts = useMemo(
    () =>
      [...list].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [list],
  );

  const resetForm = () => {
    setVendor("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setAmount("");
    setCategory("Materials");
    setNotes("");
    setImageDataUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image too large. Please choose one under 15 MB.");
      return;
    }
    setIsUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim()) {
      toast.error("Vendor name is required.");
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!date) {
      toast.error("Date is required.");
      return;
    }

    try {
      addReceipt({
        vendor: vendor.trim(),
        date: new Date(date).toISOString(),
        amount: amt,
        category,
        notes: notes.trim(),
        imageDataUrl,
      });
      toast.success("Receipt saved");
      resetForm();
      setIsOpen(false);
    } catch (err) {
      // localStorage quota exceeded most likely
      toast.error(
        "Couldn't save — your saved receipts may have filled the device storage. Try removing the photo or deleting old receipts.",
      );
      console.error(err);
    }
  };

  const categoryColor: Record<ReceiptCategory, string> = {
    Gas: "bg-amber-100 text-amber-800",
    Tools: "bg-orange-100 text-orange-800",
    Materials: "bg-blue-100 text-blue-800",
    "Vehicle Repair": "bg-red-100 text-red-800",
    Advertising: "bg-pink-100 text-pink-800",
    Phone: "bg-indigo-100 text-indigo-800",
    Insurance: "bg-emerald-100 text-emerald-800",
    Supplies: "bg-cyan-100 text-cyan-800",
    "Contract Labor": "bg-purple-100 text-purple-800",
    Other: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-gray-500">
            Track business expenses for tax season. Photos stay on this device.
          </p>
        </div>

        <Dialog
          open={isOpen}
          onOpenChange={(o) => {
            setIsOpen(o);
            if (!o) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Receipt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>Receipt Photo (optional)</Label>
                {imageDataUrl ? (
                  <div className="relative mt-2 rounded-md border overflow-hidden bg-gray-50">
                    <img
                      src={imageDataUrl}
                      alt="Receipt preview"
                      className="w-full max-h-64 object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => {
                        setImageDataUrl(undefined);
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
                      {isUploading ? "Processing…" : "Tap to upload or take a photo"}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    placeholder="e.g. Home Depot"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ReceiptCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECEIPT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Job, project, or anything you want to remember"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                Save Receipt
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs opacity-80 mt-1">{list.length} receipts</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totals by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No expenses yet — add a receipt to see category totals.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {RECEIPT_CATEGORIES.filter(
                  (c) => totalsByCategory[c]?.count > 0,
                ).map((c) => (
                  <div
                    key={c}
                    className="flex justify-between items-center text-sm border-b last:border-0 sm:border-0 py-1.5"
                  >
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColor[c]}`}
                      >
                        {c}
                      </span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {totalsByCategory[c].count} receipt
                        {totalsByCategory[c].count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="font-semibold">
                      ${totalsByCategory[c].total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ReceiptIcon className="h-5 w-5" /> Saved Receipts
        </h2>
        {sortedReceipts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm">No receipts yet.</div>
              <div className="text-xs mt-1">
                Tap Add Receipt above to save your first one.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedReceipts.map((r) => (
              <Card key={r.id} className="overflow-hidden flex flex-col">
                {r.imageDataUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(r.imageDataUrl ?? null)}
                    className="block bg-gray-50 aspect-[4/3] overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`View ${r.vendor} receipt photo`}
                  >
                    <img
                      src={r.imageDataUrl}
                      alt={`${r.vendor} receipt`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </button>
                ) : (
                  <div className="bg-gray-50 aspect-[4/3] flex items-center justify-center text-muted-foreground border-b">
                    <ImageIcon className="h-10 w-10 opacity-30" />
                  </div>
                )}
                <CardContent className="p-4 flex flex-col gap-2 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate" title={r.vendor}>
                        {r.vendor}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(r.date), "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg flex items-center">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {r.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`w-fit text-xs ${categoryColor[r.category]}`}
                  >
                    {r.category}
                  </Badge>
                  {r.notes && (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {r.notes}
                    </div>
                  )}
                  <div className="mt-auto pt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete receipt from ${r.vendor} for $${r.amount.toFixed(2)}?`,
                          )
                        ) {
                          deleteReceipt(r.id);
                          toast.success("Receipt deleted");
                        }
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle className="sr-only">Receipt Photo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Receipt full view"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
