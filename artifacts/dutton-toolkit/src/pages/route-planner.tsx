import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, Save, ExternalLink, Route, Trash2, Pencil, Check, X, GripVertical, FolderOpen } from "lucide-react";
import {
  collection,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
  updateDoc,
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

type SavedRoute = {
  id: string;
  userId: string;
  name: string;
  startAddress: string;
  endAddress: string;
  stops: string[];
  createdAt: string;
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
            <span className="shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold leading-none">
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
  onReorder,
  onRemove,
}: {
  stops: string[];
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
      {stops.map((addr, index) => (
        <div
          key={addr}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`text-xs bg-muted rounded px-2 py-1.5 flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-opacity select-none ${
            dragOverIndex === index && dragIndex.current !== index
              ? "opacity-50 ring-2 ring-primary ring-offset-1"
              : "opacity-100"
          }`}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <MapPin className="h-3 w-3 shrink-0 text-primary" />
          <span className="truncate flex-1">{addr}</span>
          <span className="text-muted-foreground font-medium shrink-0">{index + 1}</span>
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
      ))}
    </div>
  );
}

function RouteCard({
  route,
  onDelete,
  onRename,
  onLoad,
}: {
  route: SavedRoute;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onLoad: (route: SavedRoute) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(route.name || "");
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
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
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onLoad(route)}
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
    </div>
  );
}

export default function RoutePlanner() {
  const { jobs } = useAppStore();
  const { user } = useAuth();

  const [startAddress, setStartAddress] = useState("");
  const [endAddress, setEndAddress] = useState("");
  const [routeName, setRouteName] = useState("");
  const [orderedStops, setOrderedStops] = useState<string[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [saving, setSaving] = useState(false);

  const plannerRef = useRef<HTMLDivElement>(null);

  const todayJobs = jobs.filter(
    (j) => isToday(j.scheduledDate) && j.status !== "cancelled" && j.address,
  );

  const openJobs = jobs.filter(
    (j) =>
      !isToday(j.scheduledDate) &&
      (j.status === "scheduled" || j.status === "in_progress") &&
      j.address,
  );

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return;
    loadSavedRoutes();
  }, [user?.uid]);

  async function loadSavedRoutes() {
    if (!isFirebaseConfigured || !db || !user) return;
    setLoadingRoutes(true);
    try {
      const q = query(
        collection(db, "routes"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      setSavedRoutes(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SavedRoute, "id">) })),
      );
    } catch (err) {
      console.warn("[RoutePlanner] Failed to load saved routes:", err);
    } finally {
      setLoadingRoutes(false);
    }
  }

  function toggleStop(address: string) {
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
    try {
      await addDoc(collection(db, "routes"), {
        userId: user.uid,
        name: routeName.trim(),
        startAddress: startAddress.trim(),
        endAddress: endAddress.trim(),
        stops: orderedStops,
        createdAt: new Date().toISOString(),
      });
      toast.success("Route saved.");
      setRouteName("");
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

    const routeToDelete = savedRoutes.find((r) => r.id === id);
    if (!routeToDelete) return;

    // Delete from Firestore immediately so it is final even if the page closes
    try {
      await deleteDoc(doc(db, "routes", id));
    } catch (err) {
      console.warn("[RoutePlanner] Delete failed:", err);
      toast.error("Failed to delete route.");
      return;
    }

    // Remove from local state after successful Firestore deletion
    setSavedRoutes((prev) => prev.filter((r) => r.id !== id));

    // Track whether the undo was used so the toast action can be cleaned up
    let undone = false;

    toast.success("Route deleted.", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          if (undone) return;
          // Recreate the document in Firestore with its original id
          const { id: _id, ...routeData } = routeToDelete;
          try {
            await setDoc(doc(db, "routes", id), routeData);
            undone = true; // Mark done only after successful restore
            // Restore into local list in sorted order
            setSavedRoutes((prev) => {
              if (prev.some((r) => r.id === id)) return prev;
              return [...prev, routeToDelete].sort(
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

  async function handleRenameRoute(id: string, newName: string) {
    if (!isFirebaseConfigured || !db) return;
    try {
      await updateDoc(doc(db, "routes", id), { name: newName });
      setSavedRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: newName } : r)),
      );
      toast.success("Route renamed.");
    } catch (err) {
      console.warn("[RoutePlanner] Rename failed:", err);
      toast.error("Failed to rename route.");
      throw err;
    }
  }

  function handleLoadRoute(route: SavedRoute) {
    setStartAddress(route.startAddress ?? "");
    setEndAddress(route.endAddress ?? "");
    setRouteName(route.name ?? "");
    setOrderedStops(route.stops ?? []);
    toast.success("Route loaded into planner.");
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Route Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startAddress">Start Address</Label>
                <Input
                  id="startAddress"
                  placeholder="e.g. 123 Main St, Athens, GA"
                  value={startAddress}
                  onChange={(e) => setStartAddress(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endAddress">End Address</Label>
                <Input
                  id="endAddress"
                  placeholder="e.g. Your home or office address"
                  value={endAddress}
                  onChange={(e) => setEndAddress(e.target.value)}
                />
              </div>

              {orderedStops.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Selected Stops ({orderedStops.length}) — drag to reorder
                  </Label>
                  <DraggableStopList
                    stops={orderedStops}
                    onReorder={setOrderedStops}
                    onRemove={toggleStop}
                  />
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
          ) : (
            <div className="space-y-3">
              {savedRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onDelete={handleDeleteRoute}
                  onRename={handleRenameRoute}
                  onLoad={handleLoadRoute}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
