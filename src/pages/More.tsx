import { useNavigate } from "react-router-dom";
import { 
  Wallet, 
  CreditCard, 
  Tag, 
  Settings, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Moon,
  Sun
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

export default function More() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const menuItems = [
    {
      icon: Wallet,
      label: "Accounts",
      description: "Manage bank & cash accounts",
      onClick: () => navigate("/accounts"),
    },
    {
      icon: CreditCard,
      label: "Debts",
      description: "Track loans & credit cards",
      onClick: () => navigate("/debts"),
    },
    {
      icon: Tag,
      label: "Categories",
      description: "Custom expense categories",
      onClick: () => toast.info("Coming soon!"),
    },
    {
      icon: Settings,
      label: "Settings",
      description: "App preferences",
      onClick: () => toast.info("Coming soon!"),
    },
    {
      icon: HelpCircle,
      label: "Help",
      description: "FAQs & support",
      onClick: () => toast.info("Coming soon!"),
    },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <header className="glass-header px-4 py-4">
        <h1 className="text-xl font-bold">More</h1>
      </header>

      <div className="px-4 py-4 space-y-2">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              onClick={item.onClick}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border touch-feedback text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          );
        })}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border touch-feedback text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Sun className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">Theme</p>
            <p className="text-sm text-muted-foreground">
              {theme === "dark" ? "Dark Mode" : "Light Mode"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border touch-feedback text-left mt-6"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <p className="font-medium text-destructive">Log Out</p>
        </button>
      </div>
    </AppLayout>
  );
}
