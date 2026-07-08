import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { today } from "@/utils/formatters";
import { Search } from "lucide-react";

interface CupomItem { codigo: string; variacao_id: number | null; nome: string; unid: string; qtd: number; preco: number; }
interface Cupom { numero_pedido: string; equipe: string; nome_equipe: string; data_saida: string; almoxarifado: string; itens: CupomItem[]; status: string; }
interface ItemDev { codigo: string; variacao_id: number | null; nome: string; unid: string; qtd_orig: number; qtd_dev: number; danificado: boolean; }

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

export default function Devolucao() {
  const toast = useToast();
  const [busca, setBusca] = useState("");
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [cupomSel, setCupomSel] = useState<Cupom | null>(null);
  const [itens, setItens] = useState<ItemDev[]>([]);
  const [motivo, setMotivo] = useState("");
  const [responsavel, setResp] = useState("");
  const [data, setData] = useState(today());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.saidas.cupons().then((r) => {
      const d = (r as { data: Cupom[] }).data ?? [];
      setCupons(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => {});
  }, []);

  const buscarPedido = () => {
    const found = cupons.find(
      (c) => c.numero_pedido === busca.trim() ||
             c.equipe === busca.trim() ||
             (c.nome_equipe ?? "").toLowerCase().includes(busca.trim().toLowerCase())
    );
    if (!found) { toast.error("Pedido não encontrado."); setCupomSel(null); return; }
    if (found.status === "CANCELADO") { toast.error("Este pedido de saída foi cancelado — não é possível devolver itens dele."); setCupomSel(null); return; }
    setCupomSel(found);
    setItens(found.itens.map((it) => ({ codigo: it.codigo, variacao_id: it.variacao_id, nome: it.nome, unid: it.unid, qtd_orig: it.qtd, qtd_dev: it.qtd, danificado: false })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cupomSel) { toast.error("Busque um pedido primeiro."); return; }
    if (!motivo.trim()) { toast.error("Campo obrigatório: Motivo da devolução."); return; }
    if (!responsavel.trim()) { toast.error("Campo obrigatório: Responsável."); return; }
    if (itens.some((it) => it.qtd_dev <= 0)) { toast.error("Quantidade a devolver deve ser maior que zero."); return; }
    if (itens.some((it) => it.qtd_dev > it.qtd_orig)) { toast.error("Quantidade a devolver não pode exceder a quantidade original."); return; }
    setLoading(true);
    try {
      await api.devolucoes.create({ numero_pedido_origem: cupomSel.numero_pedido, itens, motivo, responsavel, data });
      toast.success("Devolução registrada com sucesso!");
      setCupomSel(null); setItens([]); setBusca(""); setMotivo(""); setResp("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a devolução.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <PageHeader title="Devolução" subtitle="Retorno de materiais ao estoque" />

        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Buscar Pedido de Saída</h3>
          <div className="flex gap-3">
            <input value={busca} onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscarPedido(); } }}
              placeholder="Número do pedido ou nome da equipe"
              className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            <button type="button" onClick={buscarPedido}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#EA6C0A] text-white text-sm font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Search size={15} /> Buscar
            </button>
          </div>
          {cupomSel && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-800">
              Pedido <span className="font-mono font-bold">{cupomSel.numero_pedido}</span> — {cupomSel.nome_equipe || cupomSel.equipe} — {cupomSel.data_saida}
            </div>
          )}
        </div>

        {cupomSel && (
          <>
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Itens a Devolver</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    {["Produto", "Unid.", "Qtd. Original", "Qtd. a Devolver", "Danificado"].map((h) => (
                      <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {itens.map((it, i) => (
                      <tr key={i}>
                        <td className="p-3 font-medium text-slate-800">{it.nome}</td>
                        <td className="p-3 font-mono text-slate-500">{it.unid}</td>
                        <td className="p-3 font-mono text-center text-slate-600">{it.qtd_orig}</td>
                        <td className="p-3">
                          <input type="number" min={0} max={it.qtd_orig} value={it.qtd_dev}
                            onChange={(e) => setItens((prev) => prev.map((x, idx) => idx === i ? { ...x, qtd_dev: Number(e.target.value) } : x))}
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center font-mono focus:outline-none focus:border-[#EA6C0A]" />
                        </td>
                        <td className="p-3">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={it.danificado}
                              onChange={(e) => setItens((prev) => prev.map((x, idx) => idx === i ? { ...x, danificado: e.target.checked } : x))} />
                            Não retorna ao estoque
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Dados da Devolução</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Responsável *</label>
                  <input value={responsavel} onChange={(e) => setResp(e.target.value)} placeholder="Nome do responsável" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Data</label>
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inp} />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Motivo da Devolução *</label>
                  <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3}
                    placeholder="Descreva o motivo da devolução..."
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading}
                className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
                {loading ? "Registrando..." : "Confirmar Devolução →"}
              </button>
            </div>
          </>
        )}
      </form>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
