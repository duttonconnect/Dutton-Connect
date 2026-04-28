import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";

const pickerIcon = L.divIcon({
  className: "dutton-picker-marker",
  html: `
    <div style="position: relative; width: 28px; height: 36px;">
      <svg viewBox="0 0 28 36" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z"
          fill="#1d4ed8" stroke="#1e3a8a" stroke-width="1.5" />
        <circle cx="14" cy="14" r="5" fill="white" />
      </svg>
    </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const initialCenter = useMemo<LatLngExpression>(
    () => (lat != null && lng != null ? [lat, lng] : [33.9519, -83.3576]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialZoom = lat != null && lng != null ? 14 : 11;

  return (
    <div className="h-[300px] w-full rounded-md overflow-hidden border bg-gray-100 relative">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        <Recenter lat={lat} lng={lng} />
        {lat != null && lng != null && (
          <Marker
            position={[lat, lng]}
            icon={pickerIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                onChange(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
              },
            }}
          />
        )}
      </MapContainer>
      <div className="absolute top-2 left-2 bg-white/95 text-[11px] text-gray-700 px-2 py-1 rounded shadow-sm pointer-events-none z-[1000] font-medium">
        Click the map to set the job location · drag the pin to adjust
      </div>
    </div>
  );
}
