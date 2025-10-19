import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NewDashboard from "./pages/NewDashboard";
import DailyExercise from "./pages/DailyExercise";
import DailyContent from "./pages/DailyContent";
import InitialAssessment from "./pages/InitialAssessment";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Subscription from "./pages/Subscription";
import ExerciseHistory from "./pages/ExerciseHistory";
import ExerciseDetails from "./pages/ExerciseDetails";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/dashboard" element={<NewDashboard />} />
            <Route path="/daily-exercise" element={<DailyExercise />} />
            <Route path="/daily-content/:dayNumber?" element={<DailyContent />} />
            <Route path="/initial-assessment" element={<InitialAssessment />} />
            <Route path="/exercise-history" element={<ExerciseHistory />} />
            <Route path="/exercise-details/:exerciseId" element={<ExerciseDetails />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
