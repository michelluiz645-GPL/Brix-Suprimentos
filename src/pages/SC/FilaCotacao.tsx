import React, { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

const URG_COR: Record<string, string> = {
  Baixa:"bg-green-100 text-green-700", Média:"bg-amber-100 text-amber-700",
  Alta:"bg-orange-100 text-orange-700", Crítica:"bg-red-100 text-red-700",
};

interface SCItem { id: number; descricao: string; quantidade: number; unidade: string; fabricante?: string; part_number?: string; }
interface SC { id: number; numero: string; destino: string; veiculo_frota?: string; urgencia: string; status: string; motivo?: string; ordem_servico?: string; solicitante?: { nome: string }; itens: SCItem[]; criado_em: string; data_necessaria?: string; }

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5";

const STARS = [1, 2, 3, 4, 5];

export default function FilaCotacao() {
  const toast = useToast();
  const [lista, setLista] = useState<SC[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel]   = useState<SC | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [stars, setStars] = useState(0);
  const [cotacao, setCotacao] = useState({
    cotacao_fornecedor: "", cotacao_fornecedor_telefone: "",
    cotacao_fornecedor_email: "", valor_cotado: "",
  });

  const carregar = useCallback(() => {
    setLoading(true);
    api.sc.list("status=pendente")
      .then(pendentes => {
        return api.sc.list("status=cotando").then(cotando => [
          ...(Array.isArray(pendentes) ? pendentes : []),
          ...(Array.isArray(cotando)   ? cotando   : []),
        ]);
      })
      .then(r => setLista(r as SC[]))
      .catch(() => toast.error("Erro ao carregar fila."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirCotacao = (sc: SC) => {
    setSel(sc);
    setCotacao({ cotacao_fornecedor:"", cotacao_fornecedor_telefone:"", cotacao_fornecedor_email:"", valor_cotado:"" });
    setStars(0);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    if (!cotacao.cotacao_fornecedor.trim()) { toast.error("Nome do fornecedor é obrigatório."); return; }
    if (!cotacao.valor_cotado || Number(cotacao.valor_cotado) <= 0) { toast.error("Informe o valor cotado."); return; }
    setSalvando(true);
    try {
      await api.sc.cotacao(sel.id, { ...cotacao, valor_cotado: Number(cotacao.valor_cotado) });
      toast.success(`Cotação da ${sel.numero} registrada!`);
      setSel(null);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar cotação.");
    } finally { setSalvando(false); }
  };

  const setCot = (k: keyof typeof cotacao) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCotacao(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Fila de Cotação" subtitle="SCs aguardando cotação do Suprimentos" />

      {loading ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400">Carregando...</div>
      ) : lista.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
          <span className="text-4xl block mb-3">✅</span>
          <p className="font-bold text-slate-600">Fila vazia — nenhuma SC aguardando cotação.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(sc => (
            <div key={sc.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-mono font-black text-slate-800">{sc.numero}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COR[sc.urgencia] ?? "bg-slate-100 text-slate-600"}`}>{sc.urgencia}</span>
                  <span className="text-[10px] text-slate-400">{sc.criado_em}</span>
                  {sc.status === "cotando" && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">Em cotação</span>}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                  <span>🏷 <b>{sc.destino}</b>{sc.veiculo_frota ? ` — ${sc.veiculo_frota}` : ""}</span>
                  <span>👤 {sc.solicitante?.nome}</span>
                  {sc.ordem_servico && <span>📋 {sc.ordem_servico}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sc.itens.map((it, i) => (
                    <span key={it.id} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                      {i + 1}. {it.descricao} — {it.quantidade} {it.unidade}
                      {it.part_number ? ` (${it.part_number})` : ""}
                    </span>
                  ))}
                </div>
                {sc.motivo && <p className="text-[11px] text-slate-400 mt-2 italic">"{sc.motivo}"</p>}
              </div>
              <button onClick={() => abrirCotacao(sc)}
                className="shrink-0 px-4 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all">
                Cotar →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal cotação */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSel(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Registrar Cotação</p>
                  <h3 className="text-lg font-black text-slate-800">{sel.numero}</h3>
                </div>
                <button onClick={() => setSel(null)} className="text-slate-400 hover:text-slate-700 text-2xl">×</button>
              </div>
            </div>
            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              {/* Itens resumo */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens</p>
                {sel.itens.map(it => (
                  <div key={it.id} className="text-xs text-slate-700 flex justify-between">
                    <span>{it.descricao}</span>
                    <span className="text-slate-400">{it.quantidade} {it.unidade}</span>
                  </div>
                ))}
              </div>

              <div>
                <label className={lbl}>Fornecedor *</label>
                <input value={cotacao.cotacao_fornecedor} onChange={setCot("cotacao_fornecedor")} placeholder="Nome do fornecedor" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Telefone</label>
                  <input value={cotacao.cotacao_fornecedor_telefone} onChange={setCot("cotacao_fornecedor_telefone")} placeholder="(XX) XXXXX-XXXX" className={inp} />
                </div>
                <div>
                  <label className={lbl}>E-mail</label>
                  <input type="email" value={cotacao.cotacao_fornecedor_email} onChange={setCot("cotacao_fornecedor_email")} placeholder="fornecedor@email.com" className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Valor total cotado (R$) *</label>
                <input type="number" min={0} step={0.01} value={cotacao.valor_cotado} onChange={setCot("valor_cotado")} placeholder="0,00" className={inp} />
              </div>

              {/* Avaliação por estrelas */}
              <div>
                <label className={lbl}>Avaliação do fornecedor</label>
                <div className="flex gap-2">
                  {STARS.map(s => (
                    <button key={s} type="button" onClick={() => setStars(s)}
                      className={`text-2xl transition-transform hover:scale-125 ${stars >= s ? "text-amber-400" : "text-slate-200"}`}>
                      ★
                    </button>
                  ))}
                  {stars > 0 && <span className="text-xs text-slate-400 self-center ml-1">{stars}/5</span>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setSel(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 disabled:opacity-60">
                  {salvando ? "Salvando..." : "Encaminhar para Aprovação →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
