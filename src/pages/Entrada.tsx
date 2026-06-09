import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Product, Supplier } from "../types";

const formatPrice = (v: any) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
};

export default function Entrada({ setor }: { setor?: string }) {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [suppliers, setSuppliers] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Header State
  const [almox, setAlmox] = useState("ALMOX 01");
  const [entryDate, setEntryDate] = useState(new Date().toLocaleDateString("pt-BR"));
  const [invoice, setInvoice] = useState("");
  const [supplierSel, setSupplierSel] = useState("─ Digitar manualmente");
  const [supplierManual, setSupplierManual] = useState("");
  const [respAlmox, setRespAlmox] = useState("");
  const [obs, setObs] = useState("");

  // Item Addition State
  const [itemCode, setItemCode] = useState("");
  const [itemQtd, setItemQtd] = useState(0);
  const [itemPrice, setItemPrice] = useState(0);
  const [itemMatch, setItemMatch] = useState<[string, Product] | null>(null);

  // Added Items List State
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, supsRes, usersRes] = await Promise.all([
        api.get("produtos"),
        api.get("fornecedores"),
        api.get("usuarios"),
      ]);
      setProducts(prodsRes || {});
      setSuppliers(supsRes || {});
      setUsers(usersRes || {});

      // Auto-select responsible if warehouse user matches current log
      const loggedUser = localStorage.getItem("geplan_username") || "admin";
      const userList = Object.values(usersRes || {}) as any[];
      const activeWarehouseUsers = userList.filter((u: any) => u.setor === "ALMOXARIFADO");
      const matched = activeWarehouseUsers.find((u: any) => u.login === loggedUser);
      if (matched) {
        setRespAlmox(matched.nome);
      } else if (activeWarehouseUsers.length > 0) {
        setRespAlmox(activeWarehouseUsers[0].nome);
      } else if (userList.length > 0) {
        setRespAlmox((userList[0] as any).nome);
      }
    } catch (e) {
      console.error("Failed to load invoice receipt dependencies", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update item search on code typing
  useEffect(() => {
    if (!itemCode.trim()) {
      setItemMatch(null);
      return;
    }

    const term = itemCode.trim().toUpperCase();
    const barcodeMatches = Object.entries(products as Record<string, any>).filter(([bc]) => bc.toUpperCase() === term) as [string, any][];
    const internalMatches = Object.entries(products as Record<string, any>).filter(([_, p]) => p.codigo_produto?.toUpperCase() === term) as [string, any][];

    if (barcodeMatches.length > 0) {
      setItemMatch(barcodeMatches[0]);
    } else if (internalMatches.length > 0) {
      // Pick one with highest stock
      const sorted = internalMatches.sort((a, b) => b[1].estoque - a[1].estoque);
      setItemMatch(sorted[0]);
    } else {
      setItemMatch(null);
    }
  }, [itemCode, products]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim()) {
      setErrorMsg("Adicione um código do produto.");
      return;
    }
    if (!itemMatch) {
      setErrorMsg(`Produto "${itemCode}" não foi encontrado em catálogo.`);
      return;
    }
    if (itemQtd <= 0) {
      setErrorMsg("A quantidade informada precisa ser maior que zero.");
      return;
    }
    if (itemPrice <= 0) {
      setErrorMsg("O preço unitário de custo precisa ser maior que zero.");
      return;
    }

    const [cb, p] = itemMatch;

    // Check if item already exists in this invoice, if so, merge them
    const existingIdx = invoiceItems.findIndex((it) => it.cb === cb);
    if (existingIdx !== -1) {
      const merged = [...invoiceItems];
      merged[existingIdx].qtd += itemQtd;
      merged[existingIdx].subtotal = merged[existingIdx].qtd * itemPrice;
      merged[existingIdx].precio = itemPrice; // update with latest price
      setInvoiceItems(merged);
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          cb,
          nome: p.nome,
          unid: p.unid || "UND",
          categoria: p.categoria || "",
          qtd: itemQtd,
          preco: itemPrice,
          subtotal: itemQtd * itemPrice,
        },
      ]);
    }

    // Reset item input
    setItemCode("");
    setItemQtd(0);
    setItemPrice(0);
    setErrorMsg("");
    setSuccessMsg("Item adicionado com sucesso!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleRemoveItem = (index: number) => {
    const updated = invoiceItems.filter((_, idx) => idx !== index);
    setInvoiceItems(updated);
  };

  const handleSaveInvoice = async () => {
    if (invoiceItems.length === 0) {
      setErrorMsg("Insira pelo menos 1 item na lista da nota fiscal.");
      return;
    }

    const finalSupplier =
      supplierSel === "─ Digitar manualmente" ? supplierManual.trim() : supplierSel.split(" — ")[1];

    if (!finalSupplier) {
      setErrorMsg("O fornecedor é obrigatório. Selecione ou digite manualmente.");
      return;
    }

    if (!invoice.trim()) {
      setErrorMsg("O número da Nota Fiscal / Orçamento é obrigatório.");
      return;
    }

    try {
      const updatedProds = { ...products };
      const movements: Record<string, any> = await api.get("movimentos") || {};
      const warningsList: string[] = [];
      const nowTs = Date.now();

      invoiceItems.forEach((it, idx) => {
        const cb = it.cb;
        const currentStock = Number(updatedProds[cb].estoque || 0);
        const maxStock = Number(updatedProds[cb].estoque_max || 0);
        const newStock = currentStock + it.qtd;

        // Verify max stock exceeded
        if (maxStock > 0 && newStock > maxStock) {
          warningsList.push(
            `O produto "${it.nome}" ultrapassou a capacidade máxima configurada (Estoque final: ${newStock} / Máximo: ${maxStock})`
          );
        }

        // Apply new stock and price on catalog product
        updatedProds[cb].estoque = newStock;
        updatedProds[cb].preco = it.preco;

        // Log entry movement
        const movId = `${nowTs}_${idx}`;
        movements[movId] = {
          tipo: "ENTRADA",
          numero_nf: invoice,
          codigo: cb,
          nome: it.nome,
          unid: it.unid,
          qtd: it.qtd,
          preco: it.preco,
          fornecedor: finalSupplier,
          nf: invoice,
          obs,
          almoxarifado: almox,
          responsavel: respAlmox,
          resp_almox: respAlmox,
          data: entryDate,
          usuario: localStorage.getItem("geplan_username") || "admin",
        };
      });

      // Save records back to DB
      await api.set("produtos", updatedProds);
      await api.set("movimentos", movements);

      setWarnings(warningsList);
      setSuccessMsg(`Recebimento da Nota Fiscal ${invoice} de R$ ${invoiceItems.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2)} efetuado com sucesso!`);
      
      // Cleanup all fields
      setInvoiceItems([]);
      setInvoice("");
      setSupplierManual("");
      setObs("");
      
      // Reload fresh database state
      const freshProds = await api.get("produtos");
      setProducts(freshProds || {});
    } catch (e: any) {
      setErrorMsg(e.message || "Erro ao realizar o salvamento da nota.");
    }
  };

  const totalInvoice = invoiceItems.reduce((acc, it) => acc + it.subtotal, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando catálogo de produtos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-bold rounded-xl">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-bold rounded-xl">
          ⚠️ {errorMsg}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold rounded-xl space-y-1">
          {warnings.map((w, idx) => (
            <div key={idx}>&bull; {w}</div>
          ))}
        </div>
      )}

      {/* Invoice Header Details */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
          📄 Dados da Nota Fiscal / Recebimento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Almoxarifado Destino
              </label>
              <select
                value={almox}
                onChange={(e) => setAlmox(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="ALMOX 01">ALMOX 01</option>
                <option value="ALMOX 02">ALMOX 02</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Data de Entrada
              </label>
              <input
                type="text"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: DD/MM/AAAA"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Número da Nota Fiscal / Orçamento *
              </label>
              <input
                type="text"
                value={invoice}
                onChange={(e) => setInvoice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: NF-2345 ou ORC-892"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Fornecedor *
              </label>
              <select
                value={supplierSel}
                onChange={(e) => setSupplierSel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="─ Digitar manualmente">─ Digitar manualmente</option>
                {Object.entries(suppliers as Record<string, any>).map(([code, s]) => (
                  <option key={code} value={`${code} — ${s.nome}`}>
                    {code} &mdash; {s.nome}
                  </option>
                ))}
              </select>

              {supplierSel === "─ Digitar manualmente" && (
                <input
                  type="text"
                  value={supplierManual}
                  onChange={(e) => setSupplierManual(e.target.value)}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Digite a Razão Social ou Nome do Fornecedor..."
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Operador Almoxarifado Responsável
              </label>
              <select
                value={respAlmox}
                onChange={(e) => setRespAlmox(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                {Object.values(users)
                  .filter((u: any) => u.setor === "ALMOXARIFADO")
                  .map((u: any) => (
                    <option key={u.login} value={u.nome}>
                      {u.nome}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Observações
              </label>
              <input
                type="text"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: Entrega parcial do lote"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Item Addition Section */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2 mb-4">
          📦 Adicionar Item à Nota Fiscal
        </h3>

        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
              Código do Produto *
            </label>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white placeholder-slate-400"
              placeholder="Digite o código interno ou código de barras..."
            />
            {itemMatch && (
              <span className="text-[11px] font-bold text-emerald-600 mt-1 block">
                ✅ {itemMatch[1].nome} &bull; Estoque: {itemMatch[1].estoque} {itemMatch[1].unid}
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
              Quantidade de Entrada *
            </label>
            <input
              type="number"
              value={itemQtd || ""}
              onChange={(e) => setItemQtd(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
              placeholder="Ex: 50"
              min={1}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
              Preço Unitário R$ *
            </label>
            <input
              type="number"
              value={itemPrice || ""}
              onChange={(e) => setItemPrice(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
              placeholder="Ex: 12.50"
              step="any"
              min={0.01}
            />
          </div>

          <div className="md:col-span-4">
            <button
              type="submit"
              className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md"
            >
              ➕ Adicionar Item na Lista
            </button>
          </div>
        </form>
      </div>

      {/* Invoice items listing */}
      {invoiceItems.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
            🧾 Itens Inclusos na Lista ({invoiceItems.length})
          </h3>

          <div className="space-y-2">
            {invoiceItems.map((it, idx) => (
              <div
                key={idx}
                className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-3.1 rounded-xl text-xs gap-2 md:gap-4 hover:bg-slate-100/50"
              >
                <div className="flex-1 font-bold text-slate-700">{it.nome}</div>
                <div className="text-slate-500 font-semibold">{`${it.qtd} ${it.unid}`}</div>
                <div className="text-slate-500 font-semibold">{`${formatPrice(it.preco)}/u`}</div>
                <div className="font-extrabold text-slate-800">{formatPrice(it.subtotal)}</div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="px-2.5 py-1 text-rose-500 hover:bg-rose-100 rounded-lg font-bold cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-end gap-3 pt-4 border-t border-slate-150">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total Geral da Nota
              </span>
              <div className="text-xl font-black text-[#C75B12]">{formatPrice(totalInvoice)}</div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleSaveInvoice}
                className="flex-1 md:flex-initial py-3 px-8 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] text-white text-xs font-bold rounded-lg cursor-pointer shadow-lg hover:shadow-orange-500/20 active:translate-y-0 transition-all duration-150"
              >
                💾 Confirmar e Registrar Nota Fiscal
              </button>

              <button
                type="button"
                onClick={() => setInvoiceItems([])}
                className="py-3 px-6 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-xs font-bold text-slate-500 cursor-pointer transition-all duration-150"
              >
                Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
