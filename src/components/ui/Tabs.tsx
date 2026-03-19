"use client";

import React, { useState } from "react";

/**
 * Tab orientation
 */
type TabOrientation = "horizontal" | "vertical";

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Label displayed in the tab */
  label: React.ReactNode;
  /** Content displayed when tab is active */
  content: React.ReactNode;
  /** Optional icon to display before the label */
  icon?: React.ReactNode;
  /** Disable the tab */
  disabled?: boolean;
}

export interface TabsProps {
  /** Array of tab items */
  items: TabItem[];
  /** Default active tab ID */
  defaultTab?: string;
  /** Orientation of the tabs */
  orientation?: TabOrientation;
  /** Additional CSS classes */
  className?: string;
  /** Callback when active tab changes */
  onChange?: (tabId: string) => void;
}

/**
 * Tabs component for organizing content into switchable panels.
 * Supports horizontal and vertical layouts with icons.
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { id: "tab1", label: "Вкладка 1", content: <div>Содержимое 1</div> },
 *     { id: "tab2", label: "Вкладка 2", content: <div>Содержимое 2</div> }
 *   ]}
 *   defaultTab="tab1"
 * />
 * ```
 */
export function Tabs({
  items,
  defaultTab,
  orientation = "horizontal",
  className = "",
  onChange,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = items.find((item) => item.id === activeTab)?.content;

  const containerClass =
    orientation === "horizontal"
      ? "flex flex-col"
      : "flex flex-row gap-6";

  const tabListClass =
    orientation === "horizontal"
      ? "flex border-b border-slate-200 overflow-x-auto"
      : "flex flex-col gap-1 min-w-[200px]";

  const tabButtonClass = (isActive: boolean, disabled?: boolean) => {
    const base = "flex items-center gap-2 px-4 py-3 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500";

    if (disabled) {
      return `${base} text-slate-400 cursor-not-allowed`;
    }

    if (orientation === "horizontal") {
      return `${base} border-b-2 ${
        isActive
          ? "border-emerald-600 text-emerald-600"
          : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
      }`;
    } else {
      return `${base} rounded-xl ${
        isActive
          ? "bg-emerald-100 text-emerald-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`;
    }
  };

  return (
    <div className={`${containerClass} ${className}`}>
      <div
        className={tabListClass}
        role="tablist"
        aria-orientation={orientation}
      >
        {items.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={activeTab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            id={`tab-${item.id}`}
            onClick={() => !item.disabled && handleTabChange(item.id)}
            disabled={item.disabled}
            className={tabButtonClass(activeTab === item.id, item.disabled)}
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 py-6"
      >
        {activeContent}
      </div>
    </div>
  );
}
