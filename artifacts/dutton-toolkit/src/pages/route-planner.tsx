import { useEffect, useRef, useState, useCallback } from "react";
import { Navigation, MapPin, Save, ExternalLink, Route, Trash2, Pencil, Check, X, GripVertical, FolderOpen, Search, ArrowDownAZ, Clock, AlertTriangle, Star, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  deleteField,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "sonner";

import { useAppStore, type Job } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const UNDO_WINDOW_MS = 5000;

type SavedRoute = {
  id: string;
  userId: string;
  name: string;
  startAddress: string;
  endAddress: string;
  stops: string[];
  createdAt: string;
  deletedAt?: string;
  starred?: boolean;
  previousName?: string;
  renamedAt?: string;
};

function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function buildMapsUrl(startAddress: string, endAddress: string, stops: string[]): string {
  const params = new URLSearchParams();
  params.set("api", "1");
  if (startAddress.trim()) params.set("origin", startAddress.trim());
  if (endAddress.trim()) params.set("destination", endAddress.trim());
  if (stops.length > 0) params.set("waypoints", stops.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function JobStopItem({
  job,
  checked,
  stopNumber,
  onToggle,
}: {
  job: Job;
  checked: boolean;
  stopNumber: number | null;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
        id={`stop-${job.id}`}
      />
      <label htmlFor={`stop-${job.id}`} className="min-w-0 flex-1 cursor-pointer">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm truncate">{job.title}</div>
          {stopNumber !== null && (
            <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950 text-xs font-semibold leading-none">
              {stopNumber}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{job.address}</span>
        </div>
        {job.scheduledDate && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(job.scheduledDate), "MMM d · h:mm a")} ·{" "}
            {job.status.replace("_", " ")}
          </div>
        )}
      </label>
    </div>
  );
}

function DraggableStopList({
  stops,
  activeJobAddresses,
  onReorder,
  onRemove,
}: {
  stops: string[];
  activeJobAddresses: Set<string>;
  onReorder: (stops: string[]) => void;
  onRemove: (address: string) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) {
      setDragOverIndex(null);
      return;
    }
    const next = [...stops];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    onReorder(next);
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="space-y-1">
      {stops.map((addr, index) => {
        const hasMatchingJob = activeJobAddresses.has(addr);
        return (
          <div
            key={addr}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`text-xs rounded px-2 py-1.5 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-opacity select-none ${
              dragOverIndex === index && dragIndex.current !== index
                ? "opacity-50 ring-2 ring-primary ring-offset-1"
                : "opacity-100"
            } ${hasMatchingJob ? "bg-muted" : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"}`}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {hasMatchingJob ? (
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
            )}
            <span className={`truncate flex-1 ${hasMatchingJob ? "" : "text-muted-foreground"}`}>{addr}</span>
            {!hasMatchingJob && (
              <span className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 whitespace-nowrap">
                No matching job
              </span>
            )}
            <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-amber-950 text-xs font-semibold leading-none">{index + 1}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(addr);
              }}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label={`Remove stop ${index + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function RouteCard({
  route,
  onDelete,
  onRename,
  onLoad,
  onStar,
  plannerHasContent,
  activeJobAddresses,
}: {
  route: SavedRoute;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onLoad: (route: SavedRoute) => void;
  onStar: (id: string, starred: boolean) => void;
  plannerHasContent: boolean;
  activeJobAddresses: Set<string>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(route.name || "");
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingLoad, setConfirmingLoad] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  function startEdit() {
    setDraftName(route.name || "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftName(route.name || "");
  }

  async function commitRename() {
    const trimmed = draftName.trim();
    if (trimmed === (route.name || "")) {
      setEditing(false);
      return;
    }
    setRenaming(true);
    try {
      await onRename(route.id, trimmed);
      setEditing(false);
    } finally {
      setRenaming(false);
    }
  }

  const stops = route.stops ?? [];
  const mapsUrl = buildMapsUrl(route.startAddress, route.endAddress, stops);
  const displayName = route.name || format(new Date(route.createdAt), "MMM d, yyyy · h:mm a");
  const staleStopCount = stops.filter((addr) => !activeJobAddresses.has(addr)).length;

  return (
    <div ref={cardRef} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="h-7 text-sm font-medium px-2 py-0"
                placeholder="Route name…"
                disabled={renaming}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={commitRename}
                disabled={renaming}
                aria-label="Confirm rename"
              >
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={cancelEdit}
                disabled={renaming}
                aria-label="Cancel rename"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <span className="text-sm font-medium truncate">{displayName}</span>
              <button
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                aria-label="Rename route"
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          )}
          {route.name && (
            <div className="text-xs text-muted-foreground">
              {route.createdAt ? format(new Date(route.createdAt), "MMM d, yyyy · h:mm a") : "—"}
            </div>
          )}
          {route.startAddress && (
            <div className="text-sm">
              <span className="font-medium">From:</span> {route.startAddress}
            </div>
          )}
          {route.endAddress && (
            <div className="text-sm">
              <span className="font-medium">To:</span> {route.endAddress}
            </div>
          )}
          {stops.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Stops ({stops.length}):</span>{" "}
              {stops.join(" → ")}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {confirmingDelete ? (
            <>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Delete?</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete(route.id);
                }}
                aria-label="Confirm delete"
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmingDelete(false)}
                aria-label="Cancel delete"
              >
                No
              </Button>
            </>
          ) : confirmingLoad ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setConfirmingLoad(false);
                  onLoad(route);
                }}
                aria-label="Confirm load route"
              >
                Replace
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setConfirmingLoad(false);
                  requestAnimationFrame(() => {
                    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  });
                }}
                aria-label="Cancel load"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => onStar(route.id, !route.starred)}
                className={`p-1 rounded transition-colors ${
                  route.starred
                    ? "text-amber-400 hover:text-amber-500"
                    : "text-muted-foreground hover:text-amber-400"
                }`}
                aria-label={route.starred ? "Unstar route" : "Star route"}
                aria-pressed={route.starred ?? false}
              >
                <Star className={`h-4 w-4 ${route.starred ? "fill-amber-400" : ""}`} />
              </button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (plannerHasContent) {
                    setConfirmingLoad(true);
                  } else {
                    onLoad(route);
                  }
                }}
                aria-label="Load route into planner"
              >
                <FolderOpen className="h-3.5 w-3.5 mr-1" />
                Load
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Open
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete route"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {confirmingLoad && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            This will replace your current route. Preview:
          </p>
          {route.startAddress && (
            <div className="text-xs">
              <span className="font-medium">From:</span> {route.startAddress}
            </div>
          )}
          {route.endAddress && (
            <div className="text-xs">
              <span className="font-medium">To:</span> {route.endAddress}
            </div>
          )}
          {stops.length > 0 && (
            <div className="text-xs">
              <span className="font-medium">Stops ({stops.length}):</span>{" "}
              <span className="text-muted-foreground">{stops.join(" → ")}</span>
            </div>
          )}
          {!route.startAddress && !route.endAddress && stops.length === 0 && (
            <div className="text-xs text-muted-foreground">No addresses saved in this route.</div>
          )}
          {staleStopCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {staleStopCount} {staleStopCount === 1 ? "stop" : "stops"} no longer{" "}
              {staleStopCount === 1 ? "matches" : "match"} active jobs
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoutePlanner() {
  const { jobs, routePlannerDirty, setRoutePlannerDirty, setRoutePlannerHasContent } = useAppStore();
  const { user } = useAuth();

  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [routeName, setRouteName] = useState("");
  const [orderedStops, setOrderedStops] = useState<string[]>([]);
  const [loadedRouteId, setLoadedRouteId] = useState<string | null>(null);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [stopsCollapsed, setStopsCollapsed] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [routeSearch, setRouteSearch] = useState(
    () => sessionStorage.getItem("routePlannerSearch") ?? ""
  );
  const [routeSort, setRouteSort] = useState<"newest" | "alpha">("newest");

  const plannerRef = useRef<HTMLDivElement>(null);
  const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingRenameTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isDirty = routePlannerDirty;
  const setIsDirty = setRoutePlannerDirty;

  const plannerHasContent =
    startAddress.trim().length > 0 ||
    endAddress.trim().length > 0 ||
    orderedStops.length > 0;

  const plannerHasAnyContent =
    plannerHasContent || routeName.trim().length > 0;

  useEffect(() => {
    if (!isDirty || !plannerHasContent) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, plannerHasContent]);

  useEffect(() => {
    setRoutePlannerHasContent(plannerHasContent);
  }, [plannerHasContent]);

  useEffect(() => {
    return () => {
      setRoutePlannerDirty(false);
      setRoutePlannerHasContent(false);
    };
  }, []);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const todayJobs = jobs.filter(
    (j) => isToday(j.scheduledDate) && j.status !== "cancelled" && j.address,
  );

  const openJobs = jobs.filter(
    (j) =>
      !isToday(j.scheduledDate) &&
      (j.status === "scheduled" || j.status === "in_progress") &&
      j.address,
  );

  const activeJobAddresses = new Set(
    jobs.filter((j) => j.status !== "cancelled" && j.address).map((j) => j.address),
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
    loadSavedRoutes();
  }, [user?.uid]);

  async function loadSavedRoutes() {
    if (!isFirebaseConfigured || !db || !user) return;
    const firestore = db;
    setLoadingRoutes(true);
    try {
      const q = query(
        collection(firestore, "routes"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const now = Date.now();
      const activeRoutes: SavedRoute[] = [];
      const staleDeleteIds: string[] = [];
      const pendingRoutes: SavedRoute[] = [];

      for (const d of snap.docs) {
        const data = d.data() as Omit<SavedRoute, "id">;
        const route: SavedRoute = { id: d.id, ...data };
        if (data.deletedAt) {
          const elapsed = now - new Date(data.deletedAt).getTime();
          if (elapsed >= UNDO_WINDOW_MS) {
            staleDeleteIds.push(d.id);
          } else {
            pendingRoutes.push(route);
          }
        } else {
          activeRoutes.push(route);
        }
      }

      // Purge stale soft-deletes in the background
      for (const id of staleDeleteIds) {
        deleteDoc(doc(firestore, "routes", id)).catch((err) =>
          console.warn("[RoutePlanner] Failed to purge stale soft-delete:", err),
        );
      }

      // Re-surface undo toasts for any renames that survived a reload
      const staleRenameIds: string[] = [];
      const pendingRenames: SavedRoute[] = [];
      for (const route of activeRoutes) {
        if (route.previousName !== undefined && route.renamedAt) {
          const elapsed = now - new Date(route.renamedAt).getTime();
          if (elapsed >= UNDO_WINDOW_MS) {
            staleRenameIds.push(route.id);
          } else {
            pendingRenames.push(route);
          }
        }
      }

      // Purge stale rename metadata in the background
      for (const id of staleRenameIds) {
        updateDoc(doc(firestore, "routes", id), {
          previousName: deleteField(),
          renamedAt: deleteField(),
        }).catch((err) =>
          console.warn("[RoutePlanner] Failed to purge stale rename metadata:", err),
        );
      }

      setSavedRoutes(activeRoutes);

      // Re-surface undo toasts for any rename operations that survived a reload
      for (const route of pendingRenames) {
        const elapsed = Date.now() - new Date(route.renamedAt!).getTime();
        const remaining = Math.max(500, UNDO_WINDOW_MS - elapsed);
        let undone = false;

        const existingTimer = pendingRenameTimers.current.get(route.id);
        if (existingTimer !== undefined) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
          pendingRenameTimers.current.delete(route.id);
          if (undone) return;
          updateDoc(doc(firestore, "routes", route.id), {
            previousName: deleteField(),
            renamedAt: deleteField(),
          }).catch((err) =>
            console.warn("[RoutePlanner] Failed to clear rename metadata:", err),
          );
        }, remaining);
        pendingRenameTimers.current.set(route.id, timer);

        toast.success("Route renamed.", {
          duration: remaining,
          action: {
            label: "Undo",
            onClick: async () => {
              if (undone) return;
              clearTimeout(timer);
              pendingRenameTimers.current.delete(route.id);
              try {
                await updateDoc(doc(firestore, "routes", route.id), {
                  name: route.previousName,
                  previousName: deleteField(),
                  renamedAt: deleteField(),
                });
                undone = true;
                setSavedRoutes((prev) =>
                  prev.map((r) =>
                    r.id === route.id
                      ? { ...r, name: route.previousName!, previousName: undefined, renamedAt: undefined }
                      : r,
                  ),
                );
              } catch (err) {
                console.warn("[RoutePlanner] Undo rename failed:", err);
                toast.error("Could not undo rename. Please try again.");
              }
            },
          },
        });
      }

      // Re-surface undo toasts for any deletions that survived a reload
      for (const route of pendingRoutes) {
        const elapsed = Date.now() - new Date(route.deletedAt!).getTime();
        const remaining = Math.max(500, UNDO_WINDOW_MS - elapsed);
        let undone = false;

        // Cancel any pre-existing timer for this route (e.g. from a prior loadSavedRoutes call)
        const existingTimer = pendingDeleteTimers.current.get(route.id);
        if (existingTimer !== undefined) clearTimeout(existingTimer);

        const timer = setTimeout(async () => {
          pendingDeleteTimers.current.delete(route.id);
          if (undone) return;
          // Guard: only hard-delete if deletedAt is still set (undo may have cleared it)
          try {
            const snap = await getDoc(doc(firestore, "routes", route.id));
            if (snap.exists() && snap.data()?.["deletedAt"]) {
              await deleteDoc(doc(firestore, "routes", route.id));
            }
          } catch (err) {
            console.warn("[RoutePlanner] Permanent delete failed:", err);
          }
        }, remaining);
        pendingDeleteTimers.current.set(route.id, timer);

        toast.success("Route deleted.", {
          duration: remaining,
          action: {
            label: "Undo",
            onClick: async () => {
              if (undone) return;
              clearTimeout(timer);
              pendingDeleteTimers.current.delete(route.id);
              try {
                await updateDoc(doc(firestore, "routes", route.id), { deletedAt: deleteField() });
                undone = true;
                setSavedRoutes((prev) => {
                  if (prev.some((r) => r.id === route.id)) return prev;
                  const restored = { ...route, deletedAt: undefined };
                  return [...prev, restored].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                  );
                });
              } catch (err) {
                console.warn("[RoutePlanner] Undo failed:", err);
                toast.error("Could not undo deletion. Please try again.");
              }
            },
          },
        });
      }
    } catch (err) {
      console.warn("[RoutePlanner] Failed to load saved routes:", err);
    } finally {
      setLoadingRoutes(false);
    }
  }

  useEffect(() => {
    if (!user?.uid) return;
    try {
      const stored = localStorage.getItem(`routePlannerSortOrder:${user.uid}`);
      if (stored === "alpha" || stored === "newest") setRouteSort(stored);
    } catch {
      // ignore
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(`routePlannerSortOrder:${user.uid}`, routeSort);
    } catch {
      // ignore
    }
  }, [routeSort, user?.uid]);

  useEffect(() => {
    if (orderedStops.length === 0) setConfirmingClearAll(false);
  }, [orderedStops.length]);

  useEffect(() => {
    setStopsCollapsed(false);
  }, [orderedStops]);

  function toggleStop(address: string) {
    markDirty();
    setOrderedStops((prev) => {
      if (prev.includes(address)) {
        return prev.filter((a) => a !== address);
      }
      return [...prev, address];
    });
  }

  function handleOpenMaps() {
    if (!startAddress.trim() && !endAddress.trim() && orderedStops.length === 0) {
      toast.error("Add at least a start address, end address, or one stop.");
      return;
    }
    window.open(buildMapsUrl(startAddress, endAddress, orderedStops), "_blank", "noopener,noreferrer");
  }

  async function handleSaveRoute() {
    if (!isFirebaseConfigured || !db || !user) {
      toast.error("Firebase is not configured. Cannot save routes.");
      return;
    }
    if (!startAddress.trim() && !endAddress.trim() && orderedStops.length === 0) {
      toast.error("Add at least a start address, end address, or one stop.");
      return;
    }
    setSaving(true);
    const firestore = db;

    // Save-over branch: overwrite an existing route the pro loaded earlier
    if (loadedRouteId) {
      const previous = savedRoutes.find((r) => r.id === loadedRouteId);
      if (!previous) {
        // Route no longer exists — fall through to create a new one
      } else {
        const previousStart = previous.startAddress;
        const previousEnd = previous.endAddress;
        const previousStops = previous.stops ?? [];

        const nextStart = startAddress.trim();
        const nextEnd = endAddress.trim();
        const nextStops = orderedStops;
        const nextName = routeName.trim();

        try {
          await updateDoc(doc(firestore, "routes", loadedRouteId), {
            name: nextName,
            startAddress: nextStart,
            endAddress: nextEnd,
            stops: nextStops,
          });

          setSavedRoutes((prev) =>
            prev.map((r) =>
              r.id === loadedRouteId
                ? { ...r, name: nextName, startAddress: nextStart, endAddress: nextEnd, stops: nextStops }
                : r,
            ),
          );
          setIsDirty(false);

          let undone = false;
          toast.success("Route updated.", {
            duration: UNDO_WINDOW_MS,
            action: {
              label: "Undo",
              onClick: async () => {
                if (undone) return;
                try {
                  await updateDoc(doc(firestore, "routes", loadedRouteId), {
                    name: previous.name,
                    startAddress: previousStart,
                    endAddress: previousEnd,
                    stops: previousStops,
                  });
                  undone = true;
                  setStartAddress(previousStart);
                  setEndAddress(previousEnd);
                  setRouteName(previous.name ?? "");
                  setOrderedStops(previousStops);
                  setSavedRoutes((prev) =>
                    prev.map((r) =>
                      r.id === loadedRouteId
                        ? { ...r, name: previous.name, startAddress: previousStart, endAddress: previousEnd, stops: previousStops }
                        : r,
                    ),
                  );
                  toast.success("Route restored.");
                } catch (err) {
                  console.warn("[RoutePlanner] Undo save-over failed:", err);
                  toast.error("Could not undo. Please try again.");
                }
              },
            },
          });
        } catch (err) {
          console.warn("[RoutePlanner] Save-over failed:", err);
          toast.error("Failed to update route.");
        } finally {
          setSaving(false);
        }
        return;
      }
    }

    // New route branch
    try {
      await addDoc(collection(firestore, "routes"), {
        userId: user.uid,
        name: routeName.trim(),
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops: orderedStops,
        createdAt: new Date().toISOString(),
        starred: false,
      });
      toast.success("Route saved.");
      setRouteName("");
      setLoadedRouteId(null);
      setIsDirty(false);
      await loadSavedRoutes();
    } catch (err) {
      console.warn("[RoutePlanner] Save failed:", err);
      toast.error("Failed to save route.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRoute(id: string) {
    if (!isFirebaseConfigured || !db) return;
    const firestore = db;

    const routeToDelete = savedRoutes.find((r) => r.id === id);
    if (!routeToDelete) return;

    const deletedAt = new Date().toISOString();

    // Soft-delete: stamp deletedAt on the doc instead of removing it.
    // This makes the deletion durable across page reloads within the undo window.
    try {
      await updateDoc(doc(firestore, "routes", id), { deletedAt });
    } catch (err) {
      console.warn("[RoutePlanner] Delete failed:", err);
      toast.error("Failed to delete route.");
      return;
    }

    // Remove from local list immediately
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));

    let undone = false;

    // Cancel any stale timer that may already exist for this route
    const existingTimer = pendingDeleteTimers.current.get(id);
    if (existingTimer !== undefined) clearTimeout(existingTimer);

    // Schedule the permanent hard-delete after the undo window expires
    const timer = setTimeout(async () => {
      pendingDeleteTimers.current.delete(id);
      if (undone) return;
      // Guard: only hard-delete if deletedAt is still set (undo may have cleared it)
      try {
        const snap = await getDoc(doc(firestore, "routes", id));
        if (snap.exists() && snap.data()?.["deletedAt"]) {
          await deleteDoc(doc(firestore, "routes", id));
        }
      } catch (err) {
        console.warn("[RoutePlanner] Permanent delete failed:", err);
      }
    }, UNDO_WINDOW_MS);
    pendingDeleteTimers.current.set(id, timer);

    toast.success("Route deleted.", {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: async () => {
          if (undone) return;
          clearTimeout(timer);
          pendingDeleteTimers.current.delete(id);
          try {
            // Clearing deletedAt is the undo — no data is lost
            await updateDoc(doc(firestore, "routes", id), { deletedAt: deleteField() });
            undone = true;
            setSavedRoutes((prev) => {
              if (prev.some((r) => r.id === id)) return prev;
              const restored = { ...routeToDelete, deletedAt: undefined };
              return [...prev, restored].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              );
            });
          } catch (err) {
            console.warn("[RoutePlanner] Undo failed:", err);
            toast.error("Could not undo deletion. Please try again.");
          }
        },
      },
    });
  }

  async function handleStarRoute(id: string, starred: boolean) {
    if (!isFirebaseConfigured || !db) return;
    try {
      await updateDoc(doc(db, "routes", id), { starred });
      setSavedRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, starred } : r)),
      );
    } catch (err) {
      console.warn("[RoutePlanner] Star failed:", err);
      toast.error("Failed to update star.");
    }
  }

  async function handleRenameRoute(id: string, newName: string) {
    if (!isFirebaseConfigured || !db) return;
    const firestore = db;

    const previousRoute = savedRoutes.find((r) => r.id === id);
    const previousName = previousRoute?.name ?? "";
    const renamedAt = new Date().toISOString();

    try {
      // Persist previousName and renamedAt so the undo survives a page reload
      await updateDoc(doc(firestore, "routes", id), {
        name: newName,
        previousName,
        renamedAt,
      });
      setSavedRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: newName, previousName, renamedAt } : r)),
      );

      let undone = false;

      // Cancel any pre-existing rename timer for this route
      const existingTimer = pendingRenameTimers.current.get(id);
      if (existingTimer !== undefined) clearTimeout(existingTimer);

      // Schedule cleanup of the persisted rename metadata after the undo window
      const timer = setTimeout(() => {
        pendingRenameTimers.current.delete(id);
        if (undone) return;
        updateDoc(doc(firestore, "routes", id), {
          previousName: deleteField(),
          renamedAt: deleteField(),
        }).catch((err) =>
          console.warn("[RoutePlanner] Failed to clear rename metadata:", err),
        );
      }, UNDO_WINDOW_MS);
      pendingRenameTimers.current.set(id, timer);

      toast.success("Route renamed.", {
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Undo",
          onClick: async () => {
            if (undone) return;
            clearTimeout(timer);
            pendingRenameTimers.current.delete(id);
            try {
              await updateDoc(doc(firestore, "routes", id), {
                name: previousName,
                previousName: deleteField(),
                renamedAt: deleteField(),
              });
              undone = true;
              setSavedRoutes((prev) =>
                prev.map((r) =>
                  r.id === id
                    ? { ...r, name: previousName, previousName: undefined, renamedAt: undefined }
                    : r,
                ),
              );
            } catch (err) {
              console.warn("[RoutePlanner] Undo rename failed:", err);
              toast.error("Could not undo rename. Please try again.");
            }
          },
        },
      });
    } catch (err) {
      console.warn("[RoutePlanner] Rename failed:", err);
      toast.error("Failed to rename route.");
      throw err;
    }
  }

  const visibleRoutes = savedRoutes
    .filter((r) => {
      if (!routeSearch.trim()) return true;
      const q = routeSearch.trim().toLowerCase();
      const displayName = r.name || format(new Date(r.createdAt), "MMM d, yyyy · h:mm a");
      return displayName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aStarred = a.starred ? 1 : 0;
      const bStarred = b.starred ? 1 : 0;
      if (bStarred !== aStarred) return bStarred - aStarred;
      if (routeSort === "alpha") {
        const nameA = (a.name || format(new Date(a.createdAt), "MMM d, yyyy · h:mm a")).toLowerCase();
        const nameB = (b.name || format(new Date(b.createdAt), "MMM d, yyyy · h:mm a")).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function handleLoadRoute(route: SavedRoute) {
    const stops = route.stops ?? [];
    const staleCount = stops.filter((addr) => !activeJobAddresses.has(addr)).length;
    setStartAddress(route.startAddress ?? "");
    setEndAddress(route.endAddress ?? "");
    setRouteName(route.name ?? "");
    setOrderedStops(stops);
    setLoadedRouteId(route.id);
    setIsDirty(false);
    if (staleCount > 0) {
      toast.warning(
        `Route loaded — ${staleCount} ${staleCount === 1 ? "stop" : "stops"} no longer ${staleCount === 1 ? "matches" : "match"} active jobs.`,
      );
    } else {
      toast.success("Route loaded into planner.");
    }
    plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={plannerRef} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Route Planner</h1>
        <p className="text-gray-500">
          Select job stops, set your start and end addresses, then open in Google Maps.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {todayJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  Today's Scheduled Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayJobs.map((job) => {
                  const idx = orderedStops.indexOf(job.address);
                  return (
                    <JobStopItem
                      key={job.id}
                      job={job}
                      checked={idx !== -1}
                      stopNumber={idx !== -1 ? idx + 1 : null}
                      onToggle={() => toggleStop(job.address)}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}

          {openJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Open / Nearby Jobs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {openJobs.map((job) => {
                  const idx = orderedStops.indexOf(job.address);
                  return (
                    <JobStopItem
                      key={job.id}
                      job={job}
                      checked={idx !== -1}
                      stopNumber={idx !== -1 ? idx + 1 : null}
                      onToggle={() => toggleStop(job.address)}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}

          {todayJobs.length === 0 && openJobs.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <div className="text-sm">No jobs available to add as stops.</div>
                <div className="text-xs mt-1">
                  Schedule some jobs first, then come back here.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Route Details
                  {orderedStops.length > 0 && (
                    <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold leading-none shrink-0">
                      {orderedStops.length} {orderedStops.length === 1 ? "stop" : "stops"}
                    </span>
                  )}
                </CardTitle>
                {confirmingReset ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Reset everything?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setStartAddress("");
                        setEndAddress("");
                        setRouteName("");
                        setOrderedStops([]);
                        setLoadedRouteId(null);
                        setConfirmingReset(false);
                        setConfirmingClearAll(false);
                        setIsDirty(false);
                        toast.success("Planner reset.");
                      }}
                    >
                      Yes, reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setConfirmingReset(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    {orderedStops.length > 0 && (
                      confirmingClearAll ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Clear all stops?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              const previousStops = [...orderedStops];
                              markDirty();
                              setOrderedStops([]);
                              setConfirmingClearAll(false);
                              let undone = false;
                              toast.success("Stops cleared.", {
                                duration: UNDO_WINDOW_MS,
                                action: {
                                  label: "Undo",
                                  onClick: () => {
                                    if (undone) return;
                                    undone = true;
                                    setOrderedStops(previousStops);
                                  },
                                },
                              });
                            }}
                          >
                            Yes, clear
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmingClearAll(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmingClearAll(true)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear all
                        </Button>
                      )
                    )}
                    {plannerHasAnyContent && !confirmingClearAll && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmingReset(true)}
                        aria-label="Reset planner"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startAddress">Start Address</Label>
                <Input
                  id="startAddress"
                  placeholder="e.g. 123 Main St, Athens, GA"
                  value={startAddress}
                  onChange={(e) => { markDirty(); setStartAddress(e.target.value); }}
                />
              </div>
              <div>
                <Label htmlFor="endAddress">End Address</Label>
                <Input
                  id="endAddress"
                  placeholder="e.g. Your home or office address"
                  value={endAddress}
                  onChange={(e) => { markDirty(); setEndAddress(e.target.value); }}
                />
              </div>

              {orderedStops.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <button
                      type="button"
                      onClick={() => setStopsCollapsed((c) => !c)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      aria-expanded={!stopsCollapsed}
                      aria-label={stopsCollapsed ? "Expand stop list" : "Collapse stop list"}
                    >
                      {stopsCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                      )}
                      Selected Stops ({orderedStops.length}){!stopsCollapsed && " — drag to reorder"}
                    </button>
                    {!stopsCollapsed && orderedStops.some((addr) => !activeJobAddresses.has(addr)) && (
                      <button
                        onClick={() => {
                          markDirty();
                          setOrderedStops((prev) => prev.filter((addr) => activeJobAddresses.has(addr)));
                          toast.success("Unmatched stops removed.");
                        }}
                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 ml-2"
                      >
                        Remove unmatched
                      </button>
                    )}
                  </div>
                  {!stopsCollapsed && (
                    <div className="max-h-56 overflow-y-auto pr-0.5">
                      <DraggableStopList
                        stops={orderedStops}
                        activeJobAddresses={activeJobAddresses}
                        onReorder={(stops) => { markDirty(); setOrderedStops(stops); }}
                        onRemove={toggleStop}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t">
                <Button onClick={handleOpenMaps} className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Route in Google Maps
                </Button>
                <div>
                  <Label htmlFor="routeName" className="text-xs text-muted-foreground">
                    Route Name (optional)
                  </Label>
                  <Input
                    id="routeName"
                    placeholder='e.g. "Monday loop"'
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    disabled={!isFirebaseConfigured}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveRoute}
                  disabled={saving || !isFirebaseConfigured}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving…" : "Save Route"}
                </Button>
                {!isFirebaseConfigured && (
                  <p className="text-xs text-muted-foreground text-center">
                    Firebase is not configured — route saving is unavailable.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Saved Routes</CardTitle>
          {isFirebaseConfigured && !loadingRoutes && savedRoutes.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search routes…"
                  value={routeSearch}
                  onChange={(e) => {
                    setRouteSearch(e.target.value);
                    sessionStorage.setItem("routePlannerSearch", e.target.value);
                  }}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <div className="flex items-center rounded-md border overflow-hidden shrink-0">
                <button
                  onClick={() => setRouteSort("newest")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    routeSort === "newest"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  aria-label="Sort by newest"
                  aria-pressed={routeSort === "newest"}
                >
                  <Clock className="h-3 w-3" />
                  Newest
                </button>
                <button
                  onClick={() => setRouteSort("alpha")}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    routeSort === "alpha"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  aria-label="Sort alphabetically"
                  aria-pressed={routeSort === "alpha"}
                >
                  <ArrowDownAZ className="h-3 w-3" />
                  A–Z
                </button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          {!isFirebaseConfigured ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Firebase is not configured — saved routes are unavailable.
            </div>
          ) : loadingRoutes ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          ) : savedRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm">No saved routes yet.</div>
              <div className="text-xs mt-1">Build a route above and press Save Route.</div>
            </div>
          ) : visibleRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <div className="text-sm">No routes match your search.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onDelete={handleDeleteRoute}
                  onRename={handleRenameRoute}
                  onLoad={handleLoadRoute}
                  onStar={handleStarRoute}
                  plannerHasContent={
                    startAddress.trim().length > 0 ||
                    endAddress.trim().length > 0 ||
                    orderedStops.length > 0
                  }
                  activeJobAddresses={activeJobAddresses}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
