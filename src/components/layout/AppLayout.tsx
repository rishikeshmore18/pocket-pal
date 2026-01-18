import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="container max-w-lg mx-auto w-full px-0 sm:px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
