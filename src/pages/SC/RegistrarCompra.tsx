import React, { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

const URG_COR: Record<string, string> = {
  Baixa: "bg-green-100 text-green-700", Média: "bg-amber-100 text-amber-700",
  Alta:  "bg-orange-100 text-orange-700", Crítica: "bg-red-100 text-red-700",
};

const fmtMoeda = (v?: number) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5";

interface SCItem { id: number; descricao: string; quantidade: number; unidade: string; part_number?: string; }
interface SC {
  id: number; numero: string; destino: string; veiculo_frota?: string;
  urgencia: string; status: string; motivo?: string;
  solicitante?: { nome: string };
  cotacao_fornecedor?: string; cotacao_fornecedor_telefone?: string;
  cotacao_fornecedor_email?: string; valor_cotado?: number;
  itens: SCItem[]; criado_em: string;
}

export default function RegistrarCompra() {
  const toast = useToast();
  const [lista, setLista]       = useState<SC[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sel, setSel]           = useState<SC | null>(null);
  const [previsao, setPrevisao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api.sc.list("status=aprovado")
      .then(r => setLista(Array.isArray(r) ? r as SC[] : []))
      .catch(() => toast.error("Erro ao carregar lista."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (sc: SC) => {
    setSel(sc);
    setPrevisao("");
  };

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    if (!previsao) { toast.error("Informe a previsão de entrega."); return; }
    setSalvando(true);
    try {
      await api.sc.comprar(sel.id, { previsao_entrega: previsao });
      toast.success(`${sel.numero} registrada como comprada!`);
      setSel(null);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar compra.");
    } finally { setSalvando(false); }
  };

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Registrar Compra" subtitle="SCs aprovadas aguardando confirmação de compra" />

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
          <span className="text-4xl block mb-3">🛒</span>
          <p className="font-bold text-slate-600">Nenhuma SC aprovada aguardando compra.</p>
          <p className="text-xs text-slate-400 mt-1">Quando o Admin Suprimentos aprovar uma SC, ela aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(sc => (
            <div key={sc.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono font-black text-slate-800 text-base">{sc.numero}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COR[sc.urgencia] ?? ""}`}>{sc.urgencia}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Aprovada ✓</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
                    <span>🏷 <b>{sc.destino}</b>{sc.veiculo_frota ? ` — ${sc.veiculo_frota}` : ""}</span>
                    <span>👤 {sc.solicitante?.nome}</span>
                    <span>📅 {sc.criado_em}</span>
                  </div>

                  {/* Cotação */}
                  {sc.cotacao_fornecedor && (
                    <div className="bg-slate-50 rounded-lg px-4 py-3 flex flex-wrap gap-6 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Fornecedor</span>
                        <span className="font-bold text-slate-800">{sc.cotacao_fornecedor}</span>
                        {sc.cotacao_fornecedor_telefone && <span className="text-slate-400 ml-2">{sc.cotacao_fornecedor_telefone}</span>}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase tracking-widest font-bold mb-0.5">Valor Cotado</span>
                        <span className="font-black text-[#EA6C0A] text-sm">{fmtMoeda(sc.valor_cotado)}</span>
                      </div>
                    </div>
                  )}

                  {/* Itens resumo */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sc.itens.map((it, i) => (
                      <span key={it.id} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        {i + 1}. {it.descricao} — {it.quantidade} {it.unidade}
                        {it.part_number ? ` (${it.part_number})` : ""}
                      </span>
                    ))}
                  </div>
                </div>

                <button onClick={() => abrir(sc)}
                  className="shrink-0 px-5 py-2.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all shadow-lg shadow-orange-500/20">
                  Registrar Compra →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal confirmar compra */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">

            <div className="p-5 border-b border-slate-100 bg-emerald-50 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirmar Compra</p>
                  <h3 className="text-lg font-black text-slate-800">{sel.numero}</h3>
                  {sel.cotacao_fornecedor && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {sel.cotacao_fornecedor}
                      {sel.valor_cotado != null && (
                        <span className="ml-2 font-black text-[#EA6C0A]">{fmtMoeda(sel.valor_cotado)}</span>
                      )}
                    </p>
                  )}
                </div>
                <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
              </div>
            </div>

            <form onSubmit={handleConfirmar} className="p-5 space-y-5">
              {/* Itens */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens sendo comprados</p>
                {sel.itens.map(it => (
                  <div key={it.id} className="flex justify-between text-xs text-slate-700">
                    <span>{it.descricao}{it.part_number ? <span className="text-slate-400 ml-1">({it.part_number})</span> : null}</span>
                    <span className="text-slate-400 ml-4 shrink-0">{it.quantidade} {it.unidade}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className={lbl}>Previsão de entrega *</label>
                <input
                  type="date"
                  min={hoje}
                  value={previsao}
                  onChange={e => setPrevisao(e.target.value)}
                  className={inp}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  O almoxarife será notificado para aguardar o material nesta data.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setSel(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all disabled:opacity-60">
                  {salvando ? "Registrando..." : "Confirmar Compra ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
