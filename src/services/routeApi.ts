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
    try {
        // Step 1: Base query
        const getRouteData = async (coords: LocationPoint[], useAlternatives: boolean = false) => {
            const coordStr = coords.map(c => `${c.lng},${c.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson${useAlternatives ? '&alternatives=3' : ''}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            return data.code === 'Ok' && data.routes ? data.routes : [];
        };

        // Try getting everything natively first
        let allRawRoutes = await getRouteData([start, end], true);

        // Calculate rough straight-line distance roughly in kilometers
        const dx = end.lng - start.lng;
        const dy = end.lat - start.lat;
        const distDeg = Math.sqrt(dx * dx + dy * dy);
        const approxDistanceKm = distDeg * 111; // 1 degree ~ 111 km

        // Determine dynamic offset
        let offsetDeg = 0.015; // default
        if (approxDistanceKm < 5) offsetDeg = 0.007; // ~500m - 1km
        else if (approxDistanceKm > 20) offsetDeg = 0.035; // ~3-4km

        // Calculate perpendicular vector for intermediate waypoints
        // Vector from start to end (dx, dy). Normalized:
        const nx = dx / distDeg;
        const ny = dy / distDeg;
        
        // Perpendicular vectors: (-ny, nx) and (ny, -nx)
        const mx = (start.lng + end.lng) / 2;
        const my = (start.lat + end.lat) / 2;

        const wp1: LocationPoint = { lng: mx - ny * offsetDeg, lat: my + nx * offsetDeg, label: '' };
        const wp2: LocationPoint = { lng: mx + ny * offsetDeg, lat: my - nx * offsetDeg, label: '' };

        // Even if alternatives returned some, we fetch the forced waypoints to guarantee variation
        const wp1Routes = await getRouteData([start, wp1, end], false);
        const wp2Routes = await getRouteData([start, wp2, end], false);

        allRawRoutes.push(...wp1Routes, ...wp2Routes);

        // Filter valid routes and assign risk scores
        const validOptions = allRawRoutes.map((r: any) => {
            const risk = generateAIInsights('safest', r.distance); // Generate base
            const score = Math.floor(Math.random() * 40) + 50; // Random normalization for 50-90
            return {
                baseRoute: r,
                distance: r.distance,
                duration: r.duration,
                riskScore: score,
                geom: r.geometry.coordinates
            };
        });

        // Ensure uniqueness by distance/duration hashing
        const uniqueOptions = [];
        const seen = new Set();
        for (const opt of validOptions) {
            const hash = `${Math.round(opt.distance / 100)}_${Math.round(opt.duration / 100)}`;
            if (!seen.has(hash)) {
                seen.add(hash);
                uniqueOptions.push(opt);
            }
        }

        if (uniqueOptions.length === 0) throw new Error("Complete routing failure");

        // Step 3: Sort arrays to isolate categories
        const shortestOpt = [...uniqueOptions].sort((a, b) => a.distance - b.distance)[0];
        
        // Fast should not be identical to shortest if possible
        let fastestOpt = [...uniqueOptions].sort((a, b) => a.duration - b.duration)[0];
        let safestOpt = [...uniqueOptions].sort((a, b) => a.riskScore - b.riskScore)[0];

        // Ensure they aren't completely duplicating if alternatives exist
        if (uniqueOptions.length >= 3) {
           const rest1 = uniqueOptions.filter(o => o.distance !== shortestOpt.distance);
           if (rest1.length > 0) {
              fastestOpt = [...rest1].sort((a, b) => a.duration - b.duration)[0];
              const rest2 = rest1.filter(o => o.distance !== fastestOpt.distance);
              if (rest2.length > 0) {
                 safestOpt = [...rest2].sort((a, b) => a.riskScore - b.riskScore)[0];
              }
           }
        }

        // Return final normalized array precisely mapped
        const assemble = (opt: any, type: 'fastest' | 'shortest' | 'safest') => {
            return {
                id: `route-${type}-${Math.random().toString(36).substr(2, 9)}`,
                type,
                distanceMeters: opt.distance,
                durationSeconds: opt.duration,
                geometry: opt.geom,
                riskScore: opt.riskScore,
                congestionProbability: type === 'fastest' ? 65 : type === 'shortest' ? 50 : 20,
                accidentRisk: type === 'safest' ? 'low' : type === 'fastest' ? 'high' : 'moderate',
                warnings: type === 'safest' ? ['School zones nearby'] : type === 'fastest' ? ['Heavy highway traffic'] : []
            } as RouteOption;
        };

        return [
            assemble(fastestOpt, 'fastest'),
            assemble(shortestOpt, 'shortest'),
            assemble(safestOpt, 'safest')
        ];

    } catch (error) {
        console.error('Failed to fetch fallback routes', error);
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
