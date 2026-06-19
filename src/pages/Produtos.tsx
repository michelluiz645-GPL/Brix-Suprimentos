import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency } from "@/utils/formatters";
import type { Product } from "@/types";
import { Search, Plus, Edit2, EyeOff } from "lucide-react";

const CATEGORIAS = [
  "FILTROS","ÓLEOS","GRAXAS","LUBRIFICANTES","COMBUSTÍVEL","PEÇAS MOTOR",
  "PEÇAS HIDRÁULICAS","ELÉTRICA","ILUMINAÇÃO","FREIOS","SUSPENSÃO","ROLAMENTOS",
  "CORREIAS","MANGUEIRAS","PARAFUSOS","FERRAMENTAS","EPI","MATERIAL DE LIMPEZA",
  "SOLDA","PNEUS","BATERIAS","TINTAS","MATERIAL DE ESCRITÓRIO","INFORMÁTICA",
  "OUTROS","PEÇA LEVE","PEÇA PESADA","ROÇADA","CONSUMO ADM",
];
const UNIDADES = ["UNID","METROS","LITROS","KG"];

type FormProd = Omit<Product, "id">;
type Aba = "lista" | "novo" | "editar";

const emptyForm = (): FormProd => ({
  codigo_produto: "", nome: "", categoria: "", unid: "UNID",
  preco: 0, estoque: 0, estoque_min: 0, estoque_max: 0,
  armario: "", prateleira: "", dias_validade_epi: 0, status: "ATIVO",
});

const inputCls = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const labelCls = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

interface FormProps {
  form: FormProd;
  setForm: React.Dispatch<React.SetStateAction<FormProd>>;
  onSubmit: (e: React.FormEvent) => void;
  salvando: boolean;
  modo: "criar" | "editar";
  onCancel: () => void;
}

