import React, { useState, useEffect } from "react";
import api from "@/services/api";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import type { User, ResponsabilidadePedidoOrcamento, ResponsabilidadeRequisicaoAlmoxarifado } from "@/types";
import { PAPEL_LABELS, RESPONSABILIDADE_PEDIDO_ORCAMENTO_LABELS, RESPONSABILIDADE_REQUISICAO_ALMOXARIFADO_LABELS } from "@/types";
import { Plus, Edit, Lock } from "lucide-react";
import CadastroUsuario from "@/pages/Usuarios/CadastroUsuario";

const SETORES  = ["ALMOXARIFADO", "ENGENHARIA", "MANUTENCAO"];
const NIVEIS   = ["OPERADOR", "ADMIN"];

const MODULOS_ALL: { chave: string; label: string }[] = [
  { chave: "dashboard",              label: "Dashboard" },
  { chave: "consultar_catalogo",     label: "Consultar Catálogo" },
  { chave: "registrar_entrada",      label: "Registrar Entrada" },
  { chave: "registrar_saida",        label: "Registrar Saída" },
  { chave: "historico_cupons",       label: "Histórico Cupons" },
  { chave: "devolucao",              label: "Devolução" },
  { chave: "entregas_pendentes",     label: "Entregas Pendentes" },
  { chave: "combustiveis",           label: "Combustíveis" },
  { chave: "fichas_produtos",        label: "Fichas de Produtos" },
  { chave: "valor_estoque",          label: "Valor de Estoque" },
  { chave: "inventario_geral",       label: "Inventário Geral" },
  { chave: "funcionarios",           label: "Funcionários" },
  { chave: "equipes_campo",          label: "Equipes de Campo" },
  { chave: "frotas_veiculos",        label: "Frotas de Veículos" },
  { chave: "reposicao_automatica",   label: "Reposição Automática" },
  { chave: "suprimentos_kobo",       label: "Suprimentos KOBO" },
  { chave: "solicitacao_compra",     label: "Solicitação de Compra" },
  { chave: "pedido_compra",          label: "Pedido de Compra" },
  { chave: "pedido_orcamento",       label: "Pedido de Orçamento" },
  { chave: "requisicao_almoxarifado",label: "Requisição de Almoxarifado" },
  { chave: "obras_projetos",         label: "Obras & Projetos" },
  { chave: "catalogo_materiais_obra",label: "Catálogo de Obras" },
  { chave: "rel_abastecimentos",     label: "Rel. Abastecimentos" },
  { chave: "fornecedores",           label: "Fornecedores" },
  { chave: "seguranca_epi",          label: "Segurança & EPI" },
  { chave: "equipamentos_pesados",   label: "Equipamentos Pesados" },
  { chave: "debitos_manutencao",     label: "Débitos Manutenção" },
  { chave: "seguranca_dados",        label: "Segurança de Dados" },
  { chave: "administracao_usuarios", label: "Administração de Usuários" },
];

const NIVEL_COLOR: Record<string, string> = {
  ADMIN: "bg-amber-100 text-amber-800",
  OPERADOR: "bg-blue-100 text-blue-800",
};

const RESPONSABILIDADES_PEDIDO_ORCAMENTO: ResponsabilidadePedidoOrcamento[] = [
  "solicitante", "cotador", "aprovador_manutencao", "aprovador_suprimentos", "aprovador_engenharia", "comprador",
];

// Cada setor só faz sentido acumular as responsabilidades que dizem respeito
// a ele — Engenharia não deve ver "Aprovador Manutenção", por exemplo.
const RESPONSABILIDADES_POR_SETOR: Record<string, ResponsabilidadePedidoOrcamento[]> = {
  ALMOXARIFADO: ["solicitante", "cotador", "aprovador_suprimentos", "comprador"],
  MANUTENCAO:   ["solicitante", "aprovador_manutencao"],
  ENGENHARIA:   ["solicitante", "aprovador_engenharia"],
};

const RESPOSTAS_SUPRIMENTOS: ResponsabilidadePedidoOrcamento[] = ["cotador", "aprovador_suprimentos", "comprador"];

// Requisição de Almoxarifado: "enviar"/"receber" valem pra qualquer setor,
// sem restrição — quem decide é o Admin, marcando o que fizer sentido pra
// cada pessoa (ex.: alguém do Almoxarifado também pode enviar).
const RESPONSABILIDADES_REQUISICAO_ALMOXARIFADO: ResponsabilidadeRequisicaoAlmoxarifado[] = ["solicitante", "aprovador"];

