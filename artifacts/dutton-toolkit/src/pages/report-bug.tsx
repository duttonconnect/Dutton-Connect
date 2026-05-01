import { useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bug,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/role";
import { saveBugReport } from "@/lib/bug-reports";
import { isFirebaseConfigured } from "@/lib/firebase";

const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;

const PAGE_OPTIONS = [
  "Dashboard",
  "Jobs",
  "Quotes",
  "Customers",
  "Payments",
  "Messages",
  "Calendar",
  "Map",
  "Route Planner",
  "Mileage Tracker",
  "Receipts",
  "Nearby Requests",
  "Find Pros",
  "Post Request",
  "My Requests",
  "My Jobs",
  "Admin",
  "Login / Signup",
  "Other",
];

const BLANK = {
  bugTitle: "",
  description: "",
  pageOrFeature: "",
  priority: "Medium" as const,
  screenshotFileName: "",
};

export default function ReportBug() {
  const { user } = useAuth();
  const { role } = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(BLANK);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof typeof BLANK, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    set("screenshotFileName", file ? file.name : "");
  };

  const clearFile = () => {
    set("screenshotFileName", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.bugTitle.trim()) {
      toast.error("Please enter a title for the bug.");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Please describe the bug.");
      return;
    }

    setSubmitting(true);
    try {
      const id = await saveBugReport({
        bugTitle: form.bugTitle.trim(),
        description: form.description.trim(),
        pageOrFeature: form.pageOrFeature || "Other",
        userRole: role ?? "unknown",
        priority: form.priority,
        screenshotFileName: form.screenshotFileName || undefined,
        reporterId: user?.uid ?? "anonymous",
        status: "open",
        createdAt: new Date().toISOString(),
      });

      if (id) {
        toast.success("Bug report sent. Thank you!");
        setForm(BLANK);
        clearFile();
      } else {
        toast.error(
          "Could not submit the report. Check your connection and try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bug className="h-6 w-6 text-primary" />
            Report a Bug
          </h1>
          <p className="text-gray-500 text-sm">
            Help us improve by describing what went wrong.
          </p>
        </div>
      </div>

      {!isFirebaseConfigured && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Firebase is not configured. Bug reports will not be saved until
            Firebase is connected.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Bug Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="bugTitle">Title *</Label>
              <Input
                id="bugTitle"
                placeholder="Short description of the bug"
                value={form.bugTitle}
                onChange={(e) => set("bugTitle", e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="What happened? What did you expect to happen? Steps to reproduce."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {form.description.length}/2000
              </p>
            </div>

            {/* Page / Feature */}
            <div className="space-y-1.5">
              <Label>Page or Feature</Label>
              <Select
                value={form.pageOrFeature}
                onValueChange={(v) => set("pageOrFeature", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a page or feature…" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  set("priority", v as (typeof PRIORITY_OPTIONS)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Screenshot (filename only — no upload storage) */}
            <div className="space-y-1.5">
              <Label>Screenshot (optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach file
                </Button>
                {form.screenshotFileName && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-700 bg-gray-100 rounded px-2 py-1">
                    {form.screenshotFileName}
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground">
                File name is recorded; image content is not uploaded.
              </p>
            </div>

            {/* Auto-filled info */}
            <div className="rounded-lg bg-gray-50 border px-4 py-3 text-sm text-muted-foreground space-y-1">
              <div>
                <span className="font-medium text-gray-700">Role:</span>{" "}
                {role ?? "unknown"}
              </div>
              <div>
                <span className="font-medium text-gray-700">User ID:</span>{" "}
                {user?.uid ? `${user.uid.slice(0, 8)}…` : "not signed in"}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !isFirebaseConfigured}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit Bug Report"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
