import { create } from 'zustand';

export interface LocationPoint {
    lat: number;
    lng: number;
    label: string;
}

export interface RouteOption {
    id: string;
    type: 'fastest' | 'shortest' | 'safest';
    distanceMeters: number;
    durationSeconds: number;
    geometry: [number, number][]; // GeoJSON LineString coordinates: [lng, lat][]
    riskScore: number;
    congestionProbability: number;
    accidentRisk: 'low' | 'moderate' | 'high';
    warnings: string[];
}

interface RoutePlannerState {
    startLocation: LocationPoint | null;
    destination: LocationPoint | null;
    routes: RouteOption[];
    selectedRouteId: string | null;
    isCalculating: boolean;
    error: string | null;

    setStartLocation: (loc: LocationPoint | null) => void;
    setDestination: (loc: LocationPoint | null) => void;
    setRoutes: (routes: RouteOption[]) => void;
    setSelectedRouteId: (id: string | null) => void;
    setIsCalculating: (isCalculating: boolean) => void;
    setError: (error: string | null) => void;
    clearRoutes: () => void;
}

export const useRoutePlannerStore = create<RoutePlannerState>((set) => ({
    startLocation: null,
    destination: null,
    routes: [],
    selectedRouteId: null,
    isCalculating: false,
    error: null,

    setStartLocation: (loc) => set({ startLocation: loc }),
    setDestination: (loc) => set({ destination: loc }),
    setRoutes: (routes) => {
        set({ routes });
        if (routes.length > 0) {
            set({ selectedRouteId: routes[0].id });
        }
    },
    setSelectedRouteId: (id) => set({ selectedRouteId: id }),
    setIsCalculating: (isCalculating) => set({ isCalculating }),
    setError: (error) => set({ error, isCalculating: false }),
    clearRoutes: () => set({ routes: [], selectedRouteId: null, error: null }),
}));
