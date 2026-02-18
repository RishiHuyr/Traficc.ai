import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { RiskHeatmap } from '@/components/dashboard/RiskHeatmap';
import { Calendar } from 'lucide-react';
import { useState, useCallback } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Handle alert click with auto-clear after zoom
  const handleAlertClick = useCallback((zoneId: string) => {
    setSelectedSegmentId(zoneId);

    // Clear selection after 2 seconds to prevent re-triggering
    setTimeout(() => {
      setSelectedSegmentId(null);
    }, 2000);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Command Center
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" />
              {today}
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <StatsGrid />

        {/* Main Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-12 gap-6"
        >
          {/* Map - Full Width */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-9">
            <RiskHeatmap selectedSegmentId={selectedSegmentId} />
          </motion.div>

          {/* Alerts - Right Column */}
          <motion.div variants={itemVariants} className="col-span-12 lg:col-span-3">
            <AlertsPanel onAlertClick={handleAlertClick} />
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;

