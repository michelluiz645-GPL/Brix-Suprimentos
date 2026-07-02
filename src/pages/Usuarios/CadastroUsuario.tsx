import React, { useState } from "react";
import { PAPEL_LABELS, type Papel } from "@/types";

const PAPEIS: { papel: Papel; icone: string; setor: string; setorCor: string; descricao: string; pode: string[]; naoPode: string[] }[] = [
  {
    papel: "op_manutencao",
    icone: "🔧",
    setor: "Manutenção",
    setorCor: "bg-emerald-100 text-emerald-700",
    descricao: "Abre solicitações de compra para sua equipe e acompanha o andamento.",
    pode: ["Abrir nova SC", "Ver suas próprias SCs", "Confirmar recebimento"],
    naoPode: ["Aprovar SCs", "Registrar cotação", "Ver SCs de outros"],
  },
  {
    papel: "admin_manutencao",
    icone: "🔧",
    setor: "Admin Manutenção",
    setorCor: "bg-emerald-100 text-emerald-700",
    descricao: "Aprova ou rejeita solicitações após a cotação do Suprimentos.",
    pode: ["Abrir nova SC", "Ver todas as SCs da Manutenção", "Aprovar / Rejeitar cotações"],
    naoPode: ["Aprovar pelo Suprimentos", "Registrar compra"],
  },
  {
    papel: "op_suprimentos",
    icone: "📦",
    setor: "Suprimentos",
    setorCor: "bg-blue-100 text-blue-700",
    descricao: "Recebe pedidos, realiza cotação e confirma compra.",
    pode: ["Ver todas as SCs abertas", "Registrar cotação", "Confirmar compra", "Dar entrada"],
    naoPode: ["Aprovação final", "Ver SCs de outros setores (filtrado)"],
  },
  {
    papel: "admin_suprimentos",
    icone: "📦",
    setor: "Admin Suprimentos",
    setorCor: "bg-blue-100 text-blue-700",
    descricao: "Supervisor do Suprimentos. Aprova pedidos antes da compra e monitora SLAs.",
    pode: ["Aprovação final de SC", "Ver todas as SCs", "Receber alertas de SLA", "Resumo diário"],
    naoPode: ["Nada — acesso amplo"],
  },
  {
    papel: "almoxarife",
    icone: "🏪",
    setor: "Almoxarifado",
    setorCor: "bg-amber-100 text-amber-700",
    descricao: "Recebe materiais e registra entrada no sistema.",
    pode: ["Ver SCs em trânsito / compradas", "Dar entrada parcial ou total", "Receber alertas de entrega"],
    naoPode: ["Criar SC", "Aprovar", "Ver histórico completo"],
  },
  {
    papel: "admin_geral",
    icone: "⚙️",
    setor: "Administrador",
    setorCor: "bg-slate-100 text-slate-700",
    descricao: "Acesso irrestrito a todos os módulos e ações do sistema.",
    pode: ["Tudo — sem restrições"],
    naoPode: [],
  },
];

const NOTIF_DEFAULTS: Record<Papel, string[]> = {
  op_manutencao:    ["sc_propria_recebida", "sc_aprovada", "sc_comprada", "material_entregue"],
  admin_manutencao: ["sc_aguardando_aprovacao_mnt", "sc_rejeitada_sup"],
  op_suprimentos:   ["nova_sc_aberta", "sc_aprovada_compra", "material_a_chegar"],
  admin_suprimentos:["sc_aguardando_aprovacao_sup", "sla_vencendo", "resumo_diario"],
  almoxarife:       ["material_a_chegar", "material_atrasado"],
  admin_geral:      ["nova_sc_aberta", "sc_aguardando_aprovacao_mnt", "sc_aguardando_aprovacao_sup", "sc_aprovada_compra", "material_a_chegar", "material_atrasado", "sla_vencendo", "resumo_diario", "sc_propria_recebida", "sc_aprovada", "sc_comprada", "material_entregue", "sc_rejeitada_sup"],
};

const NOTIF_LABELS: Record<string, string> = {
  nova_sc_aberta:              "Nova SC aberta",
  sc_aguardando_aprovacao_mnt: "SC aguardando aprovação Manutenção",
  sc_aguardando_aprovacao_sup: "SC aguardando aprovação Suprimentos",
  sc_aprovada_compra:          "SC aprovada — pronta para compra",
  sc_rejeitada_sup:            "SC rejeitada pelo Suprimentos",
  sc_propria_recebida:         "Sua SC foi recebida",
  sc_aprovada:                 "Sua SC foi aprovada",
  sc_comprada:                 "Material comprado",
  material_entregue:           "Material entregue",
  material_a_chegar:           "Material a caminho",
  material_atrasado:           "Material com atraso",
  sla_vencendo:                "SLA próximo do vencimento",
  resumo_diario:               "Resumo diário",
};

const SETORES = ["ALMOXARIFADO", "ENGENHARIA", "MANUTENCAO"] as const;
const SETOR_LABEL: Record<string, string> = { ALMOXARIFADO: "Suprimentos", ENGENHARIA: "Engenharia", MANUTENCAO: "Manutenção" };

