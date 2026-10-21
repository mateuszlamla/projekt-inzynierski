import { NavLink } from "react-router-dom";

export function Navbar() {
  const navItems = [
    {
      to: "/",
      label: "Potok Danych",
      sublabel: "Węzły & Canvas",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        </svg>
      ),
    },
    {
      to: "/charts/new",
      label: "Kreator Wykresów",
      sublabel: "Drag & Drop",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      ),
    },
    {
      to: "/dashboards",
      label: "Dashboardy",
      sublabel: "Siatka Kafelków",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
    },
    {
      to: "/script-editor",
      label: "Edytor Skryptów",
      sublabel: "Docker Sandbox",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      ),
    },
  ];

  return (
    <header className="h-14 bg-slate-950 text-slate-100 border-b border-slate-800 flex items-center justify-between px-5 shrink-0 z-30 select-none shadow-md">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/20">
          DF
        </div>
        <div>
          <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
            DataFlow <span className="text-purple-400 font-medium text-xs">Builder</span>
          </span>
          <div className="text-[10px] text-slate-400 leading-none">Platforma Wizualizacji & Analizy</div>
        </div>
      </div>

      {/* Nawigacja główna */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm shadow-blue-500/20 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Status i środowisko */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>FastAPI :8000</span>
        </div>
      </div>
    </header>
  );
}
