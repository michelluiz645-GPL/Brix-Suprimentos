import React from "react";

interface Props { nome: string; descricao: string; icone?: string; }

export default function ModuloEmDesenvolvimento({ nome, descricao, icone = "🚧" }: Props) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-10 text-center max-w-xl mx-auto my-8 shadow-sm space-y-3">
      <span className="text-4xl">{icone}</span>
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{nome}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{descricao}</p>
    </div>
  );
}
