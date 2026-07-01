import React, { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Urgencia = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
type Status   = "PENDENTE" | "COTANDO" | "AGUARDANDO_APROVACAO" | "APROVADO" | "EM_TRANSITO" | "CONCLUIDO" | "REJEITADO";

interface TimelineStep {
  titulo: string;
  subtitulo: string;
  data?: string;
  estado: "concluido" | "atual" | "rejeitado" | "futuro";
}

interface Pedido {
  id: number;
  numero_sc: string;
  data: string;
  setor: string;
  destino: string;
  equipamento: string;
  urgencia: Urgencia;
  status: Status;
  itens: number;
  valor_total: number;
  solicitante: string;
  timeline: TimelineStep[];
}

// ─── Dados de exemplo ─────────────────────────────────────────────────────────
const PEDIDOS_MOCK: Pedido[] = [
  {
    id: 1, numero_sc: "SC-2026-001", data: "2026-06-01",
    setor: "MANUTENCAO", destino: "Manutenção", equipamento: "PC200 - Escavadeira",
    urgencia: "CRITICA", status: "EM_TRANSITO", itens: 5, valor_total: 18750.00, solicitante: "Carlos Souza",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Carlos Souza — Manutenção", data: "01/06/2026 08:14", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Fornecedor: Auto Peças Brix", data: "03/06/2026 10:30", estado: "concluido" },
      { titulo: "Aguardando aprovação", subtitulo: "Encaminhado ao gestor", data: "05/06/2026 14:00", estado: "concluido" },
      { titulo: "Aprovado", subtitulo: "Aprovado por: Admin — R$ 18.750,00", data: "06/06/2026 09:20", estado: "concluido" },
      { titulo: "Em trânsito", subtitulo: "Saída: 08/06/2026 — Prev. chegada: 12/06", data: "08/06/2026 11:00", estado: "atual" },
      { titulo: "Entrega concluída", subtitulo: "Aguardando confirmação", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 2, numero_sc: "SC-2026-002", data: "2026-06-05",
    setor: "ENGENHARIA", destino: "Obra Central", equipamento: "D6T - Motoniveladora",
    urgencia: "ALTA", status: "APROVADO", itens: 3, valor_total: 9200.00, solicitante: "Ana Lima",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Ana Lima — Engenharia", data: "05/06/2026 07:50", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Fornecedor: TechnoPeças", data: "07/06/2026 13:00", estado: "concluido" },
      { titulo: "Aguardando aprovação", subtitulo: "Encaminhado ao gestor", data: "10/06/2026 09:00", estado: "concluido" },
      { titulo: "Aprovado", subtitulo: "Aprovado por: Admin — R$ 9.200,00", data: "11/06/2026 16:00", estado: "atual" },
      { titulo: "Em trânsito", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Entrega concluída", subtitulo: "", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 3, numero_sc: "SC-2026-003", data: "2026-06-10",
    setor: "MANUTENCAO", destino: "Manutenção", equipamento: "WA320 - Pá Carregadeira",
    urgencia: "MEDIA", status: "COTANDO", itens: 8, valor_total: 4350.00, solicitante: "Roberto Melo",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Roberto Melo — Manutenção", data: "10/06/2026 10:00", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Aguardando retorno de 2 fornecedores", data: "12/06/2026 08:30", estado: "atual" },
      { titulo: "Aguardando aprovação", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Aprovado", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Em trânsito", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Entrega concluída", subtitulo: "", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 4, numero_sc: "SC-2026-004", data: "2026-06-12",
    setor: "ENGENHARIA", destino: "Obra Rodovia BR-153", equipamento: "GD825 - Motoniveladora",
    urgencia: "BAIXA", status: "CONCLUIDO", itens: 2, valor_total: 1800.00, solicitante: "Fernanda Costa",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Fernanda Costa — Engenharia", data: "12/06/2026 09:00", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Fornecedor: Aço & Metal Ltda", data: "13/06/2026 11:00", estado: "concluido" },
      { titulo: "Aguardando aprovação", subtitulo: "Encaminhado ao gestor", data: "14/06/2026 14:00", estado: "concluido" },
      { titulo: "Aprovado", subtitulo: "Aprovado por: Admin — R$ 1.800,00", data: "15/06/2026 08:00", estado: "concluido" },
      { titulo: "Em trânsito", subtitulo: "Transportadora: Rápido Sul", data: "16/06/2026 10:00", estado: "concluido" },
      { titulo: "Entrega concluída", subtitulo: "Recebido por: Fernanda Costa", data: "18/06/2026 14:30", estado: "concluido" },
    ],
  },
  {
    id: 5, numero_sc: "SC-2026-005", data: "2026-06-15",
    setor: "MANUTENCAO", destino: "Manutenção", equipamento: "PC200 - Escavadeira",
    urgencia: "CRITICA", status: "REJEITADO", itens: 4, valor_total: 22000.00, solicitante: "Carlos Souza",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Carlos Souza — Manutenção", data: "15/06/2026 07:00", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Fornecedor: ImportPeças SP", data: "16/06/2026 10:00", estado: "concluido" },
      { titulo: "Aguardando aprovação", subtitulo: "Encaminhado ao gestor", data: "17/06/2026 09:00", estado: "concluido" },
      { titulo: "Rejeitado", subtitulo: "Motivo: Valor acima do orçamento aprovado", data: "17/06/2026 16:45", estado: "rejeitado" },
      { titulo: "Em trânsito", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Entrega concluída", subtitulo: "", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 6, numero_sc: "SC-2026-006", data: "2026-06-18",
    setor: "ENGENHARIA", destino: "Obra Contorno Sul", equipamento: "CAT 140 - Motoniveladora",
    urgencia: "ALTA", status: "AGUARDANDO_APROVACAO", itens: 6, valor_total: 13600.00, solicitante: "Marcos Alves",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Marcos Alves — Engenharia", data: "18/06/2026 08:00", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Fornecedor: TechnoPeças", data: "20/06/2026 10:00", estado: "concluido" },
      { titulo: "Aguardando aprovação", subtitulo: "Pendente — gestor: Admin", data: "22/06/2026 14:00", estado: "atual" },
      { titulo: "Aprovado", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Em trânsito", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Entrega concluída", subtitulo: "", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 7, numero_sc: "SC-2026-007", data: "2026-06-20",
    setor: "MANUTENCAO", destino: "Manutenção", equipamento: "WA500 - Pá Carregadeira",
    urgencia: "MEDIA", status: "PENDENTE", itens: 10, valor_total: 6800.00, solicitante: "Josefa Ramos",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Josefa Ramos — Manutenção", data: "20/06/2026 11:00", estado: "atual" },
      { titulo: "Cotação em andamento", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Aguardando aprovação", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Aprovado", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Em trânsito", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Entrega concluída", subtitulo: "", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 8, numero_sc: "SC-2026-008", data: "2026-06-25",
    setor: "ENGENHARIA", destino: "Obra Norte", equipamento: "D8T - Trator de Esteira",
    urgencia: "ALTA", status: "PENDENTE", itens: 7, valor_total: 31500.00, solicitante: "Paulo Henrique",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Paulo Henrique — Engenharia", data: "25/06/2026 09:30", estado: "atual" },
      { titulo: "Cotação em andamento", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Aguardando aprovação", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Aprovado", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Em trânsito", subtitulo: "", data: undefined, estado: "futuro" },
      { titulo: "Entrega concluída", subtitulo: "", data: undefined, estado: "futuro" },
    ],
  },
  {
    id: 9, numero_sc: "SC-2026-009", data: "2026-06-28",
    setor: "MANUTENCAO", destino: "Manutenção", equipamento: "PC360 - Escavadeira",
    urgencia: "BAIXA", status: "CONCLUIDO", itens: 1, valor_total: 950.00, solicitante: "Roberto Melo",
    timeline: [
      { titulo: "Solicitação criada", subtitulo: "Roberto Melo — Manutenção", data: "28/06/2026 07:00", estado: "concluido" },
      { titulo: "Cotação em andamento", subtitulo: "Fornecedor: Auto Peças Brix", data: "28/06/2026 12:00", estado: "concluido" },
      { titulo: "Aguardando aprovação", subtitulo: "Encaminhado ao gestor", data: "29/06/2026 08:00", estado: "concluido" },
      { titulo: "Aprovado", subtitulo: "Aprovado por: Admin — R$ 950,00", data: "29/06/2026 09:00", estado: "concluido" },
      { titulo: "Em trânsito", subtitulo: "Retirada no balcão", data: "29/06/2026 14:00", estado: "concluido" },
      { titulo: "Entrega concluída", subtitulo: "Recebido por: Roberto Melo", data: "30/06/2026 10:00", estado: "concluido" },
    ],
  },
];

