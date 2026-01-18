import { Home, Receipt, Clock, BarChart3, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Home" },
  { path: "/expenses", icon: Receipt, label: "Expenses" },
  { path: "/timesheets", icon: Clock, label: "Timesheets" },
  { path: "/stats", icon: BarChart3, label: "Stats" },
  { path: "/more", icon: Menu, label: "More" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "bottom-nav-item touch-feedback flex-1",
                isActive && "active"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className={cn(
                "text-xs transition-opacity",
                isActive ? "opacity-100" : "opacity-0 sr-only"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
