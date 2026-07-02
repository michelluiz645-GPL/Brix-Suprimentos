import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { User } from "@/types";
import NovaSC from "./NovaSC";

const STATUS_LABEL: Record<string, string> = {
  pendente:"Pendente", cotando:"Cotando", aguardando_aprovacao_mnt:"Ag. Aprov. Mnt",
  aguardando_aprovacao_sup:"Ag. Aprov. Sup", aprovado:"Aprovado",
  comprado:"Comprado", em_transito:"Em Trânsito", concluido:"Concluído", rejeitado:"Rejeitado",
};
const STATUS_COR: Record<string, string> = {
  pendente:"bg-slate-100 text-slate-600", cotando:"bg-blue-100 text-blue-700",
  aguardando_aprovacao_mnt:"bg-amber-100 text-amber-700", aguardando_aprovacao_sup:"bg-amber-100 text-amber-800",
  aprovado:"bg-emerald-100 text-emerald-700", comprado:"bg-indigo-100 text-indigo-700",
  em_transito:"bg-sky-100 text-sky-700", concluido:"bg-green-100 text-green-800",
  rejeitado:"bg-rose-100 text-rose-700",
};
const URG_COR: Record<string, string> = {
  Baixa:"bg-green-100 text-green-700", Média:"bg-amber-100 text-amber-700",
  Alta:"bg-orange-100 text-orange-700", Crítica:"bg-red-100 text-red-700",
};
const PROGRESSO: Record<string, number> = {
  pendente:10, cotando:25, aguardando_aprovacao_mnt:38, aguardando_aprovacao_sup:52,
  aprovado:65, comprado:78, em_transito:88, concluido:100, rejeitado:40,
};

interface SCItem { id: number; descricao: string; quantidade: number; unidade: string; fabricante?: string; part_number?: string; recebido: boolean; quantidade_recebida?: number; }
interface SC {
  id: number; numero: string; data_necessaria?: string;
  solicitante?: { nome: string; papel: string };
  destino: string; veiculo_frota?: string; urgencia: string; status: string;
  motivo?: string; ordem_servico?: string; local_entrega?: string;
  cotacao_fornecedor?: string; valor_cotado?: number; data_cotacao?: string;
  data_aprovacao_mnt?: string; aprovado_mnt_por?: string;
  data_aprovacao_sup?: string; aprovado_sup_por?: string;
  data_compra?: string; comprado_por?: string; previsao_entrega?: string;
  data_entrada?: string; entrada_por?: string;
  observacao_rejeicao?: string;
  itens: SCItem[];
  criado_em: string;
}

const fmtData = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const fmtMoeda = (v?: number) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const TIMELINE_STEPS = [
  { status: "pendente",               label: "SC aberta" },
  { status: "cotando",                label: "Cotação em andamento" },
  { status: "aguardando_aprovacao_mnt",label:"Ag. aprovação Manutenção" },
  { status: "aguardando_aprovacao_sup",label:"Ag. aprovação Suprimentos" },
  { status: "aprovado",               label: "Aprovado" },
  { status: "comprado",               label: "Comprado" },
  { status: "em_transito",            label: "Em trânsito" },
  { status: "concluido",              label: "Concluído" },
];

interface Props { user: User; }

