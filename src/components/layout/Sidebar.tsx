import { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Map,
  Camera,
  TrendingUp,
  Bell,
  Settings,
  Shield,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Activity,
  Video,
  LogOut,
  Brain,
} from 'lucide-react';

interface SidebarLink {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

const mainLinks: SidebarLink[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', href: '/' },
  { icon: <Brain className="w-5 h-5" />, label: 'AI Prediction', href: '/ai-prediction' },
  { icon: <Navigation className="w-5 h-5" />, label: 'Route Planner', href: '/route-planner' },
  { icon: <Map className="w-5 h-5" />, label: 'Risk Map', href: '/map' },
  { icon: <Camera className="w-5 h-5" />, label: 'Live Feeds', href: '/feeds' },
  { icon: <Video className="w-5 h-5" />, label: 'Video Analysis', href: '/accident-analysis' },
];

const secondaryLinks: SidebarLink[] = [
  { icon: <Settings className="w-5 h-5" />, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="font-display font-bold text-lg text-sidebar-foreground">
                TRAFIQ<span className="text-primary">.AI</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Traffic Intelligence</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainLinks.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <NavLink
              key={link.href}
              to={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"
                />
              )}
              {link.icon}
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-sm"
                >
                  {link.label}
                </motion.span>
              )}
              {!collapsed && link.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status indicator */}
      {!collapsed && (
        <div className="p-3">
          <div className="p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-sidebar-foreground">System Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">All systems operational</span>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Navigation */}
      <div className="p-3 border-t border-sidebar-border">
        {secondaryLinks.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <NavLink
              key={link.href}
              to={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                ? 'bg-sidebar-accent text-sidebar-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
            >
              {link.icon}
              {!collapsed && (
                <span className="font-medium text-sm">{link.label}</span>
              )}
            </NavLink>
          );
        })}

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2 text-xs">Logout</span>}
        </Button>

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
