import { create } from 'zustand';

export interface AnalyticsData {
    totalIncidents: number;
    activeRiskZones: number;
    averageRiskScore: number;
    predictionAccuracy: number;
    hourlyRisk: { hour: string; score: number }[];
    weeklyIncidents: { day: string; count: number }[];
    violationDistribution: { name: string; value: number; color: string }[];
    zonePerformance: { id: string; name: string; risk: number; trend: 'up' | 'down' | 'stable' }[];
}

interface AnalyticsState {
    data: AnalyticsData;
    updateAnalytics: (newData: Partial<AnalyticsData>) => void;
    registerIncident: (type: string) => void;
}

// Initial Mock Data (to start with, will be updated by simulation)
const initialData: AnalyticsData = {
    totalIncidents: 124,
    activeRiskZones: 8,
    averageRiskScore: 45,
    predictionAccuracy: 94.2,
    hourlyRisk: Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, score: Math.random() * 30 + 20 })),
    weeklyIncidents: [
        { day: 'Mon', count: 45 }, { day: 'Tue', count: 52 }, { day: 'Wed', count: 38 },
        { day: 'Thu', count: 65 }, { day: 'Fri', count: 48 }, { day: 'Sat', count: 59 }, { day: 'Sun', count: 42 }
    ],
    violationDistribution: [
        { name: 'Speeding', value: 45, color: '#ef4444' }, // destructive
        { name: 'Red Light', value: 25, color: '#f59e0b' }, // warning
        { name: 'Wrong Lane', value: 15, color: '#10b981' }, // primary (adjusted)
        { name: 'No Signal', value: 10, color: '#3b82f6' }, // success (adjusted)
        { name: 'Other', value: 5, color: '#64748b' }, // muted
    ],
    zonePerformance: []
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
    data: initialData,
    updateAnalytics: (newData) => set((state) => ({
        data: { ...state.data, ...newData }
    })),
    registerIncident: (type) => set((state) => {
        // Logic to update counts, trends, etc.
        const newViolations = state.data.violationDistribution.map(v =>
            v.name.toLowerCase().includes(type.toLowerCase()) ? { ...v, value: v.value + 1 } : v
        );
        return {
            data: {
                ...state.data,
                totalIncidents: state.data.totalIncidents + 1,
                violationDistribution: newViolations
            }
        };
    })
}));