interface Props {
  onSalvar: (dados: object) => Promise<void>;
  onCancelar: () => void;
  salvando?: boolean;
}

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

export default function CadastroUsuario({ onSalvar, onCancelar, salvando }: Props) {
  const [form, setForm] = useState({
    nome: "", login: "", email: "", whatsapp: "", senha: "",
    nivel: "OPERADOR", setor: "MANUTENCAO",
  });
  const [papel, setPapel] = useState<Papel | "">("");
  const [notifs, setNotifs] = useState<string[]>([]);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const selecionarPapel = (p: Papel) => {
    setPapel(p);
    setNotifs(NOTIF_DEFAULTS[p] ?? []);
  };

  const toggleNotif = (chave: string) =>
    setNotifs(p => p.includes(chave) ? p.filter(n => n !== chave) : [...p, chave]);

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.nome.trim())    e.nome  = "Nome é obrigatório.";
    if (!form.login.trim())   e.login = "Login é obrigatório.";
    if (!form.senha || form.senha.length < 6) e.senha = "Senha mínima de 6 caracteres.";
    if (!papel)               e.papel = "Selecione o papel do usuário.";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    await onSalvar({ ...form, papel, notificacoes: notifs });
  };

  const papelInfo = PAPEIS.find(p => p.papel === papel);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Seção 01 — Dados */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white text-[10px] flex items-center justify-center font-black">1</span>
          Dados do usuário
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Nome completo *</label>
            <input value={form.nome} onChange={setF("nome")} placeholder="Ex: João da Silva" className={inp} />
            {erros.nome && <p className="text-[11px] text-rose-500 mt-1">{erros.nome}</p>}
          </div>
          <div>
            <label className={lbl}>Login *</label>
            <input value={form.login} onChange={setF("login")} placeholder="Ex: joao.silva" className={inp} />
            {erros.login && <p className="text-[11px] text-rose-500 mt-1">{erros.login}</p>}
          </div>
          <div>
            <label className={lbl}>Senha inicial *</label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={form.senha} onChange={setF("senha")}
                placeholder="Mínimo 6 caracteres" className={inp}
              />
              <button type="button" onClick={() => setMostrarSenha(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                {mostrarSenha ? "Ocultar" : "Ver"}
              </button>
            </div>
            {erros.senha && <p className="text-[11px] text-rose-500 mt-1">{erros.senha}</p>}
          </div>
          <div>
            <label className={lbl}>E-mail (opcional)</label>
            <input type="email" value={form.email} onChange={setF("email")} placeholder="email@empresa.com" className={inp} />
          </div>
          <div>
            <label className={lbl}>WhatsApp (opcional)</label>
            <input value={form.whatsapp} onChange={setF("whatsapp")} placeholder="(XX) XXXXX-XXXX" className={inp} />
          </div>
          <div>
            <label className={lbl}>Nível de acesso</label>
            <select value={form.nivel} onChange={setF("nivel")} className={inp}>
              <option value="OPERADOR">Operador</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Setor</label>
            <select value={form.setor} onChange={setF("setor")} className={inp}>
              {SETORES.map(s => <option key={s} value={s}>{SETOR_LABEL[s]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Seção 02 — Papel */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white text-[10px] flex items-center justify-center font-black">2</span>
          Papel no fluxo de compras
        </h3>
        {erros.papel && <p className="text-[11px] text-rose-500 mb-3">{erros.papel}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PAPEIS.map(p => (
            <button
              key={p.papel} type="button"
              onClick={() => selecionarPapel(p.papel)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                papel === p.papel
                  ? "border-[#EA6C0A] bg-orange-50 shadow-md shadow-orange-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{p.icone}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.setorCor}`}>{p.setor}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">{PAPEL_LABELS[p.papel]}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{p.descricao}</p>
              {papel === p.papel && (
                <div className="mt-3 pt-3 border-t border-orange-200 space-y-1">
                  {p.pode.map(item => <p key={item} className="text-[10px] text-emerald-700">→ {item}</p>)}
                  {p.naoPode.map(item => <p key={item} className="text-[10px] text-rose-500">✗ {item}</p>)}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Seção 03 — Notificações */}
      {papel && (
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white text-[10px] flex items-center justify-center font-black">3</span>
            Notificações
            <span className="text-[10px] font-normal text-slate-400">(pré-selecionadas para este papel)</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(NOTIF_LABELS).map(([chave, titulo]) => (
              <label key={chave} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                <div
                  onClick={() => toggleNotif(chave)}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${notifs.includes(chave) ? "bg-[#EA6C0A]" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notifs.includes(chave) ? "left-5" : "left-0.5"}`} />
                </div>
                <span className="text-xs font-medium text-slate-700">{titulo}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={salvando}
          className="px-6 py-2.5 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all disabled:opacity-60">
          {salvando ? "Salvando..." : "Criar Usuário"}
        </button>
      </div>
    </form>
  );
}
