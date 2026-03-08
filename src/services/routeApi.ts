import { LocationPoint, RouteOption } from '@/store/routePlannerStore';

// Mock function to generate AI insights for a route based on distance and type
const generateAIInsights = (type: 'fastest' | 'shortest' | 'safest', distanceMeters: number): Partial<RouteOption> => {
    let riskScore = 0;
    let congestionProbability = 0;
    let accidentRisk: 'low' | 'moderate' | 'high' = 'low';
    const warnings: string[] = [];

    // Base scores on route type
    if (type === 'safest') {
        riskScore = Math.floor(Math.random() * 10) + 90; // 90-99
        congestionProbability = Math.floor(Math.random() * 20) + 10; // 10-30%
        accidentRisk = 'low';
        warnings.push('School zone strict speed limits active');
    } else if (type === 'fastest') {
        riskScore = Math.floor(Math.random() * 15) + 70; // 70-85
        congestionProbability = Math.floor(Math.random() * 40) + 40; // 40-80%
        accidentRisk = 'moderate';
        if (Math.random() > 0.5) warnings.push('Highway construction ahead. Lanes reduced.');
    } else {
        riskScore = Math.floor(Math.random() * 20) + 60; // 60-80
        congestionProbability = Math.floor(Math.random() * 30) + 50; // 50-80%
        accidentRisk = Math.random() > 0.7 ? 'high' : 'moderate';
        warnings.push('Navigating through multiple complex intersections.');
    }

    return { riskScore, congestionProbability, accidentRisk, warnings };
};

export const fetchOSRMRoute = async (start: LocationPoint, end: LocationPoint): Promise<RouteOption[]> => {
    // OSRM coordinates are in longitude, latitude format
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    // Fetch with alternatives=true to get multiple real paths
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Routing API Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('No routes found from the OSRM service');
        }

        // Map OSRM routes to our RouteOption format
        const resultRoutes: RouteOption[] = data.routes.map((route: any, index: number) => {
            // Determine type for UI logic
            // Usually, OSRM returns the fastest first.
            // We'll assign types based on index, but in a real app, logic would compare distance/duration.
            let type: 'fastest' | 'shortest' | 'safest' = 'fastest';
            if (index === 1) type = 'shortest';
            if (index === 2) type = 'safest';
            if (index > 2) type = 'fastest'; // fallback

            const insights = generateAIInsights(type, route.distance);

            return {
                id: `route-${index}-${Math.random().toString(36).substr(2, 9)}`,
                type,
                distanceMeters: route.distance,
                durationSeconds: route.duration,
                geometry: route.geometry.coordinates, // [lng, lat][]
                ...insights
            } as RouteOption;
        });

        // Ensure we have 3 unique-looking routes if OSRM gives fewer
        if (resultRoutes.length < 3) {
            const baseRoute = resultRoutes[0];

            // If only 1 or 2 routes, we'll create "variations" to fulfill the 3-route requirement
            // but we'll try to keep them visually distinct if possible.
            // Note: In a production app, we might use a different profile (walking, cycling) 
            // or different weighings, but here we'll add a slight offset to geometry if they are identical.

            while (resultRoutes.length < 3) {
                const index = resultRoutes.length;
                let type: 'fastest' | 'shortest' | 'safest' = 'fastest';
                if (index === 1) type = 'shortest';
                if (index === 2) type = 'safest';

                const insights = generateAIInsights(type, baseRoute.distanceMeters);

                // For the "fake" alternatives (if OSRM fails to give 3), we'll add a tiny jitter 
                // to coordinate so they don't overlap perfectly on the map.
                const jitteredGeometry: [number, number][] = baseRoute.geometry.map((coord, i) => {
                    if (i === 0 || i === baseRoute.geometry.length - 1) return coord; // keep start/end same
                    return [
                        coord[0] + (Math.random() - 0.5) * 0.0001 * index,
                        coord[1] + (Math.random() - 0.5) * 0.0001 * index
                    ];
                });

                resultRoutes.push({
                    id: `route-${index}-${Math.random().toString(36).substr(2, 9)}`,
                    type,
                    distanceMeters: baseRoute.distanceMeters * (1 + (index * 0.05)),
                    durationSeconds: baseRoute.durationSeconds * (1 + (index * 0.08)),
                    geometry: jitteredGeometry,
                    ...insights
                } as RouteOption);
            }
        }

        return resultRoutes;
    } catch (error) {
        console.error('Failed to fetch routes', error);
        throw error;
    }
};

export const geocodeAddress = async (query: string): Promise<LocationPoint[]> => {
    if (!query || query.length < 3) return [];

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;

    try {
        const response = await fetch(url);
        if (!response.ok) return [];

        const data = await response.json();
        return data.map((item: any) => ({
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            label: item.display_name
        }));
    } catch (error) {
        console.error('Geocoding failed', error);
        return [];
    }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return 'Unknown Location';

        const data = await response.json();
        // Nominatim returns address object, we'll try to get a nice label
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.suburb || '';
        const state = addr.state || '';
        const country = addr.country || '';

        const parts = [addr.road, city, state, country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : data.display_name || 'Selected Location';
    } catch (error) {
        console.error('Reverse geocoding failed', error);
        return 'Selected Location';
    }
};

// Create a debounce hook locally or logic for standard components
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout | null = null;
    return function (this: any, ...args: Parameters<T>) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            func.apply(this, args);
        }, wait);
    } as T;
}
