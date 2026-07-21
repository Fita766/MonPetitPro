import type { LucideIcon } from "lucide-react";

export interface OperationTab {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export default function OperationTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: OperationTab[];
  activeTab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div
      className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
      role="tablist"
      aria-label="Sections de la fiche opération"
    >
      <div className="flex min-w-max gap-1">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`group flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active ? "bg-teal-700 text-white shadow-sm" : "text-slate-500 hover:bg-teal-50 hover:text-teal-900"}`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-medium ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white"}`}
              >
                {index + 1}
              </span>
              <Icon size={16} />
              <span className="hidden lg:inline">{tab.label}</span>
              <span className="lg:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
