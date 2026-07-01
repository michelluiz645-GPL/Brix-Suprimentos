import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Eye, Printer } from "lucide-react";

interface CupomItem { nome: string; unid: string; qtd: number; preco: number; obs?: string; }
interface Cupom {
  id?: number;
  numero_pedido: string;
  equipe: string;
  nome_equipe: string;
  colaborador: string;
  entregador: string;
  resp_almox: string;
  data_saida: string;
  almoxarifado: string;
  itens: CupomItem[];
  status: string;
}

export default function HistoricoCupons() {
  const toast = useToast();
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [cupomSel, setCupomSel] = useState<Cupom | null>(null);

  useEffect(() => {
    api.saidas.cupons().then((r) => {
      const d = (r as { data: Cupom[] }).data ?? [];
      setCupons(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os cupons."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cupons.filter((c) => {
    const equipeOk = !filtroEquipe || (c.nome_equipe || c.equipe || "").toLowerCase().includes(filtroEquipe.toLowerCase());
    const dataOk = !filtroData || (c.data_saida ?? "").startsWith(filtroData);
    return equipeOk && dataOk;
  });

  const totalItens = (c: Cupom) => (c.itens ?? []).reduce((s, it) => s + it.qtd, 0);
  const totalVal = (c: Cupom) => (c.itens ?? []).reduce((s, it) => s + it.qtd * it.preco, 0);

  const imprimir = (c: Cupom) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Cupom ${c.numero_pedido}</title>
      <style>body{font-family:monospace;padding:20px;max-width:420px;margin:0 auto}h2{text-align:center;font-size:14px}p{font-size:11px;margin:3px 0}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #ccc;padding:4px 8px;font-size:10px}th{background:#eee}.total{font-weight:bold;text-align:right;padding-top:8px}</style></head>
      <body>
      <h2>GEPLAN — Cupom de Saída</h2>
      <p><b>Pedido:</b> ${c.numero_pedido}</p>
      <p><b>Data:</b> ${formatDate(c.data_saida)}</p>
      <p><b>Equipe:</b> ${c.nome_equipe || c.equipe}</p>
      <p><b>Entregador:</b> ${c.entregador}</p>
      <p><b>Almoxarifado:</b> ${c.almoxarifado}</p>
      <table><tr><th>Produto</th><th>Qtd</th><th>Un</th><th>Total</th></tr>
      ${(c.itens ?? []).map((it) => `<tr><td>${it.nome}</td><td>${it.qtd}</td><td>${it.unid}</td><td>R$ ${(it.qtd * it.preco).toFixed(2)}</td></tr>`).join("")}
      </table>
      <p class="total">Total Geral: R$ ${totalVal(c).toFixed(2)}</p>
      <p style="margin-top:12px"><b>Resp. Suprimentos:</b> ${c.resp_almox}</p>
      </body></html>
    `);
    win.print();
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Histórico de Cupons" subtitle="Slips de saída emitidos" />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Filtrar por equipe</label>
              <input value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} placeholder="Nome da equipe..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Filtrar por data</label>
              <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando cupons...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum cupom encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Pedido", "Data", "Equipe", "Almox.", "Itens", "Total", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#EA6C0A]">{c.numero_pedido}</td>
                    <td className="p-3 text-slate-600">{formatDate(c.data_saida)}</td>
                    <td className="p-3 font-medium">{c.nome_equipe || c.equipe}</td>
                    <td className="p-3 text-slate-500">{c.almoxarifado}</td>
                    <td className="p-3 font-mono text-center">{totalItens(c)}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(totalVal(c))}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => setCupomSel(c)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Eye size={15} /></button>
                        <button onClick={() => imprimir(c)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Printer size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {cupomSel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCupomSel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cupom {cupomSel.numero_pedido}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(cupomSel.data_saida)} — {cupomSel.nome_equipe || cupomSel.equipe}</p>
              </div>
              <button onClick={() => imprimir(cupomSel)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#EA6C0A] text-white rounded-lg hover:bg-[#C75B12] transition-colors">
                <Printer size={13} /> Imprimir
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  ["Entregador", cupomSel.entregador],
                  ["Resp. Suprimentos", cupomSel.resp_almox],
                  ["Suprimentos", cupomSel.almoxarifado],
                  ["Colaborador", cupomSel.colaborador || "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}><span className="font-bold text-slate-500 block">{k}</span><span className="text-slate-700">{v}</span></div>
                ))}
              </div>
              <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Produto", "Qtd", "Unid.", "Vlr. Unit.", "Total"].map((h) => (
                    <th key={h} className="p-2.5 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(cupomSel.itens ?? []).map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium">{it.nome}</td>
                      <td className="p-2.5 font-mono text-center">{it.qtd}</td>
                      <td className="p-2.5 font-mono text-slate-500">{it.unid}</td>
                      <td className="p-2.5 font-mono">{formatCurrency(it.preco)}</td>
                      <td className="p-2.5 font-mono font-bold">{formatCurrency(it.qtd * it.preco)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="p-2.5 font-bold text-slate-700 text-right">Total Geral</td>
                    <td className="p-2.5 font-mono font-bold text-[#EA6C0A]">{formatCurrency(totalVal(cupomSel))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setCupomSel(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
