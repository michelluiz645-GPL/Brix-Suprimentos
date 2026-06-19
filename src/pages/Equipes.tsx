import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { Team, Employee } from "@/types";
import { Plus, Edit2, Users } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyForm = () => ({ nome: "", numero: "", responsavel: "", veiculo: "", tipo: "" });

export default function Equipes() {
  const toast = useToast();
  const [equipes, setEquipes] = useState<Team[]>([]);
  const [funcionarios, setFunc] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [sel, setSel] = useState<Team | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.equipes.list().then((r) => {
        const d = (r as { data: Team[] }).data ?? [];
        setEquipes(Array.isArray(d) ? d : Object.values(d));
      }),
      api.funcionarios.list("status=ATIVO").then((r) => {
        const d = (r as { data: Employee[] }).data ?? [];
        setFunc(Array.isArray(d) ? d : Object.values(d));
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const membros = (eq: Team) => funcionarios.filter((f) => f.equipe_num === eq.numero);

  const abrirNovo = () => { setForm(emptyForm()); setSel(null); setModal("novo"); };
  const abrirEditar = (t: Team) => {
    setForm({ nome: t.nome, numero: t.numero, responsavel: t.responsavel ?? "", veiculo: t.veiculo ?? "", tipo: t.tipo ?? "" });
    setSel(t); setModal("editar");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome da equipe é obrigatório."); return; }
    if (!form.numero.trim()) { toast.error("Número da equipe é obrigatório."); return; }
    setSalvando(true);
    try {
      if (modal === "novo") {
        await api.equipes.create(form);
        toast.success("Equipe cadastrada!");
      } else if (sel?.id) {
        await api.equipes.update(sel.id, form);
        toast.success("Equipe atualizada!");
      }
      setModal(null); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const setF = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Equipes de Campo" subtitle="Composição e gestão de equipes"
          action={
            <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Nova Equipe
            </button>
          } />

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">Carregando equipes...</div>
        ) : equipes.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">Nenhuma equipe cadastrada.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipes.map((eq) => {
              const mbs = membros(eq);
              return (
                <div key={eq.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Equipe {eq.numero}</span>
                      <h3 className="text-sm font-bold text-slate-800 mt-0.5">{eq.nome}</h3>
                    </div>
                    <button onClick={() => abrirEditar(eq)} className="text-slate-300 hover:text-[#EA6C0A] transition-colors"><Edit2 size={14} /></button>
                  </div>
                  {eq.responsavel && <p className="text-xs text-slate-500 mb-1"><span className="font-bold">Responsável:</span> {eq.responsavel}</p>}
                  {eq.veiculo && <p className="text-xs text-slate-500 mb-3"><span className="font-bold">Veículo:</span> {eq.veiculo}</p>}
                  <div className="border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Users size={11} /> {mbs.length} Membro(s)
                    </div>
                    {mbs.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">Sem membros vinculados.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {mbs.map((m) => (
                          <span key={m.id} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m.nome}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {modal === "novo" ? "Nova Equipe" : "Editar Equipe"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Nome da Equipe *</label>
                <input value={form.nome} onChange={setF("nome")} placeholder="Ex: Equipe Terraplanagem Norte" className={inp} />
              </div>
              <div>
                <label className={lbl}>Número da Equipe *</label>
                <input value={form.numero} onChange={setF("numero")} placeholder="Ex: 01" className={inp} />
              </div>
              <div>
                <label className={lbl}>Responsável</label>
                <input value={form.responsavel} onChange={setF("responsavel")} placeholder="Nome do líder da equipe" className={inp} />
              </div>
              <div>
                <label className={lbl}>Veículo Associado</label>
                <input value={form.veiculo} onChange={setF("veiculo")} placeholder="Placa ou modelo" className={inp} />
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
