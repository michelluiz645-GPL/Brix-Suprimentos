import React, { useEffect, useState } from "react";
import api from "../services/api";
import KPICard from "../components/KPIs";
import { Product, Movement } from "../types";

interface DashboardProps {
  user: any;
  setor: string;
  setActivePage: (page: string) => void;
}

export default function Dashboard({ user, setor, setActivePage }: DashboardProps) {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [movements, setMovements] = useState<Record<string, any>>({});
  const [employees, setEmployees] = useState<Record<string, any>>({});
  const [equipments, setEquipments] = useState<Record<string, any>>({});
  const [deliveries, setDeliveries] = useState<Record<string, any>>({});
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, any>>({});
  const [dbStatus, setDbStatus] = useState({ connected: false, message: "" });
  
  const [filterType, setFilterType] = useState("Todos");
  const [linesCount, setLinesCount] = useState(20);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, movsRes, empsRes, equipRes, delivRes, poRes, statusRes] = await Promise.all([
        api.get("produtos"),
        api.get("movimentos"),
        api.get("funcionarios"),
        api.get("equipamentos"),
        api.get("entregas"),
        api.get("pedidos_compra"),
        api.getStatus()
      ]);

      setProducts(prodsRes || {});
      setMovements(movsRes || {});
      setEmployees(empsRes || {});
      setEquipments(equipRes || {});
      setDeliveries(delivRes || {});
      setPurchaseOrders(poRes || {});
      setDbStatus(statusRes);
    } catch (e) {
      console.error("Failed to load dashboard statistics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatPrice = (v: any) => {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
    } catch {
      return `R$ ${v}`;
    }
  };

  // Calculations
  const totalItems = Object.keys(products).length;
  const activeStaff = (Object.values(employees) as any[]).filter((f: any) => !f.demitido && f.status !== "INATIVO").length;
  const totalMovements = Object.keys(movements).length;
  const totalValue = (Object.values(products) as any[]).reduce((acc: number, p: any) => acc + (Number(p.preco || 0) * Number(p.estoque || 0)), 0);
  
  // Calculate critical products
  const criticalItems = Object.entries(products as Record<string, any>).filter(([cb, p]: [string, any]) => {
    const est = Number(p.estoque || 0);
    const min = Number(p.estoque_min || 0);
    return min > 0 && est <= min;
  });

  const pendingDeliveries = (Object.values(deliveries) as any[]).filter((d: any) => d.status === "PENDENTE").length;
  const pendingPurchases = (Object.values(purchaseOrders) as any[]).filter((po: any) => po.status !== "CONCLUÍDO" && po.status !== "CANCELADO").length;

  // Filter latest movements
  const movementsList = (Object.values(movements) as any[]).sort((a: any, b: any) => {
    return b.data.localeCompare(a.data);
  });

  const filteredMovements = movementsList.filter((m: any) => {
    if (filterType === "Todos") return true;
    return m.tipo === filterType;
  }).slice(0, linesCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando dados gerais do painel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DB Connection Health Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-colors duration-300 ${
          dbStatus.connected
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
            : "bg-rose-500/10 border-rose-500/30 text-rose-700"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{dbStatus.connected ? "✅" : "⚠️"}</span>
          <div>
            <div className="text-sm font-bold">{dbStatus.connected ? "Supabase Cloud conectado!" : "Base de dados na nuvem indisponível"}</div>
            <div className="text-xs text-slate-500">
              {dbStatus.connected ? "Sincronização em tempo real ativa." : "Acessando através da memória interna do servidor."}
            </div>
          </div>
        </div>
        <button
          onClick={() => setActivePage("Backup")}
          className="text-xs font-bold underline hover:no-underline"
        >
          {dbStatus.connected ? "Configurações" : "Resolver conexão"}
        </button>
      </div>

      {/* Critical Stock Alert Banner */}
      {criticalItems.length > 0 && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-800 text-sm flex items-start gap-3">
          <span>⚠️</span>
          <div>
            <span className="font-bold">{criticalItems.length} código(s) de produto abaixo do estoque mínimo de segurança!</span>
            <div className="text-xs mt-1 text-slate-600">
              Acesse a página de <b>Estoque</b> para gerar as notas de solicitação de compra automáticas de reposição.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon="📦"
          title="Produtos"
          value={totalItems}
          subtext="No catálogo"
          color="#2563EB"
          bgColor="rgba(37,99,235,0.08)"
        />
        <KPICard
          icon="👤"
          title="Colaboradores"
          value={activeStaff}
          subtext="Equipe ativa"
          color="#10B981"
          bgColor="rgba(16,185,129,0.08)"
        />
        <KPICard
          icon="💰"
          title="Valor em Estoque"
          value={formatPrice(totalValue)}
          subtext="Total estimado"
          color="#F59E0B"
          bgColor="rgba(245,158,11,0.08)"
        />
        <KPICard
          icon="⚠️"
          title="Itens Críticos"
          value={criticalItems.length}
          subtext={criticalItems.length > 0 ? "Reposição alerta!" : "Estoque estável"}
          color={criticalItems.length > 0 ? "#EF4444" : "#10B981"}
          bgColor={criticalItems.length > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)"}
        />
        <KPICard
          icon="📋"
          title="Pendências Compra"
          value={pendingPurchases}
          subtext={`${pendingPurchases} aguardando`}
          color={pendingPurchases > 0 ? "#8B5CF6" : "#10B981"}
          bgColor={pendingPurchases > 0 ? "rgba(139,92,246,0.08)" : "rgba(16,185,129,0.08)"}
        />
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Ações Rápidas do Almoxarifado</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button
            onClick={() => setActivePage("Consultar")}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300/80 text-sm font-bold text-slate-700 cursor-pointer transition-all duration-150"
          >
            🔍 Consultar
          </button>
          <button
            onClick={() => setActivePage("Entrada")}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#C75B12] hover:bg-[#EA6C0A] active:bg-[#EA6C0A]/90 text-sm font-bold text-white cursor-pointer shadow-lg shadow-orange-500/10 transition-all duration-150"
          >
            📥 Entrada NF
          </button>
          <button
            onClick={() => setActivePage("Saída")}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#1E293B] hover:bg-[#0F172A] active:bg-black text-sm font-bold text-white cursor-pointer transition-all duration-150"
          >
            📤 Saída Slip
          </button>
          <button
            onClick={() => setActivePage("Devolução")}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300/80 text-sm font-bold text-slate-700 cursor-pointer transition-all duration-150"
          >
            ↩️ Devolver
          </button>
          <button
            onClick={() => setActivePage("Combustíveis")}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-sm font-bold text-white cursor-pointer shadow-lg shadow-blue-500/10 transition-all duration-150"
          >
            ⛽ Combustível
          </button>
        </div>
      </div>

      {/* Latest Movements */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Últimos Movimentos</h3>
          <div className="flex items-center gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="Todos">Mostrar Todos</option>
              <option value="ENTRADA">Entradas (NF)</option>
              <option value="SAÍDA">Saídas (Crews)</option>
              <option value="DEVOLUÇÃO">Devoluções</option>
            </select>
            <select
              value={linesCount}
              onChange={(e) => setLinesCount(Number(e.target.value))}
              className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
            >
              <option value={10}>10 linhas</option>
              <option value={20}>20 linhas</option>
              <option value={50}>50 linhas</option>
              <option value={100}>100 linhas</option>
            </select>
          </div>
        </div>

        {filteredMovements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-3 font-semibold text-slate-500">Nº Pedido</th>
                  <th className="p-3 font-semibold text-slate-500">NF / ORC</th>
                  <th className="p-3 font-semibold text-slate-500">Data</th>
                  <th className="p-3 font-semibold text-slate-500">Tipo</th>
                  <th className="p-3 font-semibold text-slate-500">Descrição do Produto</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">Quantidade</th>
                  <th className="p-3 font-semibold text-slate-500 text-right">Preço Unit.</th>
                  <th className="p-3 font-semibold text-slate-500">Destinatário/Crews</th>
                  <th className="p-3 font-semibold text-slate-500">Resp. Almox</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMovements.map((move, i) => {
                  const subtotal = (move.qtd || 0) * (move.preco || 0);
                  const isEntry = move.tipo === "ENTRADA";
                  const isReturn = move.tipo === "DEVOLUÇÃO";

                  let dest = "─";
                  if (move.colaborador_epi) dest = `🦺 ${move.colaborador_epi}`;
                  else if (move.destino_frota) dest = `🚛 Frota: ${move.destino_frota}`;
                  else if (move.destino) dest = move.destino;

                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-700 font-bold">{move.numero_pedido || "─"}</td>
                      <td className="p-3 text-slate-500">{move.numero_nf || move.nf || "─"}</td>
                      <td className="p-3 text-slate-500">{move.data}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            isEntry
                              ? "bg-emerald-100 text-emerald-800"
                              : isReturn
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isEntry ? "🟢 ENTRADA" : isReturn ? "🔵 DEVOLUÇÃO" : "🔴 SAÍDA"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{move.nome}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{`${move.qtd} ${move.unid}`}</td>
                      <td className="p-3 text-right font-semibold text-slate-700">{formatPrice(move.preco)}</td>
                      <td className="p-3 text-slate-500">
                        {dest !== "─" ? dest : move.nome_equipe || move.equipe || "─"}
                      </td>
                      <td className="p-3 text-slate-500">{move.resp_almox || move.responsavel || "─"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-400">
             Nenhuma movimentação para exibir com as opções fornecidas.
          </div>
        )}
      </div>
    </div>
  );
}
