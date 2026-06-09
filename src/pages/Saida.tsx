import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Product, Employee, Team, Vehicle, Crew } from "../types";

const ALMOXARIFADOS = ["ALMOX 01", "ALMOX 02"];

const formatPrice = (v: any) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
};

export default function Saida({ setor }: { setor?: string }) {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [employees, setEmployees] = useState<Record<string, any>>({});
  const [crews, setCrews] = useState<Record<string, any>>({});
  const [vehicles, setVehicles] = useState<Record<string, any>>({});
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Header State
  const [almox, setAlmox] = useState("ALMOX 01");
  const [issueType, setIssueType] = useState("🏪 Retirada");
  const [issueDate, setIssueDate] = useState(new Date().toLocaleDateString("pt-BR"));
  const [crewSel, setCrewSel] = useState("─ Selecione a equipe");
  const [crewManual, setCrewManual] = useState("");
  const [colaborador, setColaborador] = useState("");
  const [driver, setDriver] = useState("");
  const [responsible, setResponsible] = useState("");
  const [obs, setObs] = useState("");

  // Items State
  const [items, setItems] = useState<any[]>([
    { cod: "", qtd: 1, cbSelected: "", colEpi: "", destino: "👥 Para a Equipe", obra_destino: "" },
  ]);

  // Invoice Slips & Print State
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [slipHtml, setSlipHtml] = useState("");
  const [slipB64, setSlipB64] = useState("");
  const [generatedSlipNum, setGeneratedSlipNum] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, empsRes, crewsRes, veicsRes, usersRes] = await Promise.all([
        api.get("produtos"),
        api.get("funcionarios"),
        api.get("equipes"),
        api.get("veiculos"),
        api.get("usuarios"),
      ]);

      setProducts(prodsRes || {});
      setEmployees(empsRes || {});
      setCrews(crewsRes || {});
      setVehicles(veicsRes || {});
      setUsers(usersRes || {});

      // Auto-set responsible operator
      const loggedUser = localStorage.getItem("geplan_username") || "admin";
      const activeWarehouseUsers = (Object.values(usersRes || {}) as any[]).filter((u: any) => u.setor === "ALMOXARIFADO");
      const matched = activeWarehouseUsers.find((u: any) => u.login === loggedUser) as any;
      if (matched) setResponsible(matched.nome);
      else if (activeWarehouseUsers.length > 0) setResponsible((activeWarehouseUsers[0] as any).nome);
    } catch (e) {
      console.error("Failed to load inventory issue resources", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTeamName = (num: string) => {
    const eq = crews[num.trim()];
    return eq && eq.nome ? `${num} — ${eq.nome}` : num;
  };

  const getTeamActiveMembers = (num: string) => {
    if (!num) return [];
    return Object.entries(employees as Record<string, any>).filter(
      ([_, f]: [string, any]) => String(f.equipe_num).trim() === num.trim() && !f.demitido
    ) as [string, any][];
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      { cod: "", qtd: 1, cbSelected: "", colEpi: "", destino: "👥 Para a Equipe", obra_destino: "" },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemFieldChange = (index: number, key: string, value: any) => {
    const updated = [...items];
    updated[index][key] = value;

    // Custom side effects on code change
    if (key === "cod") {
      const term = String(value).toUpperCase().trim();
      const bMatches = Object.entries(products as Record<string, any>).filter(([bc]) => bc.toUpperCase() === term) as [string, any][];
      const iMatches = Object.entries(products as Record<string, any>).filter(([_, p]) => p.codigo_produto?.toUpperCase() === term) as [string, any][];

      if (bMatches.length > 0) {
        updated[index].cbSelected = bMatches[0][0];
      } else if (iMatches.length > 0) {
        // Pick high stock
        const sorted = iMatches.sort((a, b) => b[1].estoque - a[1].estoque) as [string, any][];
        updated[index].cbSelected = sorted[0][0];
      } else {
        updated[index].cbSelected = "";
      }
    }
    setItems(updated);
  };

  // Compile destinations list
  const activeStaff = Object.values(employees as Record<string, any>).filter((f: any) => !f.demitido && f.status === "ATIVO") as any[];
  const staffOpts = activeStaff.map((f: any) => f.nome);

  const fleetLabels = Object.values(vehicles as Record<string, any>).map((v: any) => {
    return `🚛 Frota: ${v.placa} ${v.modelo ? `— ${v.modelo}` : ""}`;
  });

  const DESTINOS = [
    "👥 Para a Equipe",
    "🌿 Roçada",
    "🏗️ Obra",
    "🏢 Administração",
    "🔧 Manutenção",
    "🧴 Consumível",
    "📦 Outros",
    ...fleetLabels,
  ];

  const handleConfirmAndEmit = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSlipHtml("");
    setSlipB64("");

    const finalCrew = crewSel === "─ Selecione a equipe" ? crewManual.trim() : crewSel.split(" — ")[0];
    if (!finalCrew) {
      setErrorMsg("A equipe responsável é obrigatória.");
      return;
    }

    if (!colaborador) {
      setErrorMsg("O colaborador responsável pela retirada é obrigatório.");
      return;
    }

    if (issueType.includes("Entrega") && !driver.trim()) {
      setErrorMsg("O entregador/motorista é obrigatório.");
      return;
    }

    // Filter valid items
    const validItems = items.filter((it) => it.cod.trim() && it.cbSelected && Number(it.qtd) > 0);
    if (validItems.length === 0) {
      setErrorMsg("Adicione pelo menos um item válido com código e quantidade maior que zero.");
      return;
    }

    // Check stocks
    const prodsTmp = { ...products };
    const stockErrors = [];
    for (const it of validItems) {
      const p = prodsTmp[it.cbSelected];
      if (Number(p.estoque || 0) < Number(it.qtd)) {
        stockErrors.push(`Estoque de "${p.nome}" insuficiente (Disp: ${p.estoque}).`);
      }
    }

    if (stockErrors.length > 0) {
      setErrorMsg(stockErrors.join(" "));
      return;
    }

    try {
      setLoading(true);
      const numbering = await api.get("numeracao") || {};
      const nextNum = Number(numbering.saida || 0) + 1;
      const slipNum = `S-${String(nextNum).padStart(6, "0")}`;

      const prodsUpdate = { ...products };
      const movements = await api.get("movimentos") || {};
      const epiRegistry = await api.get("epi_validades") || {};
      const deliveries = await api.get("entregas") || {};
      const maintenanceDebits = await api.get("notas_debito_manutencao") || {};

      const nowTs = Date.now();
      const crewName = getTeamName(finalCrew);
      const isMaintCrew = finalCrew && (crews[finalCrew]?.tipo || "").toUpperCase().startsWith("MANUTEN");

      const loggedUser = localStorage.getItem("geplan_username") || "admin";

      const receiptItems: any[] = [];
      const debitItems: any[] = [];

      validItems.forEach((it, idx) => {
        const cb = it.cbSelected;
        const p = prodsUpdate[cb];
        const qty = Number(it.qtd);
        const price = Number(p.preco || 0);
        const sub = qty * price;

        prodsUpdate[cb].estoque = Number(p.estoque || 0) - qty;

        const isEpi = p.categoria === "EPI";
        const epiWorker = isEpi ? (it.colEpi || colaborador) : "";
        let expiryDate = "";

        if (isEpi) {
          const lifetimeDays = Number(p.dias_validade_epi || 0);
          if (lifetimeDays > 0) {
            const exp = new Date();
            exp.setDate(exp.getDate() + lifetimeDays);
            expiryDate = exp.toLocaleDateString("pt-BR");
          }

          // Register in epi_validades
          const regId = `${epiWorker.replace(/\s+/g, "_")}_${p.nome.replace(/\s+/g, "_")}_${nowTs}_${idx}`;
          epiRegistry[regId] = {
            funcionario: epiWorker,
            epi: p.nome,
            data_entrega: issueDate,
            proxima_troca: expiryDate,
            responsavel: responsible,
            obs: `Saída ${slipNum}`,
            registrado_por: loggedUser,
          };
        }

        // Apply Obra specific destination
        let finalDest = it.destino;
        if (dest_is_obra(it.destino) && it.obra_destino.trim()) {
          finalDest = `🏗️ Obra: ${it.obra_destino.trim()}`;
        }

        // Movements log
        const movId = `${nowTs}_${idx}`;
        movements[movId] = {
          tipo: "SAÍDA",
          numero_pedido: slipNum,
          codigo: cb,
          nome: p.nome,
          unid: p.unid || "UND",
          qtd: qty,
          preco: price,
          equipe: finalCrew,
          nome_equipe: crewName,
          colaborador: colaborador,
          colaborador_epi: epiWorker,
          resp_almox: responsible,
          destino_frota: get_fleet_plate(it.destino),
          destino: finalDest,
          tipo_saida: issueType.includes("Entrega") ? "ENTREGA" : "RETIRADA",
          entregador: driver,
          almoxarifado: almox,
          data: issueDate,
          obs,
          registrado_por: loggedUser,
          epi_vencimento: expiryDate,
        };

        const itemRes = {
          nome: p.nome,
          qtd: qty,
          unid: p.unid || "UND",
          preco: price,
          colaborador_epi: epiWorker,
          destino: finalDest,
          destino_frota: get_fleet_plate(it.destino),
          epi_vencimento: expiryDate,
          categoria: p.categoria || "OUTROS"
        };
        receiptItems.push(itemRes);

        // Process Fleet and Maintenance Debits
        const isFleet = "🚛 Frota:" in it.destino;
        const isMaintDest = it.destino === "🔧 Manutenção";
        
        if (isMaintCrew || isFleet || isMaintDest) {
          debitItems.push({
            ...itemRes,
            frota: isFleet ? get_fleet_plate(it.destino) : isMaintDest ? `MANUT-${finalCrew}` : `EQ-${finalCrew}`,
            categoria_debito: p.categoria || "OUTROS"
          });
        }
      });

      // Save Numbering counter
      numbering.saida = nextNum;
      await api.set("numeracao", numbering);

      // Save database resources
      await api.set("produtos", prodsUpdate);
      await api.set("movimentos", movements);
      if (Object.keys(epiRegistry).length > 0) await api.set("epi_validades", epiRegistry);

      // Save deliverables if Delivery
      if (issueType.includes("Entrega")) {
        const delivId = `${slipNum}_${nowTs}`;
        deliveries[delivId] = {
          numero_pedido: slipNum,
          equipe: finalCrew,
          nome_equipe: crewName,
          colaborador: colaborador,
          entregador: driver,
          resp_almox: responsible,
          registrado_por: loggedUser,
          data_saida: issueDate,
          almoxarifado: almox,
          itens: receiptItems,
          status: "PENDENTE"
        };
        await api.set("entregas", deliveries);
      }

      // Save debits if maintenance is triggered
      if (debitItems.length > 0) {
        const debitId = `ND-${slipNum}`;
        maintenanceDebits[debitId] = {
          numero: debitId,
          pedido_origem: slipNum,
          data: issueDate,
          equipe: finalCrew,
          nome_equipe: crewName,
          colaborador: colaborador,
          almoxarifado: almox,
          itens: debitItems,
          total: debitItems.reduce((acc, dt) => acc + (dt.qtd * dt.preco), 0),
          status: "ABERTO",
          registrado_por: loggedUser
        };
        await api.set("notas_debito_manutencao", maintenanceDebits);
      }

      // Construct Coupon Slip HTML
      const totalSlipValue = receiptItems.reduce((acc, it) => acc + (it.qtd * it.preco), 0);
      const totalDebitValue = debitItems.reduce((acc, it) => acc + (it.qtd * it.preco), 0);

      const html_slip = buildSlipHtml(slipNum, issueDate, almox, issueType, crewName, colaborador, responsible, driver, obs, receiptItems, totalSlipValue, debitItems, totalDebitValue);
      const b64 = btoa(unescape(encodeURIComponent(html_slip)));

      // Save to coupon history
      const history_cupons = await api.get("historico_cupons") || {};
      history_cupons[slipNum] = {
        numero: slipNum,
        data: issueDate,
        equipe: finalCrew,
        nome_equipe: crewName,
        colaborador: colaborador,
        total: totalSlipValue.toFixed(2),
        itens: receiptItems.length,
        cupom_b64: b64
      };
      await api.set("historico_cupons", history_cupons);

      setGeneratedSlipNum(slipNum);
      setSlipHtml(html_slip);
      setSlipB64(b64);
      setSuccessMsg(`Saída ${slipNum} efetuada com sucesso!`);
      
      // Reset rows
      setItems([{ cod: "", qtd: 1, cbSelected: "", colEpi: "", destino: "👥 Para a Equipe", obra_destino: "" }]);
      setObs("");
      setDriver("");

      const freshProds = await api.get("produtos");
      setProducts(freshProds || {});
    } catch (e: any) {
      setErrorMsg(e.message || "Erro desconhecido ao registrar saída de estoque.");
    } finally {
      setLoading(false);
    }
  };

  const get_fleet_plate = (label: string): string => {
    if (!label.startsWith("🚛 Frota:")) return "";
    const cleanStr = label.replace("🚛 Frota: ", "");
    return cleanStr.split(" — ")[0].trim();
  };

  const dest_is_obra = (dest: string) => dest === "🏗️ Obra";

  const totalInvoice = items.reduce((acc, it) => {
    if (!it.cbSelected || !products[it.cbSelected]) return acc;
    return acc + (Number(it.qtd) * Number(products[it.cbSelected].preco || 0));
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando frotas e equipes...</span>
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

      {slipB64 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-3">
            <a
              href={`data:text/html;base64,${slipB64}`}
              download={`cupom_${generatedSlipNum}.html`}
              className="flex-1"
            >
              <button className="w-full text-center py-3 bg-[#e8680a] text-white hover:bg-orange-600 font-black rounded-xl cursor-pointer shadow-lg shadow-orange-500/10">
                ⬇️ BAIXAR COM COMPROVANTE (IMPRIMIR)
              </button>
            </a>
            <button
              onClick={() => setSlipHtml("")}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer hover:bg-slate-200"
            >
              Fechar recibo
            </button>
          </div>
          <iframe
            srcDoc={slipHtml}
            className="w-full h-[500px] border border-slate-200 rounded-xl shadow-sm bg-white"
            title="Recibo de Saída"
          />
        </div>
      )}

      {/* Outward Header specs */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
          🧾 Registro de Retirada / Saída de Materiais
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Almoxarifado Origem
              </label>
              <select
                value={almox}
                onChange={(e) => setAlmox(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                {ALMOXARIFADOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Tipo de Saída
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="🏪 Retirada">🏪 Retirada (Pátio / Almox)</option>
                <option value="🚚 Entrega">🚚 Entrega (Transporte para o Campo)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Data de Retirada
              </label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: DD/MM/AAAA"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Equipe Destinatária *
              </label>
              <select
                value={crewSel}
                onChange={(e) => setCrewSel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="─ Selecione a equipe">─ Selecione a equipe</option>
                {Object.entries(crews as Record<string, any>).map(([num, c]: [string, any]) => (
                  <option key={num} value={`${num} — ${c.nome}`}>
                    Equipe {num} &mdash; {c.nome}
                  </option>
                ))}
              </select>
              {crewSel === "─ Selecione a equipe" && (
                <input
                  type="text"
                  value={crewManual}
                  onChange={(e) => setCrewManual(e.target.value)}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ou digite o número da equipe..."
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Colaborador Recebedor (Retirada por) *
              </label>
              <select
                value={colaborador}
                onChange={(e) => setColaborador(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="">─ Selecione o Colaborador</option>
                {/* Populate from selected crew members first */}
                {getTeamActiveMembers(crewSel === "─ Selecione a equipe" ? crewManual : crewSel.split(" — ")[0]).map(([id, emp]) => (
                  <option key={id} value={emp}>
                    {emp} (Equipe)
                  </option>
                ))}
                {/* Fallback - complete active lists */}
                {Object.entries(employees as Record<string, any>)
                  .filter(([_, emp]: [string, any]) => !emp.demitido && emp.status === "ATIVO")
                  .map(([id, emp]: [string, any]) => (
                    <option key={id} value={emp.nome}>
                      {emp.nome} ({emp.funcao || "Empregado"})
                    </option>
                  ))}
              </select>
            </div>

            {issueType.includes("Entrega") && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Entregador / Motorista (Obrigatório)*
                </label>
                <input
                  type="text"
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Nome do motorista que transportará as mercadorias"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issue Items Lists builder */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
          📦 Itens do Pedido de Fornecimento
        </h3>

        <div className="space-y-4">
          {items.map((it, idx) => {
            const hasCg = it.cbSelected && products[it.cbSelected];
            return (
              <div
                key={idx}
                className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-4 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Código do Produto {idx + 1} *
                    </label>
                    <input
                      type="text"
                      value={it.cod}
                      onChange={(e) => handleItemFieldChange(idx, "cod", e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="Código interno ou barras"
                    />
                    {hasCg && (
                      <span className="text-[11px] font-bold text-emerald-600 block mt-1">
                        &bull; {products[it.cbSelected].nome} | Disp: {products[it.cbSelected].estoque} {products[it.cbSelected].unid}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      value={it.qtd || ""}
                      onChange={(e) => handleItemFieldChange(idx, "qtd", Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="Qtd."
                      min={0.01}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {hasCg && products[it.cbSelected].categoria === "EPI" ? (
                        <div>
                          <label className="text-[10px] font-bold text-indigo-400 block mb-1.5 uppercase tracking-widest">
                            👤 Colaborador EPI
                          </label>
                          <select
                            value={it.colEpi}
                            onChange={(e) => handleItemFieldChange(idx, "colEpi", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-semibold focus:outline-none"
                          >
                            <option value="">👤 Mesmo Recebedor</option>
                            {Object.values(employees as Record<string, any>)
                              .filter((emp: any) => !emp.demitido && emp.status === "ATIVO")
                              .map((emp: any) => (
                                <option key={emp.nome} value={emp.nome}>
                                  {emp.nome}
                                </option>
                              ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                            🎯 Destino de Custo
                          </label>
                          <select
                            value={it.destino}
                            onChange={(e) => handleItemFieldChange(idx, "destino", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-semibold focus:outline-none"
                          >
                            {DESTINOS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="ml-3 p-1.5 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg"
                        title="Remover linha"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-fields for specific destinations */}
                {it.destino === "🏗️ Obra" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                        ★ Qual obra de destino? *
                      </label>
                      <input
                        type="text"
                        value={it.obra_destino}
                        onChange={(e) => handleItemFieldChange(idx, "obra_destino", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                        placeholder="Nome / EAP do projeto de engenharia"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleAddItemRow}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
        >
          ➕ Adicionar Outrol Item na Saída
        </button>
      </div>

      {/* Slips confirmation & finalize actions */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-2 border-t border-slate-100">
          <div className="text-left md:text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Preço Estimado Pedido
            </span>
            <div className="text-2xl font-black text-rose-600">{formatPrice(totalInvoice)}</div>
          </div>

          <div className="w-full md:w-auto">
            <button
              onClick={handleConfirmAndEmit}
              className="w-full md:w-auto py-3.5 px-10 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:translate-y-0 transition-all"
            >
              🖨️ CONFIRMAR SAÍDA E EMITIR COMPROVANTE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slip layout compiler helper
function buildSlipHtml(
  slipNum: string,
  date: string,
  almox: string,
  type: string,
  crew: string,
  colab: string,
  resp: string,
  driver: string,
  obs: string,
  items: any[],
  total: number,
  debitItems: any[],
  debitTotal: number
) {
  const tableRows = items
    .map((it, i) => {
      const sub = it.qtd * it.preco;
      let extra = "";
      if (it.colaborador_epi) {
        extra = `<tr style="background:transparent"><td colspan="3" style="font-size:9px;color:#4B5563;padding-left:14px;border:none">👤 EPI para: ${it.colaborador_epi} ${
          it.epi_vencimento ? `| Vecto: ${it.epi_vencimento}` : ""
        }</td></tr>`;
      } else if (it.destino && it.destino !== "👥 Para a Equipe") {
        extra = `<tr style="background:transparent"><td colspan="3" style="font-size:9px;color:#1d4ed8;padding-left:14px;border:none">🎯 Destino: ${it.destino}</td></tr>`;
      }
      return `
      <tr>
        <td style="padding:4px;border-bottom:1px dashed #ccc">${it.nome}</td>
        <td style="padding:4px;border-bottom:1px dashed #ccc;text-align:center">${it.qtd} ${it.unid}</td>
        <td style="padding:4px;border-bottom:1px dashed #ccc;text-align:right">R$ ${sub.toFixed(2)}</td>
      </tr>
      ${extra}
    `;
    })
    .join("");

  const debitBanner =
    debitTotal > 0
      ? `
    <div style="border:1.5px dashed #EF4444;background:#FEF2F2;color:#991B1B;padding:6px;border-radius:6px;font-size:9px;margin:8px 0;font-weight:bold;text-align:center">
      🔧 GERA NOTA DE DÉBITO MANUTENÇÃO ND-${slipNum} &bull; VALOR: R$ ${debitTotal.toFixed(2)}
    </div>`
      : "";

  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family:'Courier New',Courier,monospace; font-size:11px; width:72mm; margin:10px auto; padding:4px; color:#000; background:#fff; }
          .center { text-align:center; }
          .divider { border-top:1.5px dashed #000; margin:6px 0; }
          table { width:100%; border-collapse:collapse; margin:4px 0; font-size:10px; }
          tr { background:transparent; }
          td, th { padding:2px; vertical-align:top; }
          .total { font-size:13px; font-weight:bold; text-align:right; border-top: 1.5px solid #000; padding:6px 0; margin-top:4px; }
          .print-btn { display:block; width:100%; background:#e8680a; color:#fff; border:none; border-radius:6px; padding:10px 0; font-weight:bold; cursor:pointer; font-size:12px; margin-top:12px; text-transform:uppercase; text-align:center; text-decoration:none; }
          @media print { .print-btn { display:none !important; } body { margin:0; padding:2px; } }
        </style>
      </head>
      <body>
        <div class="center">
          <div style="font-size:16px;font-weight:900;letter-spacing:1px;color:#1e293b">GE<span style="color:#e8680a">PLAN</span></div>
          <div style="font-size:10px;font-weight:bold;letter-spacing:1px;margin-top:2px">COMPROVANTE DE RETIRADA / VALE</div>
          <div class="divider"></div>
        </div>
        
        <p><b>Pedido:</b> ${slipNum}</p>
        <p><b>Data Saída:</b> ${date}</p>
        <p><b>Almoxarifado:</b> ${almox}</p>
        <p><b>Tipo Fluxo:</b> ${type.toUpperCase()}</p>
        <p><b>Equipe:</b> ${crew}</p>
        <p><b>Preposto:</b> ${colab}</p>
        <p><b>Atendente:</b> ${resp}</p>
        ${driver ? `<p><b>Transportado por:</b> ${driver}</p>` : ""}
        ${obs ? `<p><b>Obs:</b> ${obs}</p>` : ""}
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid #000"><b>Item</b></th>
              <th style="text-align:center;border-bottom:1px solid #000"><b>Qtd</b></th>
              <th style="text-align:right;border-bottom:1px solid #000"><b>Sub</b></th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="total">VALOR TOTAL: R$ ${total.toFixed(2)}</div>
        
        ${debitBanner}
        
        <div class="divider"></div>
        
        <div style="margin-top:16px;text-align:center">
          <p>Assinatura do Recebedor:</p>
          <div style="border-top:1px solid #000;margin-top:28px;padding-top:4px;font-weight:bold">${colab}</div>
          <p style="font-size:8px;color:#555;margin-top:2px">CPF: ___________________</p>
        </div>
        
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir Cupom</button>
      </body>
    </html>
  `;
}
