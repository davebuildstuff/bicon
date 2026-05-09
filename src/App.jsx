import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { IncidentLiveProvider } from "./context/IncidentLiveContext.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import IncidentDetailPage from "./pages/IncidentDetail.jsx";
import ZonesPage from "./pages/Zones.jsx";
import WardensPage from "./pages/Wardens.jsx";
import SimulatePage from "./pages/Simulate.jsx";

function ProtectedExperience() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return (
    <IncidentLiveProvider>
      <AppLayout />
    </IncidentLiveProvider>
  );
}

function RootRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Children render into `<Outlet />` inside `AppLayout` */}
        <Route element={<ProtectedExperience />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/wardens" element={<WardensPage />} />
          <Route path="/simulate" element={<SimulatePage />} />
        </Route>

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
