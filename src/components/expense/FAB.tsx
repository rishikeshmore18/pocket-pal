import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      className="fab touch-feedback hover:scale-105 transition-transform"
      aria-label="Add expense"
    >
      <Plus className="w-7 h-7" />
    </button>
  );
}
