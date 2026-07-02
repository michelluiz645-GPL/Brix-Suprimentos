import React, { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

const URG_COR: Record<string, string> = {
  Baixa:"bg-green-100 text-green-700", Média:"bg-amber-100 text-amber-700",
  Alta:"bg-orange-100 text-orange-700", Crítica:"bg-red-100 text-red-700",
};

interface SCItem { id: number; descricao: string; quantidade: number; unidade: string; recebido: boolean; quantidade_recebida?: number; }
interface SC { id: number; numero: string; destino: string; veiculo_frota?: string; urgencia: string; status: string; solicitante?: { nome: string }; cotacao_fornecedor?: string; previsao_entrega?: string; itens: SCItem[]; criado_em: string; }

interface ItemRecebimento { id: number; selecionado: boolean; quantidade_recebida: number; max: number; }

const fmtData = (iso?: string) => { if (!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5";

export default function Entradas() {
  const toast = useToast();
  const [lista, setLista]     = useState<SC[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel]         = useState<SC | null>(null);
  const [itensRec, setItensRec] = useState<ItemRecebimento[]>([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.sc.list("status=em_transito"),
      api.sc.list("status=comprado"),
    ])
      .then(([t, c]) => setLista([
        ...(Array.isArray(t) ? t as SC[] : []),
        ...(Array.isArray(c) ? c as SC[] : []),
      ]))
      .catch(() => toast.error("Erro ao carregar entregas."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirEntrada = (sc: SC) => {
    setSel(sc);
    setItensRec(sc.itens.filter(it => !it.recebido).map(it => ({
      id: it.id, selecionado: false, quantidade_recebida: it.quantidade, max: it.quantidade,
    })));
  };

  const toggleItem = (id: number) =>
    setItensRec(p => p.map(it => it.id === id ? { ...it, selecionado: !it.selecionado } : it));

  const setQtd = (id: number, v: number) =>
    setItensRec(p => p.map(it => it.id === id ? { ...it, quantidade_recebida: Math.min(v, it.max) } : it));

  const marcarTodos = () => setItensRec(p => p.map(it => ({ ...it, selecionado: true })));

  const handleEntrada = async (parcial: boolean) => {
    if (!sel) return;
    const selecionados = itensRec.filter(it => it.selecionado);
    if (selecionados.length === 0) { toast.error("Selecione ao menos um item."); return; }
    setSalvando(true);
    try {
      const payload = { itens: selecionados.map(it => ({ id: it.id, quantidade_recebida: it.quantidade_recebida })) };
      if (parcial) {
        await api.sc.entradaParcial(sel.id, payload);
        toast.success("Entrada parcial registrada!");
      } else {
        await api.sc.entrada(sel.id, payload);
        toast.success("Pedido concluído! Todos os itens recebidos.");
      }
      setSel(null);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar entrada.");
    } finally { setSalvando(false); }
  };

  const selecionados = itensRec.filter(it => it.selecionado);
  const todosSecionados = selecionados.length === itensRec.length && itensRec.length > 0;

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Entradas de Material" subtitle="SCs aguardando recebimento de materiais" />

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
          <span className="text-4xl block mb-3">📦</span>
          <p className="font-bold text-slate-600">Nenhum material aguardando entrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(sc => {
            const pendentes = sc.itens.filter(it => !it.recebido);
            const recebidos = sc.itens.filter(it => it.recebido);
            return (
              <div key={sc.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="font-mono font-black text-slate-800">{sc.numero}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COR[sc.urgencia] ?? ""}`}>{sc.urgencia}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.status === "em_transito" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"}`}>
                        {sc.status === "em_transito" ? "Em Trânsito" : "Comprado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span>🏷 {sc.destino}{sc.veiculo_frota ? ` — ${sc.veiculo_frota}` : ""}</span>
                      <span>👤 {sc.solicitante?.nome}</span>
                      {sc.cotacao_fornecedor && <span>🏪 {sc.cotacao_fornecedor}</span>}
                      {sc.previsao_entrega && <span>📅 Previsão: {fmtData(sc.previsao_entrega)}</span>}
                    </div>
                  </div>
                  <button onClick={() => abrirEntrada(sc)}
                    className="shrink-0 px-4 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all">
                    Registrar Entrada →
                  </button>
                </div>

                {/* Progress de itens */}
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{recebidos.length}/{sc.itens.length} itens recebidos</span>
                    <span>{pendentes.length} pendentes</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(recebidos.length / sc.itens.length) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de entrada */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Registrar Entrada</p>
                  <h3 className="text-lg font-black text-slate-800">{sel.numero}</h3>
                </div>
                <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className={lbl}>Itens pendentes</p>
                <button type="button" onClick={marcarTodos} className="text-[10px] text-[#EA6C0A] font-bold hover:underline">Marcar todos</button>
              </div>

              {itensRec.length === 0 ? (
                <p className="text-sm text-emerald-600 text-center py-4">✓ Todos os itens já foram recebidos.</p>
              ) : itensRec.map(it => {
                const descricao = sel.itens.find(i => i.id === it.id)?.descricao ?? "";
                const unidade   = sel.itens.find(i => i.id === it.id)?.unidade ?? "";
                return (
                  <div key={it.id} className={`p-3 rounded-xl border-2 transition-all ${it.selecionado ? "border-[#EA6C0A] bg-orange-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={it.selecionado} onChange={() => toggleItem(it.id)}
                        className="w-4 h-4 rounded accent-[#EA6C0A] cursor-pointer" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{descricao}</p>
                        <p className="text-[10px] text-slate-400">Esperado: {it.max} {unidade}</p>
                      </div>
                      <div className="w-28 shrink-0">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-1">Qtd Recebida</label>
                        <input type="number" min={0.01} step={0.01} max={it.max}
                          value={it.quantidade_recebida}
                          onChange={e => setQtd(it.id, Number(e.target.value))}
                          disabled={!it.selecionado}
                          className={`${inp} text-center ${!it.selecionado ? "opacity-40" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-slate-100 shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                <span>{selecionados.length} de {itensRec.length} itens selecionados</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSel(null)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
                {!todosSecionados && (
                  <button type="button" onClick={() => handleEntrada(true)} disabled={salvando || selecionados.length === 0}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 disabled:opacity-60">
                    {salvando ? "..." : "Entrada Parcial"}
                  </button>
                )}
                <button type="button" onClick={() => handleEntrada(false)} disabled={salvando || selecionados.length === 0}
                  className="flex-1 py-2.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:-translate-y-0.5 transition-all disabled:opacity-60">
                  {salvando ? "..." : "Concluir Pedido ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
