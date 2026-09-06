import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import AppLayout from "./components/layout/AppLayout";

// Lazy load page components for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Finance = lazy(() => import("./pages/Finance"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Ideas = lazy(() => import("./pages/Ideas"));
const Login = lazy(() => import("./pages/Login"));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// A simple fallback loading spinner
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-500 animate-pulse">Yükleniyor...</p>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="finance" element={<Finance />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="ideas" element={<Ideas />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
