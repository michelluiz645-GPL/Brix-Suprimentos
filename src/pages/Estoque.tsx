import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Product, Movement } from "../types";
import { CATEGORIAS } from "./Produtos";

export default function Estoque() {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [movements, setMovements] = useState<Record<string, any>>({});
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("TODAS");
  const [onlyCritical, setOnlyCritical] = useState(false);

  // Delivery Dates for Manual PO
  const [poDates, setPoDates] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, movsRes, poRes] = await Promise.all([
        api.get("produtos"),
        api.get("movimentos"),
        api.get("pedidos_compra"),
      ]);

      setProducts(prodsRes || {});
      setMovements(movsRes || {});
      setPurchaseOrders(poRes || {});
    } catch (e) {
      console.error("Failed to load inventory safety stocks", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatPrice = (v: any) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
  };

  // Group equivalent products by Internal Code
  const groupedProducts: Record<string, {
    totalStock: number;
    minStock: number;
    maxStock: number;
    nome: string;
    unid: string;
    cat: string;
    value: number;
    items: [string, any][];
  }> = {};

  Object.entries(products as Record<string, any>).forEach(([cb, p]) => {
    const key = p.codigo_produto?.trim() || cb;
    if (!groupedProducts[key]) {
      groupedProducts[key] = {
        totalStock: 0,
        minStock: 0,
        maxStock: 0,
        nome: p.nome,
        unid: p.unid || "UND",
        cat: p.categoria || "─",
        value: 0,
        items: [],
      };
    }

    const est = Number(p.estoque || 0);
    const min = Number(p.estoque_min || 0);
    const max = Number(p.estoque_max || 0);
    const pr  = Number(p.preco || 0);

    groupedProducts[key].totalStock += est;
    groupedProducts[key].value += est * pr;
    if (min > groupedProducts[key].minStock) {
      groupedProducts[key].minStock = min;
    }
    if (max > groupedProducts[key].maxStock) {
      groupedProducts[key].maxStock = max;
    }
    groupedProducts[key].items.push([cb, p]);
  });

  // Extract understock items
  const understockList = Object.entries(groupedProducts).filter(
    ([_, g]) => g.minStock > 0 && g.totalStock <= g.minStock
  );

  const handleGenerateAutoPO = async (grpCode: string, groupData: any, qtyToOrder: number, lastPrice: number) => {
    setErrorMsg("");
    setSuccessMsg("");

    const dateNeeded = poDates[grpCode];
    if (!dateNeeded || !dateNeeded.trim()) {
      setErrorMsg(`Favor informar a data necessária de entrega para comprar o item "${groupData.nome}".`);
      return;
    }

    try {
      setLoading(true);
      const numbering = await api.get("numeracao") || {};
      const nextId = Number(numbering.pedido_auto || 0) + 1;
      const pcId = `PC-AUTO-${String(nextId).padStart(5, "0")}`;

      const pos = await api.get("pedidos_compra") || {};
      const valueEstimate = qtyToOrder * lastPrice;

      // Extract last purchase supplier
      const entMovements = Object.values(movements as Record<string, any>).filter(
        (m: any) => m.tipo === "ENTRADA" && groupData.items.some(([bc]: any) => bc === m.codigo)
      ).sort((a: any, b: any) => b.data.localeCompare(a.data)) as any[];
      
      const lastSupplier = entMovements.length > 0 ? entMovements[0].fornecedor : "─";
      const lastDate = entMovements.length > 0 ? entMovements[0].data : "─";

      const justify = `Estoque ${groupData.totalStock.toFixed(0)} atingiu limite minimo de ${groupData.minStock.toFixed(0)}. Repor ate limite maximo.`;

      pos[String(Date.now())] = {
        numero: pcId,
        tipo: "AUTO",
        status: "PENDENTE COTAÇÃO",
        data_pedido: new Date().toLocaleDateString("pt-BR"),
        data_desejada: dateNeeded.trim(),
        solicitante: "Almoxarifado (reposição automática)",
        registrado_por: localStorage.getItem("geplan_username") || "admin",
        urgency: groupData.totalStock <= 0 ? "Urgente" : "Normal",
        os: "",
        veiculo: "",
        itens: [
          {
            nome: groupData.nome,
            qtd: String(qtyToOrder),
            unidade: groupData.unid,
            medida: grpCode,
            motivo: justify,
            foto_url: null,
            ultimo_preco: lastPrice,
            valor_estimado: valueEstimate,
            ultimo_fornecedor: lastSupplier,
            ultima_compra: lastDate,
          },
        ],
      };

      // Save counter and PO
      numbering.pedido_auto = nextId;
      await api.set("numeracao", numbering);
      await api.set("pedidos_compra", pos);

      setSuccessMsg(`Pedido automático ${pcId} gerado com sucesso para ${qtyToOrder} ${groupData.unid} de "${groupData.nome}"!`);
      setPoDates({ ...poDates, [grpCode]: "" });
      loadData();
    } catch (e: any) {
      setErrorMsg(e.message || "Erro de rede ao salvar requisição de compras automática.");
    } finally {
      setLoading(false);
    }
  };

  // Build grid entries
  const listRows: any[] = [];
  Object.entries(groupedProducts).forEach(([ch, g]) => {
    const isCritical = g.minStock > 0 && g.totalStock <= g.minStock;
    const isHigh = g.maxStock > 0 && g.totalStock > g.maxStock;
    const isLow = g.minStock > 0 && g.totalStock <= g.minStock * 1.5 && !isCritical;

    if (search && !g.nome.toUpperCase().includes(search.toUpperCase()) && !ch.toUpperCase().includes(search.toUpperCase())) return;
    if (filterCat !== "TODAS" && g.cat !== filterCat) return;
    if (onlyCritical && !isCritical) return;

    let status = "🟢 OK";
    if (isCritical) status = "🔴 Crítico";
    else if (isHigh) status = "🔵 Acima Máx";
    else if (isLow) status = "🟡 Baixo";

    listRows.push({
      critical: isCritical,
      code: ch,
      nome: g.nome,
      categoria: g.cat,
      brandsCount: g.items.length,
      stock: g.totalStock,
      min: g.minStock,
      max: g.maxStock || "─",
      unid: g.unid,
      status,
      value: g.value
    });
  });

  const sortedGridRows = listRows.sort((a, b) => {
    if (a.critical && !b.critical) return -1;
    if (!a.critical && b.critical) return 1;
    return a.stock - b.stock;
  });

  const totalValue = Object.values(products as Record<string, any>).reduce((acc: number, p: any) => acc + (Number(p.preco || 0) * Number(p.estoque || 0)), 0);

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-bold rounded-xl animate-fade-in">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-bold rounded-xl animate-fade-in">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Critical Items Alerts */}
      {understockList.length > 0 && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-bold rounded-xl">
             🚨 {understockList.length} código(s) de produto estão operando abaixo do nível mínimo de segurança!
          </div>

          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            🛒 Sugestão de Fornecimento Automático (Reposição)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {understockList.map(([ch, g]) => {
              // Calculate quantities to repopulate
              const targetMax = g.maxStock;
              let qtyToOrder = targetMax > 0 ? (targetMax - g.totalStock) : (g.minStock * 2 - g.totalStock);
              qtyToOrder = Math.max(1, Math.round(qtyToOrder));

      // Estimate value based on last transaction
      const grpBarcodes = g.items.map(([bc]) => bc);
      const entList = Object.values(movements as Record<string, any>).filter(
        (m: any) => m.tipo === "ENTRADA" && grpBarcodes.includes(m.codigo)
      ).sort((a: any, b: any) => b.data.localeCompare(a.data)) as any[];

              const lastPrice = entList.length > 0 ? Number(entList[0].preco || 0) : Number(g.items[0][1].preco || 0);
              const estimateValue = qtyToOrder * lastPrice;

              // Check if order already exist
              const hasOrderInPipeline = Object.values(purchaseOrders).some((po: any) => {
                const containsItem = po.itens?.some((it: any) => it.nome === g.nome);
                return containsItem && po.status !== "CONCLUÍDO" && po.status !== "CANCELADO";
              });

              return (
                <div
                  key={ch}
                  className={`bg-white border-l-4 rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden ${
                    hasOrderInPipeline ? "border-emerald-500" : "border-amber-500"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-extrabold text-slate-800 leading-tight">{g.nome}</h5>
                      <span className="text-[10px] text-slate-400 block mt-1">Cód. Interno: {ch}</span>
                    </div>

                    <span
                      className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase ${
                        hasOrderInPipeline
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {hasOrderInPipeline ? "✅ Transação Emitida" : "⏳ Reposição Requerida"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-slate-50 text-slate-600">
                    <div>
                      <span className="text-slate-400 text-[9px] font-bold block uppercase">Estoque</span>
                      <b>{g.totalStock}</b> {g.unid}
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9px] font-bold block uppercase">Mínimo</span>
                      <b>{g.minStock}</b> {g.unid}
                    </div>
                    <div>
                      <span className="text-slate-400 text-[9px] font-bold block uppercase">Estoque Máx</span>
                      <b>{targetMax > 0 ? targetMax : "─"}</b>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 leading-relaxed">
                    Sugestão de compra: <b className="text-orange-600">{qtyToOrder} {g.unid}</b> &bull; Custo unit.: {formatPrice(lastPrice)} &bull; Estimativa da Nota: <b className="text-slate-700">{formatPrice(estimateValue)}</b>
                    {entList.length > 0 && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        Última compra: {entList[0].data} &bull; Fornecedor: {entList[0].fornecedor}
                      </div>
                    )}
                  </div>

                  {!hasOrderInPipeline && (
                    <div className="flex flex-col md:flex-row gap-2 items-end pt-2 border-t border-slate-50">
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Prazo de Entrega Desejado *
                        </label>
                        <input
                          type="text"
                          value={poDates[ch] || ""}
                          onChange={(e) => setPoDates({ ...poDates, [ch]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none"
                          placeholder="Ex: DD/MM/AAAA"
                        />
                      </div>

                      <button
                        onClick={() => handleGenerateAutoPO(ch, g, qtyToOrder, lastPrice)}
                        className="py-2 px-4 bg-[#C75B12] hover:bg-[#EA6C0A] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                      >
                        Gerar Requisição Compras
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global Stock Finder */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
          📋 Estoque Geral de Almoxarifado
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white placeholder-slate-400"
            placeholder="🔍 Filtrar produto por nome ou código..."
          />

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
          >
            <option value="TODAS">Categorias (Todas)</option>
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyCritical}
              onChange={(e) => setOnlyCritical(e.target.checked)}
              className="w-4 h-4 rounded text-[#C75B12]"
            />
            <span>Visualizar somente itens em Alerta</span>
          </label>
        </div>

        <div className="overflow-x-auto text-xs pt-2">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-3 font-semibold text-slate-500 w-8">Alerta</th>
                <th className="p-3 font-semibold text-slate-500">Cód. Interno</th>
                <th className="p-3 font-semibold text-slate-500">Descrição do Item</th>
                <th className="p-3 font-semibold text-slate-500">Categoria</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Marcas equiv</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Qtd Estoque</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Nível Mínimo</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Estoque Máximo</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Unidade</th>
                <th className="p-3 font-semibold text-slate-500 text-center">Status</th>
                <th className="p-3 font-semibold text-slate-500 text-right">Patrimônio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedGridRows.map((row) => {
                const isCritical = row.status === "🔴 Crítico";
                const isUnder = row.status === "🟡 Baixo" || isCritical;

                return (
                  <tr key={row.code} className="hover:bg-slate-50/50">
                    <td className="p-3 text-center">{isCritical ? "⚠️" : "✅"}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{row.code}</td>
                    <td className="p-3 font-bold text-slate-800">{row.nome}</td>
                    <td className="p-3 text-slate-500">{row.categoria}</td>
                    <td className="p-3 text-center text-slate-500 font-bold">{row.brandsCount}</td>
                    <td className={`p-3 text-center font-black ${isCritical ? "text-rose-600" : isUnder ? "text-amber-500" : "text-slate-800"}`}>
                      {row.stock}
                    </td>
                    <td className="p-3 text-center text-slate-500 font-bold">{row.min || "─"}</td>
                    <td className="p-3 text-center text-slate-500">{row.max}</td>
                    <td className="p-3 text-center text-slate-400 font-bold">{row.unid}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isCritical
                            ? "bg-red-100 text-red-800"
                            : isUnder
                            ? "bg-amber-100 text-amber-800"
                            : row.status.includes("máx")
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-700">{formatPrice(row.value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center text-xs font-semibold pt-4 border-t border-slate-100 text-slate-500">
          <span>{sortedGridRows.length} grupo(s) de equivalência carregado(s)</span>
          <span>Valor corporativo em estoque: <b className="text-[#C75B12]">{formatPrice(totalValue)}</b></span>
        </div>
      </div>
    </div>
  );
}
