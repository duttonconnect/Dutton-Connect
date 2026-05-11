import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ISSUE_TYPES, submitReport, type IssueType } from "@/lib/reports";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reporterId: string;
  relatedJobId?: string;
  relatedUserId?: string;
  relatedConversationId?: string;
};

export function ReportUserDialog({
  open,
  onOpenChange,
  reporterId,
  relatedJobId,
  relatedUserId,
  relatedConversationId,
}: Props) {
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setIssueType("");
    setDescription("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueType) return;

    setSubmitting(true);
    try {
      const id = await submitReport({
        reporterId,
        issueType,
        description,
        ...(relatedJobId ? { relatedJobId } : {}),
        ...(relatedUserId ? { relatedUserId } : {}),
        ...(relatedConversationId ? { relatedConversationId } : {}),
      });

      if (id === null) {
        toast.error("Failed to submit report. Please try again.");
        return;
      }

      toast.success("Report submitted. Our team will review it shortly.");
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            Report a Problem
          </DialogTitle>
          <DialogDescription>
            Let us know what happened and our team will review it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="issue-type">Issue type</Label>
            <Select
              value={issueType}
              onValueChange={(v) => setIssueType(v as IssueType)}
              required
            >
              <SelectTrigger id="issue-type">
                <SelectValue placeholder="Select an issue type…" />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what happened…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!issueType || submitting}
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
