"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsTab = {
  key: string;
  label: string;
  content: ReactNode;
};

/**
 * Client tab switcher for the settings page. Sections are server-rendered and passed in
 * as `content`; only the active tab's content is shown so the page stays uncluttered.
 */
export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const available = tabs.filter((tab) => tab.content);
  const [active, setActive] = useState(available[0]?.key ?? "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {available.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition",
              active === tab.key
                ? "border-b-2 border-slate-950 text-slate-950"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {available.map((tab) => (
        <div key={tab.key} className={cn("space-y-6", active === tab.key ? "block" : "hidden")}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