export default function MeusPedidos({ user }: Props) {
  const toast = useToast();
  const [lista, setLista] = useState<SC[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaSC, setNovaSC] = useState(false);
  const [drawer, setDrawer] = useState<SC | null>(null);
  const [filtros, setFiltros] = useState({ sc: "", destino: "", dataIni: "", dataFim: "", urgencia: "", status: "" });

  const papel = user.papel ?? "";
  const podeNovaSC = ["op_manutencao", "admin_manutencao", "admin_geral"].includes(papel);

  const carregar = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filtros.status) p.set("status", filtros.status);
    api.sc.list(p.toString() || undefined)
      .then(r => setLista(Array.isArray(r) ? r as SC[] : []))
      .catch(() => { toast.error("Erro ao carregar pedidos."); setLista([]); })
      .finally(() => setLoading(false));
  }, [filtros.status]);

  useEffect(() => { carregar(); }, [carregar]);

  const setF = (k: keyof typeof filtros) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiltros(p => ({ ...p, [k]: e.target.value }));

  const filtradas = useMemo(() => lista.filter(sc => {
    if (filtros.sc      && !sc.numero.toLowerCase().includes(filtros.sc.toLowerCase())) return false;
    if (filtros.destino && sc.destino !== filtros.destino) return false;
    if (filtros.urgencia && sc.urgencia !== filtros.urgencia) return false;
    return true;
  }), [lista, filtros]);

  const kpis = useMemo(() => ({
    aberto:   filtradas.filter(s => ["pendente","cotando","aguardando_aprovacao_mnt","aguardando_aprovacao_sup","aprovado"].includes(s.status)).length,
    transito: filtradas.filter(s => ["comprado","em_transito"].includes(s.status)).length,
    concluido:filtradas.filter(s => s.status === "concluido").length,
    rejeitado:filtradas.filter(s => s.status === "rejeitado").length,
    total:    filtradas.length,
  }), [filtradas]);

  const chips = Object.entries(filtros).filter(([,v]) => v).map(([k, v]) => ({ k: k as keyof typeof filtros, v }));
  const inp = "px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]";

  const statusAtual = (sc: SC) => {
    if (sc.status === "rejeitado") return -1;
    return TIMELINE_STEPS.findIndex(s => s.status === sc.status);
  };

  if (novaSC) return <NovaSC user={user} onConcluir={() => { setNovaSC(false); carregar(); }} />;

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Meus Pedidos (SC)" subtitle="Solicitações de compra da equipe"
        action={podeNovaSC ? (
          <button onClick={() => setNovaSC(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all">
            + Nova SC
          </button>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label:"Em Aberto",   v:kpis.aberto,    cor:"text-amber-600",   bg:"bg-amber-50",   bdr:"border-amber-200" },
          { label:"Em Trânsito", v:kpis.transito,  cor:"text-sky-600",     bg:"bg-sky-50",     bdr:"border-sky-200" },
          { label:"Concluídos",  v:kpis.concluido, cor:"text-emerald-600", bg:"bg-emerald-50", bdr:"border-emerald-200" },
          { label:"Rejeitados",  v:kpis.rejeitado, cor:"text-rose-600",    bg:"bg-rose-50",    bdr:"border-rose-200" },
          { label:"Total",       v:kpis.total,     cor:"text-slate-700",   bg:"bg-white",      bdr:"border-slate-200" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.bdr} rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-2xl font-black ${k.cor}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <input value={filtros.sc} onChange={setF("sc")} placeholder="Nº SC" className={inp} />
          <select value={filtros.destino} onChange={setF("destino")} className={inp}>
            <option value="">Todos Destinos</option>
            {["Frota","Obra","Administração","Manutenção","Outros"].map(d=><option key={d}>{d}</option>)}
          </select>
          <input type="date" value={filtros.dataIni} onChange={setF("dataIni")} className={inp} />
          <input type="date" value={filtros.dataFim} onChange={setF("dataFim")} className={inp} />
          <select value={filtros.urgencia} onChange={setF("urgencia")} className={inp}>
            <option value="">Todas Urgências</option>
            {["Baixa","Média","Alta","Crítica"].map(u=><option key={u}>{u}</option>)}
          </select>
          <select value={filtros.status} onChange={setF("status")} className={inp}>
            <option value="">Todos Status</option>
            {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            {chips.map(c => (
              <span key={c.k} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-full">
                {c.v}
                <button onClick={() => setFiltros(p => ({ ...p, [c.k]: "" }))} className="hover:text-rose-500 ml-0.5">×</button>
              </span>
            ))}
            <button onClick={() => setFiltros({ sc:"",destino:"",dataIni:"",dataFim:"",urgencia:"",status:"" })}
              className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold">Limpar tudo</button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <span className="text-[11px] text-slate-500">Exibindo <b>{filtradas.length}</b> de <b>{lista.length}</b> pedidos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Nº SC","Data Necessária","Destino","Solicitante","Itens","Urgência","Status","Progresso",""].map(h => (
                  <th key={h} className="p-3 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-400">Carregando...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-400">
                  {podeNovaSC ? <><span>Nenhuma SC encontrada. </span><button onClick={() => setNovaSC(true)} className="text-[#EA6C0A] font-bold hover:underline">Abrir nova SC →</button></> : "Nenhuma SC encontrada."}
                </td></tr>
              ) : filtradas.map(sc => {
                const pct = PROGRESSO[sc.status] ?? 0;
                return (
                  <tr key={sc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{sc.numero}</td>
                    <td className="p-3 text-slate-600">{fmtData(sc.data_necessaria)}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{sc.destino}</span>
                      {sc.veiculo_frota && <span className="block text-[10px] text-slate-400">{sc.veiculo_frota}</span>}
                    </td>
                    <td className="p-3 text-slate-600">{sc.solicitante?.nome ?? "—"}</td>
                    <td className="p-3 text-center font-bold text-slate-700">{sc.itens.length}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COR[sc.urgencia] ?? "bg-slate-100 text-slate-600"}`}>{sc.urgencia}</span></td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[sc.status] ?? "bg-slate-100 text-slate-600"}`}>{STATUS_LABEL[sc.status] ?? sc.status}</span></td>
                    <td className="p-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${sc.status === "concluido" ? "bg-emerald-500" : sc.status === "rejeitado" ? "bg-rose-400" : "bg-[#EA6C0A]"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-8">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <button onClick={() => setDrawer(sc)} className="text-[#2563EB] hover:text-[#EA6C0A] text-[11px] font-bold">Ver →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(null)} />
          <div className="relative bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-[#0F172A] p-5 text-white shrink-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Solicitação de Compra</p>
                  <h2 className="text-xl font-black font-mono mt-0.5">{drawer.numero}</h2>
                </div>
                <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-white text-2xl">×</button>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COR[drawer.urgencia] ?? ""}`}>{drawer.urgencia}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[drawer.status] ?? ""}`}>{STATUS_LABEL[drawer.status]}</span>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1"><span>Progresso</span><span>{PROGRESSO[drawer.status] ?? 0}%</span></div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${drawer.status === "concluido" ? "bg-emerald-500" : drawer.status === "rejeitado" ? "bg-rose-400" : "bg-[#EA6C0A]"}`}
                    style={{ width: `${PROGRESSO[drawer.status] ?? 0}%` }} />
                </div>
              </div>
            </div>

            {/* Detalhes */}
            <div className="p-5 space-y-3 border-b border-slate-100">
              {[
                ["Solicitante", drawer.solicitante?.nome],
                ["Destino", `${drawer.destino}${drawer.veiculo_frota ? ` — ${drawer.veiculo_frota}` : ""}`],
                ["Data necessária", fmtData(drawer.data_necessaria)],
                ["Local entrega", drawer.local_entrega],
                ["OS / EAP", drawer.ordem_servico],
              ].filter(([,v]) => v).map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-bold text-slate-800 text-right max-w-[60%]">{v}</span>
                </div>
              ))}

              {/* Cotação */}
              {drawer.cotacao_fornecedor && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cotação</p>
                  {[
                    ["Fornecedor", drawer.cotacao_fornecedor],
                    ["Valor", fmtMoeda(drawer.valor_cotado)],
                    ["Data", drawer.data_cotacao],
                  ].map(([k,v]) => (
                    <div key={String(k)} className="flex justify-between text-sm">
                      <span className="text-slate-400">{k}</span>
                      <span className="font-bold text-slate-800">{v ?? "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Rejeição */}
              {drawer.observacao_rejeicao && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mt-2">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Motivo da rejeição</p>
                  <p className="text-xs text-rose-700">{drawer.observacao_rejeicao}</p>
                </div>
              )}

              {/* Itens */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens ({drawer.itens.length})</p>
                <div className="space-y-2">
                  {drawer.itens.map((it, i) => (
                    <div key={it.id} className={`flex justify-between items-start text-xs rounded-lg px-3 py-2 ${it.recebido ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"}`}>
                      <div>
                        <span className="font-medium text-slate-800">{i + 1}. {it.descricao}</span>
                        {it.fabricante && <span className="block text-[10px] text-slate-400">{it.fabricante} {it.part_number ? `— ${it.part_number}` : ""}</span>}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="font-bold text-slate-600">{it.quantidade} {it.unidade}</span>
                        {it.recebido && <span className="block text-[10px] text-emerald-600 font-bold">✓ Recebido: {it.quantidade_recebida}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-5 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Linha do Tempo</p>
              <div className="relative">
                {TIMELINE_STEPS.map((step, i) => {
                  const idx = statusAtual(drawer);
                  const isRejeitado = drawer.status === "rejeitado";
                  let estado: "concluido" | "atual" | "futuro" | "rejeitado" = "futuro";
                  if (isRejeitado && i === idx) estado = "rejeitado";
                  else if (i < idx || drawer.status === "concluido") estado = "concluido";
                  else if (i === idx) estado = "atual";
                  const isLast = i === TIMELINE_STEPS.length - 1;
                  return (
                    <div key={step.status} className="flex gap-4">
                      {!isLast && <div className="absolute left-[11px] w-0.5 bg-slate-100" style={{ top: `${i * 52 + 24}px`, height: "40px" }} />}
                      <div className="shrink-0 mt-1 relative z-10">
                        {estado === "concluido"  && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>}
                        {estado === "atual"      && <div className="w-6 h-6 rounded-full bg-[#EA6C0A] flex items-center justify-center text-white text-[10px] font-black">▶</div>}
                        {estado === "rejeitado"  && <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center text-white text-[10px] font-black">✕</div>}
                        {estado === "futuro"     && <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white" />}
                      </div>
                      <div className={`pb-10 flex-1 ${estado === "futuro" ? "opacity-30" : ""}`}>
                        <p className={`text-sm font-bold ${estado === "rejeitado" ? "text-rose-600" : estado === "atual" ? "text-[#EA6C0A]" : "text-slate-800"}`}>{step.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
