import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import RiskMapPage from "./pages/RiskMapPage";
import LiveFeedsPage from "./pages/LiveFeedsPage";
import SettingsPage from "./pages/SettingsPage";
import AccidentAnalysisPage from "./pages/AccidentAnalysisPage";
import RoutePlannerPage from "./pages/RoutePlannerPage";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import AIPredictionDashboard from "./pages/AIPredictionDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><RiskMapPage /></ProtectedRoute>} />
          <Route path="/feeds" element={<ProtectedRoute><LiveFeedsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/accident-analysis" element={<ProtectedRoute><AccidentAnalysisPage /></ProtectedRoute>} />
          <Route path="/route-planner" element={<ProtectedRoute><RoutePlannerPage /></ProtectedRoute>} />
          <Route path="/ai-prediction" element={<ProtectedRoute><AIPredictionDashboard /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
