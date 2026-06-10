import React, { useEffect, useState } from "react";
import api from "@/services/api";
import KPICard from "@/components/KPICard";
import { formatCurrency } from "@/utils/formatters";
import type { User } from "@/types";

interface DashboardProps {
  user: User;
  setor: string;
  setActivePage: (page: string) => void;
}

export default function Dashboard({ user, setor, setActivePage }: DashboardProps) {
  const [products, setProducts]       = useState<Record<string, object>>({});
  const [movements, setMovements]     = useState<Record<string, object>>({});
  const [employees, setEmployees]     = useState<Record<string, object>>({});
  const [deliveries, setDeliveries]   = useState<Record<string, object>>({});
  const [purchases, setPurchases]     = useState<Record<string, object>>({});
  const [dbStatus, setDbStatus]       = useState({ connected: false, message: "" });
  const [filterType, setFilterType]   = useState("Todos");
  const [linesCount, setLinesCount]   = useState(20);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [prods, movs, emps, delivs, pos, status] = await Promise.all([
          api.produtos.list(),
          api.movimentos.list(),
          api.funcionarios.list(),
          api.entregas.list(),
          api.pedidosCompra.list(),
          api.sistema.status(),
        ]);
        setProducts((prods as { data: Record<string, object> }).data ?? {});
        setMovements((movs as { data: Record<string, object> }).data ?? {});
        setEmployees((emps as { data: Record<string, object> }).data ?? {});
        setDeliveries((delivs as { data: Record<string, object> }).data ?? {});
        setPurchases((pos as { data: Record<string, object> }).data ?? {});
        setDbStatus(status);
      } catch {
        setDbStatus({ connected: false, message: "Erro ao verificar conexão." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const productList   = Object.values(products) as Record<string, number>[];
  const movList       = Object.values(movements) as Record<string, string | number>[];
  const empList       = Object.values(employees) as Record<string, string | boolean>[];
  const delivList     = Object.values(deliveries) as Record<string, string>[];
  const purchList     = Object.values(purchases) as Record<string, string>[];

  const totalValue    = productList.reduce((s, p) => s + Number(p.preco ?? 0) * Number(p.estoque ?? 0), 0);
  const activeStaff   = empList.filter((e) => !e.demitido && e.status !== "INATIVO").length;
  const critical      = productList.filter((p) => Number(p.estoque_min ?? 0) > 0 && Number(p.estoque ?? 0) <= Number(p.estoque_min ?? 0));
  const pendDelivs    = delivList.filter((d) => d.status === "PENDENTE").length;
  const pendPurchases = purchList.filter((p) => p.status !== "CONCLUÍDO" && p.status !== "CANCELADO").length;

  const filteredMovs = movList
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))
    .filter((m) => filterType === "Todos" || m.tipo === filterType)
    .slice(0, linesCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500 text-sm">Carregando painel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* DB Status */}
      <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm ${dbStatus.connected ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : "bg-rose-500/10 border-rose-500/30 text-rose-700"}`}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{dbStatus.connected ? "✅" : "⚠️"}</span>
          <div>
            <div className="text-sm font-bold">{dbStatus.connected ? "Banco de dados conectado!" : "Base de dados indisponível"}</div>
            <div className="text-xs text-slate-500">{dbStatus.connected ? "Sincronização em tempo real ativa." : "Verifique as configurações de conexão."}</div>
          </div>
        </div>
        <button onClick={() => setActivePage("Backup")} className="text-xs font-bold underline hover:no-underline">
          {dbStatus.connected ? "Configurações" : "Resolver conexão"}
        </button>
      </div>

      {/* Critical alert */}
      {critical.length > 0 && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-800 text-sm flex items-start gap-3">
          <span>⚠️</span>
          <div>
            <span className="font-bold">{critical.length} produto(s) abaixo do estoque mínimo de segurança!</span>
            <div className="text-xs mt-1 text-slate-600">Acesse <b>Valor Estoque</b> para gerar as solicitações de reposição.</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard icon="📦" title="Produtos" value={productList.length} subtext="No catálogo" color="#2563EB" bgColor="rgba(37,99,235,0.08)" />
        <KPICard icon="👤" title="Colaboradores" value={activeStaff} subtext="Equipe ativa" color="#10B981" bgColor="rgba(16,185,129,0.08)" />
        <KPICard icon="💰" title="Valor em Estoque" value={formatCurrency(totalValue)} subtext="Total estimado" color="#F59E0B" bgColor="rgba(245,158,11,0.08)" />
        <KPICard
          icon="⚠️" title="Itens Críticos" value={critical.length}
          subtext={critical.length > 0 ? "Reposição urgente!" : "Estoque estável"}
          color={critical.length > 0 ? "#EF4444" : "#10B981"}
          bgColor={critical.length > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)"}
        />
        <KPICard
          icon="📋" title="Compras Pend." value={pendPurchases}
          subtext={`${pendPurchases} aguardando`}
          color={pendPurchases > 0 ? "#8B5CF6" : "#10B981"}
          bgColor={pendPurchases > 0 ? "rgba(139,92,246,0.08)" : "rgba(16,185,129,0.08)"}
        />
      </div>

      {/* Quick Actions */}
      {setor === "ALMOXARIFADO" && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "🔍 Consultar",   page: "Consultar",    cls: "bg-slate-100 hover:bg-slate-200/80 text-slate-700" },
              { label: "📥 Entrada NF",  page: "Entrada",      cls: "bg-[#C75B12] hover:bg-[#EA6C0A] text-white shadow-lg shadow-orange-500/10" },
              { label: "📤 Saída Slip",  page: "Saída",        cls: "bg-[#1E293B] hover:bg-[#0F172A] text-white" },
              { label: "↩️ Devolver",    page: "Devolução",    cls: "bg-slate-100 hover:bg-slate-200/80 text-slate-700" },
              { label: "⛽ Combustível", page: "Combustíveis", cls: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-lg shadow-blue-500/10" },
            ].map((a) => (
              <button key={a.page} onClick={() => setActivePage(a.page)} className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold cursor-pointer transition-all duration-150 ${a.cls}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Movements table */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Últimos Movimentos</h3>
          <div className="flex items-center gap-3">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none">
              <option value="Todos">Todos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAÍDA">Saídas</option>
              <option value="DEVOLUÇÃO">Devoluções</option>
            </select>
            <select value={linesCount} onChange={(e) => setLinesCount(Number(e.target.value))} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {filteredMovs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Nº Pedido", "NF / ORC", "Data", "Tipo", "Produto", "Qtd", "Preço", "Destinatário", "Responsável"].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMovs.map((m, i) => {
                  const isEntry  = m.tipo === "ENTRADA";
                  const isReturn = m.tipo === "DEVOLUÇÃO";
                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-700">{String(m.numero_pedido ?? "—")}</td>
                      <td className="p-3 text-slate-500">{String(m.numero_nf ?? m.nf ?? "—")}</td>
                      <td className="p-3 text-slate-500">{String(m.data)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${isEntry ? "bg-emerald-100 text-emerald-800" : isReturn ? "bg-indigo-100 text-indigo-800" : "bg-rose-100 text-rose-800"}`}>
                          {isEntry ? "🟢 ENTRADA" : isReturn ? "🔵 DEVOLUÇÃO" : "🔴 SAÍDA"}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{String(m.nome ?? "—")}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{`${m.qtd} ${m.unid}`}</td>
                      <td className="p-3 font-semibold text-slate-700">{formatCurrency(Number(m.preco ?? 0))}</td>
                      <td className="p-3 text-slate-500">{String(m.destino ?? m.nome_equipe ?? m.equipe ?? "—")}</td>
                      <td className="p-3 text-slate-500">{String(m.resp_almox ?? m.responsavel ?? "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-400 text-sm">
            Nenhuma movimentação encontrada com os filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}
