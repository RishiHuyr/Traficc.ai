import { LatLngTuple } from "leaflet";

export interface RoadSegment {
    id: string;
    name: string;
    path: LatLngTuple[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Major Roads in Lower Manhattan (Approximated)
export const mockRoadSegments: RoadSegment[] = [
    // Broadway (North-South Spine)
    {
        id: "broadway-1",
        name: "Broadway (Lower)",
        path: [
            [40.7032, -74.0170], // Battery Park
            [40.7075, -74.0113], // Wall St
            [40.7115, -74.0093], // City Hall
            [40.7165, -74.0064], // Canal St
        ],
        riskLevel: 'medium'
    },
    // West Side Highway (Hwy)
    {
        id: "west-side-1",
        name: "West Side Hwy",
        path: [
            [40.7020, -74.0163],
            [40.7110, -74.0145],
            [40.7180, -74.0125],
            [40.7250, -74.0105],
        ],
        riskLevel: 'low'
    },
    // FDR Drive (East Side)
    {
        id: "fdr-1",
        name: "FDR Drive",
        path: [
            [40.7015, -74.0110],
            [40.7060, -74.0020],
            [40.7120, -73.9970], // Brooklyn Bridge
            [40.7180, -73.9920],
        ],
        riskLevel: 'high'
    },
    // Canal Street (Cross-Town Congestion)
    {
        id: "canal-1",
        name: "Canal St",
        path: [
            [40.7225, -74.0105], // West
            [40.7205, -74.0055], // Broadway Intersection
            [40.7185, -74.0005], // East
        ],
        riskLevel: 'critical'
    },
    // Wall Street Area
    {
        id: "wall-1",
        name: "Wall St",
        path: [
            [40.7075, -74.0113],
            [40.7060, -74.0080],
            [40.7050, -74.0050],
        ],
        riskLevel: 'medium'
    },
    // Brooklyn Bridge Approach
    {
        id: "bk-bridge-1",
        name: "Brooklyn Bridge",
        path: [
            [40.7120, -74.0040],
            [40.7060, -73.9960],
        ],
        riskLevel: 'high'
    },
    // Chambers Street
    {
        id: "chambers-1",
        name: "Chambers St",
        path: [
            [40.7170, -74.0140],
            [40.7150, -74.0080],
            [40.7130, -74.0030],
        ],
        riskLevel: 'low'
    }
];