function FormProduto({ form, setForm, onSubmit, salvando, modo, onCancel }: FormProps) {
  const set = (campo: keyof FormProd) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [campo]: val }));
  };

  return (
    <form onSubmit={onSubmit} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-6">
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
        {modo === "criar" ? "Novo Produto" : `Editando: ${form.nome}`}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>Código do Produto *</label>
          <input
            value={form.codigo_produto}
            onChange={set("codigo_produto")}
            disabled={modo === "editar"}
            placeholder="Ex: 7891234567890 ou MTR-001"
            className={`${inputCls} ${modo === "editar" ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Nome *</label>
          <input value={form.nome} onChange={set("nome")} placeholder="Nome completo do produto" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Categoria *</label>
          <select value={form.categoria} onChange={set("categoria")} className={inputCls}>
            <option value="">— Selecione —</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Unidade de Medida *</label>
          <select value={form.unid} onChange={set("unid")} className={inputCls}>
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Preço Unitário (R$)</label>
          <input type="number" min={0} step="0.01" value={form.preco} onChange={set("preco")} className={inputCls} />
        </div>
        {modo === "criar" && (
          <div>
            <label className={labelCls}>Estoque Inicial</label>
            <input type="number" min={0} value={form.estoque} onChange={set("estoque")} className={inputCls} />
          </div>
        )}
        <div>
          <label className={labelCls}>Estoque Mínimo</label>
          <input type="number" min={0} value={form.estoque_min} onChange={set("estoque_min")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Estoque Máximo</label>
          <input type="number" min={0} value={form.estoque_max} onChange={set("estoque_max")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Armário</label>
          <input value={form.armario} onChange={set("armario")} placeholder="Ex: A" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Prateleira</label>
          <input value={form.prateleira} onChange={set("prateleira")} placeholder="Ex: 01" className={inputCls} />
        </div>
        {form.categoria === "EPI" && (
          <div>
            <label className={labelCls}>Validade EPI (dias)</label>
            <input type="number" min={0} value={form.dias_validade_epi ?? 0} onChange={set("dias_validade_epi")} className={inputCls} />
            {(form.dias_validade_epi ?? 0) > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Vence em aprox.{" "}
                {new Date(Date.now() + (form.dias_validade_epi ?? 0) * 86400000).toLocaleDateString("pt-BR")} a partir de hoje
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={salvando}
          className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
          {salvando ? "Salvando..." : modo === "criar" ? "Cadastrar Produto →" : "Salvar Alterações →"}
        </button>
      </div>
    </form>
  );
}

export default function Produtos() {
  const toast = useToast();
  const [aba, setAba] = useState<Aba>("lista");
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [form, setForm] = useState<FormProd>(emptyForm());
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState<FormProd>(emptyForm());
  const [salvando, setSalvando] = useState(false);
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.produtos.list() as { data: Product[] };
      const d = r?.data ?? [];
      setProdutos(Array.isArray(d) ? d : Object.values(d));
    } catch {
      toast.error("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const norm = (s: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const produtosVisiveis = useMemo(() => {
    const q = norm(busca);
    return produtos
      .filter((p) => p.status !== "INATIVO")
      .filter((p) => {
        const matchBusca = !q ||
          norm(p.codigo_produto).includes(q) ||
          norm(p.nome).includes(q) ||
          norm(p.categoria).includes(q);
        const matchCat = !filtroCategoria || p.categoria === filtroCategoria;
        return matchBusca && matchCat;
      });
  }, [produtos, busca, filtroCategoria]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo_produto.trim()) { toast.error("Campo obrigatório: Código do Produto."); return; }
    if (!form.nome.trim())           { toast.error("Campo obrigatório: Nome."); return; }
    if (!form.categoria)             { toast.error("Campo obrigatório: Categoria."); return; }
    if (form.preco < 0)              { toast.error("Preço não pode ser negativo."); return; }
    const existe = produtos.find((p) => p.codigo_produto === form.codigo_produto.trim());
    if (existe) { toast.error("Já existe um produto com este código. Use a aba Editar Produto para modificá-lo."); return; }
    setSalvando(true);
    try {
      await api.produtos.create(form);
      toast.success("Produto cadastrado com sucesso!");
      setForm(emptyForm());
      await carregar();
      setAba("lista");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar o produto.");
    } finally { setSalvando(false); }
  };

  const selecionarParaEditar = (p: Product) => {
    setEditId(p.codigo_produto);
    setEditForm({
      codigo_produto: p.codigo_produto,
      nome: p.nome,
      categoria: p.categoria ?? "",
      unid: p.unid ?? "UNID",
      preco: p.preco ?? 0,
      estoque: p.estoque ?? 0,
      estoque_min: p.estoque_min ?? 0,
      estoque_max: p.estoque_max ?? 0,
      armario: p.armario ?? "",
      prateleira: p.prateleira ?? "",
      dias_validade_epi: p.dias_validade_epi ?? 0,
      status: p.status ?? "ATIVO",
    });
    setAba("editar");
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nome.trim()) { toast.error("Campo obrigatório: Nome."); return; }
    if (!editForm.categoria)   { toast.error("Campo obrigatório: Categoria."); return; }
    if (editForm.preco < 0)    { toast.error("Preço não pode ser negativo."); return; }
    setSalvandoEdit(true);
    try {
      await api.produtos.update(editId, editForm);
      toast.success("Produto atualizado com sucesso!");
      await carregar();
      setAba("lista");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o produto.");
    } finally { setSalvandoEdit(false); }
  };

  const handleInativar = async (p: Product) => {
    if (!window.confirm(`Inativar "${p.nome}"?\nO produto não aparecerá mais nas buscas.`)) return;
    try {
      await api.produtos.update(p.codigo_produto, { ...p, status: "INATIVO" });
      toast.success(`"${p.nome}" inativado com sucesso.`);
      await carregar();
    } catch {
      toast.error("Não foi possível inativar o produto.");
    }
  };

  const ativosCount = produtos.filter((p) => p.status !== "INATIVO").length;
  const categoriasCount = new Set(produtos.filter((p) => p.status !== "INATIVO").map((p) => p.categoria)).size;
  const criticos = produtos.filter((p) => p.status !== "INATIVO" && p.estoque_min > 0 && p.estoque <= p.estoque_min);
  const valorEstoque = produtos
    .filter((p) => p.status !== "INATIVO")
    .reduce((acc, p) => acc + (p.preco || 0) * (p.estoque || 0), 0);

  const tabLabels: Record<Aba, string> = { lista: "📋 Lista", novo: "➕ Novo Produto", editar: "✏️ Editar Produto" };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Fichas de Produtos ✓" subtitle="Cadastro e manutenção do catálogo de produtos." />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total de Produtos", value: ativosCount, icon: "📦", alert: false },
            { label: "Categorias", value: categoriasCount, icon: "🏷️", alert: false },
            { label: "Itens Críticos", value: criticos.length, icon: "⚠️", alert: criticos.length > 0 },
            { label: "Valor em Estoque", value: formatCurrency(valorEstoque), icon: "💰", alert: false },
          ].map((k) => (
            <div key={k.label} className={`bg-white border rounded-xl p-4 shadow-sm ${k.alert ? "border-amber-300 bg-amber-50" : "border-slate-100"}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{k.icon}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k.label}</span>
              </div>
              <div className={`text-2xl font-bold font-mono ${k.alert ? "text-amber-700" : "text-slate-700"}`}>{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b border-slate-200">
          {(["lista", "novo", "editar"] as Aba[]).map((id) => (
            <button key={id} onClick={() => setAba(id)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${aba === id ? "border-[#EA6C0A] text-[#EA6C0A] bg-white" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {tabLabels[id]}
            </button>
          ))}
        </div>

        {aba === "lista" && (
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por código, nome ou categoria..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
              </div>
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Todas as categorias</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setAba("novo")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] rounded-lg shadow hover:-translate-y-0.5 transition-all">
                <Plus size={14} /> Novo Produto
              </button>
            </div>

            {loading ? (
              <div className="p-10 text-center text-sm text-slate-400">Carregando...</div>
            ) : produtosVisiveis.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                {ativosCount === 0
                  ? 'Nenhum produto cadastrado. Clique em "Novo Produto" para começar.'
                  : "Nenhum produto encontrado com esses filtros."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Código", "Nome", "Categoria", "Unid.", "Preço", "Estoque", "Mínimo", "Local", "Ações"].map((h) => (
                        <th key={h} className="p-3 font-semibold text-slate-500 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {produtosVisiveis.map((p) => {
                      const critico = p.estoque_min > 0 && p.estoque <= p.estoque_min;
                      return (
                        <tr key={p.codigo_produto} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-slate-600">{p.codigo_produto}</td>
                          <td className="p-3 font-medium text-slate-800 max-w-[200px] truncate">{p.nome}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                              {p.categoria}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{p.unid}</td>
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{formatCurrency(p.preco)}</td>
                          <td className="p-3 font-mono">
                            <span className={critico ? "text-rose-600 font-bold" : "text-slate-700"}>
                              {p.estoque}{critico && " ⚠️"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-500">{p.estoque_min}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {[p.armario, p.prateleira].filter(Boolean).join(" / ") || "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <button onClick={() => selecionarParaEditar(p)} title="Editar produto"
                                className="text-[#EA6C0A] hover:text-[#C75B12] transition-colors">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleInativar(p)} title="Inativar produto"
                                className="text-slate-400 hover:text-rose-500 transition-colors">
                                <EyeOff size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-2.5 border-t border-slate-100 text-[10px] text-slate-400">
              {produtosVisiveis.length} produto{produtosVisiveis.length !== 1 ? "s" : ""} encontrado{produtosVisiveis.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {aba === "novo" && (
          <FormProduto
            form={form}
            setForm={setForm}
            onSubmit={handleCriar}
            salvando={salvando}
            modo="criar"
            onCancel={() => setAba("lista")}
          />
        )}

        {aba === "editar" && (
          editId ? (
            <FormProduto
              form={editForm}
              setForm={setEditForm}
              onSubmit={handleEditar}
              salvando={salvandoEdit}
              modo="editar"
              onCancel={() => setAba("lista")}
            />
          ) : (
            <div className="bg-white border border-slate-100 rounded-xl p-8 shadow-sm text-center">
              <p className="text-sm text-slate-500 mb-4">
                Selecione um produto na lista e clique no ícone ✏️ para editar.
              </p>
              <button onClick={() => setAba("lista")} className="text-[#EA6C0A] text-sm font-bold hover:underline">
                Ir para a lista →
              </button>
            </div>
          )
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