const labelResponsabilidade = (resp: ResponsabilidadePedidoOrcamento, setor: string): string => {
  if (resp === "solicitante") {
    if (setor === "ENGENHARIA")   return "Solicitante (Engenharia — pedidos de Obra)";
    if (setor === "ALMOXARIFADO") return "Solicitante (Almoxarifado — Reposição Automática)";
    return "Solicitante (Manutenção)";
  }
  return RESPONSABILIDADE_PEDIDO_ORCAMENTO_LABELS[resp];
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
  const [modulosDoSetor, setModulosDoSetor] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    api.usuarios.list().then((r) => {
      setUsers(Array.isArray(r) ? r as User[] : []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Cada setor só pode acessar um subconjunto dos módulos do sistema
  // (RN-002.1) — recarrega essa lista sempre que o setor do formulário muda,
  // e remove do formulário qualquer módulo já marcado que não pertença mais
  // ao novo setor (evita liberar um módulo sem efeito nenhum para o usuário).
  useEffect(() => {
    if (modal !== "create" && modal !== "edit") return;
    api.modulos.list(form.setor as string).then((r) => {
      const chaves = Array.isArray(r) ? r.map((m) => m.chave) : [];
      setModulosDoSetor(chaves);
      setForm((p) => ({ ...p, modulos: (p.modulos ?? []).filter((m) => chaves.includes(m)) }));
    }).catch(() => setModulosDoSetor([]));
  }, [modal, form.setor]);

  const openCreate = () => { setForm({ setor: "ALMOXARIFADO", nivel: "OPERADOR", modulos: [] }); setModal("create"); };
  const openEdit   = (u: User) => { setTarget(u); setForm({ ...u }); setModal("edit"); };
  const openSenha  = (u: User) => { setTarget(u); setNovaSenha(""); setModal("senha"); };

  const toggleModulo = (chave: string) => setForm((p) => {
    const prev = p.modulos ?? [];
    return { ...p, modulos: prev.includes(chave) ? prev.filter((x) => x !== chave) : [...prev, chave] };
  });

  const toggleResponsabilidade = (modulo: string, resp: string) => setForm((p) => {
    const atuais = p.responsabilidades?.[modulo] ?? [];
    const novas = atuais.includes(resp) ? atuais.filter((r) => r !== resp) : [...atuais, resp];
    return { ...p, responsabilidades: { ...p.responsabilidades, [modulo]: novas } };
  });

  const toggleSetorAtendido = (modulo: string, setorCodigo: string) => setForm((p) => {
    const atuais = p.setores_atendidos?.[modulo] ?? [];
    const novos = atuais.includes(setorCodigo) ? atuais.filter((s) => s !== setorCodigo) : [...atuais, setorCodigo];
    return { ...p, setores_atendidos: { ...p.setores_atendidos, [modulo]: novos } };
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
                  {["Usuário", "Nome", "Papel", "Nível", "Setor", "Módulos", ""].map((h) => <th key={h} className="p-3 font-semibold text-slate-500">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u.login} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-700">{u.login}</td>
                      <td className="p-3 font-semibold text-slate-800">{u.nome}</td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">{u.papel ? (PAPEL_LABELS[u.papel as keyof typeof PAPEL_LABELS] ?? u.papel) : "—"}</span></td>
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

      {/* Modal criação — usa CadastroUsuario */}
      <Modal isOpen={modal === "create"} onClose={() => setModal(null)} title="Novo Usuário" size="xl">
        <CadastroUsuario
          salvando={saving}
          onCancelar={() => setModal(null)}
          onSalvar={async (dados) => {
            setSaving(true);
            try {
              await api.usuarios.create(dados as object);
              toast.success("Usuário criado com sucesso!");
              setModal(null); load();
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : "Não foi possível criar o usuário.");
            } finally { setSaving(false); }
          }}
        />
      </Modal>

      {/* Edit modal (mantém formulário simples) */}
      <Modal isOpen={modal === "edit"} onClose={() => setModal(null)} title="Editar Usuário" size="lg">
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
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Papel no fluxo SC</label>
              <select value={String(form.papel ?? "")} onChange={(e) => setForm((p) => ({ ...p, papel: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]">
                <option value="op_manutencao">Operacional Manutenção — abre SCs</option>
                <option value="admin_manutencao">Admin Manutenção — aprova SCs da equipe</option>
                <option value="op_suprimentos">Operacional Suprimentos — faz cotação e compra</option>
                <option value="admin_suprimentos">Admin Suprimentos — aprovação final</option>
                <option value="op_engenharia">Operacional Engenharia — abre pedidos de Obra</option>
                <option value="admin_engenharia">Admin Engenharia — aprova pedidos de Obra</option>
                <option value="almoxarife">Almoxarife — dá entrada de materiais</option>
                <option value="admin_geral">Administrador Geral — acesso irrestrito</option>
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

          {form.papel !== "admin_geral" && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Módulos Permitidos <span className="font-normal normal-case text-slate-400">(apenas os disponíveis para o setor selecionado)</span>
              </label>
              {form.nivel === "ADMIN" && (
                <p className="text-[10px] text-amber-600 mb-2">Mesmo sendo Admin, esse usuário só vê os módulos marcados aqui — só "Administrador Geral" tem acesso irrestrito a tudo.</p>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {MODULOS_ALL.filter(({ chave }) => modulosDoSetor.includes(chave)).map(({ chave, label }) => {
                  const checked = (form.modulos ?? []).includes(chave);
                  return (
                    <label key={chave} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border text-xs transition-colors ${checked ? "bg-[#EA6C0A]/10 border-[#EA6C0A]/30 text-[#C75B12] font-semibold" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleModulo(chave)} className="hidden" />
                      <span className={`w-3 h-3 rounded border flex items-center justify-center ${checked ? "bg-[#EA6C0A] border-[#EA6C0A]" : "border-slate-300"}`}>
                        {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                      </span>
                      {label}
                    </label>
                  );
                })}
              </div>

              {(form.modulos ?? []).includes("pedido_orcamento") && (() => {
                const setorForm = String(form.setor ?? "");
                const respsDoSetor = RESPONSABILIDADES_POR_SETOR[setorForm] ?? RESPONSABILIDADES_PEDIDO_ORCAMENTO;
                const respsAtuais = form.responsabilidades?.pedido_orcamento ?? [];
                const temRespSuprimentos = RESPOSTAS_SUPRIMENTOS.some((r) => respsAtuais.includes(r));
                return (
                  <div className="mt-3 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
                    <label className="text-[10px] font-bold text-[#C75B12] uppercase tracking-widest block mb-2">
                      Responsabilidades em Pedido de Orçamento
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">Um usuário pode acumular mais de uma responsabilidade.</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {respsDoSetor.map((resp) => {
                        const checked = respsAtuais.includes(resp);
                        return (
                          <label key={resp} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border text-xs transition-colors ${checked ? "bg-[#EA6C0A]/10 border-[#EA6C0A]/30 text-[#C75B12] font-semibold" : "bg-white border-slate-200 text-slate-500"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleResponsabilidade("pedido_orcamento", resp)} className="hidden" />
                            <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-[#EA6C0A] border-[#EA6C0A]" : "border-slate-300"}`}>
                              {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                            </span>
                            {labelResponsabilidade(resp, setorForm)}
                          </label>
                        );
                      })}
                    </div>

                    {temRespSuprimentos && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <label className="text-[10px] font-bold text-[#C75B12] uppercase tracking-widest block mb-1">
                          Setores Atendidos
                        </label>
                        <p className="text-[10px] text-slate-500 mb-2">Quais setores solicitantes essa pessoa recebe pedido — nenhum marcado = atende todos.</p>
                        <div className="flex gap-1.5">
                          {["MANUTENCAO", "ENGENHARIA"].map((s) => {
                            const checked = (form.setores_atendidos?.pedido_orcamento ?? []).includes(s);
                            return (
                              <label key={s} className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs transition-colors ${checked ? "bg-[#EA6C0A]/10 border-[#EA6C0A]/30 text-[#C75B12] font-semibold" : "bg-white border-slate-200 text-slate-500"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleSetorAtendido("pedido_orcamento", s)} className="hidden" />
                                <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-[#EA6C0A] border-[#EA6C0A]" : "border-slate-300"}`}>
                                  {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                                </span>
                                {s === "MANUTENCAO" ? "Manutenção" : "Engenharia"}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(form.modulos ?? []).includes("requisicao_almoxarifado") && (() => {
                const respsAtuais = form.responsabilidades?.requisicao_almoxarifado ?? [];
                return (
                  <div className="mt-3 p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
                    <label className="text-[10px] font-bold text-[#C75B12] uppercase tracking-widest block mb-2">
                      Requisição de Almoxarifado
                    </label>
                    <p className="text-[10px] text-slate-500 mb-2">Enviar (abrir pedido) e receber (aprovar/separar) são independentes — marque uma, outra, ou as duas.</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {RESPONSABILIDADES_REQUISICAO_ALMOXARIFADO.map((resp) => {
                        const checked = respsAtuais.includes(resp);
                        return (
                          <label key={resp} className={`flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg border text-xs transition-colors ${checked ? "bg-[#EA6C0A]/10 border-[#EA6C0A]/30 text-[#C75B12] font-semibold" : "bg-white border-slate-200 text-slate-500"}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleResponsabilidade("requisicao_almoxarifado", resp)} className="hidden" />
                            <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-[#EA6C0A] border-[#EA6C0A]" : "border-slate-300"}`}>
                              {checked && <span className="text-white text-[8px] font-bold">✓</span>}
                            </span>
                            {RESPONSABILIDADE_REQUISICAO_ALMOXARIFADO_LABELS[resp]}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
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
