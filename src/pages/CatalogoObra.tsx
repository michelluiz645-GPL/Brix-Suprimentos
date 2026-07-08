import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { Plus, Edit2, Search, Upload, PowerOff } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const CATEGORIAS = [
  "Concreto", "Alvenaria", "Estrutura Metálica", "Impermeabilização", "Cobertura",
  "Revestimento", "Esquadrias", "Hidráulico", "Elétrico", "Fundação",
  "Terraplanagem", "Pavimentação", "Sinalização", "EPI/Segurança", "Ferramentas",
  "Locação de Equipamento", "Serviço/Mão de Obra", "Outros",
];

interface Material {
  id?: number; codigo: string; nome: string; categoria: string; unidade: string;
  especificacao: string; obs: string; status: "ATIVO" | "INATIVO";
}

const emptyForm = (): Omit<Material, "id"> => ({
  codigo: "", nome: "", categoria: CATEGORIAS[0], unidade: "UN",
  especificacao: "", obs: "", status: "ATIVO",
});

export default function CatalogoObra() {
  const toast = useToast();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCateg, setFiltroCateg] = useState("");
  const [modal, setModal] = useState<"novo" | "editar" | "importar" | null>(null);
  const [sel, setSel] = useState<Material | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [salvando, setSalvando] = useState(false);
  const [textoImport, setTextoImport] = useState("");

  const carregar = () => {
    setLoading(true);
    api.materiaisObra.list().then((r) => {
      const d = (r as { data: Material[] }).data ?? [];
      setMateriais(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar o catálogo de materiais."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim()) { toast.error("Código é obrigatório."); return; }
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    setSalvando(true);
    try {
      if (modal === "novo") {
        await api.materiaisObra.create(form);
        toast.success("Material cadastrado!");
      } else if (sel?.id) {
        await api.materiaisObra.update(sel.id, form);
        toast.success("Material atualizado!");
      }
      setModal(null); setForm(emptyForm()); setSel(null);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o material.");
    } finally { setSalvando(false); }
  };

  const inativar = async (m: Material) => {
    if (!m.id || !confirm("Inativar este material?")) return;
    try {
      await api.materiaisObra.update(m.id, { status: "INATIVO" });
      toast.success("Material inativado.");
      carregar();
    } catch {
      toast.error("Não foi possível inativar o material.");
    }
  };

  const handleImportar = async () => {
    const linhas = textoImport.trim().split("\n").filter((l) => l.trim());
    const itens = [];
    for (const linha of linhas) {
      const partes = linha.split("|").map((p) => p.trim());
      if (partes.length < 2) continue;
      const [codigo, nome, categoria, unidade = "UN", especificacao = ""] = partes;
      if (!codigo || !nome) continue;
      itens.push({ codigo, nome, categoria: categoria || "Outros", unidade, especificacao });
    }
    if (itens.length === 0) { toast.error("Nenhuma linha válida encontrada."); return; }
    try {
      const res = await api.materiaisObra.importar(itens);
      toast.success(`${res.importados} material(ais) importado(s)!`);
      setTextoImport(""); setModal(null);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível importar os materiais.");
    }
  };

  const filtered = materiais.filter((m) => {
    if (filtroCateg && m.categoria !== filtroCateg) return false;
    if (busca) {
      const q = busca.toLowerCase();
      return m.codigo.toLowerCase().includes(q) || m.nome.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Catálogo de Materiais de Obra" subtitle="Materiais e serviços de referência para Solicitações de Compra"
          action={
            <div className="flex gap-2">
              <button onClick={() => setModal("importar")}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                <Upload size={14} /> Importar
              </button>
              <button onClick={() => { setForm(emptyForm()); setSel(null); setModal("novo"); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
                <Plus size={14} /> Novo Material
              </button>
            </div>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por código ou nome..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
          </div>
          <select value={filtroCateg} onChange={(e) => setFiltroCateg(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando catálogo...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum material encontrado. Cadastre ou importe materiais.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Código", "Nome", "Categoria", "Unidade", "Especificação", "Status", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((m) => (
                  <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${m.status === "INATIVO" ? "opacity-50" : ""}`}>
                    <td className="p-3 font-mono font-bold text-[#EA6C0A]">{m.codigo}</td>
                    <td className="p-3 font-medium text-slate-800">{m.nome}</td>
                    <td className="p-3 text-slate-500">{m.categoria}</td>
                    <td className="p-3 text-slate-500">{m.unidade}</td>
                    <td className="p-3 text-slate-400 max-w-[200px] truncate">{m.especificacao || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.status === "ATIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{m.status}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setSel(m); setForm({ codigo: m.codigo, nome: m.nome, categoria: m.categoria, unidade: m.unidade, especificacao: m.especificacao, obs: m.obs, status: m.status }); setModal("editar"); }}
                          className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Edit2 size={13} /></button>
                        {m.status === "ATIVO" && m.id && (
                          <button onClick={() => inativar(m)} className="text-slate-400 hover:text-rose-500 transition-colors"><PowerOff size={13} /></button>
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

      {/* Modal novo/editar */}
      {(modal === "novo" || modal === "editar") && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {modal === "novo" ? "Novo Material de Obra" : "Editar Material"}
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Código *</label>
                <input value={form.codigo} onChange={setF("codigo")} placeholder="Ex: CON-001" disabled={modal === "editar"}
                  className={`${inp} font-mono uppercase ${modal === "editar" ? "opacity-60 cursor-not-allowed" : ""}`} />
              </div>
              <div>
                <label className={lbl}>Unidade</label>
                <input value={form.unidade} onChange={setF("unidade")} placeholder="UN, M², M³, KG..." className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Nome *</label>
                <input value={form.nome} onChange={setF("nome")} placeholder="Nome do material ou serviço" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Categoria</label>
                <select value={form.categoria} onChange={setF("categoria")} className={inp}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Especificação Técnica</label>
                <textarea value={form.especificacao} onChange={setF("especificacao")} rows={2} placeholder="Norma, dimensão, resistência, marca aceita..."
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Observações</label>
                <textarea value={form.obs} onChange={setF("obs")} rows={2}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
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

      {/* Modal importar */}
      {modal === "importar" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Importar em Lote</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">Cole o texto no formato abaixo, uma linha por material:</p>
              <code className="block text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 font-mono">
                CÓDIGO | NOME | CATEGORIA | UNIDADE | ESPECIFICAÇÃO
              </code>
              <textarea value={textoImport} onChange={(e) => setTextoImport(e.target.value)} rows={8}
                placeholder={"CON-001 | Concreto Usinado fck25 | Concreto | M³ | ABNT NBR 12655\nALV-001 | Tijolo Cerâmico 9x14x19 | Alvenaria | PC | ..."}
                className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleImportar} disabled={!textoImport.trim()}
                className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-[#EA6C0A] rounded-lg hover:bg-[#C75B12] transition-colors disabled:opacity-50">
                <Upload size={13} /> Importar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
