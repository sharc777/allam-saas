import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NewDashboard from "./pages/NewDashboard";
import DailyExercise from "./pages/DailyExercise";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Quiz from "./pages/Quiz";
import NotFound from "./pages/NotFound";
import TestTypeSelection from "./pages/TestTypeSelection";
import Lesson from "./pages/Lesson";
import PracticeQuiz from "./pages/PracticeQuiz";
import InitialAssessment from "./pages/InitialAssessment";
import Subscription from "./pages/Subscription";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/test-selection" element={<TestTypeSelection />} />
          <Route path="/initial-assessment" element={<InitialAssessment />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/dashboard" element={<NewDashboard />} />
          <Route path="/old-dashboard" element={<Dashboard />} />
          <Route path="/daily-exercise" element={<DailyExercise />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/practice-quiz" element={<PracticeQuiz />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/lesson/:dayNumber/:topicId" element={<Lesson />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
