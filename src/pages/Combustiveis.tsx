import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Vehicle } from "../types";

export default function Combustiveis() {
  const [combustiveis, setCombustiveis] = useState<Record<string, number>>({
    "DIESEL S500": 0,
    "DIESEL S10": 0,
    "GASOLINA": 0,
  });
  const [precos, setPrecos] = useState<Record<string, number>>({
    "DIESEL S500": 0,
    "DIESEL S10": 0,
    "GASOLINA": 0,
  });
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [crews, setCrews] = useState<Record<string, any>>({});
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active form Tab
  const [activeTab, setActivePage] = useState("📥 Entrada");

  // Entrada Form
  const [tipoC_E, setTipoC_E] = useState("DIESEL S500");
  const [qtdC_E, setQtdC_E] = useState<number | "">("");
  const [valC_E, setValC_E] = useState<number | "">("");
  const [fornC_E, setFornC_E] = useState("");

  // Saída Form
  const [tipoC_S, setTipoC_S] = useState("DIESEL S500");
  const [qtdC_S, setQtdC_S] = useState<number | "">("");
  const [frotaC_S, setFrotaC_S] = useState("─ Sem frota");
  const [eqC_S, setEqC_S] = useState("─");
  const [kmC_S, setKmC_S] = useState("");

  // Externo Form
  const [tipoC_Ext, setTipoC_Ext] = useState("DIESEL S500");
  const [qtdC_Ext, setQtdC_Ext] = useState<number | "">("");
  const [valC_Ext, setValC_Ext] = useState<number | "">("");
  const [frotaC_Ext, setFrotaC_Ext] = useState("─ Sem frota");
  const [eqC_Ext, setEqC_Ext] = useState("─");
  const [kmC_Ext, setKmC_Ext] = useState("");
  const [postoC_Ext, setPostoC_Ext] = useState("");

  // Preço Form
  const [novosPrecos, setNovosPrecos] = useState<Record<string, number>>({
    "DIESEL S500": 0,
    "DIESEL S10": 0,
    "GASOLINA": 0,
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [combRes, precosRes, veicsRes, crewsRes, movsRes] = await Promise.all([
        api.get("combustiveis"),
        api.get("precos_combustiveis"),
        api.get("veiculos"),
        api.get("equipes"),
        api.get("mov_combustiveis"),
      ]);

      const defaultComb = { "DIESEL S500": 0, "DIESEL S10": 0, "GASOLINA": 0 };
      setCombustiveis(Object.keys(combRes || {}).length > 0 ? combRes : defaultComb);
      
      const defaultPrecos = { "DIESEL S500": 0, "DIESEL S10": 0, "GASOLINA": 0 };
      const currentPrecos = Object.keys(precosRes || {}).length > 0 ? precosRes : defaultPrecos;
      setPrecos(currentPrecos);
      setNovosPrecos(currentPrecos);

      setVehicles(veicsRes || {});
      setCrews(crewsRes || {});

      // Sort logs descending
      const list = Object.values(movsRes || {}).sort((a: any, b: any) => b.data.localeCompare(a.data));
      setMovements(list);
    } catch (e) {
      console.error("Failed to load fuel stock registers", e);
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

  // Lists loader helpers
  const frotasOpt = ["─ Sem frota", "🌿 Roçada"].concat(
    Object.values(vehicles as Record<string, any>).map((v: any) => `${v.placa || ""} — ${v.modelo || ""}`.trim())
  );

  const equipesOpt = ["─"].concat(
    Object.entries(crews as Record<string, any>).map(([num, c]: [string, any]) => `${num} — ${c.nome}`.trim())
  );

  const getCleanPlate = (label: string) => {
    if (label === "─ Sem frota" || label === "🌿 Roçada") return label;
    return label.split(" — ")[0].trim();
  };

  const getCleanCrew = (label: string) => {
    if (label === "─") return "";
    return label.split(" — ")[0].trim();
  };

  const handleEntradaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const qty = Number(qtdC_E);
    const val = Number(valC_E);

    if (qty <= 0) {
      setErrorMsg("A quantidade em litros precisa ser superior a zero.");
      return;
    }

    try {
      const cCurrent = { ...combustiveis };
      cCurrent[tipoC_E] = Number(cCurrent[tipoC_E] || 0) + qty;

      if (val > 0) {
        const pCurrent = { ...precos };
        pCurrent[tipoC_E] = val / qty;
        await api.set("precos_combustiveis", pCurrent);
      }

      const movId = String(Date.now());
      const movs = await api.get("mov_combustiveis") || {};
      movs[movId] = {
        tipo: "ENTRADA",
        combustivel: tipoC_E,
        quantidade: qty,
        valor: val,
        fornecedor: fornC_E,
        responsavel: localStorage.getItem("geplan_username") || "admin",
        data: new Date().toLocaleString("pt-BR"),
        usuario: localStorage.getItem("geplan_username") || "admin",
      };

      await api.set("combustiveis", cCurrent);
      await api.set("mov_combustiveis", movs);

      setSuccessMsg(`Entrada registrada com sucesso! +${qty.toFixed(1)}L de ${tipoC_E}.`);
      setQtdC_E("");
      setValC_E("");
      setFornC_E("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de rede ao salvar entrada de combustível.");
    }
  };

  const handleSaidaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const qty = Number(qtdC_S);
    if (qty <= 0) {
      setErrorMsg("A quantidade informada precisa ser maior que zero.");
      return;
    }

    if (frotaC_S === "─ Sem frota" && eqC_S === "─") {
      setErrorMsg("Por favor, selecione pelo menos a frota de destino ou a equipe.");
      return;
    }

    const currentStock = Number(combustiveis[tipoC_S] || 0);
    if (currentStock < qty) {
      setErrorMsg(`Estoque de combustível insuficiente. (Disponível: ${currentStock.toFixed(1)}L)`);
      return;
    }

    const plate = getCleanPlate(frotaC_S);
    const crewNum = getCleanCrew(eqC_S);

    // Odometer Mileage Checks
    if (kmC_S.trim() && plate !== "─ Sem frota" && plate !== "🌿 Roçada") {
      try {
        const valKm = parseFloat(kmC_S.replace(/[^\d.]/g, ""));
        if (!isNaN(valKm)) {
          const pastMovs = Object.values(await api.get("mov_combustiveis") || {}) as any[];
          const samePlate = pastMovs
            .filter((m: any) => m.frota === plate && m.km_ho)
            .sort((a: any, b: any) => b.data.localeCompare(a.data));

          if (samePlate.length > 0) {
            const lastKm = parseFloat(String(samePlate[0].km_ho).replace(/[^\d.]/g, ""));
            if (!isNaN(lastKm) && valKm < lastKm) {
              setErrorMsg(`O quilômetro/horímetro informado (${valKm}) é inferior ao último registrado (${lastKm}) para esta frota.`);
              return;
            }
          }
        }
      } catch (err) {
        // Safe bypass
      }
    }

    try {
      const cCurrent = { ...combustiveis };
      cCurrent[tipoC_S] = currentStock - qty;

      const pUnit = Number(precos[tipoC_S] || 0);

      const movId = String(Date.now());
      const movs = await api.get("mov_combustiveis") || {};
      movs[movId] = {
        tipo: "SAÍDA",
        combustivel: tipoC_S,
        quantidade: qty,
        valor: qty * pUnit,
        frota: plate === "─ Sem frota" ? "" : plate,
        equipe: crewNum,
        km_ho: kmC_S,
        responsavel: localStorage.getItem("geplan_username") || "admin",
        data: new Date().toLocaleString("pt-BR"),
        usuario: localStorage.getItem("geplan_username") || "admin",
      };

      await api.set("combustiveis", cCurrent);
      await api.set("mov_combustiveis", movs);

      setSuccessMsg(`Retirada de ${qty.toFixed(1)}L de ${tipoC_S} efetuada com sucesso!`);
      setQtdC_S("");
      setKmC_S("");
      setFrotaC_S("─ Sem frota");
      setEqC_S("─");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de rede ao salvar saída de combustível.");
    }
  };

  const handleExternoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const qty = Number(qtdC_Ext);
    const val = Number(valC_Ext);

    if (qty <= 0 || val <= 0) {
      setErrorMsg("A quantidade e o valor total precisam ser maiores que zero.");
      return;
    }

    const plate = getCleanPlate(frotaC_Ext);
    const crewNum = getCleanCrew(eqC_Ext);

    if (plate === "─ Sem frota" && !crewNum) {
      setErrorMsg("Por favor, selecione qual frota ou equipe realizou este abastecimento.");
      return;
    }

    // Odometer Mileage Checks
    if (kmC_Ext.trim() && plate !== "─ Sem frota" && plate !== "🌿 Roçada") {
      try {
        const valKm = parseFloat(kmC_Ext.replace(/[^\d.]/g, ""));
        if (!isNaN(valKm)) {
          const pastMovs = Object.values(await api.get("mov_combustiveis") || {}) as any[];
          const samePlate = pastMovs
            .filter((m: any) => m.frota === plate && m.km_ho)
            .sort((a: any, b: any) => b.data.localeCompare(a.data));

          if (samePlate.length > 0) {
            const lastKm = parseFloat(String(samePlate[0].km_ho).replace(/[^\d.]/g, ""));
            if (!isNaN(lastKm) && valKm < lastKm) {
              setErrorMsg(`O quilômetro/horímetro informado (${valKm}) é inferior ao último registrado (${lastKm}) para esta frota.`);
              return;
            }
          }
        }
      } catch (err) {
        // Safe bypass
      }
    }

    try {
      const movId = String(Date.now());
      const movs = await api.get("mov_combustiveis") || {};
      movs[movId] = {
        tipo: "ABASTECIMENTO EXTERNO",
        combustivel: tipoC_Ext,
        quantidade: qty,
        valor: val,
        frota: plate === "─ Sem frota" ? "" : plate,
        equipe: crewNum,
        km_ho: kmC_Ext,
        fornecedor: postoC_Ext,
        responsavel: localStorage.getItem("geplan_username") || "admin",
        data: new Date().toLocaleString("pt-BR"),
        usuario: localStorage.getItem("geplan_username") || "admin",
      };

      await api.set("mov_combustiveis", movs);

      setSuccessMsg(`Abastecimento externo de ${qty.toFixed(1)}L de ${tipoC_Ext} salvo com sucesso!`);
      setQtdC_Ext("");
      setValC_Ext("");
      setKmC_Ext("");
      setPostoC_Ext("");
      setFrotaC_Ext("─ Sem frota");
      setEqC_Ext("─");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de rede ao salvar abastecimento externo.");
    }
  };

  const handlePrecosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.set("precos_combustiveis", novosPrecos);
      setPrecos(novosPrecos);
      setSuccessMsg("Preços corporativos por litro de combustível atualizados!");
    } catch (err: any) {
      setErrorMsg(err.message || "Falha de rede ao atualizar base de preços.");
    }
  };

  const setNovoPreco = (key: string, val: number) => {
    setNovosPrecos({ ...novosPrecos, [key]: val });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando telemetria de combustíveis...</span>
      </div>
    );
  }

  // Pre-calculate mileage Covered per plate
  const sortedMovementsByData = [...movements].sort((a, b) => a.data.localeCompare(b.data));
  const mileageByPlate: Record<string, number[]> = {};

  sortedMovementsByData.forEach((m) => {
    if (m.frota && m.km_ho && m.frota !== "🌿 Roçada") {
      try {
        const valKm = parseFloat(m.km_ho.replace(/[^\d.]/g, ""));
        if (!isNaN(valKm)) {
          mileageByPlate.hasOwnProperty(m.frota)
            ? mileageByPlate[m.frota].push(valKm)
            : (mileageByPlate[m.frota] = [valKm]);
        }
      } catch {}
    }
  });

  return (
    <div className="space-y-6">
      {/* Levels Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIPOS_COMBUSTIVEL.map((tc) => {
          const qty = Number(combustiveis[tc] || 0);
          const pr = Number(precos[tc] || 0);

          return (
            <div key={tc} className="bg-white border-t-4 border-[#C75B12] rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-slate-800">{tc}</span>
                <span className="text-xs font-semibold text-slate-400">Preço: {formatPrice(pr)}/L</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-black text-slate-800">{qty.toFixed(1)}</span>
                <span className="text-xs font-bold text-slate-400">litros</span>
              </div>
              {/* Progress level indicators */}
              <div className="w-full bg-slate-100 rounded-lg h-3 overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, (qty / 10000) * 100)}%` }}
                  className="bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] h-full rounded-lg"
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold mt-1.5 block">
                Capacidade calibrada de tanque: 10.000 L
              </span>
            </div>
          );
        })}
      </div>

      {/* Forms Router Interface tabs */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex border-b border-slate-150 pb-2 overflow-x-auto gap-2">
          {["📥 Entrada", "📤 Saída", "🔄 Abastecimento Externo", "📊 Movimentações", "💰 Atualizar Preços"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setActivePage(t);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 px-4 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === t
                  ? "bg-[#C75B12] text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab 1: Entrada */}
        {activeTab === "📥 Entrada" && (
          <form onSubmit={handleEntradaSubmit} className="space-y-4 max-w-2xl animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Combustível
                </label>
                <select
                  value={tipoC_E}
                  onChange={(e) => setTipoC_E(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {TIPOS_COMBUSTIVEL.map((tc) => (
                    <option key={tc} value={tc}>
                      {tc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Quantidade L *
                </label>
                <input
                  type="number"
                  value={qtdC_E}
                  onChange={(e) => setQtdC_E(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 500"
                  step="any"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Valor Total R$
                </label>
                <input
                  type="number"
                  value={valC_E}
                  onChange={(e) => setValC_E(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 2500.00"
                  step="any"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Fornecedor / Posto Parceiro
              </label>
              <input
                type="text"
                value={fornC_E}
                onChange={(e) => setFornC_E(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: Posto BR Shell Distribuidora"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Registrar Entrada de Combustível
            </button>
          </form>
        )}

        {/* Tab 2: Saída */}
        {activeTab === "📤 Saída" && (
          <form onSubmit={handleSaidaSubmit} className="space-y-4 max-w-2xl animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Combustível
                </label>
                <select
                  value={tipoC_S}
                  onChange={(e) => setTipoC_S(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {TIPOS_COMBUSTIVEL.map((tc) => (
                    <option key={tc} value={tc}>
                      {tc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Quantidade Despejada L *
                </label>
                <input
                  type="number"
                  value={qtdC_S}
                  onChange={(e) => setQtdC_S(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 50"
                  step="any"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Frota / Placa Destino *
                </label>
                <select
                  value={frotaC_S}
                  onChange={(e) => setFrotaC_S(e.target.value)}
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
                  Equipe Resp.
                </label>
                <select
                  value={eqC_S}
                  onChange={(e) => setEqC_S(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {equipesOpt.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  KM / Horímetro do Veículo
                </label>
                <input
                  type="text"
                  value={kmC_S}
                  onChange={(e) => setKmC_S(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 125430 ou 854.2h"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Registrar Abastecimento Interno
            </button>
          </form>
        )}

        {/* Tab 3: Abastecimento Externo */}
        {activeTab === "🔄 Abastecimento Externo" && (
          <form onSubmit={handleExternoSubmit} className="space-y-4 max-w-2xl animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Combustível
                </label>
                <select
                  value={tipoC_Ext}
                  onChange={(e) => setTipoC_Ext(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {TIPOS_COMBUSTIVEL.map((tc) => (
                    <option key={tc} value={tc}>
                      {tc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Qtd de Litros *
                </label>
                <input
                  type="number"
                  value={qtdC_Ext}
                  onChange={(e) => setQtdC_Ext(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 40"
                  step="any"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Valor Total R$ *
                </label>
                <input
                  type="number"
                  value={valC_Ext}
                  onChange={(e) => setValC_Ext(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 220.00"
                  step="any"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Frota / Placa Abastecida *
                </label>
                <select
                  value={frotaC_Ext}
                  onChange={(e) => setFrotaC_Ext(e.target.value)}
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
                  Equipe Vinculada
                </label>
                <select
                  value={eqC_Ext}
                  onChange={(e) => setEqC_Ext(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  {equipesOpt.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  KM / Horímetro
                </label>
                <input
                  type="text"
                  value={kmC_Ext}
                  onChange={(e) => setKmC_Ext(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: 125430"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Nome do Posto / Empresa Parceira
                </label>
                <input
                  type="text"
                  value={postoC_Ext}
                  onChange={(e) => setPostoC_Ext(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: Posto Graal KM 120"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Registrar Abastecimento em Posto Externo
            </button>
          </form>
        )}

        {/* Tab 4: Movimentações */}
        {activeTab === "📊 Movimentações" && (
          <div className="space-y-4 animate-fade-in">
            {movements.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">Data</th>
                      <th className="p-3 font-semibold text-slate-500">Tipo</th>
                      <th className="p-3 font-semibold text-slate-500">Combustível</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Volume (L)</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Valor estimado</th>
                      <th className="p-3 font-semibold text-slate-500">Frota / Posto</th>
                      <th className="p-3 font-semibold text-slate-500">Equipe</th>
                      <th className="p-3 font-semibold text-slate-500">KM/Horímetro</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">KM Percorrido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {movements.slice(0, 50).map((m, idx) => {
                      const isEntry = m.tipo === "ENTRADA";
                      const isExternal = m.tipo === "ABASTECIMENTO EXTERNO";
                      const plate = m.frota || m.fornecedor || "─";

                      // Calculate distance covered since last refill
                      let kmCovered = "─";
                      if (m.frota && m.km_ho && mileageByPlate[m.frota]) {
                        try {
                          const valCurrent = parseFloat(m.km_ho.replace(/[^\d.]/g, ""));
                          const list = mileageByPlate[m.frota];
                          const orderIdx = list.indexOf(valCurrent);
                          if (orderIdx > 0) {
                            const valPast = list[orderIdx - 1];
                            const diff = valCurrent - valPast;
                            kmCovered = `+${diff.toFixed(1)} km/h`;
                          }
                        } catch {}
                      }

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-slate-500">{m.data}</td>
                          <td className="p-3 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                isEntry
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isExternal
                                  ? "bg-indigo-100 text-indigo-805"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{m.combustivel}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{`${m.quantidade.toFixed(1)} L`}</td>
                          <td className="p-3 text-right font-semibold text-slate-700">{formatPrice(m.valor)}</td>
                          <td className="p-3 text-slate-500 font-bold">{plate}</td>
                          <td className="p-3 text-slate-500">{m.equipe || "─"}</td>
                          <td className="p-3 text-slate-500 font-bold">{m.km_ho || "─"}</td>
                          <td className="p-3 text-center text-emerald-600 font-bold">{kmCovered}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Nenhum registro de combustíveis registrado até o momento.
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Atualizar Preços */}
        {activeTab === "💰 Atualizar Preços" && (
          <form onSubmit={handlePrecosSubmit} className="space-y-4 max-w-xl animate-fade-in">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Definir Custo Médio por Litro (R$/L)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIPOS_COMBUSTIVEL.map((tc) => (
                <div key={tc}>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase tracking-widest">
                    {tc}
                  </label>
                  <input
                    type="number"
                    value={novosPrecos[tc] === undefined ? "" : novosPrecos[tc]}
                    onChange={(e) => setNovoPreco(tc, Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                    placeholder="Ex: 5.89"
                    step="any"
                    min={0}
                    required
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Salvar Configurações de Preços
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export const TIPOS_COMBUSTIVEL = ["DIESEL S500", "DIESEL S10", "GASOLINA"];
