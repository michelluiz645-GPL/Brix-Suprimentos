import React, { useState } from "react";
import api from "@/services/api";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import PageHeader from "@/components/PageHeader";
import type { User } from "@/types";

interface Item { descricao: string; quantidade: number; unidade: string; fabricante: string; part_number: string; aplicacao_equipamento: string; }
const itemVazio = (): Item => ({ descricao: "", quantidade: 1, unidade: "UN", fabricante: "", part_number: "", aplicacao_equipamento: "" });

const UNIDADES = ["UN", "KG", "LT", "CX", "MT", "PC", "PAR", "JG", "GL", "ROLO", "SACO", "BALDE"];
const DESTINOS = ["Frota", "Obra", "Administração", "Manutenção", "Outros"] as const;
const URGENCIAS: { valor: string; cor: string }[] = [
  { valor: "Baixa",   cor: "bg-green-100 text-green-700 border-green-300" },
  { valor: "Média",   cor: "bg-amber-100 text-amber-700 border-amber-300" },
  { valor: "Alta",    cor: "bg-orange-100 text-orange-700 border-orange-300" },
  { valor: "Crítica", cor: "bg-red-100 text-red-700 border-red-300" },
];

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

interface Props { user: User; onConcluir?: () => void; }

export default function NovaSC({ user, onConcluir }: Props) {
  const toast = useToast();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    data_necessaria: "", funcao_cargo: "",
    destino: "Frota" as typeof DESTINOS[number],
    veiculo_frota: "", urgencia: "Média",
    local_entrega: "", ponto_referencia: "", horario_recebimento: "",
    motivo: "", ordem_servico: "",
  });
  const [itens, setItens] = useState<Item[]>([itemVazio()]);
  const [erros, setErros] = useState<Record<string, string>>({});

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const setItem = (i: number, k: keyof Item, v: string | number) =>
    setItens(p => p.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const addItem    = () => setItens(p => [...p, itemVazio()]);
  const removeItem = (i: number) => setItens(p => p.filter((_, idx) => idx !== i));

  const validar = () => {
    const e: Record<string, string> = {};
    if (!form.destino) e.destino = "Destino é obrigatório.";
    if (!form.urgencia) e.urgencia = "Urgência é obrigatória.";
    if (!form.motivo.trim()) e.motivo = "Justificativa é obrigatória.";
    if (itens.some(it => !it.descricao.trim())) e.itens = "Todos os itens precisam de descrição.";
    if (itens.some(it => it.quantidade <= 0))   e.itens = "Quantidade deve ser maior que zero.";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    setSalvando(true);
    try {
      await api.sc.create({ ...form, itens });
      toast.success("Solicitação de compra aberta com sucesso!");
      setForm({ data_necessaria:"", funcao_cargo:"", destino:"Frota", veiculo_frota:"", urgencia:"Média", local_entrega:"", ponto_referencia:"", horario_recebimento:"", motivo:"", ordem_servico:"" });
      setItens([itemVazio()]);
      onConcluir?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir solicitação.");
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <PageHeader title="Nova Solicitação de Compra" subtitle={`Solicitante: ${user.nome}`} />

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 01 — Dados */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white flex items-center justify-center text-[10px] font-black">1</span>
            Dados da Solicitação
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Data necessária</label>
              <input type="date" value={form.data_necessaria} onChange={setF("data_necessaria")} className={inp} />
            </div>
            <div>
              <label className={lbl}>Função / Cargo</label>
              <input value={form.funcao_cargo} onChange={setF("funcao_cargo")} placeholder="Ex: Mecânico" className={inp} />
            </div>
          </div>
        </div>

        {/* 02 — Classificação */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white flex items-center justify-center text-[10px] font-black">2</span>
            Classificação
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Destino *</label>
              <select value={form.destino} onChange={setF("destino")} className={inp}>
                {DESTINOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {erros.destino && <p className="text-[11px] text-rose-500 mt-1">{erros.destino}</p>}
            </div>
            {form.destino === "Frota" && (
              <div>
                <label className={lbl}>Veículo / Frota</label>
                <input value={form.veiculo_frota} onChange={setF("veiculo_frota")} placeholder="Ex: PC200 - Escavadeira" className={inp} />
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Urgência *</label>
            <div className="flex gap-3 flex-wrap">
              {URGENCIAS.map(u => (
                <button key={u.valor} type="button"
                  onClick={() => setForm(p => ({ ...p, urgencia: u.valor }))}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                    form.urgencia === u.valor ? `${u.cor} scale-105 shadow-sm` : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>
                  {u.valor}
                </button>
              ))}
            </div>
            {erros.urgencia && <p className="text-[11px] text-rose-500 mt-1">{erros.urgencia}</p>}
          </div>
        </div>

        {/* 03 — Entrega */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white flex items-center justify-center text-[10px] font-black">3</span>
            Informações de Entrega
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Local de entrega</label>
              <input value={form.local_entrega} onChange={setF("local_entrega")} placeholder="Ex: Almoxarifado Central, Km 15..." className={inp} />
            </div>
            <div>
              <label className={lbl}>Ponto de referência</label>
              <input value={form.ponto_referencia} onChange={setF("ponto_referencia")} placeholder="Ex: Portaria principal" className={inp} />
            </div>
            <div>
              <label className={lbl}>Horário de recebimento</label>
              <input type="time" value={form.horario_recebimento} onChange={setF("horario_recebimento")} className={inp} />
            </div>
          </div>
        </div>

        {/* 04 — Itens */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white flex items-center justify-center text-[10px] font-black">4</span>
              Itens Solicitados
            </h3>
            <button type="button" onClick={addItem}
              className="text-xs font-bold text-[#EA6C0A] hover:underline">+ Adicionar item</button>
          </div>
          {erros.itens && <p className="text-[11px] text-rose-500">{erros.itens}</p>}
          <div className="space-y-3">
            {itens.map((it, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item {i + 1}</span>
                  {itens.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="text-xs text-rose-400 hover:text-rose-600 font-bold">✕ Remover</button>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-4">
                    <label className={lbl}>Descrição *</label>
                    <input value={it.descricao} onChange={e => setItem(i, "descricao", e.target.value)} placeholder="Ex: Filtro de óleo motor" className={inp} />
                  </div>
                  <div className="col-span-1">
                    <label className={lbl}>Qtd *</label>
                    <input type="number" min={0.01} step={0.01} value={it.quantidade} onChange={e => setItem(i, "quantidade", Number(e.target.value))} className={inp} />
                  </div>
                  <div className="col-span-1">
                    <label className={lbl}>Unid</label>
                    <select value={it.unidade} onChange={e => setItem(i, "unidade", e.target.value)} className={inp}>
                      {UNIDADES.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={lbl}>Fabricante</label>
                    <input value={it.fabricante} onChange={e => setItem(i, "fabricante", e.target.value)} placeholder="Opcional" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Part Number</label>
                    <input value={it.part_number} onChange={e => setItem(i, "part_number", e.target.value)} placeholder="Opcional" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Aplicação / Equipamento</label>
                    <input value={it.aplicacao_equipamento} onChange={e => setItem(i, "aplicacao_equipamento", e.target.value)} placeholder="Ex: PC200 nº de série 1234" className={inp} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 05 — Justificativa */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#EA6C0A] text-white flex items-center justify-center text-[10px] font-black">5</span>
            Motivo / Justificativa
          </h3>
          <div>
            <label className={lbl}>Justificativa *</label>
            <textarea value={form.motivo} onChange={setF("motivo")} rows={4}
              placeholder="Descreva o motivo da solicitação, equipamento parado, impacto na operação..."
              className={`${inp} resize-none`} />
            {erros.motivo && <p className="text-[11px] text-rose-500 mt-1">{erros.motivo}</p>}
          </div>
          <div>
            <label className={lbl}>Nº da OS / EAP</label>
            <input value={form.ordem_servico} onChange={setF("ordem_servico")} placeholder="Ex: OS-2026-0542" className={inp} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={onConcluir}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="px-8 py-2.5 text-sm font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all disabled:opacity-60 shadow-lg shadow-orange-500/20">
            {salvando ? "Enviando..." : "Fechar Pedido →"}
          </button>
        </div>
      </form>
    </div>
  );
}
