import React from "react";

interface KPICardProps {
  icon: string | React.ReactNode;
  title: string;
  value: string | number;
  subtext?: string;
  color: string;
  bgColor: string;
}

export default function KPICard({ icon, title, value, subtext, color, bgColor }: KPICardProps) {
  return (
    <div
      style={{ borderLeftColor: color }}
      className="bg-white border-l-4 border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">
            {title}
          </div>
          <div className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">
            {value}
          </div>
          {subtext && (
            <div style={{ color }} className="text-[11px] font-medium leading-none">
              {subtext}
            </div>
          )}
        </div>
        <div
          style={{ backgroundColor: bgColor, color }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold font-mono"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
