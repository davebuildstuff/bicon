import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const LAGOS = /** @type {[number,number]} */ ([6.5244, 3.3792]);
const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const TIER_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  WATCH: "#22c55e",
  LOW: "#3b82f6",
};

/** @param {string} tier @param {string} status */
function pinColor(tier, status) {
  if (status === "DISMISSED" || status === "RESOLVED") return "#52525b";
  return TIER_COLORS[tier] ?? "#94a3b8";
}

/** @param {string} color */
function makePin(color) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid rgba(255,255,255,0.88);box-shadow:0 0 10px ${color}bb,0 2px 8px rgba(0,0,0,0.7);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function makeClickPin() {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:#34d399;border:2.5px solid #fff;box-shadow:0 0 10px #34d39999;"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/** @param {{ onMapClick?: (lat: number, lng: number) => void }} props */
function ClickCapture({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick?.(
        Math.round(e.latlng.lat * 1e6) / 1e6,
        Math.round(e.latlng.lng * 1e6) / 1e6,
      );
    },
  });
  return null;
}

/** @param {{ center: [number,number] | null }} props */
function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

/**
 * @typedef {{
 *   _id: string;
 *   coordinates?: { lat: number; lng: number };
 *   vesTier?: string;
 *   status?: string;
 *   type?: string;
 *   source?: string;
 *   vesScore?: number;
 * }} MapIncident
 *
 * @typedef {{
 *   _id: string;
 *   name?: string;
 *   lat?: number | string;
 *   lng?: number | string;
 *   radius?: number | string;
 *   active?: boolean;
 * }} MapZone
 */

/**
 * @param {{
 *   zones?: MapZone[];
 *   incidents?: MapIncident[];
 *   onMapClick?: (lat: number, lng: number) => void;
 *   clickedPin?: [number, number] | null;
 *   flyTo?: [number, number] | null;
 *   zoom?: number;
 *   style?: React.CSSProperties;
 * }} props
 */
export default function BiconMap({
  zones = [],
  incidents = [],
  onMapClick,
  clickedPin,
  flyTo,
  zoom = 12,
  style,
}) {
  return (
    <MapContainer
      center={LAGOS}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", background: "#0d1117", ...style }}
    >
      <TileLayer url={DARK_TILES} attribution={ATTRIB} maxZoom={19} />

      {onMapClick ? <ClickCapture onMapClick={onMapClick} /> : null}
      {flyTo ? <FlyTo center={flyTo} /> : null}

      {zones.map((z) => {
        const lat = Number(z.lat);
        const lng = Number(z.lng);
        const radius = Number(z.radius);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) return null;
        const active = z.active !== false;
        return (
          <Circle
            key={String(z._id)}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: active ? "#34d399" : "#71717a",
              fillColor: active ? "#34d399" : "#71717a",
              fillOpacity: active ? 0.13 : 0.05,
              weight: active ? 1.5 : 1,
              dashArray: active ? undefined : "5 4",
            }}
          >
            <Popup>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                <strong style={{ display: "block", marginBottom: 2 }}>{String(z.name ?? "Zone")}</strong>
                {lat.toFixed(5)}, {lng.toFixed(5)}<br />
                r = {radius} m &nbsp;·&nbsp; {active ? "Active" : "Inactive"}
              </span>
            </Popup>
          </Circle>
        );
      })}

      {incidents.map((inc) => {
        const c = inc.coordinates;
        if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return null;
        const color = pinColor(inc.vesTier ?? "", inc.status ?? "");
        return (
          <Marker
            key={String(inc._id)}
            position={[c.lat, c.lng]}
            icon={makePin(color)}
          >
            <Popup>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                <strong style={{ display: "block", marginBottom: 2 }}>
                  {String(inc.type ?? "Incident")}
                </strong>
                {String(inc.source ?? "—")} · {String(inc.status ?? "—")}
                {inc.vesTier ? <><br />Tier: {inc.vesTier}</> : null}
                {typeof inc.vesScore === "number" ? <><br />VES: {inc.vesScore}</> : null}
              </span>
            </Popup>
          </Marker>
        );
      })}

      {clickedPin ? (
        <Marker position={clickedPin} icon={makeClickPin()} />
      ) : null}
    </MapContainer>
  );
}
