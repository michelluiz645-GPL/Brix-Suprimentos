import React, { useState, useEffect } from "react";
import api from "@/services/api";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { User } from "@/types";
import { Plus, Edit, Lock } from "lucide-react";

const SETORES  = ["ALMOXARIFADO", "ENGENHARIA", "MANUTENCAO"];
const NIVEIS   = ["OPERADOR", "ADMIN"];
const MODULOS_ALL = [
  "Dashboard","Consultar","Entrada","Saída","Histórico Cupons","Devolução","Entregas Pend.","Combustíveis","Produtos",
  "Valor Estoque","Inventário","Funcionários","Equipes","Frotas","Suprimentos Kobo","Pedidos de Compra","EPI",
  "Obras & Projetos","Fornecedores","Débitos Oficina","Relatórios","Backup","Usuários","Meus Pedidos","Equipamentos",
];

const NIVEL_COLOR: Record<string, string> = {
  ADMIN: "bg-amber-100 text-amber-800",
  OPERADOR: "bg-blue-100 text-blue-800",
};

export default function Usuarios() {
  const toast = useToast();
  const [users, setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<"create" | "edit" | "senha" | null>(null);
  const [target, setTarget] = useState<User | null>(null);
  const [form, setForm]     = useState<Partial<User & { senha: string }>>({ setor: "ALMOXARIFADO", nivel: "OPERADOR", modulos: [] });
  const [novaSenha, setNovaSenha] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.usuarios.list().then((r) => {
      setUsers(Array.isArray(r) ? r as User[] : []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ setor: "ALMOXARIFADO", nivel: "OPERADOR", modulos: [] }); setModal("create"); };
  const openEdit   = (u: User) => { setTarget(u); setForm({ ...u }); setModal("edit"); };
  const openSenha  = (u: User) => { setTarget(u); setNovaSenha(""); setModal("senha"); };

  const toggleModulo = (m: string) => setForm((p) => {
    const prev = p.modulos ?? [];
    return { ...p, modulos: prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m] };
  });

  const handleSave = async () => {
    if (!form.login?.trim() || !form.nome?.trim()) { toast.error("Preencha nome e usuário."); return; }
    if (modal === "create" && !form.senha?.trim()) { toast.error("A senha é obrigatória para novo usuário."); return; }
    if (form.senha && form.senha.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    setSaving(true);
    try {
      if (modal === "create") await api.usuarios.create(form);
      else if (modal === "edit" && target?.id) await api.usuarios.update(target.id, form);
      toast.success(modal === "create" ? "Usuário criado com sucesso!" : "Usuário atualizado!");
      setModal(null); load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally { setSaving(false); }
  };

  const handleSenha = async () => {
    if (!novaSenha.trim() || novaSenha.length < 6) { toast.error("A nova senha deve ter pelo menos 6 caracteres."); return; }
    setSaving(true);
    try {
      await api.usuarios.resetSenha(target!.id!, novaSenha);
      toast.success("Senha redefinida com sucesso!");
      setModal(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Usuários & Permissões" subtitle="Gestão de acesso ao sistema"
          action={
            <button onClick={openCreate} className="flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all">
              <Plus size={16} /> Novo Usuário
            </button>
          }
        />

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Usuário", "Nome", "Nível", "Setor", "Módulos", ""].map((h) => <th key={h} className="p-3 font-semibold text-slate-500">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.login} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-700">{u.login}</td>
                      <td className="p-3 font-semibold text-slate-800">{u.nome}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${NIVEL_COLOR[u.nivel] ?? "bg-slate-100 text-slate-600"}`}>{u.nivel}</span></td>
                      <td className="p-3 text-slate-500">{u.setor}</td>
                      <td className="p-3 text-slate-400">{u.nivel === "ADMIN" ? "Todos" : `${(u.modulos ?? []).length} módulos`}</td>
                      <td className="p-3 flex items-center gap-2">
                        <button onClick={() => openEdit(u)} title="Editar" className="text-slate-400 hover:text-[#EA6C0A]"><Edit size={14} /></button>
                        <button onClick={() => openSenha(u)} title="Redefinir senha" className="text-slate-400 hover:text-blue-500"><Lock size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nenhum usuário cadastrado.</div>}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      <Modal isOpen={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "create" ? "Novo Usuário" : "Editar Usuário"} size="lg">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Login *", field: "login", placeholder: "usuário.sobrenome" },
              { label: "Nome Completo *", field: "nome", placeholder: "Nome como exibido" },
            ].map((f) => (
              <div key={f.field}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                <input value={String(form[f.field as keyof typeof form] ?? "")} onChange={(e) => setForm((p) => ({ ...p, [f.field]: e.target.value }))} placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Setor</label>
              <select value={String(form.setor ?? "")} onChange={(e) => setForm((p) => ({ ...p, setor: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]">
                {SETORES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nível</label>
              <select value={String(form.nivel ?? "")} onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]">
                {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {modal === "create" && (
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Senha *</label>
                <input type="password" value={form.senha ?? ""} onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))} placeholder="Mín. 6 caracteres"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]" />
              </div>
            )}
          </div>

          {form.nivel !== "ADMIN" && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Módulos Permitidos</label>
              <div className="grid grid-cols-3 gap-1.5">
                {MODULOS_ALL.map((m) => {
                  const checked = (form.modulos ?? []).includes(m);
                  return (
                    <label key={m} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border text-xs transition-colors ${checked ? "bg-[#EA6C0A]/10 border-[#EA6C0A]/30 text-[#C75B12] font-semibold" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleModulo(m)} className="hidden" />
                      <span className={`w-3 h-3 rounded border flex items-center justify-center ${checked ? "bg-[#EA6C0A] border-[#EA6C0A]" : "border-slate-300"}`}>
                        {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                      </span>
                      {m}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5"}`}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal isOpen={modal === "senha"} onClose={() => setModal(null)} title={`Redefinir Senha — ${target?.nome}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nova Senha</label>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mín. 6 caracteres"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#EA6C0A]" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
            <button onClick={handleSenha} disabled={saving}
              className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {saving ? "Salvando..." : "Redefinir Senha"}
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
