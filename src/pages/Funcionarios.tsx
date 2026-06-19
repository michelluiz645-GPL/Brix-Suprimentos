import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCpf } from "@/utils/formatters";
import type { Employee } from "@/types";
import { Plus, Edit2, UserX, Search } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyForm = () => ({ nome: "", funcao: "", equipe_num: "", cpf: "", tel: "", status: "ATIVO" as const, demitido: false });

export default function Funcionarios() {
  const toast = useToast();
  const [funcionarios, setFunc] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("ATIVO");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [sel, setSel] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.funcionarios.list(filtroStatus ? `status=${filtroStatus}` : undefined).then((r) => {
      const d = (r as { data: Employee[] }).data ?? [];
      setFunc(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os funcionários."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroStatus]);

  const abrirNovo = () => { setForm(emptyForm()); setSel(null); setModal("novo"); };
  const abrirEditar = (f: Employee) => {
    setForm({ nome: f.nome, funcao: f.funcao, equipe_num: f.equipe_num, cpf: f.cpf ?? "", tel: f.tel ?? "", status: f.status as "ATIVO", demitido: f.demitido });
    setSel(f); setModal("editar");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.funcao.trim()) { toast.error("Função é obrigatória."); return; }
    setSalvando(true);
    try {
      if (modal === "novo") {
        await api.funcionarios.create(form);
        toast.success("Funcionário cadastrado com sucesso!");
      } else if (sel?.id) {
        await api.funcionarios.update(sel.id, form);
        toast.success("Funcionário atualizado com sucesso!");
      }
      setModal(null); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const demitir = async (f: Employee) => {
    if (!f.id) return;
    if (!confirm(`Confirmar desligamento de ${f.nome}?`)) return;
    try {
      await api.funcionarios.update(f.id, { ...f, status: "INATIVO", demitido: true });
      toast.success("Funcionário desligado.");
      carregar();
    } catch { toast.error("Não foi possível registrar o desligamento."); }
  };

  const setF = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = funcionarios.filter((f) =>
    !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.funcao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Funcionários" subtitle="Cadastro e gestão de colaboradores"
          action={
            <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Novo Funcionário
            </button>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou função..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
              <option value="">Todos</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum funcionário encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Nome", "Função", "Equipe", "CPF", "Telefone", "Status", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-800">{f.nome}</td>
                    <td className="p-3 text-slate-600">{f.funcao}</td>
                    <td className="p-3 font-mono text-slate-500">{f.equipe_num || "—"}</td>
                    <td className="p-3 font-mono text-slate-500">{f.cpf ? formatCpf(f.cpf) : "—"}</td>
                    <td className="p-3 text-slate-500">{f.tel || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.status === "ATIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(f)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Edit2 size={14} /></button>
                        {f.status === "ATIVO" && (
                          <button onClick={() => demitir(f)} className="text-slate-400 hover:text-rose-500 transition-colors"><UserX size={14} /></button>
                        )}
                      </div>
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
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {modal === "novo" ? "Novo Funcionário" : "Editar Funcionário"}
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Nome Completo *</label>
                <input value={form.nome} onChange={setF("nome")} placeholder="Nome completo" className={inp} />
              </div>
              <div>
                <label className={lbl}>Função *</label>
                <input value={form.funcao} onChange={setF("funcao")} placeholder="Ex: Operador de máquina" className={inp} />
              </div>
              <div>
                <label className={lbl}>Número da Equipe</label>
                <input value={form.equipe_num} onChange={setF("equipe_num")} placeholder="Ex: 01" className={inp} />
              </div>
              <div>
                <label className={lbl}>CPF</label>
                <input value={form.cpf} onChange={setF("cpf")} placeholder="000.000.000-00" className={inp} />
              </div>
              <div>
                <label className={lbl}>Telefone</label>
                <input value={form.tel} onChange={setF("tel")} placeholder="(00) 00000-0000" className={inp} />
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
