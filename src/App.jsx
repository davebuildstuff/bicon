import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { IncidentLiveProvider } from "./context/IncidentLiveContext.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import IncidentDetailPage from "./pages/IncidentDetail.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ZonesPage from "./pages/Zones.jsx";
import WardensPage from "./pages/Wardens.jsx";
import SimulatePage from "./pages/Simulate.jsx";

function ProtectedExperience() {
  const { token, busy } = useAuth();
  if (!token && busy) return null;
  if (!token) return <Navigate to="/login" replace />;
  return (
    <IncidentLiveProvider>
      <AppLayout />
    </IncidentLiveProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedExperience />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/wardens" element={<WardensPage />} />
          <Route path="/simulate" element={<SimulatePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
