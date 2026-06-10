import React from "react";
import PageHeader from "@/components/PageHeader";

export default function Equipes() {
  return (
    <div className="space-y-6">
      <PageHeader title="Equipes de Campo" subtitle="Gestão das equipes de campo e seus membros." />

      <div className="bg-white border border-slate-100 rounded-xl p-10 text-center shadow-sm">
        <span className="text-5xl block mb-4">👥</span>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Equipes de Campo</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
          Gestão das equipes de campo e seus membros.
          <br />Este módulo está sendo implementado conforme os requisitos funcionais documentados no CLAUDE.md.
        </p>
        <div className="inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-xs text-slate-500 font-medium">
          Em desenvolvimento
        </div>
      </div>
    </div>
  );
}
