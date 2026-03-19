"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItemProps {
  /** Unique identifier for the item */
  id: string;
  /** Title displayed in the header */
  title: React.ReactNode;
  /** Content displayed when expanded */
  content: React.ReactNode;
  /** Optional icon to display before the title */
  icon?: React.ReactNode;
}

export interface AccordionProps {
  /** Array of accordion items */
  items: AccordionItemProps[];
  /** Allow multiple items to be open simultaneously */
  allowMultiple?: boolean;
  /** Default open item IDs */
  defaultOpen?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Accordion component for collapsible content sections.
 * Supports single or multiple open items with smooth animations.
 *
 * @example
 * ```tsx
 * <Accordion
 *   items={[
 *     { id: "1", title: "Раздел 1", content: "Содержимое 1" },
 *     { id: "2", title: "Раздел 2", content: "Содержимое 2" }
 *   ]}
 *   allowMultiple={false}
 * />
 * ```
 */
export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  className = "",
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        return (
          <div
            key={item.id}
            className="border border-slate-200 rounded-xl overflow-hidden bg-white"
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <div className="flex items-center gap-3 flex-1">
                {item.icon && (
                  <span className="text-slate-600" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="font-bold text-slate-900">{item.title}</span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              id={`accordion-content-${item.id}`}
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
              }`}
              role="region"
              aria-labelledby={`accordion-header-${item.id}`}
            >
              <div className="p-4 pt-0 text-slate-700">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
