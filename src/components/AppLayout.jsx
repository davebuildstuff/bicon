import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  MapPinned,
  Play,
  Shield,
  ShieldUser,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/zones", label: "Zones", icon: MapPinned },
  { to: "/wardens", label: "Wardens", icon: ShieldUser },
  { to: "/simulate", label: "Simulate", icon: Play },
];

export default function AppLayout() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-black/40">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <Shield className="h-8 w-8 text-emerald-400" aria-hidden />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">Bicon</div>
            <div className="text-[11px] text-zinc-500">Dispatcher console</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  isActive
                    ? "bg-white/10 font-medium text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
