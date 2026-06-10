import React, { useState, useEffect } from "react";
import api from "@/services/api";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { formatCurrency } from "@/utils/formatters";
import type { Product } from "@/types";
import { Search } from "lucide-react";

export default function Consultar() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Product | null>(null);

  useEffect(() => {
    api.produtos.list().then((r) => {
      const data = (r as { data: Product[] }).data ?? [];
      setProducts(Array.isArray(data) ? data : Object.values(data));
    }).finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map((p) => p.categoria).filter(Boolean))].sort();

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().replace(/[áàãâ]/g, "a").replace(/[éê]/g, "e").replace(/[íî]/g, "i").replace(/[óõô]/g, "o").replace(/[úû]/g, "u");
    const name = (p.nome + " " + p.codigo_produto + " " + p.categoria).toLowerCase().replace(/[áàãâ]/g, "a").replace(/[éê]/g, "e").replace(/[íî]/g, "i").replace(/[óõô]/g, "o").replace(/[úû]/g, "u");
    const matchQ = !q || name.includes(q);
    const matchC = !category || p.categoria === category;
    return matchQ && matchC && p.status !== "INATIVO";
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Consultar Catálogo" subtitle="Busca de produtos no estoque" />

      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nome ou categoria..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#EA6C0A]"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Carregando catálogo...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Código", "Nome", "Categoria", "Unid.", "Preço Unit.", "Estoque", "Mín.", "Localização", ""].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.slice(0, 50).map((p) => {
                  const isCritical = Number(p.estoque_min ?? 0) > 0 && Number(p.estoque ?? 0) <= Number(p.estoque_min ?? 0);
                  return (
                    <tr key={p.id ?? p.codigo_produto} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-600">{p.codigo_produto}</td>
                      <td className="p-3 font-semibold text-slate-800">{p.nome}</td>
                      <td className="p-3 text-slate-500">{p.categoria}</td>
                      <td className="p-3 text-slate-500">{p.unid}</td>
                      <td className="p-3 font-mono text-slate-700">{formatCurrency(p.preco)}</td>
                      <td className="p-3">
                        <span className={`font-mono font-bold ${isCritical ? "text-rose-600" : "text-slate-700"}`}>
                          {p.estoque}
                          {isCritical && " ⚠️"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{p.estoque_min}</td>
                      <td className="p-3 text-slate-400">{p.armario}/{p.prateleira}</td>
                      <td className="p-3">
                        <button onClick={() => setSelected(p)} className="text-xs font-bold text-[#EA6C0A] hover:underline">
                          Detalhar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm">Nenhum produto encontrado.</div>
            )}
            {filtered.length > 50 && (
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100">
                Exibindo 50 de {filtered.length} resultados. Refine a busca para ver mais.
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Ficha do Produto" size="md">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Código",       selected.codigo_produto],
                ["Nome",         selected.nome],
                ["Categoria",    selected.categoria],
                ["Unidade",      selected.unid],
                ["Preço Unit.",  formatCurrency(selected.preco)],
                ["Estoque",      selected.estoque],
                ["Estoque Mín.", selected.estoque_min],
                ["Estoque Máx.", selected.estoque_max],
                ["Armário",      selected.armario],
                ["Prateleira",   selected.prateleira],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                  <div className="font-semibold text-slate-800">{value ?? "—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
