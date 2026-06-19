import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { FuelMovement } from "@/types";
import { Download } from "lucide-react";

const COMBUSTIVEIS = ["DIESEL S10", "DIESEL COMUM", "GASOLINA", "ETANOL", "ARLA 32"];

export default function RelatoriosAbastecimento() {
  const toast = useToast();
  const [movimentos, setMov] = useState<FuelMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCombustivel, setFiltroComb] = useState("");
  const [filtroDataInicio, setDataInicio] = useState("");
  const [filtroDataFim, setDataFim] = useState("");

  useEffect(() => {
    setLoading(true);
    api.combustiveis.list().then((r) => {
      const d = (r as { data: FuelMovement[] }).data ?? [];
      setMov(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os abastecimentos."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = movimentos.filter((m) => {
    if (m.tipo !== "ABASTECIMENTO" && filtroTipo !== "ENTRADA") {
      if (filtroTipo === "ABASTECIMENTO" && m.tipo !== "ABASTECIMENTO") return false;
      if (filtroTipo === "" && m.tipo !== "ABASTECIMENTO") return false;
    }
    if (filtroTipo === "ENTRADA" && m.tipo !== "ENTRADA") return false;
    if (filtroTipo === "ABASTECIMENTO" && m.tipo !== "ABASTECIMENTO") return false;
    if (filtroEquipe && !(m.equipe ?? "").toLowerCase().includes(filtroEquipe.toLowerCase())) return false;
    if (filtroCombustivel && m.combustivel !== filtroCombustivel) return false;
    if (filtroDataInicio && m.data < filtroDataInicio) return false;
    if (filtroDataFim && m.data > filtroDataFim) return false;
    return true;
  });

  const totalLitros = filtered.filter((m) => m.tipo === "ABASTECIMENTO").reduce((s, m) => s + m.quantidade, 0);
  const totalValor = filtered.reduce((s, m) => s + m.valor, 0);

  const porEquipe = filtered
    .filter((m) => m.tipo === "ABASTECIMENTO")
    .reduce<Record<string, { litros: number; valor: number }>>((acc, m) => {
      const eq = m.equipe || "Sem equipe";
      if (!acc[eq]) acc[eq] = { litros: 0, valor: 0 };
      acc[eq].litros += m.quantidade;
      acc[eq].valor += m.valor;
      return acc;
    }, {});

  const exportarCSV = () => {
    const rows = [["Data", "Tipo", "Combustível", "Qtd (L)", "Valor", "Frota", "Equipe", "KM/Horômetro", "Responsável"]];
    filtered.forEach((m) => rows.push([
      formatDate(m.data), m.tipo, m.combustivel, String(m.quantidade),
      m.valor.toFixed(2), m.frota ?? "", m.equipe ?? "", m.km_ho ?? "", m.responsavel,
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `abastecimentos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Rel. Abastecimentos" subtitle="Consolidado de combustíveis por equipe e período"
          action={
            <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Download size={14} /> Exportar CSV
            </button>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Abastecimentos</option>
                <option value="ABASTECIMENTO">Abastecimentos</option>
                <option value="ENTRADA">Entradas</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Combustível</label>
              <select value={filtroCombustivel} onChange={(e) => setFiltroComb(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Todos</option>
                {COMBUSTIVEIS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Equipe</label>
              <input value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} placeholder="Filtrar equipe"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Data Início</label>
              <input type="date" value={filtroDataInicio} onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Data Fim</label>
              <input type="date" value={filtroDataFim} onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Abastecido", value: `${totalLitros.toFixed(0)} L`, sub: "litros no período" },
            { label: "Valor Total", value: formatCurrency(totalValor), sub: "no período selecionado" },
            { label: "Registros", value: String(filtered.length), sub: "movimentações" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{k.label}</p>
              <p className="text-xl font-black font-mono text-slate-800">{k.value}</p>
              <p className="text-[10px] text-slate-400">{k.sub}</p>
            </div>
          ))}
        </div>

        {Object.keys(porEquipe).length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Consumo por Equipe</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(porEquipe).sort((a, b) => b[1].litros - a[1].litros).map(([eq, dados]) => (
                <div key={eq} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{eq}</p>
                  <p className="text-sm font-black font-mono text-[#EA6C0A]">{dados.litros.toFixed(0)} L</p>
                  <p className="text-[10px] text-slate-400">{formatCurrency(dados.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum registro encontrado para o filtro selecionado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Data", "Tipo", "Combustível", "Qtd (L)", "Valor", "Frota", "Equipe", "KM / Ho.", "Responsável"].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-600">{formatDate(m.data)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>{m.tipo}</span>
                    </td>
                    <td className="p-3 font-medium">{m.combustivel}</td>
                    <td className="p-3 font-mono">{m.quantidade}</td>
                    <td className="p-3 font-mono">{formatCurrency(m.valor)}</td>
                    <td className="p-3 font-mono text-slate-500">{m.frota || "—"}</td>
                    <td className="p-3 text-slate-500">{m.equipe || "—"}</td>
                    <td className="p-3 font-mono text-slate-500">{m.km_ho || "—"}</td>
                    <td className="p-3">{m.responsavel}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                  <td colSpan={3} className="p-3 text-slate-600">Total</td>
                  <td className="p-3 font-mono text-[#EA6C0A]">{totalLitros.toFixed(0)} L</td>
                  <td className="p-3 font-mono text-[#EA6C0A]">{formatCurrency(totalValor)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
