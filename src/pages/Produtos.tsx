import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Product } from "../types";

export default function Produtos() {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("📋 Lista");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("Todas");

  // Create Product Form States
  const [newBarcode, setNewBarcode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("PEÇA LEVE");
  const [newUnid, setNewUnid] = useState("UNID");
  const [newInternal, setNewInternal] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newMin, setNewMin] = useState(0);
  const [newMax, setNewMax] = useState(0);
  const [newEstoque, setNewEstoque] = useState(0);
  const [newCabinet, setNewCabinet] = useState("");
  const [newShelf, setNewShelf] = useState("");
  const [newEpiVal, setNewEpiVal] = useState(0);

  // Edit Product Form States
  const [editSelectedBarcode, setEditSelectedBarcode] = useState("");
  const [editName, setEditName] = useState("");
  const [editCat, setEditCat] = useState("PEÇA LEVE");
  const [editUnid, setEditUnid] = useState("UNID");
  const [editInternal, setEditInternal] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editMin, setEditMin] = useState(0);
  const [editMax, setEditMax] = useState(0);
  const [editEstoque, setEditEstoque] = useState(0);
  const [editCabinet, setEditCabinet] = useState("");
  const [editShelf, setEditShelf] = useState("");
  const [editEpiVal, setEditEpiVal] = useState(0);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("produtos");
      setProducts(res || {});
    } catch (e) {
      console.error("Failed to load products directory", e);
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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const bc = newBarcode.trim();
    const name = newName.trim();

    if (!bc || !name) {
      setErrorMsg("O código de barras e o nome do produto são obrigatórios.");
      return;
    }

    if (products[bc]) {
      setErrorMsg(`O código de barras "${bc}" já está cadastrado para outro produto.`);
      return;
    }

    try {
      const updated = { ...products };
      updated[bc] = {
        nome: name,
        categoria: newCat,
        unid: newUnid,
        preco: newPrice,
        estoque: newEstoque,
        estoque_min: newMin,
        estoque_max: newMax,
        codigo_produto: newInternal.trim().toUpperCase(),
        armario: newCabinet.trim().toUpperCase(),
        prateleira: newShelf.trim().toUpperCase(),
        dias_validade_epi: newCat === "EPI" ? Number(newEpiVal) : 0,
      };

      await api.set("produtos", updated);
      setSuccessMsg(`Produto "${name}" cadastrado com sucesso!`);
      
      // Reset fields
      setNewBarcode("");
      setNewName("");
      setNewInternal("");
      setNewPrice(0);
      setNewMin(0);
      setNewMax(0);
      setNewEstoque(0);
      setNewCabinet("");
      setNewShelf("");
      setNewEpiVal(0);

      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha de rede ao cadastrar produto.");
    }
  };

  const handleEditSelectChange = (bc: string) => {
    setEditSelectedBarcode(bc);
    if (!bc) return;

    const p = products[bc];
    setEditName(p.nome || "");
    setEditCat(p.categoria || "PEÇA LEVE");
    setEditUnid(p.unid || "UNID");
    setEditInternal(p.codigo_produto || "");
    setEditPrice(p.preco || 0);
    setEditMin(p.estoque_min || 0);
    setEditMax(p.estoque_max || 0);
    setEditEstoque(p.estoque || 0);
    setEditCabinet(p.armario || "");
    setEditShelf(p.prateleira || "");
    setEditEpiVal(p.dias_validade_epi || 0);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!editSelectedBarcode) return;

    const name = editName.trim();
    if (!name) {
      setErrorMsg("O nome do produto não pode ficar em branco.");
      return;
    }

    try {
      const updated = { ...products };
      updated[editSelectedBarcode] = {
        nome: name,
        categoria: editCat,
        unid: editUnid,
        preco: editPrice,
        estoque: editEstoque,
        estoque_min: editMin,
        estoque_max: editMax,
        codigo_produto: editInternal.trim().toUpperCase(),
        armario: editCabinet.trim().toUpperCase(),
        prateleira: editShelf.trim().toUpperCase(),
        dias_validade_epi: editCat === "EPI" ? Number(editEpiVal) : 0,
      };

      await api.set("produtos", updated);
      setSuccessMsg(`Produto "${name}" atualizado e salvo com sucesso!`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de rede ao salvar modificações.");
    }
  };

  // Compile list and warn missing EPI specs
  const filteredProductsList = Object.entries(products as Record<string, any>).filter(([bc, p]) => {
    const term = search.toUpperCase().trim();
    const matchSearch =
      !term ||
      bc.includes(term) ||
      p.nome.toUpperCase().includes(term) ||
      (p.codigo_produto && p.codigo_produto.toUpperCase().includes(term));

    const matchCat = selectedCat === "Todas" || p.categoria === selectedCat;
    return matchSearch && matchCat;
  });

  const missingEpiValidities = Object.values(products as Record<string, any>).filter(
    (p: any) => p.categoria === "EPI" && (!p.dias_validade_epi || p.dias_validade_epi <= 0)
  ) as any[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando central de produtos...</span>
      </div>
    );
  }

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

      {missingEpiValidities.length > 0 && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-800 text-xs">
          <b>🦺 Alerta de EPI:</b> {missingEpiValidities.length} Equipamento(s) de Proteção Individual (EPI) estão sem configuração de validade/vida útil!
          <div className="text-[11px] text-slate-500 mt-1">
            Configure a quantidade de dias úteis em <b>&ldquo;✏️ Editar Produto&rdquo;</b> para que as notas de saída de EPI estimem automaticamente a data de troca do trabalhador.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex border-b border-slate-150 pb-2 overflow-x-auto gap-2">
          {["📋 Lista", "➕ Novo Produto", "✏️ Editar Produto"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 px-4 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === tab
                  ? "bg-[#C75B12] text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Lista */}
        {activeTab === "📋 Lista" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white placeholder-slate-400"
                placeholder="🔍 Pesquise por nome, código de barras ou interno..."
              />

              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="Todas">Todas as Categorias</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {filteredProductsList.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">Cód. Barras</th>
                      <th className="p-3 font-semibold text-slate-500">Cód. Interno</th>
                      <th className="p-3 font-semibold text-slate-500">Descrição do Produto</th>
                      <th className="p-3 font-semibold text-slate-500">Categoria</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Unid</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Estoque</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Mínimo</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Armário/Prat.</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Validade EPI</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProductsList.map(([bc, item]) => {
                      const est = Number(item.estoque || 0);
                      const min = Number(item.estoque_min || 0);
                      const max = Number(item.estoque_max || 0);
                      const isEpi = item.categoria === "EPI";

                      let statusStyle = "text-slate-800";
                      if (min > 0 && est <= min) statusStyle = "text-rose-600 font-black";
                      else if (max > 0 && est > max) statusStyle = "text-blue-500 font-bold";

                      return (
                        <tr key={bc} className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono text-slate-500">{bc}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{item.codigo_produto || "─"}</td>
                          <td className="p-3 font-bold text-slate-800">{item.nome}</td>
                          <td className="p-3 text-slate-500">{item.categoria}</td>
                          <td className="p-3 text-center text-slate-400 font-bold">{item.unid}</td>
                          <td className={`p-3 text-center ${statusStyle}`}>{est}</td>
                          <td className="p-3 text-center text-slate-500 font-bold">{min || "─"}</td>
                          <td className="p-3 text-center text-slate-500">
                            {item.armario || item.prateleira ? `${item.armario}-${item.prateleira}` : "─"}
                          </td>
                          <td className="p-3 text-center">
                            {isEpi ? (
                              item.dias_validade_epi && item.dias_validade_epi > 0 ? (
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                                  {item.dias_validade_epi} dias
                                </span>
                              ) : (
                                <span className="text-amber-600 font-bold">⚠️ Não conf.</span>
                              )
                            ) : (
                              "─"
                            )}
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-700">{formatPrice(item.preco)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Nenhum produto cadastrado corresponde aos termos de filtragem definidos.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Novo Produto */}
        {activeTab === "➕ Novo Produto" && (
          <form onSubmit={handleCreateProduct} className="space-y-4 max-w-4xl animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Código de Barras *
                </label>
                <input
                  type="text"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Código de barras (ex: EAN)"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Nome descritivo"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Categoria
                </label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Unidade de Medida
                </label>
                <select
                  value={newUnid}
                  onChange={(e) => setNewUnid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Código Interno
                </label>
                <input
                  type="text"
                  value={newInternal}
                  onChange={(e) => setNewInternal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Equivalências entre marcas (ex: FILT-64B)"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Preço de Custo Unitário R$
                </label>
                <input
                  type="number"
                  value={newPrice || ""}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 25.50"
                  step="any"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Estoque Mínimo de Segurança
                </label>
                <input
                  type="number"
                  value={newMin || ""}
                  onChange={(e) => setNewMin(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 5"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Estoque Máximo (0 = sem limite)
                </label>
                <input
                  type="number"
                  value={newMax || ""}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 200"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Estoque Inicial
                </label>
                <input
                  type="number"
                  value={newEstoque || ""}
                  onChange={(e) => setNewEstoque(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Armário 🗄️
                  </label>
                  <input
                    type="text"
                    value={newCabinet}
                    onChange={(e) => setNewCabinet(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    placeholder="Ex: A3"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Prateleira 📦
                  </label>
                  <input
                    type="text"
                    value={newShelf}
                    onChange={(e) => setNewShelf(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    placeholder="Ex: P1"
                  />
                </div>
              </div>

              {newCat === "EPI" && (
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-indigo-400 block mb-1.5 uppercase tracking-widest">
                    🦺 Vida Útil / Validade EPI (dias)
                  </label>
                  <input
                    type="number"
                    value={newEpiVal || ""}
                    onChange={(e) => setNewEpiVal(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    placeholder="Quantidade de dias que o trabalhador pode usar antes de vencer (ex: 180)"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Cadastrar Produto
            </button>
          </form>
        )}

        {/* Tab 3: Editar Produto */}
        {activeTab === "✏️ Editar Produto" && (
          <div className="space-y-4 max-w-4xl animate-fade-in">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Selecione o Produto para Modificação
              </label>
              <select
                value={editSelectedBarcode}
                onChange={(e) => handleEditSelectChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">─ Escolha o produto...</option>
                {Object.entries(products as Record<string, any>).map(([bc, item]) => (
                  <option key={bc} value={bc}>
                    {bc} &mdash; {item.nome}
                  </option>
                ))}
              </select>
            </div>

            {editSelectedBarcode && (
              <form onSubmit={handleEditProduct} className="space-y-4 pt-4 border-t border-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Nome descritivo
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      placeholder="Nome descritivo"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Categoria
                    </label>
                    <select
                      value={editCat}
                      onChange={(e) => setEditCat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Unidade de Medida
                    </label>
                    <select
                      value={editUnid}
                      onChange={(e) => setEditUnid(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Código Interno
                    </label>
                    <input
                      type="text"
                      value={editInternal}
                      onChange={(e) => setEditInternal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Preço R$
                    </label>
                    <input
                      type="number"
                      value={editPrice || ""}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      step="any"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Estoque Mínimo de Segurança
                    </label>
                    <input
                      type="number"
                      value={editMin || ""}
                      onChange={(e) => setEditMin(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Estoque Máximo (0 = sem limite)
                    </label>
                    <input
                      type="number"
                      value={editMax || ""}
                      onChange={(e) => setEditMax(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Almoxarifado Estoque Atual
                    </label>
                    <input
                      type="number"
                      value={editEstoque || ""}
                      onChange={(e) => setEditEstoque(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                        Armário 🗄️
                      </label>
                      <input
                        type="text"
                        value={editCabinet}
                        onChange={(e) => setEditCabinet(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                        Prateleira 📦
                      </label>
                      <input
                        type="text"
                        value={editShelf}
                        onChange={(e) => setEditShelf(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  {editCat === "EPI" && (
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-indigo-400 block mb-1.5 uppercase tracking-widest">
                        🦺 Vida Útil / Validade EPI (dias)
                      </label>
                      <input
                        type="number"
                        value={editEpiVal || ""}
                        onChange={(e) => setEditEpiVal(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer animate-fade-in"
                >
                  Salvar Alterações
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const CATEGORIAS = [
  "FILTROS",
  "ÓLEOS",
  "GRAXAS",
  "LUBRIFICANTES",
  "COMBUSTÍVEL",
  "PEÇAS MOTOR",
  "PEÇAS HIDRÁULICAS",
  "ELÉTRICA",
  "ILUMINAÇÃO",
  "FREIOS",
  "SUSPENSÃO",
  "ROLAMENTOS",
  "CORREIAS",
  "MANGUEIRAS",
  "PARAFUSOS",
  "FERRAMENTAS",
  "EPI",
  "MATERIAL DE LIMPEZA",
  "SOLDA",
  "PNEUS",
  "BATERIAS",
  "TINTAS",
  "MATERIAL DE ESCRITÓRIO",
  "INFORMÁTICA",
  "OUTROS",
  "PEÇA LEVE",
  "PEÇA PESADA",
  "ROÇADA",
  "CONSUMO ADM",
];

export const UNIDADES = ["UNID", "METROS", "LITROS", "KG"];
export const TIPOS_EQUIP = ["ROÇADEIRA", "SOPRADOR", "OUTRO"];
export const ALMOXARIFADOS = ["ALMOX 01", "ALMOX 02"];
export const TIPOS_COMBUSTIVEL = ["DIESEL S500", "DIESEL S10", "GASOLINA"];
