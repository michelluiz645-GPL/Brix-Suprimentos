import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Vehicle, Equipment } from "../types";

export default function PedidosCompra() {
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, any>>({});
  const [vehicles, setVehicles] = useState<Record<string, any>>({});
  const [equipments, setEquipments] = useState<Record<string, Equipment>>({});
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("📋 Solicitações");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // New SC Form State
  const [scUrgency, setScUrgency] = useState("Normal");
  const [scOs, setScOs] = useState("");
  const [scVeic, setScVeic] = useState("");
  const [scDesejada, setScDesejada] = useState("");
  const [scItemNome, setScItemNome] = useState("");
  const [scItemQtd, setScItemQtd] = useState("");
  const [scItemUnid, setScItemUnid] = useState("UNID");
  const [scItemMotivo, setScItemMotivo] = useState("");
  const [scItems, setScItems] = useState<any[]>([]);

  // Bid comparison State for selected SC
  const [selectedPoIdForQuotation, setSelectedPoIdForQuotation] = useState("");
  const [pVendorA, setPVendorA] = useState("");
  const [pPriceA, setPPriceA] = useState("");
  const [pVendorB, setPVendorB] = useState("");
  const [pPriceB, setPPriceB] = useState("");
  const [pVendorC, setPVendorC] = useState("");
  const [pPriceC, setPPriceC] = useState("");
  const [pChosen, setPChosen] = useState("A");

  const loadData = async () => {
    try {
      setLoading(true);
      const [poRes, veicsRes, equipRes] = await Promise.all([
        api.get("pedidos_compra"),
        api.get("veiculos"),
        api.get("equipamentos"),
      ]);

      setPurchaseOrders(poRes || {});
      setVehicles(veicsRes || {});
      setEquipments(equipRes || {});
    } catch (e) {
      console.error("Failed to load purchase operations", e);
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

  const handleAddItemToSC = () => {
    const nome = scItemNome.trim();
    const qty = Number(scItemQtd);

    if (!nome) {
      setErrorMsg("O nome do item é obrigatório.");
      return;
    }
    if (qty <= 0) {
      setErrorMsg("A quantidade informada precisa ser maior que zero.");
      return;
    }

    setScItems([
      ...scItems,
      {
        nome,
        qtd: String(qty),
        unidade: scItemUnid,
        motivo: scItemMotivo.trim(),
        ultimo_preco: 0,
        valor_estimado: 0,
      },
    ]);

    setScItemNome("");
    setScItemQtd("");
    setScItemMotivo("");
    setErrorMsg("");
  };

  const handleRemoveItemFromSC = (index: number) => {
    setScItems(scItems.filter((_, i) => i !== index));
  };

  const handleSubmitNewPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (scItems.length === 0) {
      setErrorMsg("Adicione pelo menos um item à lista de solicitação.");
      return;
    }

    try {
      setLoading(true);
      const numbering = await api.get("numeracao") || {};
      const nextId = Number(numbering.pedido_manual || 0) + 1;
      const pcId = `PC-${String(nextId).padStart(5, "0")}`;

      const pos = await api.get("pedidos_compra") || {};
      
      pos[String(Date.now())] = {
        numero: pcId,
        tipo: "MANUAL",
        status: "PENDENTE COTAÇÃO",
        data_pedido: new Date().toLocaleDateString("pt-BR"),
        data_desejada: scDesejada.trim() || new Date().toLocaleDateString("pt-BR"),
        solicitante: localStorage.getItem("geplan_username") || "Colaborador Engenharia",
        registrado_por: localStorage.getItem("geplan_username") || "admin",
        urgency: scUrgency,
        os: scOs.trim().toUpperCase(),
        veiculo: scVeic,
        itens: scItems,
      };

      // Increment sequence
      numbering.pedido_manual = nextId;
      await api.set("numeracao", numbering);
      await api.set("pedidos_compra", pos);

      setSuccessMsg(`Solicitação de Compras ${pcId} enviada para cotação de preços com sucesso!`);
      // Reset
      setScItems([]);
      setScOs("");
      setScVeic("");
      setScDesejada("");
      setScUrgency("Normal");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao registrar PC.");
    } finally {
      setLoading(false);
    }
  };

  // Bid / Supplier choice register
  const handleSaveQuotationBids = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedPoIdForQuotation) return;

    const valA = Number(pPriceA);
    const valB = Number(pPriceB);
    const valC = Number(pPriceC);

    if (isNaN(valA) && isNaN(valB) && isNaN(valC)) {
      setErrorMsg("Informe pelo menos um valor válido para as propostas comerciais.");
      return;
    }

    try {
      setLoading(true);
      const pos = await api.get("pedidos_compra") || {};
      const target = pos[selectedPoIdForQuotation];

      if (!target) {
        setErrorMsg("Solicitação não localizada.");
        return;
      }

      // Calculate automatic target saving
      const validPrices = [valA, valB, valC].filter((p) => !isNaN(p) && p > 0);
      const maxPrice = Math.max(...validPrices);
      const minPrice = Math.min(...validPrices);
      const savingEst = maxPrice - minPrice;

      let chosenPrice = 0;
      let chosenVendor = "";

      if (pChosen === "A") {
        chosenPrice = valA;
        chosenVendor = pVendorA;
      } else if (pChosen === "B") {
        chosenPrice = valB;
        chosenVendor = pVendorB;
      } else {
        chosenPrice = valC;
        chosenVendor = pVendorC;
      }

      target.cotacoes_fornecedores = {
        forn_A: pVendorA,
        val_A: valA,
        forn_B: pVendorB,
        val_B: valB,
        forn_C: pVendorC,
        val_C: valC,
        forn_escolhido: chosenVendor,
        val_escolhido: chosenPrice,
        saving_previsto: savingEst,
      };

      target.status = "COMPRAS (CORTADO)";
      
      // Update price values to PO items automatically
      if (target.itens && target.itens.length > 0) {
        target.itens[0].ultimo_preco = chosenPrice / Number(target.itens[0].qtd || 1);
        target.itens[0].valor_estimado = chosenPrice;
      }

      await api.set("pedidos_compra", pos);
      setSuccessMsg(`Propostas inseridas no pedido ${target.numero}. Status alterado para aprovação.`);
      setSelectedPoIdForQuotation("");
      setPVendorA("");
      setPPriceA("");
      setPVendorB("");
      setPPriceB("");
      setPVendorC("");
      setPPriceC("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao registrar propostas.");
    } finally {
      setLoading(false);
    }
  };

  // Direct status transition trigger
  const handleTransitionStatus = async (poKey: string, newStatus: string) => {
    setErrorMsg("");
    setSuccessMsg("");

    try {
      setLoading(true);
      const pos = await api.get("pedidos_compra") || {};
      const target = pos[poKey];

      if (target) {
        target.status = newStatus;
        
        // If order concluded, update products database stock levels automatically
        if (newStatus === "CONCLUÍDO") {
          const prods = await api.get("produtos") || {};
          (target.itens || []).forEach((item: any) => {
            // Find fitting shelf address by item brand/internal name
            const matchingEntries = Object.entries(prods).filter(
              ([_, p]: any) => p.nome === item.nome || p.codigo_produto === item.medida
            );

            if (matchingEntries.length > 0) {
              const [bc, pObj]: any = matchingEntries[0];
              pObj.estoque = Number(pObj.estoque || 0) + Number(item.qtd || 1);
            }
          });
          await api.set("produtos", prods);
        }

        await api.set("pedidos_compra", pos);
        setSuccessMsg(`Status do pedido ${target.numero} atualizado com êxito para "${newStatus}".`);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao realizar transição de aprovação.");
    } finally {
      setLoading(false);
    }
  };

  const selectQuotationForm = (key: string) => {
    setSelectedPoIdForQuotation(key);
    const target = purchaseOrders[key];
    const prev = target.cotacoes_fornecedores || {};
    setPVendorA(prev.forn_A || "");
    setPPriceA(prev.val_A || "");
    setPVendorB(prev.forn_B || "");
    setPPriceB(prev.val_B || "");
    setPVendorC(prev.forn_C || "");
    setPPriceC(prev.val_C || "");
    setPChosen("A");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando central de suprimentos...</span>
      </div>
    );
  }

  const frotasOpt = ["─ Sem frota"].concat(
    Object.values(vehicles as Record<string, any>).map((v: any) => `${v.placa || ""} — ${v.modelo || ""}`.trim())
  );

  const poListSorted = Object.entries(purchaseOrders).sort((a: any, b: any) => b[0].localeCompare(a[0])) as [string, any][];

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

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex border-b border-slate-150 pb-2 overflow-x-auto gap-2">
          {["📋 Solicitações", "➕ Nova Requisição", "⚖️ Comparativo de Cotações"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 px-4 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                tab === t
                  ? "bg-[#C75B12] text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab 1: Solicitações */}
        {tab === "📋 Solicitações" && (
          <div className="space-y-4 animate-fade-in">
            {poListSorted.length > 0 ? (
              <div className="space-y-4">
                {poListSorted.map(([key, po]) => {
                  const status = po.status || "PENDENTE COTAÇÃO";
                  const isPendingBid = status === "PENDENTE COTAÇÃO";
                  const isReadyForApproval = status === "COMPRAS (CORTADO)";
                  const isConcluded = status === "CONCLUÍDO";
                  const isCanceled = status === "CANCELADO";

                  let badgeColor = "bg-amber-100 text-amber-800";
                  if (isReadyForApproval) badgeColor = "bg-indigo-100 text-indigo-800";
                  else if (isConcluded) badgeColor = "bg-emerald-100 text-emerald-800";
                  else if (isCanceled) badgeColor = "bg-slate-100 text-slate-600";

                  return (
                    <div
                      key={key}
                      className="bg-slate-50 border border-slate-150 rounded-xl p-5 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Nº Registro
                          </span>
                          <h4 className="text-sm font-black text-slate-800">{po.numero} &mdash; Solicitação {po.tipo}</h4>
                        </div>

                        <div className="flex gap-2 items-center flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${badgeColor}`}>
                            {status}
                          </span>
                          {po.urgency === "Urgente" && (
                            <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded-full text-[9px] font-black uppercase">
                              🚨 URGENTE
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600 pb-3 border-b border-slate-150">
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Pedido em</span>
                          <b>{po.data_pedido}</b>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Prazo Desejável</span>
                          <b>{po.data_desejada}</b>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Solicitante</span>
                          <b>{po.solicitante}</b>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase">Destino (O.S)</span>
                          <b>{po.os || "─"} {po.veiculo ? `| ${po.veiculo}` : ""}</b>
                        </div>
                      </div>

                      <div className="text-xs space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">
                          Itens Requeridos
                        </span>
                        {(po.itens || []).map((it: any, i: number) => (
                          <div key={i} className="bg-white px-3 py-2 rounded-lg border border-slate-100 flex justify-between">
                            <div>
                              <span className="font-bold text-slate-800">{it.nome}</span>
                              {it.motivo && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">Destino: {it.motivo}</span>
                              )}
                            </div>
                            <span className="font-extrabold text-[#C75B12]">{it.qtd} {it.unidade}</span>
                          </div>
                        ))}
                      </div>

                      {/* Quotation preview */}
                      {po.cotacoes_fornecedores && (
                        <div className="bg-slate-100 rounded-lg p-3.5 text-xs space-y-2">
                          <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">
                            ⚖️ Propostas Comerciais Armazenadas
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {po.cotacoes_fornecedores.forn_A && (
                              <div className="bg-white p-2 rounded-md border border-slate-200">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase">Forn A</span>
                                <b>{po.cotacoes_fornecedores.forn_A}</b>: {formatPrice(po.cotacoes_fornecedores.val_A)}
                              </div>
                            )}
                            {po.cotacoes_fornecedores.forn_B && (
                              <div className="bg-white p-2 rounded-md border border-slate-200">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase">Forn B</span>
                                <b>{po.cotacoes_fornecedores.forn_B}</b>: {formatPrice(po.cotacoes_fornecedores.val_B)}
                              </div>
                            )}
                            {po.cotacoes_fornecedores.forn_C && (
                              <div className="bg-white p-2 rounded-md border border-slate-200">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase">Forn C</span>
                                <b>{po.cotacoes_fornecedores.forn_C}</b>: {formatPrice(po.cotacoes_fornecedores.val_C)}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-4 items-center pt-1 border-t border-slate-200 text-slate-500 font-bold">
                            <span>Vencedor: <b className="text-emerald-600">{po.cotacoes_fornecedores.forn_escolhido}</b> ({formatPrice(po.cotacoes_fornecedores.val_escolhido)})</span>
                            {po.cotacoes_fornecedores.saving_previsto > 0 && (
                              <span>Saving: <b className="text-[#C75B12]">{formatPrice(po.cotacoes_fornecedores.saving_previsto)}</b></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Approval controls */}
                      <div className="flex gap-2 pt-2 justify-end">
                        {isPendingBid && (
                          <button
                            onClick={() => {
                              selectQuotationForm(key);
                              setTab("⚖️ Comparativo de Cotações");
                            }}
                            className="bg-[#1e293b] text-white hover:bg-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            💰 Inserir Cotações
                          </button>
                        )}

                        {isReadyForApproval && (
                          <>
                            <button
                              onClick={() => handleTransitionStatus(key, "CONCLUÍDO")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer"
                            >
                              ⚡ Aprovar e Lançar Estoque (Recebido)
                            </button>

                            <button
                              onClick={() => handleTransitionStatus(key, "CANCELADO")}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              ❌ Recusar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Nenhum registro de pedido de compras registrado até o momento.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Nova Requisição */}
        {tab === "➕ Nova Requisição" && (
          <form onSubmit={handleSubmitNewPurchaseOrder} className="space-y-4 animate-fade-in pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
              🏢 Nova Solicitação de Compras (Manutenção / Engenharia)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Prazo de Entrega Desejado *
                </label>
                <input
                  type="text"
                  value={scDesejada}
                  onChange={(e) => setScDesejada(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="DD/MM/AAAA"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Centro de Custos (O.S Nº)
                </label>
                <input
                  type="text"
                  value={scOs}
                  onChange={(e) => setScOs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: OS-2026-04"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Frota / Veículo Alvo
                </label>
                <select
                  value={scVeic}
                  onChange={(e) => setScVeic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {frotasOpt.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Prioridade
                </label>
                <select
                  value={scUrgency}
                  onChange={(e) => setScUrgency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgente">🚨 Urgente</option>
                </select>
              </div>
            </div>

            {/* Sub-form item addition */}
            <div className="p-4 border border-slate-100 bg-slate-50 rounded-xl space-y-4">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                📦 Adicionar Item para Comprar
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Descrição do Item
                  </label>
                  <input
                    type="text"
                    value={scItemNome}
                    onChange={(e) => setScItemNome(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Filtro lubrificante Hilux PSD-33"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Unidade de Medida
                  </label>
                  <select
                    value={scItemUnid}
                    onChange={(e) => setScItemUnid(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="UNID">UNID</option>
                    <option value="METROS">METROS</option>
                    <option value="LITROS">LITROS</option>
                    <option value="KG">KG</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Quantidade requerida
                  </label>
                  <input
                    type="number"
                    value={scItemQtd}
                    onChange={(e) => setScItemQtd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: 5"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Justificativa / Motivo da Solicitação
                  </label>
                  <input
                    type="text"
                    value={scItemMotivo}
                    onChange={(e) => setScItemMotivo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Substituição preventiva no km 120.000"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItemToSC}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
              >
                + Incluir item na Solicitação
              </button>
            </div>

            {/* List to launch */}
            {scItems.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  🛒 Itens Adicionados à Requisição
                </span>

                <div className="space-y-1.5">
                  {scItems.map((item, idx) => (
                    <div key={idx} className="bg-[#C75B12]/5 px-4 py-2 rounded-lg border border-[#C75B12]/10 flex justify-between items-center text-xs">
                      <div>
                        <b>{item.nome}</b> &bull; Motivo: {item.motivo || "─"}
                      </div>
                      <div className="flex gap-4 items-center font-bold">
                        <span className="text-[#C75B12]">{item.qtd} {item.unidade}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromSC(idx)}
                          className="text-red-600 font-black cursor-pointer bg-transparent border-0"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#C75B12] hover:bg-[#EA6C0A] text-white text-xs font-black rounded-xl cursor-pointer"
            >
              Emitir Nova Requisicao de Compras (Enviar para Cotação)
            </button>
          </form>
        )}

        {/* Tab 3: Comparativo de Cotações */}
        {tab === "⚖️ Comparativo de Cotações" && (
          <div className="space-y-4 animate-fade-in pt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Selecione a Solicitação para Inserir Ofertas
              </label>
              <select
                value={selectedPoIdForQuotation || ""}
                onChange={(e) => selectQuotationForm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">─ Filtrar solicitações em cotação comercial...</option>
                {poListSorted
                  .filter(([_, po]) => po.status === "PENDENTE COTAÇÃO")
                  .map(([ky, po]) => (
                    <option key={ky} value={ky}>
                      {po.numero} &mdash; {po.itens?.[0]?.nome || "Sem item"} [{po.solicitante}]
                    </option>
                  ))}
              </select>
            </div>

            {selectedPoIdForQuotation && (
              <form onSubmit={handleSaveQuotationBids} className="space-y-4 pt-4 border-t border-slate-100 max-w-4xl">
                <span className="text-xs font-bold text-[#C75B12] block mb-2 uppercase tracking-wide">
                  📋 Inserir Propostas Comerciais Recebidas (Máx 3 Lojas)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#1E293B]/5 p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">
                      Opção A
                    </span>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Fornecedor</label>
                      <input
                        type="text"
                        value={pVendorA}
                        onChange={(e) => setPVendorA(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Ex: Comercial Auto Peças"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Valor Total do Pedido R$</label>
                      <input
                        type="number"
                        value={pPriceA}
                        onChange={(e) => setPPriceA(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Ex: 1200.00"
                        step="any"
                      />
                    </div>
                  </div>

                  <div className="bg-[#1E293B]/5 p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">
                      Opção B
                    </span>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Fornecedor</label>
                      <input
                        type="text"
                        value={pVendorB}
                        onChange={(e) => setPVendorB(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Ex: Auto Imports Distribuidora"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Valor Total do Pedido R$</label>
                      <input
                        type="number"
                        value={pPriceB}
                        onChange={(e) => setPPriceB(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Ex: 1150.00"
                        step="any"
                      />
                    </div>
                  </div>

                  <div className="bg-[#1E293B]/5 p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-widest">
                      Opção C
                    </span>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Fornecedor</label>
                      <input
                        type="text"
                        value={pVendorC}
                        onChange={(e) => setPVendorC(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Ex: Distribuidora Real de Máquinas"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Valor Total do Pedido R$</label>
                      <input
                        type="number"
                        value={pPriceC}
                        onChange={(e) => setPPriceC(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Ex: 1400.00"
                        step="any"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred purchase bid dropdown */}
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    ⭐ Indicação de Escolha Recomendada
                  </label>
                  <select
                    value={pChosen}
                    onChange={(e) => setPChosen(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="A">Opção A (Forn: {pVendorA || "─"} &bull; Valor: {formatPrice(pPriceA)})</option>
                    <option value="B font-bold">Opção B (Forn: {pVendorB || "─"} &bull; Valor: {formatPrice(pPriceB)})</option>
                    <option value="C">Opção C (Forn: {pVendorC || "─"} &bull; Valor: {formatPrice(pPriceC)})</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-black rounded-lg cursor-pointer transition-colors"
                >
                  Registrar Cotações Comércio para Aprovação
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
