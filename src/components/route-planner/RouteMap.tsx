import { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRoutePlannerStore } from '@/store/routePlannerStore';
import { useTheme } from 'next-themes';

const hslVar = (token: string, alpha?: number) =>
    alpha == null ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

const getRouteColor = (riskScore: number): string => {
    if (riskScore >= 80) return hslVar('--success'); // Green
    if (riskScore >= 60) return hslVar('--warning'); // Amber
    return hslVar('--destructive'); // Red
};

const createPointIcon = (type: 'start' | 'dest') => {
    const color = type === 'start' ? hslVar('--primary') : hslVar('--destructive');
    const ping = type === 'start' ? hslVar('--primary', 0.22) : hslVar('--destructive', 0.22);

    return L.divIcon({
        className: `leaflet-${type}-marker`,
        html: `
      <div style="position: relative;">
        <div style="
          position: absolute;
          inset: -10px;
          border-radius: 9999px;
          background: ${ping};
          animation: leafPing 2.2s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: ${color};
          border: 3px solid hsl(var(--background));
          box-shadow: 0 8px 16px hsl(var(--foreground) / 0.25);
        "></div>
      </div>
    `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
    });
};

const RouteMap = memo(() => {
    const mapElRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);
    const markerLayerRef = useRef<L.LayerGroup | null>(null);

    const { startLocation, destination, routes, selectedRouteId } = useRoutePlannerStore();
    const { theme } = useTheme();

    // Initialize Map
    useEffect(() => {
        if (!mapElRef.current || mapRef.current) return;

        // Default center to NY
        const map = L.map(mapElRef.current, {
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true, // Crucial for performance with complex polylines
        }).setView([40.7128, -74.006], 13);

        // Dark tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            attribution: "© CARTO © OpenStreetMap",
            maxZoom: 19,
        }).addTo(map);

        routeLayerRef.current = L.layerGroup().addTo(map);
        markerLayerRef.current = L.layerGroup().addTo(map);

        // Initial zoom control position
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Update Markers
    useEffect(() => {
        const group = markerLayerRef.current;
        if (!group) return;

        group.clearLayers();

        if (startLocation) {
            L.marker([startLocation.lat, startLocation.lng], {
                icon: createPointIcon('start'),
                keyboard: false,
            }).addTo(group);
        }

        if (destination) {
            L.marker([destination.lat, destination.lng], {
                icon: createPointIcon('dest'),
                keyboard: false,
            }).addTo(group);
        }
    }, [startLocation, destination]);

    // Handle zooming to fit route or points
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // If we have routes, zoom to the selected route or all routes
        if (routes.length > 0) {
            const activeRoute = routes.find(r => r.id === selectedRouteId) || routes[0];
            const bounds = L.latLngBounds(activeRoute.geometry.map(coord => [coord[1], coord[0]] as [number, number]));
            map.flyToBounds(bounds, { padding: [100, 100], duration: 0.8 });
        } else if (startLocation && destination) {
            const bounds = L.latLngBounds([
                [startLocation.lat, startLocation.lng],
                [destination.lat, destination.lng]
            ]);
            map.flyToBounds(bounds, { padding: [100, 100], duration: 0.8 });
        } else if (startLocation) {
            map.flyTo([startLocation.lat, startLocation.lng], 14, { duration: 0.8 });
        } else if (destination) {
            map.flyTo([destination.lat, destination.lng], 14, { duration: 0.8 });
        }
    }, [routes, selectedRouteId, startLocation, destination]);

    // Render Routes (Polylines)
    useEffect(() => {
        const group = routeLayerRef.current;
        if (!group) return;

        group.clearLayers();

        if (routes.length === 0) return;

        // Draw unselected routes first (to be underneath)
        routes.forEach(route => {
            if (route.id === selectedRouteId) return;

            const latLngs = route.geometry.map(coord => [coord[1], coord[0]] as [number, number]);
            L.polyline(latLngs, {
                color: hslVar('--muted-foreground', 0.5),
                weight: 4,
                opacity: 0.6,
                dashArray: '5, 10',
            }).addTo(group);
        });

        // Draw active route on top
        const activeRoute = routes.find(r => r.id === selectedRouteId);
        if (activeRoute) {
            const color = getRouteColor(activeRoute.riskScore);
            const latLngs = activeRoute.geometry.map(coord => [coord[1], coord[0]] as [number, number]);

            // Outer glow/shadow
            L.polyline(latLngs, {
                color: color,
                weight: 12,
                opacity: 0.2,
            }).addTo(group);

            // Inner line
            L.polyline(latLngs, {
                color: color,
                weight: 5,
                opacity: 1,
            }).addTo(group);
        }
    }, [routes, selectedRouteId]);

    return (
        <div className="absolute inset-0 h-full w-full bg-zinc-950/50">
            <div ref={mapElRef} className="h-full w-full" aria-label="Route planning map" />
            <div className="absolute bottom-2 right-12 z-[1000] text-[9px] text-muted-foreground/50 pointer-events-none px-2 py-0.5 bg-background/50 rounded backdrop-blur-sm">
                © CARTO • OpenStreetMap
            </div>
        </div>
    );
});

export default RouteMap;
