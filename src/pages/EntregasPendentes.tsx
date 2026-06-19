import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatDate, today } from "@/utils/formatters";
import type { Delivery } from "@/types";
import { CheckCircle, Clock } from "lucide-react";

export default function EntregasPendentes() {
  const toast = useToast();
  const [entregas, setEntregas] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [confirmadoPor, setConfirmadoPor] = useState("");
  const [filtroEquipe, setFiltroEquipe] = useState("");

  const carregar = () => {
    setLoading(true);
    api.entregas.list("status=PENDENTE").then((r) => {
      const d = (r as { data: Delivery[] }).data ?? [];
      setEntregas(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar as entregas."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const confirmar = async (id: number) => {
    if (!confirmadoPor.trim()) { toast.error("Informe quem confirmou o recebimento."); return; }
    try {
      await api.entregas.confirm(id, { confirmado_por: confirmadoPor, data_confirmacao: today() });
      toast.success("Entrega confirmada com sucesso!");
      setConfirmando(null); setConfirmadoPor("");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível confirmar a entrega.");
    }
  };

  const diasAtraso = (data_saida: string) => {
    const diff = Date.now() - new Date(data_saida).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const filtered = entregas.filter((e) =>
    !filtroEquipe || (e.nome_equipe || e.equipe || "").toLowerCase().includes(filtroEquipe.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Entregas Pendentes" subtitle="Confirmação de recebimento em campo" />

        {filtered.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 font-medium">
            <Clock size={15} className="text-amber-500 shrink-0" />
            {filtered.length} entrega(s) aguardando confirmação de recebimento.
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Filtrar por equipe</label>
          <input value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} placeholder="Nome da equipe..."
            className="w-full md:w-72 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
        </div>

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">Carregando entregas...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">Nenhuma entrega pendente.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => {
              const atraso = diasAtraso(e.data_saida);
              const atrasado = atraso > 3;
              return (
                <div key={e.id} className={`bg-white border rounded-xl p-5 shadow-sm ${atrasado ? "border-amber-200" : "border-slate-100"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-[#EA6C0A] text-xs">{e.numero_pedido}</span>
                        {atrasado && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{atraso}d de atraso</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800">{e.nome_equipe || e.equipe}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500">
                        <span>Saída: {formatDate(e.data_saida)}</span>
                        <span>Entregador: {e.entregador}</span>
                        <span>Almox.: {e.almoxarifado}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(e.itens ?? []).map((it, i) => (
                          <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                            {it.nome} ({it.qtd} {it.unid})
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {confirmando === e.id ? (
                        <div className="flex flex-col gap-2 items-end">
                          <input value={confirmadoPor} onChange={(x) => setConfirmadoPor(x.target.value)}
                            placeholder="Confirmado por..."
                            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] w-48" />
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmando(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={() => e.id !== undefined && confirmar(e.id)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">Confirmar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setConfirmando(e.id ?? null); setConfirmadoPor(""); }}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">
                          <CheckCircle size={13} /> Confirmar Entrega
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
