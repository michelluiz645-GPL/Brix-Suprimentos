import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/utils/formatters";
import type { Product } from "@/types";
import { Download } from "lucide-react";

interface CatGroup { categoria: string; produtos: Product[]; subtotal: number; }

export default function ValorEstoque() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.produtos.list("status=ATIVO").then((r) => {
      const d = (r as { data: Product[] }).data ?? [];
      setProdutos(Array.isArray(d) ? d : Object.values(d));
    }).finally(() => setLoading(false));
  }, []);

  const grupos: CatGroup[] = Object.entries(
    produtos.reduce<Record<string, Product[]>>((acc, p) => {
      (acc[p.categoria] = acc[p.categoria] ?? []).push(p);
      return acc;
    }, {})
  ).map(([categoria, ps]) => ({
    categoria,
    produtos: ps,
    subtotal: ps.reduce((s, p) => s + p.estoque * p.preco, 0),
  })).sort((a, b) => a.categoria.localeCompare(b.categoria));

  const totalGeral = grupos.reduce((s, g) => s + g.subtotal, 0);

  const exportarCSV = () => {
    const rows = [["Código", "Nome", "Categoria", "Estoque", "Preço Unit.", "Valor Total"]];
    produtos.forEach((p) => rows.push([
      p.codigo_produto, p.nome, p.categoria,
      String(p.estoque), String(p.preco), String((p.estoque * p.preco).toFixed(2)),
    ]));
    rows.push(["", "", "", "", "TOTAL GERAL", totalGeral.toFixed(2)]);
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Valor de Estoque" subtitle="Inventário financeiro completo"
        action={
          <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        } />

      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 text-white shadow-xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Valor Total do Estoque</p>
        <p className="text-3xl font-black font-mono">{loading ? "Calculando..." : formatCurrency(totalGeral)}</p>
        <p className="text-xs text-slate-400 mt-1">{produtos.length} produto(s) em {grupos.length} categoria(s)</p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">Calculando estoque...</div>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <div key={g.categoria} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{g.categoria}</h3>
                <span className="text-xs font-black font-mono text-[#EA6C0A]">{formatCurrency(g.subtotal)}</span>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-slate-50">
                  {["Código", "Nome", "Estoque", "Unid.", "Preço Unit.", "Valor Total"].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-400 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {g.produtos.map((p) => (
                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.estoque <= p.estoque_min && p.estoque_min > 0 ? "bg-rose-50/40" : ""}`}>
                      <td className="p-3 font-mono text-slate-500">{p.codigo_produto}</td>
                      <td className="p-3 font-medium text-slate-800">{p.nome}</td>
                      <td className="p-3 font-mono text-center font-bold text-slate-700">{p.estoque}</td>
                      <td className="p-3 font-mono text-slate-500">{p.unid}</td>
                      <td className="p-3 font-mono">{formatCurrency(p.preco)}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(p.estoque * p.preco)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
