import React, { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { User } from "@/types";

const URG_COR: Record<string, string> = {
  Baixa:"bg-green-100 text-green-700", Média:"bg-amber-100 text-amber-700",
  Alta:"bg-orange-100 text-orange-700", Crítica:"bg-red-100 text-red-700",
};

interface SCItem { id: number; descricao: string; quantidade: number; unidade: string; }
interface SC {
  id: number; numero: string; destino: string; veiculo_frota?: string; urgencia: string;
  status: string; solicitante?: { nome: string };
  cotacao_fornecedor?: string; cotacao_fornecedor_telefone?: string;
  valor_cotado?: number; data_cotacao?: string; motivo?: string;
  itens: SCItem[]; criado_em: string;
}

const fmtMoeda = (v?: number) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5";

interface Props { user: User; }

export default function FilaAprovacao({ user }: Props) {
  const toast = useToast();
  const papel = user.papel ?? "";
  const statusFila = papel === "admin_manutencao" ? "aguardando_aprovacao_mnt" : "aguardando_aprovacao_sup";

  const [lista, setLista]     = useState<SC[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<{ sc: SC; acao: "aprovar" | "rejeitar" } | null>(null);
  const [obs, setObs]         = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api.sc.list(`status=${statusFila}`)
      .then(r => setLista(Array.isArray(r) ? r as SC[] : []))
      .catch(() => toast.error("Erro ao carregar fila."))
      .finally(() => setLoading(false));
  }, [statusFila]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAcao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    if (modal.acao === "rejeitar" && obs.trim().length < 10) {
      toast.error("Descreva o motivo com pelo menos 10 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      if (modal.acao === "aprovar") {
        if (papel === "admin_manutencao" || papel === "admin_geral") {
          await api.sc.aprovarMnt(modal.sc.id, { observacao: obs });
        } else {
          await api.sc.aprovarSup(modal.sc.id, { observacao: obs });
        }
        toast.success(`${modal.sc.numero} aprovada!`);
      } else {
        await api.sc.rejeitarMnt(modal.sc.id, { motivo: obs });
        toast.success(`${modal.sc.numero} rejeitada.`);
      }
      setModal(null);
      setObs("");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na ação.");
    } finally { setSalvando(false); }
  };

  const etapaLabel = papel === "admin_manutencao" ? "Manutenção" : "Suprimentos";

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Fila de Aprovação" subtitle={`SCs aguardando aprovação do ${etapaLabel}`} />

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
          <span className="text-4xl block mb-3">✅</span>
          <p className="font-bold text-slate-600">Nenhuma SC aguardando aprovação.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map(sc => (
            <div key={sc.id} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
              {/* Cabeçalho */}
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-black text-slate-800 text-lg">{sc.numero}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COR[sc.urgencia] ?? ""}`}>{sc.urgencia}</span>
                  <span className="text-xs text-slate-400">{sc.criado_em}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setModal({ sc, acao: "rejeitar" }); setObs(""); }}
                    className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
                    ✕ Rejeitar
                  </button>
                  <button onClick={() => { setModal({ sc, acao: "aprovar" }); setObs(""); }}
                    className="px-4 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:-translate-y-0.5 transition-all">
                    ✓ Aprovar
                  </button>
                </div>
              </div>

              {/* Corpo */}
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <p className={lbl}>Solicitação</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Destino</span><span className="font-bold">{sc.destino}{sc.veiculo_frota ? ` — ${sc.veiculo_frota}` : ""}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Solicitante</span><span className="font-bold">{sc.solicitante?.nome ?? "—"}</span></div>
                    {sc.motivo && <div className="text-[11px] text-slate-400 italic mt-1">"{sc.motivo}"</div>}
                  </div>
                </div>
                {sc.cotacao_fornecedor && (
                  <div>
                    <p className={lbl}>Cotação</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Fornecedor</span><span className="font-bold">{sc.cotacao_fornecedor}</span></div>
                      {sc.cotacao_fornecedor_telefone && <div className="flex justify-between"><span className="text-slate-400">Tel</span><span className="font-bold">{sc.cotacao_fornecedor_telefone}</span></div>}
                      <div className="flex justify-between"><span className="text-slate-400">Valor</span><span className="font-black text-[#EA6C0A] text-base">{fmtMoeda(sc.valor_cotado)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Data</span><span className="font-bold">{sc.data_cotacao ?? "—"}</span></div>
                    </div>
                  </div>
                )}
                <div className="col-span-2">
                  <p className={lbl}>Itens ({sc.itens.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {sc.itens.map((it, i) => (
                      <span key={it.id} className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded-lg">
                        {i + 1}. {it.descricao} — {it.quantidade} {it.unidade}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal aprovação/rejeição */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className={`p-5 rounded-t-2xl ${modal.acao === "aprovar" ? "bg-emerald-50 border-b border-emerald-100" : "bg-rose-50 border-b border-rose-100"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {modal.acao === "aprovar" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
                  </p>
                  <h3 className="text-lg font-black text-slate-800">{modal.sc.numero}</h3>
                </div>
                <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
              </div>
              {modal.sc.valor_cotado && (
                <div className="mt-2">
                  <span className="text-xl font-black text-[#EA6C0A]">{fmtMoeda(modal.sc.valor_cotado)}</span>
                  <span className="text-xs text-slate-400 ml-2">— {modal.sc.cotacao_fornecedor}</span>
                </div>
              )}
            </div>
            <form onSubmit={handleAcao} className="p-5 space-y-4">
              <div>
                <label className={lbl}>{modal.acao === "rejeitar" ? "Motivo da rejeição *" : "Observação (opcional)"}</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={4}
                  placeholder={modal.acao === "rejeitar" ? "Descreva o motivo com pelo menos 10 caracteres..." : "Informações adicionais (opcional)"}
                  className={`${inp} resize-none`} />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className={`px-6 py-2 text-xs font-bold text-white rounded-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 ${
                    modal.acao === "aprovar" ? "bg-gradient-to-r from-emerald-600 to-emerald-500" : "bg-gradient-to-r from-rose-600 to-rose-500"
                  }`}>
                  {salvando ? "Processando..." : modal.acao === "aprovar" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
