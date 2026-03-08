import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationInputPanel } from '@/components/route-planner/LocationInputPanel';
import { RouteOptionsPanel } from '@/components/route-planner/RouteOptionsPanel';
import { AIInsightsPanel } from '@/components/route-planner/AIInsightsPanel';
import LiveRiskMapImpl from '@/components/dashboard/LiveRiskMapImpl';
import { useRoutePlannerStore } from '@/store/routePlannerStore';

export default function RoutePlannerPage() {
    const { routes, selectedRouteId, startLocation, destination } = useRoutePlannerStore();

    return (
        <DashboardLayout>
            <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0"
                >
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                            AI Route Planner
                            <Badge variant="outline" className="border-primary text-primary ml-2 bg-primary/10">
                                BETA
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Intelligent pathfinding with real-time risk simulation
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share Route
                        </Button>
                        <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
                            <Download className="w-4 h-4 mr-2" />
                            Export Data
                        </Button>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0 relative">

                    {/* Map Section (Spans 3 columns) — reuses LiveRiskMapImpl */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-3 h-[400px] lg:h-full relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 z-0"
                    >
                        {/* Reuse the exact same map from Risk Map section */}
                        <LiveRiskMapImpl
                            routeData={routes}
                            selectedRouteId={selectedRouteId}
                            hideTraffic={true}
                            startPoint={startLocation}
                            endPoint={destination}
                        />

                        {/* Floating Centered Search Bar over map */}
                        <div className="absolute top-6 left-0 right-0 px-6 z-[400]">
                            <LocationInputPanel />
                        </div>
                    </motion.div>

                    {/* Right Sidebar - Route options and AI insights */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-4 flex flex-col h-full min-h-0 z-10"
                    >
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 min-h-0">
                            <RouteOptionsPanel />
                        </div>
                        <div className="flex-shrink-0 pt-2 border-t border-zinc-800">
                            <AIInsightsPanel />
                        </div>
                    </motion.div>

                </div>
            </div>
        </DashboardLayout>
    );
}
