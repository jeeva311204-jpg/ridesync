import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const driverIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [28, 44],
  className: "driver-marker",
});

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [map]);
  return null;
}

function ClickCatcher({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng);
    },
  });
  return null;
}

export default function MapView({
  center = [11.1085, 77.3411],
  pickup,
  drop,
  driverPos,
  routePath,
  onMapClick,
  height = "100%",
}) {
  return (
    <MapContainer center={center} zoom={13} style={{ height, width: "100%" }}>
      <MapResizeHandler />
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onMapClick && <ClickCatcher onMapClick={onMapClick} />}
      {pickup && <Marker position={[pickup.lat, pickup.lng]} />}
      {drop && <Marker position={[drop.lat, drop.lng]} />}
      {driverPos && <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon} />}
      {routePath?.length > 0 && (
        <Polyline positions={routePath} pathOptions={{ color: "#4f46e5", weight: 5, opacity: 0.85 }} />
      )}
    </MapContainer>
  );
}