const EQUIPAMENTOS = [...new Set(PEDIDOS_MOCK.map((p) => p.equipamento))];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const fmtMoeda = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PROGRESSO: Record<Status, number> = {
  PENDENTE: 10, COTANDO: 28, AGUARDANDO_APROVACAO: 48,
  APROVADO: 65, EM_TRANSITO: 82, CONCLUIDO: 100, REJEITADO: 40,
};

const STATUS_LABEL: Record<Status, string> = {
  PENDENTE: "Pendente", COTANDO: "Cotando",
  AGUARDANDO_APROVACAO: "Ag. Aprovação", APROVADO: "Aprovado",
  EM_TRANSITO: "Em Trânsito", CONCLUIDO: "Concluído", REJEITADO: "Rejeitado",
};

const STATUS_COLOR: Record<Status, string> = {
  PENDENTE:             "bg-slate-100 text-slate-600",
  COTANDO:              "bg-blue-100 text-blue-700",
  AGUARDANDO_APROVACAO: "bg-amber-100 text-amber-700",
  APROVADO:             "bg-emerald-100 text-emerald-700",
  EM_TRANSITO:          "bg-indigo-100 text-indigo-700",
  CONCLUIDO:            "bg-green-100 text-green-800",
  REJEITADO:            "bg-red-100 text-red-700",
};

