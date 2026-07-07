import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { today } from "@/utils/formatters";
import type { Product } from "@/types";
import { ClipboardList, Check } from "lucide-react";

interface ItemInv extends Product { contagem?: number; }

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

export default function Inventario() {
  const toast = useToast();
  const [produtos, setProdutos] = useState<ItemInv[]>([]);
  const [loading, setLoading] = useState(true);
  const [responsavel, setResp] = useState("");
  const [almoxarifado, setAlmox] = useState("");
  const [justificativa, setJust] = useState("");
  const [data, setData] = useState(today());
  const [iniciado, setIniciado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");

  useEffect(() => {
    api.produtos.list("status=ATIVO").then((r) => {
      const d = (r as { data: Product[] }).data ?? [];
      const ps = (Array.isArray(d) ? d : Object.values(d)) as Product[];
      setProdutos(ps.map((p) => ({ ...p, contagem: undefined })));
    }).finally(() => setLoading(false));
  }, []);

  const iniciar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsavel.trim()) { toast.error("Informe o responsável."); return; }
    if (!almoxarifado.trim()) { toast.error("Informe o almoxarifado."); return; }
    setIniciado(true);
  };

  const handleFinalizar = async () => {
    if (!justificativa.trim()) { toast.error("Justificativa é obrigatória para confirmar ajustes."); return; }
    const comDivergencia = produtos.filter((p) => p.contagem !== undefined && p.contagem !== (p.estoque_total ?? 0));
    if (comDivergencia.length === 0) { toast.warning("Nenhuma divergência detectada para ajuste."); return; }
    setSalvando(true);
    try {
      for (const p of comDivergencia) {
        if (p.id !== undefined && p.contagem !== undefined) {
          const estoqueAtual = p.estoque_total ?? 0;
          await api.movimentos.create({
            tipo: "AJUSTE", codigo: p.codigo_produto, nome: p.nome, unid: p.unid,
            qtd: p.contagem - estoqueAtual, preco: p.preco_min ?? 0, almoxarifado,
            responsavel, data, obs: `Inventário — ${justificativa}`, usuario: responsavel,
          });
          // TODO: contagem física por marca/variação — por ora, o ajuste recai
          // inteiro sobre a variação de maior estoque, como aproximação.
          const variacoes = [...(p.variacoes ?? [])].sort((a, b) => b.estoque - a.estoque);
          if (variacoes.length > 0) {
            const diferenca = p.contagem - estoqueAtual;
            variacoes[0] = { ...variacoes[0], estoque: Math.max(0, variacoes[0].estoque + diferenca) };
            await api.produtos.update(String(p.id), { variacoes });
          }
        }
      }
      toast.success(`Inventário finalizado! ${comDivergencia.length} ajuste(s) aplicado(s).`);
      setIniciado(false); setResp(""); setAlmox(""); setJust("");
      api.produtos.list("status=ATIVO").then((r) => {
        const d = (r as { data: Product[] }).data ?? [];
        setProdutos(((Array.isArray(d) ? d : Object.values(d)) as Product[]).map((p) => ({ ...p, contagem: undefined })));
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao aplicar ajustes.");
    } finally { setSalvando(false); }
  };

  const setContagem = (id: number, val: number) =>
    setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, contagem: val } : p));

  const categorias = [...new Set(produtos.map((p) => p.categoria))].sort();
  const filtered = filtroCategoria ? produtos.filter((p) => p.categoria === filtroCategoria) : produtos;
  const comDivergencia = produtos.filter((p) => p.contagem !== undefined && p.contagem !== (p.estoque_total ?? 0));

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Inventário Geral" subtitle="Contagem física e ajuste de estoque" />

        {!iniciado ? (
          <form onSubmit={iniciar} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-[#EA6C0A]" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Iniciar Sessão de Inventário</h3>
            </div>
            <div>
              <label className={lbl}>Responsável *</label>
              <input value={responsavel} onChange={(e) => setResp(e.target.value)} placeholder="Nome do responsável" className={inp} />
            </div>
            <div>
              <label className={lbl}>Almoxarifado *</label>
              <input value={almoxarifado} onChange={(e) => setAlmox(e.target.value)} placeholder="Ex: Almox Central" className={inp} />
            </div>
            <div>
              <label className={lbl}>Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inp} />
            </div>
            <button type="submit"
              className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] rounded-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-orange-500/20">
              Iniciar Inventário →
            </button>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#0F172A] rounded-xl text-white">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Sessão em andamento</p>
                <p className="text-sm font-bold">{almoxarifado} — {responsavel} — {data}</p>
              </div>
              {comDivergencia.length > 0 && (
                <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-1 rounded-full">{comDivergencia.length} divergência(s)</span>
              )}
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <label className={lbl}>Filtrar por categoria</label>
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] mt-1">
                <option value="">Todas as categorias</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-10 text-center text-xs text-slate-400">Carregando produtos...</div>
              ) : (
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    {["Código", "Produto", "Categoria", "Unid.", "Est. Sistema", "Contagem Física", "Diferença"].map((h) => (
                      <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((p) => {
                      const estoqueTotal = p.estoque_total ?? 0;
                      const dif = p.contagem !== undefined ? p.contagem - estoqueTotal : null;
                      const diverge = dif !== null && dif !== 0;
                      return (
                        <tr key={p.id} className={`transition-colors ${diverge ? "bg-amber-50/40" : "hover:bg-slate-50"}`}>
                          <td className="p-3 font-mono text-slate-500">{p.codigo_produto}</td>
                          <td className="p-3 font-medium text-slate-800">{p.nome}</td>
                          <td className="p-3 text-slate-500">{p.categoria}</td>
                          <td className="p-3 font-mono text-slate-400">{p.unid}</td>
                          <td className="p-3 font-mono text-center font-bold text-slate-700">{estoqueTotal}</td>
                          <td className="p-3">
                            <input type="number" min={0} placeholder="—"
                              value={p.contagem !== undefined ? p.contagem : ""}
                              onChange={(e) => p.id !== undefined && setContagem(p.id, Number(e.target.value))}
                              className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-mono focus:outline-none focus:border-[#EA6C0A]" />
                          </td>
                          <td className="p-3 font-mono font-bold text-center">
                            {dif === null ? <span className="text-slate-300">—</span> : (
                              <span className={dif === 0 ? "text-emerald-500" : dif > 0 ? "text-sky-500" : "text-rose-500"}>
                                {dif > 0 ? "+" : ""}{dif}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {comDivergencia.length > 0 && (
              <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {comDivergencia.length} Divergência(s) — Confirmar Ajuste
                </h3>
                <div>
                  <label className={lbl}>Justificativa Obrigatória *</label>
                  <textarea value={justificativa} onChange={(e) => setJust(e.target.value)} rows={2}
                    placeholder="Descreva o motivo dos ajustes..."
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
                </div>
                <div className="flex justify-end">
                  <button onClick={handleFinalizar} disabled={salvando}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
                    <Check size={15} /> {salvando ? "Aplicando ajustes..." : "Finalizar Inventário →"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
