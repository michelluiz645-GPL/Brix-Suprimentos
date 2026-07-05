import React, { useState, useMemo, useEffect, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { api } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { ResponsabilidadePedidoOrcamento } from "@/types";
import ComparativoCotacao, { type Fornecedor, type ItemComparativo } from "./PedidosOrcamento/ComparativoCotacao";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Urgencia    = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
type Status      =
  | "PENDENTE" | "COTANDO" | "AGUARDANDO_APROVACAO_MANUTENCAO" | "AGUARDANDO_APROVACAO_COMPRA"
  | "APROVADO" | "EM_TRANSITO" | "CONCLUIDO" | "REJEITADO";
type TipoDestino = "FROTA" | "OBRA" | "EQUIPAMENTO";
type TipoAcao    = "aprovar_compra" | "rejeitar" | "comprar" | "receber" | null;

interface Item { descricao: string; quantidade: number; unidade: string; }
interface TimelineStep {
  titulo: string; subtitulo: string; data?: string | null;
  estado: "concluido" | "atual" | "rejeitado" | "futuro";
}
interface Pedido {
  id: number; numero_sc: string; data: string;
  setor: string; destino: string; tipo_destino: TipoDestino;
  urgencia: Urgencia; status: Status;
  itens: Item[]; valor_total: number; solicitante: string;
  timeline: TimelineStep[];
  cotado_por?: string | null;
  cotacao_fornecedores?: Fornecedor[] | null;
  cotacao_itens?: ItemComparativo[] | null;
  aprovado_manutencao_por?: string | null;
  fornecedor_escolhido?: string | null;
  prazo_entrega_escolhido?: string | null;
  forma_pagamento_escolhida?: string | null;
  aprovado_compra_por?: string | null;
  comprado_por?: string | null;
  data_prevista_recebimento?: string | null;
  recebido_por?: string | null;
  motivo_rejeicao?: string | null;
}
interface Props {
  user: { login: string; nome: string; nivel: string; papel?: string; responsabilidades?: Record<string, string[]> };
  setor: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const UNIDADES = ["Un","Kg","Lt","Cx","Mt","Par","Jg","Rolo","Pç","Gl","Balde","Saco"];
const FROTAS   = ["PC200 - Escavadeira","WA320 - Pá Carregadeira","D6T - Motoniveladora","GD825 - Motoniveladora","CAT 140 - Motoniveladora","WA500 - Pá Carregadeira","PC360 - Escavadeira","D8T - Trator de Esteira"];
const EQUIPAMENTOS_LIST = ["Gerador 180kVA","Compressor de Ar 250L","Bomba de Concreto","Rolo Compactador","Vibrador de Concreto","Serra Circular","Andaime Tubular"];
const ITEM_VAZIO: Item = { descricao: "", quantidade: 1, unidade: "Un" };

const RESPONSABILIDADES_TODAS: ResponsabilidadePedidoOrcamento[] = [
  "solicitante", "cotador", "aprovador_manutencao", "aprovador_suprimentos", "comprador",
];

const STATUS_LABEL: Record<Status, string> = {
  PENDENTE:"Pendente", COTANDO:"Cotando",
  AGUARDANDO_APROVACAO_MANUTENCAO:"Ag. Aprov. Manutenção", AGUARDANDO_APROVACAO_COMPRA:"Ag. Aprov. Compra",
  APROVADO:"Compra Aprovada", EM_TRANSITO:"Em Trânsito", CONCLUIDO:"Concluído", REJEITADO:"Rejeitado",
};
const STATUS_COLOR: Record<Status, string> = {
  PENDENTE:"bg-slate-100 text-slate-600", COTANDO:"bg-blue-100 text-blue-700",
  AGUARDANDO_APROVACAO_MANUTENCAO:"bg-amber-100 text-amber-700", AGUARDANDO_APROVACAO_COMPRA:"bg-amber-100 text-amber-700",
  APROVADO:"bg-emerald-100 text-emerald-700",
  EM_TRANSITO:"bg-indigo-100 text-indigo-700", CONCLUIDO:"bg-green-100 text-green-800",
  REJEITADO:"bg-red-100 text-red-700",
};
const URG_COLOR: Record<Urgencia, string> = {
  CRITICA:"bg-red-100 text-red-700", ALTA:"bg-orange-100 text-orange-700",
  MEDIA:"bg-amber-100 text-amber-700", BAIXA:"bg-green-100 text-green-800",
};
const PROGRESSO: Record<Status, number> = {
  PENDENTE:8, COTANDO:22, AGUARDANDO_APROVACAO_MANUTENCAO:38, AGUARDANDO_APROVACAO_COMPRA:52,
  APROVADO:65, EM_TRANSITO:82, CONCLUIDO:100, REJEITADO:40,
};

const STATUS_DA_ABA: Record<string, Status[]> = {
  "Solicitações":       [],
  "Recebidas":          ["PENDENTE"],
  "Em Cotação":         ["COTANDO"],
  "Aprovar Orçamento":  ["AGUARDANDO_APROVACAO_MANUTENCAO"],
  "Aprovar Compra":     ["AGUARDANDO_APROVACAO_COMPRA"],
  "Aprovadas":          ["APROVADO"],
  "Em Trânsito":        ["EM_TRANSITO"],
  "Concluído":          ["CONCLUIDO"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (iso: string) => { const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };
const fmtMoeda = (v: number)   => v.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const todayISO = ()             => new Date().toISOString().slice(0, 10);
const barColor = (s: Status) =>
  s === "CONCLUIDO" ? "bg-emerald-500" : s === "REJEITADO" ? "bg-red-500" : "bg-[#EA6C0A]";

const LS_KEY = "geplan_pedidos_orcamento";
const lsCarregar = (): Pedido[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
};
const lsSalvar = (lista: Pedido[]) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(lista)); } catch { /* sem espaço */ }
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PedidosOrcamento({ user, setor }: Props) {
  const papel = user.papel ?? (
    setor === "MANUTENCAO"  ? "op_manutencao" :
    setor === "ALMOXARIFADO"? "almoxarife"     : "op_suprimentos"
  );
  const nivelAdmin = (user as { nivel?: string }).nivel === "ADMIN";
  const minhasResp = useMemo(() => new Set(
    nivelAdmin ? RESPONSABILIDADES_TODAS : (user.responsabilidades?.pedido_orcamento ?? [])
  ), [nivelAdmin, user.responsabilidades]);
  const temResp = useCallback((r: ResponsabilidadePedidoOrcamento) => minhasResp.has(r), [minhasResp]);

  // "Confirmar Recebimento" continua gated por papel/setor, como já era.
  const podeConfirmarRecebimento = papel === "op_manutencao" || papel === "admin_manutencao" || papel === "almoxarife" || papel === "admin_geral";

  // Pendentes/Aprovadas/Em Trânsito/Concluído são um painel geral, somente
  // leitura, visível para qualquer um com acesso ao módulo — só as filas de
  // ação (Em Cotação, Aprovar Orçamento, Aprovar Compra) continuam restritas
  // a quem tem a responsabilidade correspondente.
  const abas = useMemo(() => {
    const lista: string[] = [];
    if (temResp("solicitante"))           lista.push("Solicitações");
    lista.push("Recebidas");
    if (temResp("cotador"))                lista.push("Em Cotação");
    if (temResp("aprovador_manutencao"))    lista.push("Aprovar Orçamento");
    if (temResp("aprovador_suprimentos"))   lista.push("Aprovar Compra");
    lista.push("Aprovadas", "Em Trânsito", "Concluído");
    return lista;
  }, [temResp]);

  const toast = useToast();
  const [pedidos,  setPedidos]  = useState<Pedido[]>(lsCarregar);
  const [loading,  setLoading]  = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState(abas[0]);
  const [drawer,   setDrawer]   = useState<Pedido | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [acaoModal,  setAcaoModal]  = useState<{ pedido: Pedido; tipo: TipoAcao } | null>(null);
  const [acaoValor,  setAcaoValor]  = useState("");
  const [comparativoModal, setComparativoModal] = useState<{ pedido: Pedido; modo: "editar" | "aprovar" | "visualizar" } | null>(null);
  const [filtroBusca,   setFiltroBusca]   = useState("");
  const [filtroDataDe,  setFiltroDataDe]  = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");

  const [form, setForm] = useState({
    urgencia: "MEDIA" as Urgencia, tipo_destino: "FROTA" as TipoDestino,
    destino: "", itens: [{ ...ITEM_VAZIO }] as Item[],
  });

  const carregar = useCallback(() => {
    setLoading(true);
    api.pedidosOrcamento.list()
      .then(r => {
        const lista = Array.isArray(r) ? r as Pedido[] : [];
        setPedidos(lista);
        lsSalvar(lista);
      })
      .catch(() => {
        // mantém o que está no localStorage — não apaga os dados da tela
        const cache = lsCarregar();
        if (cache.length > 0) setPedidos(cache);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Suprimentos (Almoxarifado) atende pedidos de todos os setores solicitantes
  // — só quem está vendo a partir de um setor solicitante (Manutenção, e no
  // futuro Engenharia) fica restrito a enxergar apenas os pedidos do próprio
  // setor.
  const pedidosVisiveis = useMemo(
    () => setor === "ALMOXARIFADO" ? pedidos : pedidos.filter(p => p.setor === setor),
    [pedidos, setor]
  );

  // Lista-base de uma aba, antes dos filtros de busca/data. Em "Solicitações",
  // quem só tem a responsabilidade de solicitante acompanha suas próprias
  // solicitações em qualquer status (do PENDENTE ao CONCLUIDO/REJEITADO);
  // quem também tem outra responsabilidade já vê a fila inteira por padrão.
  const baseParaAba = useCallback((aba: string): Pedido[] => {
    if (aba === "Solicitações") {
      const apenasSolicitante = temResp("solicitante") && !nivelAdmin &&
        !temResp("cotador") && !temResp("aprovador_manutencao") && !temResp("aprovador_suprimentos") && !temResp("comprador");
      return apenasSolicitante ? pedidosVisiveis.filter(p => p.solicitante === user.nome) : pedidosVisiveis;
    }
    const statusFiltro = STATUS_DA_ABA[aba] ?? [];
    return pedidosVisiveis.filter(p => statusFiltro.includes(p.status));
  }, [pedidosVisiveis, temResp, nivelAdmin, user.nome]);

  // Busca por frota/obra/equipamento (destino) ou nº da SC, e filtro por período
  const aplicarFiltros = useCallback((lista: Pedido[]) => {
    let r = lista;
    if (filtroBusca.trim()) {
      const q = filtroBusca.trim().toLowerCase();
      r = r.filter(p => p.destino.toLowerCase().includes(q) || p.numero_sc.toLowerCase().includes(q));
    }
    if (filtroDataDe)  r = r.filter(p => p.data >= filtroDataDe);
    if (filtroDataAte) r = r.filter(p => p.data <= filtroDataAte);
    return r;
  }, [filtroBusca, filtroDataDe, filtroDataAte]);

  const pedidosAba = useMemo(
    () => aplicarFiltros(baseParaAba(abaAtiva)),
    [baseParaAba, abaAtiva, aplicarFiltros]
  );

  // Badge de contagem por aba (já considerando os filtros ativos)
  const contagem = useCallback(
    (aba: string) => aplicarFiltros(baseParaAba(aba)).length,
    [baseParaAba, aplicarFiltros]
  );

  // KPIs globais (já restritos ao setor de quem está vendo)
  const kpis = useMemo(() => ({
    pendentes:  pedidosVisiveis.filter(p => p.status === "PENDENTE").length,
    cotando:    pedidosVisiveis.filter(p => p.status === "COTANDO").length,
    aprovacao:  pedidosVisiveis.filter(p => p.status === "AGUARDANDO_APROVACAO_MANUTENCAO" || p.status === "AGUARDANDO_APROVACAO_COMPRA").length,
    transito:   pedidosVisiveis.filter(p => p.status === "EM_TRANSITO").length,
  }), [pedidosVisiveis]);

  // Executa uma chamada de API de transição e atualiza a lista com o retorno do servidor
  const executarAcao = useCallback(async (chamada: () => Promise<unknown>) => {
    setSalvando(true);
    try {
      const salvo = await chamada() as Pedido;
      setPedidos(prev => {
        const nova = prev.map(p => p.id === salvo.id ? salvo : p);
        lsSalvar(nova);
        return nova;
      });
      setDrawer(d => d?.id === salvo.id ? salvo : d);
      setAcaoModal(null);
      setAcaoValor("");
      setComparativoModal(null);
      toast.success("Status atualizado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar pedido.");
    } finally { setSalvando(false); }
  }, [toast]);

  // Confirma ação do modal
  const confirmarAcao = async () => {
    if (!acaoModal) return;
    const { pedido, tipo } = acaoModal;
    if (tipo === "aprovar_compra") {
      await executarAcao(() => api.pedidosOrcamento.aprovarCompra(pedido.id));
    } else if (tipo === "rejeitar") {
      if (!acaoValor.trim()) { toast.error("Informe o motivo da rejeição."); return; }
      await executarAcao(() => api.pedidosOrcamento.rejeitar(pedido.id, { motivo: acaoValor }));
    } else if (tipo === "comprar") {
      if (!acaoValor) { toast.error("Informe a data prevista de recebimento."); return; }
      await executarAcao(() => api.pedidosOrcamento.registrarCompra(pedido.id, { data_prevista_recebimento: acaoValor }));
    } else if (tipo === "receber") {
      await executarAcao(() => api.pedidosOrcamento.confirmarRecebimento(pedido.id));
    }
  };

  // Formulário — nova solicitação
  const addItem    = () => setForm(p => ({ ...p, itens: [...p.itens, { ...ITEM_VAZIO }] }));
  const removeItem = (i: number) => setForm(p => ({ ...p, itens: p.itens.filter((_, idx) => idx !== i) }));
  const setItem    = (i: number, k: keyof Item, v: string | number) =>
    setForm(p => ({ ...p, itens: p.itens.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));

  const handleCriar = async () => {
    if (!form.destino.trim()) { toast.error("Selecione o destino do pedido."); return; }
    const invalido = form.itens.findIndex(i => !i.descricao.trim() || i.quantidade <= 0);
    if (invalido >= 0) { toast.error(`Item ${invalido + 1}: preencha a descrição e quantidade.`); return; }
    setSalvando(true);
    try {
      await api.pedidosOrcamento.create({
        data: todayISO(), setor: "MANUTENCAO",
        destino: form.destino, tipo_destino: form.tipo_destino,
        urgencia: form.urgencia, itens: form.itens,
      });
      await carregar();
      setShowForm(false);
      setForm({ urgencia: "MEDIA", tipo_destino: "FROTA", destino: "", itens: [{ ...ITEM_VAZIO }] });
      toast.success("Solicitação enviada para o Suprimentos!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar solicitação.");
    } finally { setSalvando(false); }
  };

  // Botões de ação por responsabilidade + status (usados na listagem e no drawer)
  const renderBotoes = (p: Pedido, tamanho: "sm" | "md" = "sm") => {
    const cls = tamanho === "md"
      ? "px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
      : "px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60";

    const btnModal = (label: string, tipo: TipoAcao, cor: string) => (
      <button key={label} disabled={salvando}
        onClick={() => { setAcaoModal({ pedido: p, tipo }); setAcaoValor(""); }}
        className={`${cls} ${cor}`}>
        {label}
      </button>
    );
    const btnDireto = (label: string, chamada: () => Promise<unknown>, cor: string) => (
      <button key={label} disabled={salvando}
        onClick={() => executarAcao(chamada)}
        className={`${cls} ${cor}`}>
        {label}
      </button>
    );
    const btnComparativo = (label: string, modo: "editar" | "aprovar", cor: string) => (
      <button key={label} disabled={salvando}
        onClick={() => setComparativoModal({ pedido: p, modo })}
        className={`${cls} ${cor}`}>
        {label}
      </button>
    );

    const acoes: React.ReactNode[] = [];

    if (temResp("cotador") && p.status === "PENDENTE")
      acoes.push(btnDireto("Iniciar Cotação", () => api.pedidosOrcamento.iniciarCotacao(p.id), "bg-blue-600 hover:bg-blue-700"));
    if (temResp("cotador") && p.status === "COTANDO")
      acoes.push(btnComparativo("Preencher Cotação", "editar", "bg-amber-500 hover:bg-amber-600"));
    if (temResp("aprovador_manutencao") && p.status === "AGUARDANDO_APROVACAO_MANUTENCAO") {
      acoes.push(btnComparativo("Aprovar Orçamento", "aprovar", "bg-emerald-600 hover:bg-emerald-700"));
      acoes.push(btnModal("Rejeitar", "rejeitar", "bg-red-500 hover:bg-red-600"));
    }
    if (temResp("aprovador_suprimentos") && p.status === "AGUARDANDO_APROVACAO_COMPRA") {
      acoes.push(btnModal("Aprovar Compra", "aprovar_compra", "bg-emerald-600 hover:bg-emerald-700"));
      acoes.push(btnModal("Rejeitar", "rejeitar", "bg-red-500 hover:bg-red-600"));
    }
    if (temResp("comprador") && p.status === "APROVADO")
      acoes.push(btnModal("Registrar Compra", "comprar", "bg-indigo-600 hover:bg-indigo-700"));
    if (podeConfirmarRecebimento && p.status === "EM_TRANSITO")
      acoes.push(btnModal("Confirmar Recebimento", "receber", "bg-emerald-600 hover:bg-emerald-700"));

    return acoes.length ? <div className="flex flex-wrap gap-2">{acoes}</div> : null;
  };

  const inp = "w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]";

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      <PageHeader
        title="Pedidos de Orçamento"
        subtitle="Fluxo completo: Solicitação → Cotação → Aprovação Manutenção → Aprovação Compra → Compra → Recebimento"
        action={temResp("solicitante") ? (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all">
            + Nova Solicitação
          </button>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Pendentes",     valor:kpis.pendentes,  cor:"text-slate-600",  bg:"bg-slate-50",  bdr:"border-slate-200" },
          { label:"Em Cotação",    valor:kpis.cotando,    cor:"text-blue-600",   bg:"bg-blue-50",   bdr:"border-blue-200"  },
          { label:"Ag. Aprovação", valor:kpis.aprovacao,  cor:"text-amber-600",  bg:"bg-amber-50",  bdr:"border-amber-200" },
          { label:"Em Trânsito",   valor:kpis.transito,   cor:"text-indigo-600", bg:"bg-indigo-50", bdr:"border-indigo-200"},
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.bdr} rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-2xl font-black ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros de busca */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-100 rounded-xl p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Buscar (frota, obra, equipamento ou nº da SC)</label>
          <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
            placeholder="Ex: PC200, Obra BR-153, SC-ORC-2026-0001" className={inp} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">De</label>
          <input type="date" value={filtroDataDe} onChange={e => setFiltroDataDe(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Até</label>
          <input type="date" value={filtroDataAte} onChange={e => setFiltroDataAte(e.target.value)} className={inp} />
        </div>
        {(filtroBusca || filtroDataDe || filtroDataAte) && (
          <button onClick={() => { setFiltroBusca(""); setFiltroDataDe(""); setFiltroDataAte(""); }}
            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-2">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Abas + Lista */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">

        {/* Barra de abas */}
        <div className="border-b border-slate-100 flex overflow-x-auto">
          {abas.map(aba => {
            const cnt = contagem(aba);
            return (
              <button key={aba} onClick={() => setAbaAtiva(aba)}
                className={`px-5 py-3.5 text-xs font-bold whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${
                  abaAtiva === aba
                    ? "border-[#EA6C0A] text-[#EA6C0A]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}>
                {aba}
                {cnt > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                    abaAtiva === aba ? "bg-[#EA6C0A] text-white" : "bg-slate-100 text-slate-500"
                  }`}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da aba */}
        <div className="p-4">
          {loading ? (
            <p className="text-center py-12 text-slate-400 text-xs">Carregando pedidos...</p>
          ) : pedidosAba.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 text-sm font-semibold">Fila vazia</p>
              <p className="text-slate-300 text-xs mt-1">
                {abaAtiva === "Solicitações"
                  ? "Clique em + Nova Solicitação para abrir um pedido."
                  : "Nenhum pedido aguardando nesta etapa."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosAba.map(p => (
                <div key={p.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono font-black text-slate-800 text-sm">{p.numero_sc}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${URG_COLOR[p.urgencia]}`}>
                          {p.urgencia.charAt(0)+p.urgencia.slice(1).toLowerCase()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate">{p.destino}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {p.solicitante} · {fmtDate(p.data)} · {p.itens.length} {p.itens.length === 1 ? "item" : "itens"}
                        {p.valor_total > 0 ? ` · ${fmtMoeda(p.valor_total)}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor(p.status)}`} style={{ width:`${PROGRESSO[p.status]}%` }}/>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{PROGRESSO[p.status]}%</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button onClick={() => setDrawer(p)}
                        className="text-[11px] font-bold text-blue-600 hover:text-[#EA6C0A] transition-colors whitespace-nowrap">
                        Ver detalhes →
                      </button>
                      {renderBotoes(p, "sm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nova Solicitação */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nova Solicitação de Orçamento" size="lg">
        <div className="space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Urgência</label>
              <select value={form.urgencia} onChange={e => setForm(p => ({ ...p, urgencia:e.target.value as Urgencia }))} className={inp}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo de Destino</label>
              <select value={form.tipo_destino} onChange={e => setForm(p => ({ ...p, tipo_destino:e.target.value as TipoDestino, destino:"" }))} className={inp}>
                <option value="FROTA">Frota / Equipamento de campo</option>
                <option value="OBRA">Obra</option>
                <option value="EQUIPAMENTO">Equipamento interno</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              {form.tipo_destino === "FROTA" ? "Selecionar Frota" : form.tipo_destino === "OBRA" ? "Nome da Obra" : "Selecionar Equipamento"}
            </label>
            {form.tipo_destino === "OBRA"
              ? <input value={form.destino} onChange={e => setForm(p => ({ ...p, destino:e.target.value }))} placeholder="Ex: Obra Rodovia BR-153" className={inp}/>
              : <select value={form.destino} onChange={e => setForm(p => ({ ...p, destino:e.target.value }))} className={inp}>
                  <option value="">Selecione...</option>
                  {(form.tipo_destino === "FROTA" ? FROTAS : EQUIPAMENTOS_LIST).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            }
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Itens Solicitados</label>
              <button onClick={addItem} className="text-[10px] font-bold text-[#EA6C0A] hover:underline">+ Adicionar item</button>
            </div>
            <div className="space-y-2">
              {form.itens.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.descricao} onChange={e => setItem(i,"descricao",e.target.value)}
                    placeholder="Descrição do item" className={`${inp} col-span-6`}/>
                  <input type="number" min={1} value={it.quantidade} onChange={e => setItem(i,"quantidade",Number(e.target.value))}
                    className={`${inp} col-span-2`}/>
                  <select value={it.unidade} onChange={e => setItem(i,"unidade",e.target.value)} className={`${inp} col-span-3`}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeItem(i)} disabled={form.itens.length === 1}
                    className="col-span-1 text-slate-300 hover:text-red-500 transition-colors text-lg font-bold disabled:opacity-30">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
            <button onClick={handleCriar} disabled={salvando}
              className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all disabled:opacity-60">
              {salvando ? "Enviando..." : "Enviar para Suprimentos"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Ação de status */}
      <Modal
        isOpen={!!acaoModal}
        onClose={() => { setAcaoModal(null); setAcaoValor(""); }}
        title={
          acaoModal?.tipo === "aprovar_compra"      ? "Aprovar Compra"        :
          acaoModal?.tipo === "rejeitar"            ? "Rejeitar Pedido"       :
          acaoModal?.tipo === "comprar"             ? "Registrar Compra"      :
          "Confirmar Recebimento"
        }
        size="sm">
        {acaoModal && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Pedido <strong className="font-mono">{acaoModal.pedido.numero_sc}</strong> — {acaoModal.pedido.destino}
            </p>

            {acaoModal.tipo === "rejeitar" && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Motivo da Rejeição</label>
                <textarea value={acaoValor} onChange={e => setAcaoValor(e.target.value)}
                  rows={3} placeholder="Descreva o motivo..." className={`${inp} resize-none`} autoFocus/>
              </div>
            )}

            {acaoModal.tipo === "comprar" && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Data Prevista de Recebimento</label>
                <input type="date" min={todayISO()} value={acaoValor} onChange={e => setAcaoValor(e.target.value)} className={inp} autoFocus/>
              </div>
            )}

            {acaoModal.tipo === "aprovar_compra" && (
              <p className="text-xs text-slate-500">
                Confirma a aprovação da compra deste pedido?
                {acaoModal.pedido.valor_total > 0 ? ` Valor: ${fmtMoeda(acaoModal.pedido.valor_total)}` : ""}
              </p>
            )}

            {acaoModal.tipo === "receber" && (
              <p className="text-xs text-slate-500">Confirma o recebimento completo dos itens deste pedido?</p>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button onClick={() => { setAcaoModal(null); setAcaoValor(""); }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
              <button onClick={confirmarAcao} disabled={salvando}
                className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                  acaoModal.tipo === "rejeitar" ? "bg-red-600 hover:bg-red-700" :
                  acaoModal.tipo === "aprovar_compra" || acaoModal.tipo === "receber" ? "bg-emerald-600 hover:bg-emerald-700" :
                  "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A]"
                }`}>
                {salvando ? "Processando..." :
                  acaoModal.tipo === "aprovar_compra"      ? "Aprovar"               :
                  acaoModal.tipo === "rejeitar"             ? "Rejeitar"              :
                  acaoModal.tipo === "comprar"              ? "Confirmar Compra"      :
                  "Confirmar Recebimento"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Cotação Comparativa (preencher ou aprovar com escolha de fornecedor) */}
      <Modal
        isOpen={!!comparativoModal}
        onClose={() => setComparativoModal(null)}
        title={
          comparativoModal?.modo === "editar"      ? "Cotação Comparativa de Compra" :
          comparativoModal?.modo === "aprovar"     ? "Aprovar Orçamento — Escolher Fornecedor" :
          "Cotação Comparativa"
        }
        size="xl">
        {comparativoModal && (
          <ComparativoCotacao
            numeroSc={comparativoModal.pedido.numero_sc}
            setor={comparativoModal.pedido.setor}
            destino={comparativoModal.pedido.destino}
            data={fmtDate(comparativoModal.pedido.data)}
            itensIniciais={comparativoModal.pedido.itens}
            fornecedores={comparativoModal.pedido.cotacao_fornecedores}
            itensComparativo={comparativoModal.pedido.cotacao_itens}
            fornecedorEscolhido={comparativoModal.pedido.fornecedor_escolhido}
            modo={comparativoModal.modo}
            salvando={salvando}
            onSalvar={(dados) => executarAcao(() =>
              api.pedidosOrcamento.enviarAprovacaoManutencao(comparativoModal.pedido.id, dados)
            )}
            onAprovar={(fornecedorEscolhido) => executarAcao(() =>
              api.pedidosOrcamento.aprovarManutencao(comparativoModal.pedido.id, { fornecedor_escolhido: fornecedorEscolhido })
            )}
          />
        )}
      </Modal>

      {/* Drawer: Detalhes + Timeline */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(null)}/>
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="bg-[#0F172A] p-5 text-white">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pedido de Orçamento</p>
                  <h2 className="text-xl font-black font-mono mt-0.5">{drawer.numero_sc}</h2>
                </div>
                <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COLOR[drawer.urgencia]}`}>
                  {drawer.urgencia.charAt(0)+drawer.urgencia.slice(1).toLowerCase()}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[drawer.status]}`}>
                  {STATUS_LABEL[drawer.status]}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Progresso</span><span>{PROGRESSO[drawer.status]}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(drawer.status)}`} style={{ width:`${PROGRESSO[drawer.status]}%` }}/>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 border-b border-slate-100">
              {([
                ["Solicitante", drawer.solicitante],
                ["Destino",     drawer.destino],
                ["Tipo",        drawer.tipo_destino === "FROTA" ? "Frota" : drawer.tipo_destino === "OBRA" ? "Obra" : "Equipamento"],
                ["Data",        fmtDate(drawer.data)],
                ...(drawer.fornecedor_escolhido ? [["Fornecedor Escolhido", drawer.fornecedor_escolhido]] : []),
                ...(drawer.prazo_entrega_escolhido ? [["Prazo de Entrega", drawer.prazo_entrega_escolhido]] : []),
                ...(drawer.forma_pagamento_escolhida ? [["Forma de Pagamento", drawer.forma_pagamento_escolhida]] : []),
                ...(drawer.valor_total > 0 ? [["Valor Total", fmtMoeda(drawer.valor_total)]] : []),
                ...(drawer.data_prevista_recebimento ? [["Previsão de Recebimento", fmtDate(drawer.data_prevista_recebimento)]] : []),
                ...(drawer.motivo_rejeicao ? [["Motivo da Rejeição", drawer.motivo_rejeicao]] : []),
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm gap-4">
                  <span className="text-slate-400 font-medium shrink-0">{k}</span>
                  <span className="font-bold text-slate-800 text-right">{v}</span>
                </div>
              ))}

              <div className="pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Itens</p>
                <div className="space-y-1.5">
                  {drawer.itens.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-700 font-medium">{it.descricao}</span>
                      <span className="font-bold text-slate-500 shrink-0 ml-3">{it.quantidade} {it.unidade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {drawer.cotacao_fornecedores && (
                <button onClick={() => setComparativoModal({ pedido: drawer, modo: "visualizar" })}
                  className="w-full text-center text-[11px] font-bold text-blue-600 hover:text-[#EA6C0A] transition-colors py-1">
                  Ver Cotação Comparativa →
                </button>
              )}

              <div className="pt-1">{renderBotoes(drawer, "md")}</div>
            </div>

            <div className="p-5 flex-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Linha do Tempo</h3>
              <div className="relative">
                {drawer.timeline.map((step, i) => {
                  const isLast = i === drawer.timeline.length - 1;
                  return (
                    <div key={i} className="flex gap-4 relative">
                      {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100"/>}
                      <div className="shrink-0 mt-1">
                        {step.estado === "concluido"  && <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>}
                        {step.estado === "atual"      && <div className="w-6 h-6 rounded-full bg-[#EA6C0A] flex items-center justify-center text-white text-[10px] font-black">▶</div>}
                        {step.estado === "rejeitado"  && <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-black">✕</div>}
                        {step.estado === "futuro"     && <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white"/>}
                      </div>
                      <div className={`pb-5 flex-1 ${step.estado === "futuro" ? "opacity-35" : ""}`}>
                        <p className={`text-sm font-bold ${step.estado === "rejeitado" ? "text-red-600" : step.estado === "atual" ? "text-[#EA6C0A]" : "text-slate-800"}`}>
                          {step.titulo}
                        </p>
                        {step.subtitulo && <p className="text-[11px] text-slate-500 mt-0.5">{step.subtitulo}</p>}
                        {step.data      && <p className="text-[10px] text-slate-400 mt-1 font-mono">{step.data}</p>}
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
