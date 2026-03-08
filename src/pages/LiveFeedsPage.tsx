import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Car,
  AlertTriangle,
  Wifi,
  Eye,
  RefreshCw,
  Grid3X3,
  LayoutGrid,
  Shield,
} from 'lucide-react';
import { cameraFeeds } from '@/lib/mockData';
import { useState } from 'react';
import EnhancedCameraFeed from '@/components/feeds/EnhancedCameraFeed';
import LiveTrafficSection from '@/components/feeds/LiveTrafficSection';

export default function LiveFeedsPage() {
  const [layout, setLayout] = useState<'grid' | 'featured'>('grid');
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Live Traffic Feed Section */}
        <LiveTrafficSection />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">
              Additional Camera Feeds
            </span>
          </div>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              Static Camera Feeds
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Simulated monitoring with AI-powered risk detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={layout === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLayout('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={layout === 'featured' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLayout('featured')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
            <Button variant="glow" size="sm">
              <Camera className="w-4 h-4 mr-2" />
              Add Camera
            </Button>
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {cameraFeeds.filter(c => c.status === 'online').length}
                </p>
                <p className="text-xs text-muted-foreground">Cameras Online</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {cameraFeeds.filter(c => c.status === 'processing').length}
                </p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {cameraFeeds.reduce((acc, c) => acc + c.vehicleCount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Vehicles Tracked</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {cameraFeeds.reduce((acc, c) => acc + c.violations, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Violations</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">
                  94.2%
                </p>
                <p className="text-xs text-muted-foreground">AI Accuracy</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-6 px-4 py-3 bg-muted/30 rounded-lg border border-border"
        >
          <span className="text-xs font-medium text-muted-foreground">Detection Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-2 border-success" />
            <span className="text-xs text-muted-foreground">Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-2 border-warning" />
            <span className="text-xs text-muted-foreground">Moderate Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-2 border-destructive" />
            <span className="text-xs text-muted-foreground">High Risk</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-xs text-muted-foreground">
            Labels show violation type + confidence score
          </span>
        </motion.div>

        {/* Camera Grid */}
        <div className={`grid gap-6 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
          {cameraFeeds.map((camera, index) => (
            <motion.div
              key={camera.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              className={layout === 'featured' && index === 0 ? 'lg:col-span-2 lg:row-span-2' : ''}
            >
              <EnhancedCameraFeed
                camera={camera}
                isFeatured={layout === 'featured' && index === 0}
                isSelected={selectedFeed === camera.id}
                onSelect={() => setSelectedFeed(camera.id === selectedFeed ? null : camera.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
