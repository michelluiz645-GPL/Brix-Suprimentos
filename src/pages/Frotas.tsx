import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { Vehicle } from "@/types";
import { Plus, Edit2 } from "lucide-react";

const TIPOS = ["CAMINHÃO", "CAMINHONETE", "VAN", "ÔNIBUS", "RETROESCAVADEIRA", "MOTONIVELADORA", "PÁ CARREGADEIRA", "TRATOR", "OUTRO"];

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyForm = () => ({ placa: "", modelo: "", tipo: TIPOS[0], equipe: "", ano: "", status: "ATIVO" as const });

export default function Frotas() {
  const toast = useToast();
  const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [sel, setSel] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.veiculos.list().then((r) => {
      const d = (r as { data: Vehicle[] }).data ?? [];
      setVeiculos(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os veículos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setForm(emptyForm()); setSel(null); setModal("novo"); };
  const abrirEditar = (v: Vehicle) => {
    setForm({ placa: v.placa, modelo: v.modelo, tipo: v.tipo, equipe: v.equipe ?? "", ano: v.ano ?? "", status: v.status as "ATIVO" });
    setSel(v); setModal("editar");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim()) { toast.error("Placa é obrigatória."); return; }
    if (!form.modelo.trim()) { toast.error("Modelo é obrigatório."); return; }
    setSalvando(true);
    try {
      if (modal === "novo") {
        await api.veiculos.create(form);
        toast.success("Veículo cadastrado!");
      } else if (sel?.id) {
        await api.veiculos.update(sel.id, form);
        toast.success("Veículo atualizado!");
      }
      setModal(null); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const setF = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = veiculos.filter((v) => {
    const statusOk = !filtroStatus || v.status === filtroStatus;
    const tipoOk = !filtroTipo || v.tipo === filtroTipo;
    return statusOk && tipoOk;
  });

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Frotas de Veículos" subtitle="Cadastro e controle da frota"
          action={
            <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Novo Veículo
            </button>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os tipos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os status</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum veículo encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Placa", "Modelo", "Tipo", "Equipe", "Ano", "Status", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#EA6C0A]">{v.placa}</td>
                    <td className="p-3 font-medium text-slate-800">{v.modelo}</td>
                    <td className="p-3 text-slate-500">{v.tipo}</td>
                    <td className="p-3 font-mono text-slate-500">{v.equipe || "—"}</td>
                    <td className="p-3 text-slate-500">{v.ano || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === "ATIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => abrirEditar(v)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Edit2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {modal === "novo" ? "Novo Veículo" : "Editar Veículo"}
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Placa *</label>
                <input value={form.placa} onChange={setF("placa")} placeholder="Ex: ABC-1234" className={`${inp} uppercase`} />
              </div>
              <div>
                <label className={lbl}>Modelo *</label>
                <input value={form.modelo} onChange={setF("modelo")} placeholder="Ex: Iveco Daily" className={inp} />
              </div>
              <div>
                <label className={lbl}>Tipo</label>
                <select value={form.tipo} onChange={setF("tipo")} className={inp}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Equipe Associada</label>
                <input value={form.equipe} onChange={setF("equipe")} placeholder="Nº da equipe" className={inp} />
              </div>
              <div>
                <label className={lbl}>Ano</label>
                <input value={form.ano} onChange={setF("ano")} placeholder="Ex: 2022" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Status</label>
                <select value={form.status} onChange={setF("status")} className={inp}>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
