import React, { useState } from "react";
import api from "../services/api";
import { Product, Movement } from "../types";

export default function Consultar() {
  const [query, setQuery] = useState("");
  const [searchedProduct, setSearchedProduct] = useState<Product | null>(null);
  const [barcodeSelected, setBarcodeSelected] = useState("");
  const [equivalents, setEquivalents] = useState<[string, Product][]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPrice = (v: any) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearchedProduct(null);
    setEquivalents([]);
    setHistory([]);

    try {
      const prods: Record<string, Product> = await api.get("produtos") || {};

      let targetBc = "";
      let targetProduct: Product | null = null;

      // 1. Search by Internal Code
      const matchesByInternal = Object.entries(prods).filter(
        ([_, p]) => p.codigo_produto?.trim().toUpperCase() === query.trim().toUpperCase()
      );

      // 2. Search by Barcode
      if (matchesByInternal.length > 0) {
        // Find the one with highest stock if multiple matches found
        const sorted = matchesByInternal.sort((a, b) => b[1].estoque - a[1].estoque);
        targetBc = sorted[0][0];
        targetProduct = sorted[0][1];
      } else if (prods[query.trim()]) {
        targetBc = query.trim();
        targetProduct = prods[query.trim()];
      }

      if (!targetProduct) {
        setError(`Produto com o código "${query}" não encontrado no inventário.`);
        setLoading(false);
        return;
      }

      setSearchedProduct(targetProduct);
      setBarcodeSelected(targetBc);

      // Fetch alternatives / equivalents
      const grpCode = targetProduct.codigo_produto?.trim() || targetBc;
      const allEquivalents = Object.entries(prods).filter(([bc, p]) => {
        const pGrp = p.codigo_produto?.trim() || bc;
        return pGrp.toUpperCase() === grpCode.toUpperCase();
      });
      setEquivalents(allEquivalents);

      // Fetch movement logs for this item
      const movements: Record<string, Movement> = await api.get("movimentos") || {};
      const targetIntCode = targetProduct.codigo_produto;

      const matchedHistory = Object.values(movements).filter((m) => {
        const matchesBc = m.codigo === targetBc;
        const matchesIntCode = targetIntCode && Object.keys(prods).some(
          (bc) => prods[bc].codigo_produto === targetIntCode && m.codigo === bc
        );
        return matchesBc || matchesIntCode;
      });

      // Sort and slice top 20
      const sortedHistory = matchedHistory
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 20);

      setHistory(sortedHistory);
    } catch (e: any) {
      setError(e.message || "Erro de rede e falha na solicitação.");
    } finally {
      setLoading(false);
    }
  };

  // Group stats
  const totalGroupStock = equivalents.reduce((acc, [_, p]) => acc + Number(p.estoque || 0), 0);
  const maxGroupMin = equivalents.reduce((acc, [_, p]) => Math.max(acc, Number(p.estoque_min || 0)), 0);
  const isBelowMin = maxGroupMin > 0 && totalGroupStock <= maxGroupMin;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          Consultar Produto
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#EA6C0A] focus:bg-white transition-all"
            placeholder="Digite o código interno ou código de barras e pressione Enter..."
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#1E293B] hover:bg-[#0F172A] text-white text-sm font-bold rounded-lg cursor-pointer transition-colors shadow-lg shadow-slate-900/10"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-bold rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {searchedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Main Item details */}
          <div className="bg-white border-t-4 border-[#2563EB] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-tight">
                  {searchedProduct.nome}
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold uppercase tracking-wide inline-block mt-2">
                  📂 {searchedProduct.categoria}
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isBelowMin ? "bg-rose-500/10 text-rose-700" : "bg-emerald-500/10 text-emerald-700"
                }`}
              >
                {isBelowMin ? "🔴 Alerta: Crítico" : "🟢 OK"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-50">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Código Interno
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {searchedProduct.codigo_produto || "─"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Código de Barras
                </span>
                <span className="text-sm font-bold text-slate-700">{barcodeSelected}</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Estoque Atual
                </span>
                <span className="text-sm font-black text-slate-800">
                  {searchedProduct.estoque} {searchedProduct.unid}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Estoque Mínimo
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {searchedProduct.estoque_min} {searchedProduct.unid}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Preço de Custo
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {formatPrice(searchedProduct.preco)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Localização
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  🗄️ {searchedProduct.armario || "─"} &bull; 📦 {searchedProduct.prateleira || "─"}
                </span>
              </div>
            </div>
          </div>

          {/* Group and alternatives details */}
          <div className="bg-white border-t-4 border-[#0D9488] rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Grupo de Equivalência
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Produtos que possuem o mesmo código interno são tratados como equivalentes.
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs py-4 border-y border-slate-50">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Estoque Total do Grupo
                </span>
                <span className="text-base font-black text-slate-800">
                  {totalGroupStock} {searchedProduct.unid}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">
                  Mínimo do Grupo
                </span>
                <span className="text-base font-black text-slate-800">
                  {maxGroupMin} {searchedProduct.unid}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block mb-2">
                Marcas / Produtos Disponíveis
              </span>
              <div className="space-y-2">
                {equivalents.map(([bc, item]) => (
                  <div key={bc} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 rounded-lg">
                    <span className="font-semibold text-slate-700">{item.nome}</span>
                    <span className="font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.estoque} {item.unid}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit log history */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Últimas 20 Movimentações em Lote
            </h3>
            {history.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">Data</th>
                      <th className="p-3 font-semibold text-slate-500">Nº Pedido</th>
                      <th className="p-3 font-semibold text-slate-500">Tipo</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Quantidade</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Preço</th>
                      <th className="p-3 font-semibold text-slate-500">Responsável</th>
                      <th className="p-3 font-semibold text-slate-500">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map((h, i) => {
                      const isEntry = h.tipo === "ENTRADA";
                      const isReturn = h.tipo === "DEVOLUÇÃO";
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-500">{h.data}</td>
                          <td className="p-3 font-bold text-slate-700">{h.numero_pedido || "─"}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isEntry
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isReturn
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {h.tipo}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-600">{`${h.qtd} ${h.unid}`}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{formatPrice(h.preco)}</td>
                          <td className="p-3 text-slate-500">{h.responsavel || h.resp_almox || "─"}</td>
                          <td className="p-3 text-slate-400 italic truncate max-w-[200px]">{h.obs || h.motivo || "─"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Nenhuma movimentação para relatar para este lote de produtos.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
