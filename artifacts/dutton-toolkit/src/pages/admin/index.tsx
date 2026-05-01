import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  Users,
  Search,
  Loader2,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  BadgeCheck,
  Bug,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  type AdminUser,
  loadAllUsers,
  setUserAdmin,
  setUserRole,
} from "@/lib/admin";
import {
  type BugReport,
  loadBugReports,
  updateBugReportStatus,
} from "@/lib/bug-reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type SortKey = keyof Pick<AdminUser, "displayName" | "email" | "role" | "createdAt">;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user, isAdmin, isConfigured } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loadingBugs, setLoadingBugs] = useState(true);
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null);

  async function fetchUsers() {
    setLoading(true);
    const list = await loadAllUsers();
    setUsers(list);
    setLoading(false);
  }

  async function fetchBugReports() {
    setLoadingBugs(true);
    const reports = await loadBugReports();
    setBugReports(reports);
    setLoadingBugs(false);
  }

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchBugReports();
    } else {
      setLoading(false);
      setLoadingBugs(false);
    }
  }, [isAdmin]);

  // ─── Guard ──────────────────────────────────────────────────────────────────

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
        <Shield className="h-10 w-10 opacity-20" />
        <p className="font-medium">Firebase is not configured.</p>
        <p className="text-sm">Set the VITE_FIREBASE_* environment variables to use admin features.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <Shield className="h-12 w-12 text-red-400" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          This area is restricted to admin accounts. Contact your system
          administrator to request access.
        </p>
      </div>
    );
  }

  // ─── Sort & Filter ──────────────────────────────────────────────────────────

  const q = search.toLowerCase().trim();
  const filtered = users.filter(
    (u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q),
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] ?? "").toLowerCase();
    const bv = (b[sortKey] ?? "").toLowerCase();
    const cmp = av.localeCompare(bv);
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-0.5" />
    );
  }

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleToggleAdmin(target: AdminUser) {
    if (target.id === user?.uid) {
      toast.error("You cannot change your own admin status.");
      return;
    }
    setTogglingId(target.id);
    try {
      await setUserAdmin(target.id, !target.isAdmin);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === target.id ? { ...u, isAdmin: !u.isAdmin } : u,
        ),
      );
      toast.success(
        target.isAdmin
          ? `Admin removed from ${target.email}`
          : `${target.email} is now an admin`,
      );
    } catch {
      toast.error("Failed to update admin status.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleRole(target: AdminUser) {
    const next: "pro" | "customer" =
      target.role === "pro" ? "customer" : "pro";
    setTogglingId(target.id + "-role");
    try {
      await setUserRole(target.id, next);
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, role: next } : u)),
      );
      toast.success(`${target.email} role changed to ${next}`);
    } catch {
      toast.error("Failed to update role.");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleBugStatus(
    report: BugReport,
    newStatus: BugReport["status"],
  ) {
    setUpdatingBugId(report.id + newStatus);
    try {
      const ok = await updateBugReportStatus(report.id, newStatus);
      if (ok) {
        setBugReports((prev) =>
          prev.map((r) =>
            r.id === report.id ? { ...r, status: newStatus } : r,
          ),
        );
        toast.success(
          `Report marked as ${newStatus === "reviewed" ? "reviewed" : "resolved"}.`,
        );
      } else {
        toast.error("Failed to update report status.");
      }
    } finally {
      setUpdatingBugId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const adminCount = users.filter((u) => u.isAdmin).length;
  const proCount = users.filter((u) => u.role === "pro").length;
  const customerCount = users.filter((u) => u.role === "customer").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Admin Panel
          </h1>
          <p className="text-gray-500">Manage all Dutton Connect users.</p>
        </div>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{proCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-2xl font-bold">{customerCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Customers</p>
          </CardContent>
        </Card>
      </div>

      {/* User table */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-4 w-4" />
              Users
              <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("displayName")}
                    >
                      Name <SortIcon col="displayName" />
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("email")}
                    >
                      Email <SortIcon col="email" />
                    </th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("role")}
                    >
                      Role <SortIcon col="role" />
                    </th>
                    <th className="px-4 py-3 text-left">Admin</th>
                    <th
                      className="px-4 py-3 text-left cursor-pointer hover:text-foreground select-none"
                      onClick={() => toggleSort("createdAt")}
                    >
                      Joined <SortIcon col="createdAt" />
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((u) => {
                    const isCurrentUser = u.id === user.uid;
                    const roleToggling = togglingId === u.id + "-role";
                    const adminToggling = togglingId === u.id;
                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-gray-50 transition-colors ${isCurrentUser ? "bg-blue-50/50" : ""}`}
                      >
                        {/* Name */}
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            {u.displayName || <span className="text-muted-foreground italic">No name</span>}
                            {isCurrentUser && (
                              <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded font-semibold leading-none">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {u.email || "—"}
                        </td>

                        {/* Role badge */}
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              u.role === "pro"
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : u.role === "customer"
                                  ? "border-gray-300 text-gray-600 bg-gray-50"
                                  : "border-gray-200 text-gray-400"
                            }
                          >
                            {u.role || "unknown"}
                          </Badge>
                        </td>

                        {/* Admin badge */}
                        <td className="px-4 py-3">
                          {u.isAdmin ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                              <BadgeCheck className="h-4 w-4" /> Admin
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle role */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={!!togglingId || isCurrentUser}
                              onClick={() => handleToggleRole(u)}
                              title={`Switch to ${u.role === "pro" ? "customer" : "pro"}`}
                            >
                              {roleToggling ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.role === "pro" ? (
                                "Set Customer"
                              ) : (
                                "Set Pro"
                              )}
                            </Button>

                            {/* Toggle admin */}
                            <Button
                              size="sm"
                              variant={u.isAdmin ? "destructive" : "secondary"}
                              className="h-7 text-xs px-2"
                              disabled={!!togglingId || isCurrentUser}
                              onClick={() => handleToggleAdmin(u)}
                              title={u.isAdmin ? "Remove admin" : "Grant admin"}
                            >
                              {adminToggling ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : u.isAdmin ? (
                                "Remove Admin"
                              ) : (
                                "Make Admin"
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info callout */}
      {adminCount === 1 && (
        <p className="text-xs text-muted-foreground text-center">
          You are the only admin. To grant access to another user, click "Make Admin" on their row.
        </p>
      )}

      {/* ─── Bug Reports ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Bug className="h-4 w-4" />
              Bug Reports
              <Badge variant="secondary" className="ml-1">
                {bugReports.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBugReports}
              disabled={loadingBugs}
            >
              <RefreshCw
                className={`mr-2 h-3.5 w-3.5 ${loadingBugs ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingBugs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bugReports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bug className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No bug reports yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {bugReports.map((r) => {
                const isReviewing = updatingBugId === r.id + "reviewed";
                const isResolving = updatingBugId === r.id + "resolved";
                return (
                  <div key={r.id} className="px-4 py-4 space-y-2">
                    {/* Title row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">
                          {r.bugTitle}
                        </span>
                        {/* Priority badge */}
                        <Badge
                          variant="outline"
                          className={
                            r.priority === "High"
                              ? "border-red-300 text-red-700 bg-red-50"
                              : r.priority === "Medium"
                                ? "border-amber-300 text-amber-700 bg-amber-50"
                                : "border-gray-300 text-gray-600 bg-gray-50"
                          }
                        >
                          {r.priority}
                        </Badge>
                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={
                            r.status === "resolved"
                              ? "border-green-300 text-green-700 bg-green-50"
                              : r.status === "reviewed"
                                ? "border-blue-300 text-blue-700 bg-blue-50"
                                : "border-gray-300 text-gray-500 bg-gray-50"
                          }
                        >
                          {r.status === "resolved" ? (
                            <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                          ) : r.status === "reviewed" ? (
                            <Clock className="h-3 w-3 mr-1 inline" />
                          ) : null}
                          {r.status}
                        </Badge>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {r.status !== "reviewed" && r.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            disabled={!!updatingBugId}
                            onClick={() => handleBugStatus(r, "reviewed")}
                          >
                            {isReviewing ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Mark Reviewed"
                            )}
                          </Button>
                        )}
                        {r.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs px-2"
                            disabled={!!updatingBugId}
                            onClick={() => handleBugStatus(r, "resolved")}
                          >
                            {isResolving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Mark Resolved"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {r.description}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {r.pageOrFeature && (
                        <span>
                          <span className="font-medium text-gray-600">Page:</span>{" "}
                          {r.pageOrFeature}
                        </span>
                      )}
                      <span>
                        <span className="font-medium text-gray-600">Role:</span>{" "}
                        {r.userRole}
                      </span>
                      <span>
                        <span className="font-medium text-gray-600">
                          Reporter:
                        </span>{" "}
                        {r.reporterId.slice(0, 10)}…
                      </span>
                      <span>
                        <span className="font-medium text-gray-600">
                          Submitted:
                        </span>{" "}
                        {formatDate(r.createdAt)}
                      </span>
                      {r.screenshotFileName && (
                        <span>
                          <span className="font-medium text-gray-600">
                            Screenshot:
                          </span>{" "}
                          {r.screenshotFileName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
