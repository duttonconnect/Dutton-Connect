import { useEffect, useMemo, useState } from "react";
import { useAppStore, type Job } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import { MapPin, Navigation, Phone, ArrowRight, AlertCircle } from "lucide-react";

const STATUS_COLORS: Record<Job["status"], { bg: string; border: string }> = {
  scheduled:   { bg: "#1d4ed8", border: "#1e3a8a" },
  in_progress: { bg: "#0ea5e9", border: "#0369a1" },
  completed:   { bg: "#374151", border: "#111827" },
  cancelled:   { bg: "#9ca3af", border: "#4b5563" },
};

function statusLabel(s: Job["status"]) {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDirectionsUrl(job: Job) {
  if (typeof job.latitude === "number" && typeof job.longitude === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;
}

const iconCache = new Map<Job["status"], L.DivIcon>();
function getStatusIcon(status: Job["status"]) {
  const cached = iconCache.get(status);
  if (cached) return cached;
  const c = STATUS_COLORS[status];
  const html = `
    <div style="position: relative; width: 28px; height: 36px;">
      <svg viewBox="0 0 28 36" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z"
          fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" />
        <circle cx="14" cy="14" r="5" fill="white" />
      </svg>
    </div>`;
  const icon = L.divIcon({
    className: "dutton-job-marker",
    html,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  });
  iconCache.set(status, icon);
  return icon;
}

function ChangeView({ center, zoom }: { center: LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapView() {
  const { jobs, customers } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<"all" | Job["status"]>("all");

  const mappableJobs = useMemo(
    () =>
      jobs.filter(
        (j) =>
          typeof j.latitude === "number" &&
          typeof j.longitude === "number" &&
          (statusFilter === "all" || j.status === statusFilter),
      ),
    [jobs, statusFilter],
  );

  const unmapped = jobs.filter(
    (j) => typeof j.latitude !== "number" || typeof j.longitude !== "number",
  );

  const center = useMemo<LatLngExpression>(() => {
    if (mappableJobs.length === 0) {
      return [33.9519, -83.3576];
    }
    const avgLat =
      mappableJobs.reduce((acc, j) => acc + (j.latitude || 0), 0) / mappableJobs.length;
    const avgLng =
      mappableJobs.reduce((acc, j) => acc + (j.longitude || 0), 0) / mappableJobs.length;
    return [avgLat, avgLng];
  }, [mappableJobs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Map</h1>
          <p className="text-gray-500">
            {mappableJobs.length} job{mappableJobs.length === 1 ? "" : "s"} on the map
            {unmapped.length > 0 ? ` • ${unmapped.length} without coordinates` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "scheduled", "in_progress", "completed", "cancelled"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : statusLabel(s)}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="h-[60vh] min-h-[400px] w-full relative bg-gray-100">
          <MapContainer
            center={center}
            zoom={11}
            scrollWheelZoom={true}
            style={{ width: "100%", height: "100%" }}
          >
            <ChangeView center={center} zoom={11} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappableJobs.map((job) => {
              const customer = customers.find((c) => c.id === job.customerId);
              return (
                <Marker
                  key={job.id}
                  position={[job.latitude!, job.longitude!]}
                  icon={getStatusIcon(job.status)}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[220px] max-w-[280px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-gray-900 text-sm leading-tight">
                          {job.title}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {statusLabel(job.status)}
                        </Badge>
                      </div>
                      {customer && (
                        <div className="text-xs text-gray-700 font-medium">{customer.name}</div>
                      )}
                      <div className="flex items-start gap-1.5 text-xs text-gray-600">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{job.address}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(job.scheduledDate), "EEE, MMM d")}
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <a
                          href={buildDirectionsUrl(job)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 no-underline"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Directions
                        </a>
                        {customer?.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-50 no-underline"
                          >
                            <Phone className="h-3.5 w-3.5" /> {customer.phone}
                          </a>
                        )}
                        <Link href={`/jobs/${job.id}`}>
                          <span className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-medium border border-gray-300 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer no-underline">
                            Open Job <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs">
          {(Object.keys(STATUS_COLORS) as Job["status"][]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full border"
                style={{ background: STATUS_COLORS[s].bg, borderColor: STATUS_COLORS[s].border }}
              />
              <span className="font-medium text-gray-700">{statusLabel(s)}</span>
            </div>
          ))}
          <div className="ml-auto text-[11px] text-muted-foreground">
            Map data &copy; OpenStreetMap contributors
          </div>
        </CardContent>
      </Card>

      {unmapped.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <div className="font-semibold text-sm">Jobs without coordinates</div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Open a job and use the Use My Location button or enter latitude/longitude to place it on the map.
            </p>
            <div className="space-y-2">
              {unmapped.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`}>
                  <div className="flex items-center justify-between text-sm p-2 rounded border hover:bg-accent cursor-pointer">
                    <div>
                      <div className="font-medium">{j.title}</div>
                      <div className="text-xs text-muted-foreground">{j.address}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
