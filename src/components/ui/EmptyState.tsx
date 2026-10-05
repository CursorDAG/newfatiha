import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-[#D4AF37] mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-cream mb-2">{title}</h3>
      <p className="text-white/60 mb-6 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-gradient-to-r from-[#D4AF37] to-[#C49A2B] text-[#06201A] font-bold px-6 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 hover:from-[#E8D48B] hover:to-[#D4AF37]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
