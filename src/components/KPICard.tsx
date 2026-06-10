import React from "react";

interface KPICardProps {
  icon: React.ReactNode | string;
  title: string;
  value: string | number;
  subtext?: string;
  color?: string;
  bgColor?: string;
  onClick?: () => void;
}

export default function KPICard({ icon, title, value, subtext, color = "#EA6C0A", bgColor, onClick }: KPICardProps) {
  return (
    <div
      className={`bg-white border border-slate-100 rounded-xl p-4 shadow-sm ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: bgColor || `${color}15`, color }}
        >
          {typeof icon === "string" ? <span>{icon}</span> : icon}
        </div>
      </div>
      <div className="font-mono text-xl font-bold text-slate-800 leading-tight">{value}</div>
      <div className="text-xs font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">{title}</div>
      {subtext && <div className="text-[10px] text-slate-400 mt-1">{subtext}</div>}
    </div>
  );
}