const URG_COLOR: Record<Urgencia, string> = {
  CRITICA: "bg-red-100 text-red-700",
  ALTA:    "bg-orange-100 text-orange-700",
  MEDIA:   "bg-amber-100 text-amber-700",
  BAIXA:   "bg-green-100 text-green-800",
};

const ABERTO_STATUS: Status[] = ["PENDENTE", "COTANDO", "AGUARDANDO_APROVACAO", "APROVADO"];

type SortKey = "numero_sc" | "data" | "urgencia" | "status";
const URG_ORDER: Record<Urgencia, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
const STS_ORDER: Record<Status, number>   = { PENDENTE: 0, COTANDO: 1, AGUARDANDO_APROVACAO: 2, APROVADO: 3, EM_TRANSITO: 4, CONCLUIDO: 5, REJEITADO: 6 };

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PedidosOrcamento() {
  const [filtros, setFiltros] = useState({
    sc: "", setor: "", equipamento: "", dataIni: "", dataFim: "", urgencia: "", status: "",
  });
  const [sort, setSort]       = useState<{ key: SortKey; asc: boolean }>({ key: "data", asc: false });
  const [drawer, setDrawer]   = useState<Pedido | null>(null);

  const setF = (k: keyof typeof filtros) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiltros((p) => ({ ...p, [k]: e.target.value }));

  const limpar = () => setFiltros({ sc: "", setor: "", equipamento: "", dataIni: "", dataFim: "", urgencia: "", status: "" });

  // Filtro
  const filtrados = useMemo(() => {
    let r = PEDIDOS_MOCK.filter((p) => {
      if (filtros.sc        && !p.numero_sc.toLowerCase().includes(filtros.sc.toLowerCase())) return false;
      if (filtros.setor     && p.setor !== filtros.setor) return false;
      if (filtros.equipamento && p.equipamento !== filtros.equipamento) return false;
      if (filtros.dataIni   && p.data < filtros.dataIni) return false;
      if (filtros.dataFim   && p.data > filtros.dataFim) return false;
      if (filtros.urgencia  && p.urgencia !== filtros.urgencia) return false;
      if (filtros.status    && p.status !== filtros.status) return false;
      return true;
    });
    r.sort((a, b) => {
      let diff = 0;
      if (sort.key === "numero_sc") diff = a.numero_sc.localeCompare(b.numero_sc);
      if (sort.key === "data")      diff = a.data.localeCompare(b.data);
      if (sort.key === "urgencia")  diff = URG_ORDER[a.urgencia] - URG_ORDER[b.urgencia];
      if (sort.key === "status")    diff = STS_ORDER[a.status] - STS_ORDER[b.status];
      return sort.asc ? diff : -diff;
    });
    return r;
  }, [filtros, sort]);

  // KPIs
  const kpis = useMemo(() => ({
    aberto:    filtrados.filter((p) => ABERTO_STATUS.includes(p.status)).length,
    transito:  filtrados.filter((p) => p.status === "EM_TRANSITO").length,
    concluido: filtrados.filter((p) => p.status === "CONCLUIDO").length,
    rejeitado: filtrados.filter((p) => p.status === "REJEITADO").length,
    total:     filtrados.length,
    valor:     filtrados.reduce((s, p) => s + p.valor_total, 0),
  }), [filtrados]);

  // Chips de filtros ativos
  const chips = useMemo(() => {
    const c: { key: keyof typeof filtros; label: string }[] = [];
    if (filtros.sc)          c.push({ key: "sc",          label: `Nº SC: ${filtros.sc}` });
    if (filtros.setor)       c.push({ key: "setor",       label: `Setor: ${filtros.setor}` });
    if (filtros.equipamento) c.push({ key: "equipamento", label: filtros.equipamento });
    if (filtros.dataIni)     c.push({ key: "dataIni",     label: `De: ${fmtDate(filtros.dataIni)}` });
    if (filtros.dataFim)     c.push({ key: "dataFim",     label: `Até: ${fmtDate(filtros.dataFim)}` });
    if (filtros.urgencia)    c.push({ key: "urgencia",    label: `Urgência: ${filtros.urgencia}` });
    if (filtros.status)      c.push({ key: "status",      label: `Status: ${STATUS_LABEL[filtros.status as Status] ?? filtros.status}` });
    return c;
  }, [filtros]);

  const toggleSort = (key: SortKey) =>
    setSort((p) => p.key === key ? { key, asc: !p.asc } : { key, asc: true });

  const barColor = (s: Status) =>
    s === "CONCLUIDO" ? "bg-emerald-500" : s === "REJEITADO" ? "bg-red-500" : "bg-[#EA6C0A]";

  const thCls = (key: SortKey) =>
    `p-3 font-semibold text-slate-500 cursor-pointer select-none hover:text-[#EA6C0A] transition-colors ${sort.key === key ? "text-[#EA6C0A]" : ""}`;

  const arrow = (key: SortKey) => sort.key === key ? (sort.asc ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-5">
      <PageHeader title="Pedidos de Orçamento" subtitle="Solicitações de Manutenção e Engenharia" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Em Aberto",    valor: kpis.aberto,    cor: "text-amber-600",   bg: "bg-amber-50",   bdr: "border-amber-200" },
          { label: "Em Trânsito",  valor: kpis.transito,  cor: "text-indigo-600",  bg: "bg-indigo-50",  bdr: "border-indigo-200" },
          { label: "Concluídos",   valor: kpis.concluido, cor: "text-emerald-600", bg: "bg-emerald-50", bdr: "border-emerald-200" },
          { label: "Rejeitados",   valor: kpis.rejeitado, cor: "text-red-600",     bg: "bg-red-50",     bdr: "border-red-200" },
          { label: "Total",        valor: kpis.total,     cor: "text-slate-700",   bg: "bg-white",      bdr: "border-slate-200" },
          { label: "Valor Total",  valor: fmtMoeda(kpis.valor), cor: "text-[#EA6C0A]", bg: "bg-white", bdr: "border-orange-200" },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} border ${k.bdr} rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-xl font-black ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <input value={filtros.sc} onChange={setF("sc")} placeholder="Nº SC"
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]" />
          <select value={filtros.setor} onChange={setF("setor")}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]">
            <option value="">Todos Setores</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="ENGENHARIA">Engenharia</option>
            <option value="ADMINISTRACAO">Administração</option>
            <option value="ALMOXARIFADO">Almoxarifado</option>
          </select>
          <select value={filtros.equipamento} onChange={setF("equipamento")}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]">
            <option value="">Todos Equipamentos</option>
            {EQUIPAMENTOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="date" value={filtros.dataIni} onChange={setF("dataIni")}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]" />
          <input type="date" value={filtros.dataFim} onChange={setF("dataFim")}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]" />
          <select value={filtros.urgencia} onChange={setF("urgencia")}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]">
            <option value="">Todas Urgências</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
          <select value={filtros.status} onChange={setF("status")}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]">
            <option value="">Todos Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="COTANDO">Cotando</option>
            <option value="AGUARDANDO_APROVACAO">Ag. Aprovação</option>
            <option value="APROVADO">Aprovado</option>
            <option value="EM_TRANSITO">Em Trânsito</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="REJEITADO">Rejeitado</option>
          </select>
        </div>

        {/* Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-full">
                {c.label}
                <button onClick={() => setFiltros((p) => ({ ...p, [c.key]: "" }))} className="hover:text-red-500 transition-colors ml-0.5">×</button>
              </span>
            ))}
            <button onClick={limpar} className="text-[10px] text-slate-400 hover:text-red-500 font-semibold transition-colors">Limpar tudo</button>
          </div>
        )}
      </div>

      {/* Contador + Tabela */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-semibold">
            Exibindo <span className="text-slate-800 font-bold">{filtrados.length}</span> de <span className="text-slate-800 font-bold">{PEDIDOS_MOCK.length}</span> pedidos
          </span>
          {chips.length > 0 && (
            <button onClick={limpar} className="text-[10px] text-slate-400 hover:text-[#EA6C0A] font-semibold transition-colors">Limpar filtros</button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th onClick={() => toggleSort("numero_sc")} className={thCls("numero_sc")}>Nº SC{arrow("numero_sc")}</th>
                <th onClick={() => toggleSort("data")}      className={thCls("data")}>Data{arrow("data")}</th>
                <th className="p-3 font-semibold text-slate-500">Setor / Destino</th>
                <th className="p-3 font-semibold text-slate-500">Equipamento</th>
                <th onClick={() => toggleSort("urgencia")}  className={thCls("urgencia")}>Urgência{arrow("urgencia")}</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Itens</th>
                <th onClick={() => toggleSort("status")}    className={thCls("status")}>Status{arrow("status")}</th>
                <th className="p-3 font-semibold text-slate-500 min-w-[120px]">Progresso</th>
                <th className="p-3 font-semibold text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-slate-400">Nenhum pedido encontrado.</td></tr>
              ) : filtrados.map((p) => {
                const pct = PROGRESSO[p.status];
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{p.numero_sc}</td>
                    <td className="p-3 text-slate-600">{fmtDate(p.data)}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800">{p.setor === "MANUTENCAO" ? "Manutenção" : "Engenharia"}</span>
                      <span className="block text-[10px] text-slate-400">{p.destino}</span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">{p.equipamento}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COLOR[p.urgencia]}`}>
                        {p.urgencia.charAt(0) + p.urgencia.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">{p.itens}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${barColor(p.status)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <button onClick={() => setDrawer(p)}
                        className="text-[#2563EB] hover:text-[#EA6C0A] text-[11px] font-bold transition-colors whitespace-nowrap">
                        Ver →
                      </button>
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
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
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
                  {drawer.urgencia.charAt(0) + drawer.urgencia.slice(1).toLowerCase()}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[drawer.status]}`}>
                  {STATUS_LABEL[drawer.status]}
                </span>
              </div>
              {/* Barra de progresso */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Progresso</span><span>{PROGRESSO[drawer.status]}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(drawer.status)}`} style={{ width: `${PROGRESSO[drawer.status]}%` }} />
                </div>
              </div>
            </div>

            {/* Detalhes */}
            <div className="p-5 space-y-4 border-b border-slate-100">
              {[
                ["Solicitante", drawer.solicitante],
                ["Setor", drawer.setor === "MANUTENCAO" ? "Manutenção" : "Engenharia"],
                ["Destino", drawer.destino],
                ["Equipamento", drawer.equipamento],
                ["Data", fmtDate(drawer.data)],
                ["Itens", String(drawer.itens)],
                ["Valor Total", fmtMoeda(drawer.valor_total)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">{k}</span>
                  <span className="font-bold text-slate-800 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="p-5 flex-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Linha do Tempo</h3>
              <div className="relative">
                {drawer.timeline.map((step, i) => {
                  const isLast = i === drawer.timeline.length - 1;
                  return (
                    <div key={i} className="flex gap-4 relative">
                      {/* Linha vertical */}
                      {!isLast && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100" />
                      )}
                      {/* Ponto */}
                      <div className="shrink-0 mt-1">
                        {step.estado === "concluido" && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>
                        )}
                        {step.estado === "atual" && (
                          <div className="w-6 h-6 rounded-full bg-[#EA6C0A] flex items-center justify-center text-white text-[10px] font-black">▶</div>
                        )}
                        {step.estado === "rejeitado" && (
                          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-black">✕</div>
                        )}
                        {step.estado === "futuro" && (
                          <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white" />
                        )}
                      </div>
                      {/* Conteúdo */}
                      <div className={`pb-5 flex-1 ${step.estado === "futuro" ? "opacity-40" : ""}`}>
                        <p className={`text-sm font-bold ${step.estado === "rejeitado" ? "text-red-600" : step.estado === "atual" ? "text-[#EA6C0A]" : "text-slate-800"}`}>
                          {step.titulo}
                        </p>
                        {step.subtitulo && <p className="text-[11px] text-slate-500 mt-0.5">{step.subtitulo}</p>}
                        {step.data && <p className="text-[10px] text-slate-400 mt-1 font-mono">{step.data}</p>}
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
