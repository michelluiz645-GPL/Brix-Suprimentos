import React, { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Urgencia = "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
type Status   = "PENDENTE" | "COTANDO" | "AGUARDANDO_APROVACAO" | "APROVADO" | "EM_TRANSITO" | "CONCLUIDO" | "REJEITADO";
type TipoDestino = "FROTA" | "OBRA" | "EQUIPAMENTO";

interface Item { descricao: string; quantidade: number; unidade: string; }
interface TimelineStep {
  titulo: string; subtitulo: string; data?: string;
  estado: "concluido" | "atual" | "rejeitado" | "futuro";
}
interface Pedido {
  id: number; numero_sc: string; data: string;
  setor: string; destino: string; tipo_destino: TipoDestino;
  urgencia: Urgencia; status: Status;
  itens: Item[]; valor_total: number; solicitante: string;
  timeline: TimelineStep[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const UNIDADES   = ["Un", "Kg", "Lt", "Cx", "Mt", "Par", "Jg", "Rolo", "Pç", "Gl", "Balde", "Saco"];
const FROTAS     = ["PC200 - Escavadeira","WA320 - Pá Carregadeira","D6T - Motoniveladora","GD825 - Motoniveladora","CAT 140 - Motoniveladora","WA500 - Pá Carregadeira","PC360 - Escavadeira","D8T - Trator de Esteira"];
const EQUIPAMENTOS_LIST = ["Gerador 180kVA","Compressor de Ar 250L","Bomba de Concreto","Rolo Compactador","Vibrador de Concreto","Serra Circular","Andaime Tubular"];

const ITEM_VAZIO: Item = { descricao: "", quantidade: 1, unidade: "Un" };

const STATUS_LABEL: Record<Status, string> = {
  PENDENTE:"Pendente", COTANDO:"Cotando", AGUARDANDO_APROVACAO:"Ag. Aprovação",
  APROVADO:"Aprovado", EM_TRANSITO:"Em Trânsito", CONCLUIDO:"Concluído", REJEITADO:"Rejeitado",
};
const STATUS_COLOR: Record<Status, string> = {
  PENDENTE:"bg-slate-100 text-slate-600", COTANDO:"bg-blue-100 text-blue-700",
  AGUARDANDO_APROVACAO:"bg-amber-100 text-amber-700", APROVADO:"bg-emerald-100 text-emerald-700",
  EM_TRANSITO:"bg-indigo-100 text-indigo-700", CONCLUIDO:"bg-green-100 text-green-800",
  REJEITADO:"bg-red-100 text-red-700",
};
const URG_COLOR: Record<Urgencia, string> = {
  CRITICA:"bg-red-100 text-red-700", ALTA:"bg-orange-100 text-orange-700",
  MEDIA:"bg-amber-100 text-amber-700", BAIXA:"bg-green-100 text-green-800",
};
const PROGRESSO: Record<Status, number> = {
  PENDENTE:10, COTANDO:28, AGUARDANDO_APROVACAO:48,
  APROVADO:65, EM_TRANSITO:82, CONCLUIDO:100, REJEITADO:40,
};
const ABERTO_STATUS: Status[] = ["PENDENTE","COTANDO","AGUARDANDO_APROVACAO","APROVADO"];
type SortKey = "numero_sc"|"data"|"urgencia"|"status";
const URG_ORDER: Record<Urgencia,number> = {CRITICA:0,ALTA:1,MEDIA:2,BAIXA:3};
const STS_ORDER: Record<Status,number>   = {PENDENTE:0,COTANDO:1,AGUARDANDO_APROVACAO:2,APROVADO:3,EM_TRANSITO:4,CONCLUIDO:5,REJEITADO:6};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) => { const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2,"0");
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const todayISO = () => new Date().toISOString().slice(0,10);

const STATUS_STEP: Record<Status,number> = {
  PENDENTE:0, COTANDO:1, AGUARDANDO_APROVACAO:2, APROVADO:3, EM_TRANSITO:4, CONCLUIDO:5, REJEITADO:-1,
};
const STEP_TITULOS = [
  "Solicitação criada","Cotação em andamento","Aguardando aprovação",
  "Aprovado","Em trânsito","Entrega concluída",
];

const transicao = (pedido: Pedido, novoStatus: Status, feito_por: string): Pedido => {
  const stepAtual = STATUS_STEP[pedido.status];
  const stepNovo  = STATUS_STEP[novoStatus];
  const ts = nowStr();
  const tl = pedido.timeline.map((step, i) => {
    if (i < stepAtual) return step;
    if (i === stepAtual) {
      if (novoStatus === "REJEITADO")
        return { ...step, estado: "rejeitado" as const, data: ts, subtitulo: `Rejeitado por: ${feito_por}` };
      return { ...step, estado: "concluido" as const, data: step.data ?? ts };
    }
    if (novoStatus !== "REJEITADO" && i === stepNovo)
      return { ...step, estado: "atual" as const, data: ts, subtitulo: step.subtitulo || feito_por };
    return step;
  });
  return { ...pedido, status: novoStatus, timeline: tl };
};

const criarTimeline = (solicitante: string): TimelineStep[] =>
  STEP_TITULOS.map((titulo, i) => ({
    titulo,
    subtitulo: i === 0 ? `${solicitante} — Manutenção` : "",
    data: i === 0 ? nowStr() : undefined,
    estado: i === 0 ? "atual" : "futuro",
  }));

// ─── Estado inicial vazio — pedidos criados em tempo real ────────────────────
const PEDIDOS_MOCK: Pedido[] = [];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  user: { login: string; nome: string; nivel: string };
  setor: string;
}

const barColor = (s: Status) =>
  s === "CONCLUIDO" ? "bg-emerald-500" : s === "REJEITADO" ? "bg-red-500" : "bg-[#EA6C0A]";

// ─── Componente principal ─────────────────────────────────────────────────────
export default function PedidosOrcamento({ user, setor }: Props) {
  const isAlmox = setor === "ALMOXARIFADO";
  const isManut = setor === "MANUTENCAO";
  const isAdmin = user.nivel === "ADMIN";

  const [pedidos, setPedidos] = useState<Pedido[]>(PEDIDOS_MOCK);
  const [filtros, setFiltros] = useState({ sc:"", setor2:"", equipamento:"", dataIni:"", dataFim:"", urgencia:"", status:"" });
  const [sort, setSort]       = useState<{key:SortKey;asc:boolean}>({key:"data",asc:false});
  const [drawer, setDrawer]   = useState<Pedido|null>(null);
  const [showForm, setShowForm] = useState(false);

  // Formulário novo pedido
  const [form, setForm] = useState({
    urgencia: "MEDIA" as Urgencia,
    tipo_destino: "FROTA" as TipoDestino,
    destino: "",
    itens: [{ ...ITEM_VAZIO }] as Item[],
  });

  const setF = (k: keyof typeof filtros) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setFiltros((p) => ({ ...p, [k]: e.target.value }));
  const limpar = () => setFiltros({sc:"",setor2:"",equipamento:"",dataIni:"",dataFim:"",urgencia:"",status:""});

  // Filtro + ordenação
  const filtrados = useMemo(() => {
    let r = pedidos.filter((p) => {
      if (filtros.sc         && !p.numero_sc.toLowerCase().includes(filtros.sc.toLowerCase())) return false;
      if (filtros.setor2     && p.setor !== filtros.setor2) return false;
      if (filtros.equipamento && p.destino !== filtros.equipamento) return false;
      if (filtros.dataIni    && p.data < filtros.dataIni) return false;
      if (filtros.dataFim    && p.data > filtros.dataFim) return false;
      if (filtros.urgencia   && p.urgencia !== filtros.urgencia) return false;
      if (filtros.status     && p.status !== filtros.status) return false;
      return true;
    });
    r.sort((a,b) => {
      let d = 0;
      if (sort.key==="numero_sc") d = a.numero_sc.localeCompare(b.numero_sc);
      if (sort.key==="data")      d = a.data.localeCompare(b.data);
      if (sort.key==="urgencia")  d = URG_ORDER[a.urgencia]-URG_ORDER[b.urgencia];
      if (sort.key==="status")    d = STS_ORDER[a.status]-STS_ORDER[b.status];
      return sort.asc ? d : -d;
    });
    return r;
  }, [pedidos, filtros, sort]);

  const kpis = useMemo(()=>({
    aberto:    filtrados.filter(p=>ABERTO_STATUS.includes(p.status)).length,
    transito:  filtrados.filter(p=>p.status==="EM_TRANSITO").length,
    concluido: filtrados.filter(p=>p.status==="CONCLUIDO").length,
    rejeitado: filtrados.filter(p=>p.status==="REJEITADO").length,
    total:     filtrados.length,
    valor:     filtrados.reduce((s,p)=>s+p.valor_total,0),
  }),[filtrados]);

  const chips = useMemo(()=>{
    const c: {key:keyof typeof filtros;label:string}[] = [];
    if (filtros.sc)          c.push({key:"sc",         label:`Nº SC: ${filtros.sc}`});
    if (filtros.setor2)      c.push({key:"setor2",     label:`Setor: ${filtros.setor2}`});
    if (filtros.equipamento) c.push({key:"equipamento",label:filtros.equipamento});
    if (filtros.dataIni)     c.push({key:"dataIni",    label:`De: ${fmtDate(filtros.dataIni)}`});
    if (filtros.dataFim)     c.push({key:"dataFim",    label:`Até: ${fmtDate(filtros.dataFim)}`});
    if (filtros.urgencia)    c.push({key:"urgencia",   label:`Urgência: ${filtros.urgencia}`});
    if (filtros.status)      c.push({key:"status",     label:`Status: ${STATUS_LABEL[filtros.status as Status]??filtros.status}`});
    return c;
  },[filtros]);

  const toggleSort = (key:SortKey) =>
    setSort(p=>p.key===key?{key,asc:!p.asc}:{key,asc:true});

  // Ação de transição de status
  const executarAcao = (pedido: Pedido, novoStatus: Status) => {
    const updated = transicao(pedido, novoStatus, user.nome);
    setPedidos(prev=>prev.map(p=>p.id===updated.id?updated:p));
    setDrawer(updated);
  };

  // Criar novo pedido
  const handleCriar = () => {
    if (!form.destino.trim()) return;
    if (form.itens.some(i=>!i.descricao.trim()||i.quantidade<=0)) return;
    const nextId = pedidos.length > 0 ? Math.max(...pedidos.map(p=>p.id))+1 : 1;
    const sc = `SC-2026-${String(nextId).padStart(3,"0")}`;
    const novo: Pedido = {
      id: nextId, numero_sc: sc, data: todayISO(),
      setor: "MANUTENCAO", destino: form.destino,
      tipo_destino: form.tipo_destino, urgencia: form.urgencia,
      status: "PENDENTE", itens: form.itens, valor_total: 0,
      solicitante: user.nome,
      timeline: criarTimeline(user.nome),
    };
    setPedidos(prev=>[novo,...prev]);
    setShowForm(false);
    setForm({urgencia:"MEDIA",tipo_destino:"FROTA",destino:"",itens:[{...ITEM_VAZIO}]});
  };

  const addItem    = () => setForm(p=>({...p,itens:[...p.itens,{...ITEM_VAZIO}]}));
  const removeItem = (i:number) => setForm(p=>({...p,itens:p.itens.filter((_,idx)=>idx!==i)}));
  const setItem = (i:number,k:keyof Item,v:string|number) =>
    setForm(p=>({...p,itens:p.itens.map((it,idx)=>idx===i?{...it,[k]:v}:it)}));

  const thC = (k:SortKey) => `p-3 font-semibold text-slate-500 cursor-pointer select-none hover:text-[#EA6C0A] transition-colors ${sort.key===k?"text-[#EA6C0A]":""}`;
  const arr = (k:SortKey) => sort.key===k?(sort.asc?" ↑":" ↓"):"";

  // Botões de ação no drawer
  const renderAcoes = (p: Pedido) => {
    const btn = (label:string,status:Status,cor:string) => (
      <button key={label} onClick={()=>executarAcao(p,status)}
        className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:-translate-y-0.5 ${cor}`}>
        {label}
      </button>
    );
    const acoes = [];
    if (isAlmox && p.status==="PENDENTE")
      acoes.push(btn("Iniciar Cotação","COTANDO","bg-blue-600 hover:bg-blue-700"));
    if (isAlmox && p.status==="COTANDO")
      acoes.push(btn("Encaminhar para Aprovação","AGUARDANDO_APROVACAO","bg-amber-500 hover:bg-amber-600"));
    if (isAdmin && p.status==="AGUARDANDO_APROVACAO") {
      acoes.push(btn("Aprovar","APROVADO","bg-emerald-600 hover:bg-emerald-700"));
      acoes.push(btn("Rejeitar","REJEITADO","bg-red-600 hover:bg-red-700"));
    }
    if (isAlmox && p.status==="APROVADO")
      acoes.push(btn("Confirmar Envio","EM_TRANSITO","bg-indigo-600 hover:bg-indigo-700"));
    if (isManut && p.status==="EM_TRANSITO")
      acoes.push(btn("Confirmar Recebimento","CONCLUIDO","bg-emerald-600 hover:bg-emerald-700"));
    return acoes.length ? <div className="flex flex-wrap gap-2 mt-4">{acoes}</div> : null;
  };

  const inp = "w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]";

  return (
    <div className="space-y-5">
      <PageHeader title="Pedidos de Orçamento" subtitle="Solicitações de Manutenção para Suprimentos"
        action={isManut ? (
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all">
            + Novo Pedido
          </button>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {label:"Em Aberto",   valor:kpis.aberto,             cor:"text-amber-600",   bg:"bg-amber-50",   bdr:"border-amber-200"},
          {label:"Em Trânsito", valor:kpis.transito,           cor:"text-indigo-600",  bg:"bg-indigo-50",  bdr:"border-indigo-200"},
          {label:"Concluídos",  valor:kpis.concluido,          cor:"text-emerald-600", bg:"bg-emerald-50", bdr:"border-emerald-200"},
          {label:"Rejeitados",  valor:kpis.rejeitado,          cor:"text-red-600",     bg:"bg-red-50",     bdr:"border-red-200"},
          {label:"Total",       valor:kpis.total,              cor:"text-slate-700",   bg:"bg-white",      bdr:"border-slate-200"},
          {label:"Valor Total", valor:fmtMoeda(kpis.valor),    cor:"text-[#EA6C0A]",   bg:"bg-white",      bdr:"border-orange-200"},
        ].map(k=>(
          <div key={k.label} className={`${k.bg} border ${k.bdr} rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-xl font-black ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <input value={filtros.sc} onChange={setF("sc")} placeholder="Nº SC" className={inp}/>
          <select value={filtros.setor2} onChange={setF("setor2")} className={inp}>
            <option value="">Todos Setores</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="ENGENHARIA">Engenharia</option>
          </select>
          <select value={filtros.equipamento} onChange={setF("equipamento")} className={inp}>
            <option value="">Todos Destinos</option>
            {[...new Set(pedidos.map(p=>p.destino))].map(e=><option key={e} value={e}>{e}</option>)}
          </select>
          <input type="date" value={filtros.dataIni} onChange={setF("dataIni")} className={inp}/>
          <input type="date" value={filtros.dataFim} onChange={setF("dataFim")} className={inp}/>
          <select value={filtros.urgencia} onChange={setF("urgencia")} className={inp}>
            <option value="">Todas Urgências</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
          <select value={filtros.status} onChange={setF("status")} className={inp}>
            <option value="">Todos Status</option>
            {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {chips.length>0&&(
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(c=>(
              <span key={c.key} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-full">
                {c.label}
                <button onClick={()=>setFiltros(p=>({...p,[c.key]:""}))} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
            <button onClick={limpar} className="text-[10px] text-slate-400 hover:text-red-500 font-semibold">Limpar tudo</button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-semibold">
            Exibindo <span className="text-slate-800 font-bold">{filtrados.length}</span> de <span className="text-slate-800 font-bold">{pedidos.length}</span> pedidos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th onClick={()=>toggleSort("numero_sc")} className={thC("numero_sc")}>Nº SC{arr("numero_sc")}</th>
                <th onClick={()=>toggleSort("data")}      className={thC("data")}>Data{arr("data")}</th>
                <th className="p-3 font-semibold text-slate-500">Destino</th>
                <th className="p-3 font-semibold text-slate-500">Itens</th>
                <th onClick={()=>toggleSort("urgencia")}  className={thC("urgencia")}>Urgência{arr("urgencia")}</th>
                <th onClick={()=>toggleSort("status")}    className={thC("status")}>Status{arr("status")}</th>
                <th className="p-3 font-semibold text-slate-500 min-w-[130px]">Progresso</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.length===0
                ? <tr><td colSpan={8} className="p-10 text-center text-slate-400">Nenhum pedido encontrado.</td></tr>
                : filtrados.map(p=>{
                  const pct = PROGRESSO[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-800">{p.numero_sc}</td>
                      <td className="p-3 text-slate-600">{fmtDate(p.data)}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{p.destino}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          {p.tipo_destino==="FROTA"?"Frota":p.tipo_destino==="OBRA"?"Obra":"Equipamento"}
                          {" — "}{p.solicitante}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{p.itens.length}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${URG_COLOR[p.urgencia]}`}>
                          {p.urgencia.charAt(0)+p.urgencia.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor(p.status)}`} style={{width:`${pct}%`}}/>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <button onClick={()=>setDrawer(p)} className="text-[#2563EB] hover:text-[#EA6C0A] text-[11px] font-bold transition-colors whitespace-nowrap">
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

      {/* Modal: Novo Pedido */}
      <Modal isOpen={showForm} onClose={()=>setShowForm(false)} title="Novo Pedido de Orçamento" size="lg">
        <div className="space-y-5 text-sm">
          {/* Urgência + Tipo Destino */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Urgência</label>
              <select value={form.urgencia} onChange={e=>setForm(p=>({...p,urgencia:e.target.value as Urgencia}))} className={inp}>
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo de Destino</label>
              <select value={form.tipo_destino} onChange={e=>setForm(p=>({...p,tipo_destino:e.target.value as TipoDestino,destino:""}))} className={inp}>
                <option value="FROTA">Frota / Equipamento de campo</option>
                <option value="OBRA">Obra</option>
                <option value="EQUIPAMENTO">Equipamento interno</option>
              </select>
            </div>
          </div>

          {/* Destino específico */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">
              {form.tipo_destino==="FROTA"?"Selecionar Frota":form.tipo_destino==="OBRA"?"Nome da Obra":"Selecionar Equipamento"}
            </label>
            {form.tipo_destino==="OBRA"
              ? <input value={form.destino} onChange={e=>setForm(p=>({...p,destino:e.target.value}))} placeholder="Ex: Obra Rodovia BR-153" className={inp}/>
              : <select value={form.destino} onChange={e=>setForm(p=>({...p,destino:e.target.value}))} className={inp}>
                  <option value="">Selecione...</option>
                  {(form.tipo_destino==="FROTA"?FROTAS:EQUIPAMENTOS_LIST).map(o=><option key={o} value={o}>{o}</option>)}
                </select>
            }
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Itens Solicitados</label>
              <button onClick={addItem} className="text-[10px] font-bold text-[#EA6C0A] hover:underline">+ Adicionar item</button>
            </div>
            <div className="space-y-2">
              {form.itens.map((it,i)=>(
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.descricao} onChange={e=>setItem(i,"descricao",e.target.value)}
                    placeholder="Descrição do item" className={`${inp} col-span-6`}/>
                  <input type="number" min={1} value={it.quantidade} onChange={e=>setItem(i,"quantidade",Number(e.target.value))}
                    className={`${inp} col-span-2`}/>
                  <select value={it.unidade} onChange={e=>setItem(i,"unidade",e.target.value)} className={`${inp} col-span-3`}>
                    {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={()=>removeItem(i)} disabled={form.itens.length===1}
                    className="col-span-1 text-slate-300 hover:text-red-500 transition-colors text-lg font-bold disabled:opacity-30">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
            <button onClick={handleCriar}
              className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all">
              Enviar para Suprimentos
            </button>
          </div>
        </div>
      </Modal>

      {/* Drawer */}
      {drawer&&(
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setDrawer(null)}/>
          <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="bg-[#0F172A] p-5 text-white">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pedido de Orçamento</p>
                  <h2 className="text-xl font-black font-mono mt-0.5">{drawer.numero_sc}</h2>
                </div>
                <button onClick={()=>setDrawer(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
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
                  <div className={`h-full rounded-full ${barColor(drawer.status)}`} style={{width:`${PROGRESSO[drawer.status]}%`}}/>
                </div>
              </div>
            </div>

            {/* Detalhes */}
            <div className="p-5 space-y-3 border-b border-slate-100">
              {[
                ["Solicitante", drawer.solicitante],
                ["Destino", drawer.destino],
                ["Tipo", drawer.tipo_destino==="FROTA"?"Frota":drawer.tipo_destino==="OBRA"?"Obra":"Equipamento"],
                ["Data", fmtDate(drawer.data)],
              ].map(([k,v])=>(
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400 font-medium">{k}</span>
                  <span className="font-bold text-slate-800">{v}</span>
                </div>
              ))}

              {/* Itens */}
              <div className="pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Itens</p>
                <div className="space-y-1.5">
                  {drawer.itens.map((it,i)=>(
                    <div key={i} className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-700 font-medium">{it.descricao}</span>
                      <span className="font-bold text-slate-500 shrink-0 ml-3">{it.quantidade} {it.unidade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações */}
              {renderAcoes(drawer)}
            </div>

            {/* Timeline */}
            <div className="p-5 flex-1">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Linha do Tempo</h3>
              <div className="relative">
                {drawer.timeline.map((step,i)=>{
                  const isLast = i===drawer.timeline.length-1;
                  return (
                    <div key={i} className="flex gap-4 relative">
                      {!isLast&&<div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100"/>}
                      <div className="shrink-0 mt-1">
                        {step.estado==="concluido"&&<div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>}
                        {step.estado==="atual"    &&<div className="w-6 h-6 rounded-full bg-[#EA6C0A] flex items-center justify-center text-white text-[10px] font-black">▶</div>}
                        {step.estado==="rejeitado"&&<div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-black">✕</div>}
                        {step.estado==="futuro"   &&<div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white"/>}
                      </div>
                      <div className={`pb-5 flex-1 ${step.estado==="futuro"?"opacity-35":""}`}>
                        <p className={`text-sm font-bold ${step.estado==="rejeitado"?"text-red-600":step.estado==="atual"?"text-[#EA6C0A]":"text-slate-800"}`}>
                          {step.titulo}
                        </p>
                        {step.subtitulo&&<p className="text-[11px] text-slate-500 mt-0.5">{step.subtitulo}</p>}
                        {step.data&&<p className="text-[10px] text-slate-400 mt-1 font-mono">{step.data}</p>}
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
