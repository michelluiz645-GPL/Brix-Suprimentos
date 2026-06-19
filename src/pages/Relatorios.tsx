import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate } from "@/utils/formatters";
import type { Movement } from "@/types";
import { Download } from "lucide-react";

const TIPOS = ["ENTRADA", "SAÍDA", "DEVOLUÇÃO", "AJUSTE"];
const BADGE: Record<string, string> = {
  "ENTRADA":   "bg-emerald-100 text-emerald-700",
  "SAÍDA":     "bg-rose-100 text-rose-700",
  "DEVOLUÇÃO": "bg-sky-100 text-sky-700",
  "AJUSTE":    "bg-amber-100 text-amber-700",
};

export default function Relatorios() {
  const toast = useToast();
  const [movimentos, setMov] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAlmox, setFiltroAlmox] = useState("");
  const [filtroDataInicio, setDataInicio] = useState("");
  const [filtroDataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setLoading(true);
    api.movimentos.list().then((r) => {
      const d = (r as { data: Movement[] }).data ?? [];
      setMov(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os movimentos."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = movimentos.filter((m) => {
    if (filtroTipo && m.tipo !== filtroTipo) return false;
    if (filtroAlmox && !(m.almoxarifado ?? "").toLowerCase().includes(filtroAlmox.toLowerCase())) return false;
    if (filtroDataInicio && m.data < filtroDataInicio) return false;
    if (filtroDataFim && m.data > filtroDataFim) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!m.nome.toLowerCase().includes(q) && !(m.numero_pedido ?? "").includes(q) && !(m.numero_nf ?? "").includes(q)) return false;
    }
    return true;
  });

  const totalEntradas = filtered.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.qtd * m.preco, 0);
  const totalSaidas = filtered.filter((m) => m.tipo === "SAÍDA").reduce((s, m) => s + m.qtd * m.preco, 0);

  const exportarCSV = () => {
    const rows = [["Data", "Tipo", "Pedido", "NF", "Produto", "Qtd", "Unid.", "Preço Unit.", "Total", "Almox.", "Responsável"]];
    filtered.forEach((m) => rows.push([
      formatDate(m.data), m.tipo, m.numero_pedido ?? "", m.numero_nf ?? "",
      m.nome, String(m.qtd), m.unid, m.preco.toFixed(2),
      (m.qtd * m.preco).toFixed(2), m.almoxarifado, m.responsavel ?? m.usuario,
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `movimentos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Relatórios" subtitle="Histórico completo de movimentações"
          action={
            <button onClick={exportarCSV} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Download size={14} /> Exportar CSV
            </button>
          } />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Registros", value: String(filtered.length), cls: "text-slate-800" },
            { label: "Entradas", value: formatCurrency(totalEntradas), cls: "text-emerald-600" },
            { label: "Saídas", value: formatCurrency(totalSaidas), cls: "text-rose-600" },
            { label: "Saldo Líquido", value: formatCurrency(totalEntradas - totalSaidas), cls: totalEntradas >= totalSaidas ? "text-sky-600" : "text-amber-600" },
          ].map((k) => (
            <div key={k.label} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`text-lg font-black font-mono ${k.cls}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Buscar produto / pedido / NF</label>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo</label>
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Todos</option>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
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

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando movimentos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhuma movimentação encontrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Data", "Tipo", "Pedido", "NF", "Produto", "Qtd", "Preço", "Total", "Almox.", "Responsável"].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(m.data)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${BADGE[m.tipo] ?? "bg-slate-100 text-slate-500"}`}>{m.tipo}</span>
                      </td>
                      <td className="p-3 font-mono text-[#EA6C0A]">{m.numero_pedido || "—"}</td>
                      <td className="p-3 font-mono text-slate-500">{m.numero_nf || "—"}</td>
                      <td className="p-3 font-medium text-slate-800 max-w-[180px] truncate">{m.nome}</td>
                      <td className="p-3 font-mono text-center">{m.qtd} <span className="text-slate-400">{m.unid}</span></td>
                      <td className="p-3 font-mono">{formatCurrency(m.preco)}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(m.qtd * m.preco)}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{m.almoxarifado}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{m.responsavel ?? m.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
