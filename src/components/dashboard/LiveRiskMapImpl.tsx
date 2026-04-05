import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Layers, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoadSegment } from "@/lib/mockRoads";
import { useRiskStore } from "@/services/riskStore";
import { RouteOption, LocationPoint } from "@/store/routePlannerStore";

// --- Custom Styles for Traffic Layers ---

// Helper to get color based on risk level
const getTrafficColor = (level: string) => {
    switch (level) {
        case "critical": return "#991b1b"; // Dark Red (Traffic Jam)
        case "high": return "#dc2626";     // Red (Heavy)
        case "medium": return "#f59e0b";   // Amber/Yellow (Moderate)
        default: return "#22c55e";         // Green (Low)
    }
};

const userIcon = () => L.divIcon({
    className: "leaflet-user-marker",
    html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; inset: -12px; background: #3b82f630; border-radius: 50%; animation: ping 2s infinite;"></div>
      <div style="width: 100%; height: 100%; background: #3b82f6; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.5);"></div>
    </div>
  `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// Colors for route polylines as per requirements
const getRouteColorByType = (type: string) => {
    switch (type) {
        case 'fastest': return '#3b82f6'; // Blue
        case 'shortest': return '#22c55e'; // Green
        case 'safest': return '#f59e0b';   // Amber
        default: return '#3b82f6';
    }
};

interface LiveRiskMapProps {
    onTrafficUpdate?: (segments: RoadSegment[]) => void;
    onSegmentClick?: (id: string) => void;
    selectedSegmentId?: string | null;
    // Optional Route Planner props
    routeData?: RouteOption[];
    selectedRouteId?: string | null;
    hideTraffic?: boolean;
    startPoint?: LocationPoint | null;
    endPoint?: LocationPoint | null;
}

export default function LiveRiskMapImpl({
    onTrafficUpdate,
    onSegmentClick,
    selectedSegmentId,
    routeData,
    selectedRouteId,
    hideTraffic = false,
    startPoint,
    endPoint
}: LiveRiskMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const userMarkerRef = useRef<L.Marker | null>(null);
    const trafficLayerRef = useRef<L.LayerGroup | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);
    const startMarkerRef = useRef<L.Marker | null>(null);
    const endMarkerRef = useRef<L.Marker | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // Simulation State
    const { zones: trafficData, fetchNearbyRoads, updateUserLocation, userLocation: storeUserLoc } = useRiskStore();

    const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [showTraffic, setShowTraffic] = useState(true);
    const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track manual interaction

    // Initialize Map - start with a neutral view, will center on user location when available
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [0, 0], // Neutral center - will be updated when user location is obtained
            zoom: 2, // World view initially
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true
        });

        // Real Colored Street Map Tiles (OpenStreetMap standard)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        trafficLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);

        // Track user interactions (zoom, pan, drag)
        map.on('zoomstart', () => setHasUserInteracted(true));
        map.on('dragstart', () => setHasUserInteracted(true));

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Notify parent of updates (Legacy support, prefer store)
    useEffect(() => {
        onTrafficUpdate?.(trafficData);
    }, [trafficData, onTrafficUpdate]);

    // Handle external selection (Fly To with Highlight) - ONE TIME ONLY
    const lastZoomedSegmentRef = useRef<string | null>(null);

    useEffect(() => {
        if (!selectedSegmentId || !mapRef.current) {
            // Reset the lock when selection clears so zooming works again if re-selected later
            if (!selectedSegmentId) lastZoomedSegmentRef.current = null;
            return;
        }

        // Prevent re-zooming if already zoomed to this specific selection instance
        if (lastZoomedSegmentRef.current === selectedSegmentId) return;

        const segment = trafficData.find(s => s.id === selectedSegmentId);
        if (segment && segment.path.length > 0) {
            // Mark this segment as zoomed
            lastZoomedSegmentRef.current = selectedSegmentId;

            // Calculate center of the segment
            const centerLat = segment.path.reduce((sum, p) => sum + p[0], 0) / segment.path.length;
            const centerLng = segment.path.reduce((sum, p) => sum + p[1], 0) / segment.path.length;

            // Smooth fly to location matching requirements
            mapRef.current.flyTo([centerLat, centerLng], 16, {
                duration: 0.8,
                easeLinearity: 0.25
            });

            // Add temporary highlight effect
            const layer = trafficLayerRef.current;
            if (layer) {
                // Create a pulsing highlight polyline
                const highlightLine = L.polyline(segment.path, {
                    color: '#ffffff',
                    weight: 8,
                    opacity: 0.8,
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'pulse-highlight'
                }).addTo(layer);

                // Remove highlight after 3 seconds
                setTimeout(() => {
                    layer.removeLayer(highlightLine);
                }, 3000);
            }
        }
    }, [selectedSegmentId, trafficData]);

    // Traffic Simulation Loop (Simulate congestion changes) - NOW UPDATES STORE
    useEffect(() => {
        const interval = setInterval(() => {
            useRiskStore.setState(state => ({
                zones: state.zones.map(seg => {
                    // 10% chance to change state per tick
                    if (Math.random() > 0.9) {
                        const levels: RoadSegment['riskLevel'][] = ['low', 'medium', 'high', 'critical'];
                        const currentIdx = levels.indexOf(seg.riskLevel);
                        const change = Math.random() > 0.5 ? 1 : -1;
                        const newIdx = Math.max(0, Math.min(3, currentIdx + change));
                        return { ...seg, riskLevel: levels[newIdx] };
                    }
                    return seg;
                })
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // --- Route Rendering (for Route Planner reuse) ---
    useEffect(() => {
        const map = mapRef.current;
        const routeLayer = routeLayerRef.current;
        if (!routeLayer) return;

        routeLayer.clearLayers();

        // Also clear start/end markers
        if (startMarkerRef.current) { map?.removeLayer(startMarkerRef.current); startMarkerRef.current = null; }
        if (endMarkerRef.current) { map?.removeLayer(endMarkerRef.current); endMarkerRef.current = null; }

        if (!routeData || routeData.length === 0) return;

        // Draw unselected routes first (dim/faded)
        routeData.forEach(route => {
            if (route.id === selectedRouteId) return;
            const color = getRouteColorByType(route.type);
            const latLngs = route.geometry.map(c => [c[1], c[0]] as [number, number]);
            L.polyline(latLngs, {
                color: color,
                weight: 5,
                opacity: 0.15, // Significantly faded
                lineCap: 'round',
                lineJoin: 'round',
            }).addTo(routeLayer);
        });

        // Draw selected route on top with glow effect
        const activeRoute = routeData.find(r => r.id === selectedRouteId) || routeData[0];
        if (activeRoute) {
            const color = getRouteColorByType(activeRoute.type);
            const latLngs = activeRoute.geometry.map(c => [c[1], c[0]] as [number, number]);

            // Outer glow
            L.polyline(latLngs, { color, weight: 14, opacity: 0.2, lineCap: 'round' }).addTo(routeLayer);
            // Main line
            L.polyline(latLngs, { color, weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(routeLayer);

            // Zoom to fit
            if (map && latLngs.length > 0) {
                const bounds = L.latLngBounds(latLngs);
                map.flyToBounds(bounds, { padding: [80, 80], duration: 0.9 });
            }

            // Add start marker
            const startCoord = latLngs[0];
            const endCoord = latLngs[latLngs.length - 1];

            const mkIcon = (color: string) => L.divIcon({
                className: '',
                html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);">&nbsp;</div>`,
                iconSize: [18, 18], iconAnchor: [9, 9]
            });

            if (map) {
                startMarkerRef.current = L.marker(startCoord, { icon: mkIcon('#3b82f6'), keyboard: false })
                    .bindTooltip('Start', { direction: 'top', permanent: false }).addTo(map);
                endMarkerRef.current = L.marker(endCoord, { icon: mkIcon('#ef4444'), keyboard: false })
                    .bindTooltip('Destination', { direction: 'top', permanent: false }).addTo(map);
            }
        }
    }, [routeData, selectedRouteId]);

    // Handle Start/Stop markers when no route is calculated yet
    useEffect(() => {
        const map = mapRef.current;
        if (!map || (routeData && routeData.length > 0)) return;

        // Start Marker
        if (startPoint) {
            const mkIcon = () => L.divIcon({
                className: '',
                html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);">&nbsp;</div>`,
                iconSize: [18, 18], iconAnchor: [9, 9]
            });

            if (startMarkerRef.current) {
                startMarkerRef.current.setLatLng([startPoint.lat, startPoint.lng]);
            } else {
                startMarkerRef.current = L.marker([startPoint.lat, startPoint.lng], { icon: mkIcon() }).addTo(map);
            }

            // Auto-center on start point if it's the first time it's set
            if (!hasUserInteracted) {
                map.flyTo([startPoint.lat, startPoint.lng], 15);
            }
        } else if (startMarkerRef.current) {
            map.removeLayer(startMarkerRef.current);
            startMarkerRef.current = null;
        }

        // End Marker
        if (endPoint) {
            const mkIcon = () => L.divIcon({
                className: '',
                html: `<div style="width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);">&nbsp;</div>`,
                iconSize: [18, 18], iconAnchor: [9, 9]
            });

            if (endMarkerRef.current) {
                endMarkerRef.current.setLatLng([endPoint.lat, endPoint.lng]);
            } else {
                endMarkerRef.current = L.marker([endPoint.lat, endPoint.lng], { icon: mkIcon() }).addTo(map);
            }
        } else if (endMarkerRef.current) {
            map.removeLayer(endMarkerRef.current);
            endMarkerRef.current = null;
        }
    }, [startPoint, endPoint, routeData, hasUserInteracted]);

    // Function to render traffic lines/markers based on location
    const refreshTrafficLayer = useCallback(() => {
        const layer = trafficLayerRef.current;
        if (!layer) return;
        layer.clearLayers();

        if (!showTraffic || hideTraffic) return;

        trafficData.forEach(seg => {
            const color = getTrafficColor(seg.riskLevel);

            // Standard Google Maps Traffic Style: Solid line with border

            // 1. Border / Background (Darker/Black to make color pop)
            L.polyline(seg.path, {
                color: '#000000',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false
            }).addTo(layer);

            // 2. Traffic Color Line
            const coreLine = L.polyline(seg.path, {
                color: color,
                weight: 4,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
            }).addTo(layer);

            // 3. Simple Tooltip
            coreLine.bindTooltip(`
                <div class="px-2 py-1 bg-[#0f172a] text-white text-xs border border-white/10 rounded shadow-md font-bold">
                   ${seg.name} <span class="text-zinc-500 font-normal">(${seg.riskLevel.toUpperCase()})</span>
                </div>
            `, {
                direction: 'top',
                sticky: true,
                className: 'leaflet-custom-tooltip',
                opacity: 1
            });

            // 4. Highlight on Hover & Click Events
            coreLine.on('mouseover', (e) => {
                e.target.setStyle({ weight: 6 });
            });
            coreLine.on('mouseout', (e) => {
                e.target.setStyle({ weight: 4 });
            });
            coreLine.on('click', () => {
                onSegmentClick?.(seg.id);
            });
        });
    }, [trafficData, showTraffic]);

    // Render Traffic Layer whenever data or visibility changes
    useEffect(() => {
        refreshTrafficLayer();
    }, [trafficData, showTraffic, refreshTrafficLayer]);

    // Fetch Real Road Geometry using Store Action
    // (Logic moved to store, here we just trigger it)

    // Location Handling
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setPermission('denied');
            return;
        }

        setIsLocating(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newLoc = { lat: latitude, lng: longitude };

                console.log(`User location obtained: ${latitude}, ${longitude}`);

                // Update local state for map centering
                setUserLoc(newLoc);
                // Update global store
                updateUserLocation(newLoc);

                // ALWAYS fetch roads on first location acquisition
                // Then fetch again if user moves significantly (>500m)
                const isFirstLocation = !storeUserLoc;
                const hasMovedSignificantly = storeUserLoc &&
                    (Math.abs(newLoc.lat - storeUserLoc.lat) > 0.005 ||
                        Math.abs(newLoc.lng - storeUserLoc.lng) > 0.005);

                if (isFirstLocation || hasMovedSignificantly) {
                    console.log(`Fetching roads for ${isFirstLocation ? 'initial' : 'updated'} location`);
                    fetchNearbyRoads(latitude, longitude);
                }

                setIsLocating(false);
                setPermission('granted');

                const map = mapRef.current;
                if (map) {
                    if (!userMarkerRef.current) {
                        // First time - create marker and center map
                        userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon() }).addTo(map);

                        // Only auto-center if user hasn't manually interacted
                        if (!hasUserInteracted) {
                            map.flyTo([latitude, longitude], 15, { duration: 1.5 });
                        }
                    } else {
                        // Update marker position but don't recenter map
                        userMarkerRef.current.setLatLng([latitude, longitude]);
                    }
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                setIsLocating(false);
                if (err.code === 1) setPermission('denied');
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
        );
    }, [storeUserLoc, fetchNearbyRoads, updateUserLocation]);


    useEffect(() => {
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    return (
        <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
            {/* Map Container */}
            <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-zinc-900" />

            {/* Permission Modal Overlay */}
            <AnimatePresence>
                {permission === 'prompt' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <Card className="bg-zinc-900 border-zinc-800 shadow-2xl max-w-sm w-full relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                            <CardContent className="p-6 text-center space-y-4">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 relative group">
                                    <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-20" />
                                    <Navigation className="w-7 h-7 text-primary relative z-10" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">Enable Live Traffic</h3>
                                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                                        Allow location access to view real-time road congestion and risk analysis for your route.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 pt-2">
                                    <Button onClick={startTracking} disabled={isLocating} className="w-full font-semibold shadow-lg shadow-primary/10">
                                        {isLocating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
                                        {isLocating ? "Locating..." : "Allow Location Access"}
                                    </Button>
                                    <Button variant="ghost" onClick={() => setPermission('denied')} className="text-zinc-600 text-xs hover:text-zinc-400">
                                        View Default City
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating HUD */}
            <div className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start pointer-events-none">
                {/* Legend */}
                <div className="bg-zinc-950/90 backdrop-blur-md rounded-lg p-3 border border-zinc-800 pointer-events-auto shadow-xl flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Real-Time Traffic</div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-400">
                        <div className="flex items-center gap-1.5"><div className="w-6 h-1 rounded-full bg-emerald-500"></div>Flowing</div>
                        <div className="flex items-center gap-1.5"><div className="w-6 h-1 rounded-full bg-yellow-500"></div>Slow</div>
                        <div className="flex items-center gap-1.5"><div className="w-6 h-1 rounded-full bg-red-500"></div>Congested</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <Button size="icon" variant="outline" className="h-9 w-9 bg-zinc-950/80 border-zinc-800 hover:bg-zinc-900 text-white" onClick={() => {
                        if (permission === 'granted' && userLoc && mapRef.current) {
                            mapRef.current.flyTo(userLoc, 16);
                        } else if (permission !== 'granted') {
                            setPermission('prompt');
                        }
                    }}>
                        <Navigation className={`w-4 h-4 ${permission === 'granted' ? 'text-primary' : 'text-zinc-400'}`} />
                    </Button>
                    <Button size="icon" variant="outline" className="h-9 w-9 bg-zinc-950/80 border-zinc-800 hover:bg-zinc-900 text-white" onClick={() => setShowTraffic(!showTraffic)}>
                        <Layers className={`w-4 h-4 ${showTraffic ? 'text-primary' : 'text-zinc-400'}`} />
                    </Button>
                </div>
            </div>
        </div>
    );
}

