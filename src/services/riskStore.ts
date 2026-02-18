import { create } from 'zustand';
import { RoadSegment, mockRoadSegments } from '@/lib/mockRoads';

interface RiskState {
    zones: RoadSegment[];
    userLocation: { lat: number; lng: number } | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setZones: (zones: RoadSegment[]) => void;
    updateUserLocation: (loc: { lat: number; lng: number }) => void;
    fetchNearbyRoads: (lat: number, lng: number) => Promise<void>;
}

export const useRiskStore = create<RiskState>((set, get) => ({
    zones: mockRoadSegments,
    userLocation: null,
    isLoading: false,
    error: null,

    setZones: (zones) => set({ zones }),

    updateUserLocation: (loc) => set({ userLocation: loc }),

    fetchNearbyRoads: async (lat, lng) => {
        set({ isLoading: true, error: null });
        try {
            // Query for major roads around the point (radius 1500m)
            const query = `
                [out:json][timeout:25];
                (
                  way["highway"~"primary|secondary|tertiary"](around:1500,${lat},${lng});
                );
                out geom;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });

            if (!response.ok) throw new Error("Overpass API limit");

            const data = await response.json();
            const ways = data.elements.filter((e: any) => e.type === 'way' && e.geometry);

            const newSegments: RoadSegment[] = ways.map((w: any) => ({
                id: `osm-${w.id}`,
                name: w.tags?.name || "Unnamed Road",
                path: w.geometry.map((p: any) => [p.lat, p.lon] as [number, number]),
                riskLevel: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'high' : Math.random() > 0.2 ? 'medium' : 'low'
            }));

            if (newSegments.length > 0) {
                set({ zones: newSegments });
            }
        } catch (err: any) {
            console.warn("Failed to fetch real roads, falling back to mock:", err);
            set({ error: err.message });
            // Keep existing (mock) zones on failure
        } finally {
            set({ isLoading: false });
        }
    }
}));
