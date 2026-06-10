import React, { useState } from "react";
import {
  LayoutDashboard, Search, ArrowDownToLine, ArrowUpFromLine,
  Receipt, RotateCcw, Truck, Fuel, Package, TrendingUp,
  ClipboardList, Wrench, User, Users, Car, FileSpreadsheet,
  DownloadCloud, ShoppingCart, FileText, ShieldAlert, Building2,
  Factory, AlertTriangle, Database, UserCheck, ChevronLeft,
  ChevronRight, LogOut,
} from "lucide-react";
import type { User as UserType, Setor } from "@/types";

interface SidebarProps {
  user: UserType;
  setor: Setor | string;
  activePage: string;
  setActivePage: (page: string) => void;
  onLogout: () => void;
}

const ICONS: Record<string, React.ReactNode> = {
  "Dashboard":          <LayoutDashboard size={18} />,
  "Consultar":          <Search size={18} />,
  "Entrada":            <ArrowDownToLine size={18} />,
  "Saída":              <ArrowUpFromLine size={18} />,
  "Histórico Cupons":   <Receipt size={18} />,
  "Devolução":          <RotateCcw size={18} />,
  "Entregas Pend.":     <Truck size={18} />,
  "Combustíveis":       <Fuel size={18} />,
  "Produtos":           <Package size={18} />,
  "Valor Estoque":      <TrendingUp size={18} />,
  "Inventário":         <ClipboardList size={18} />,
  "Equipamentos":       <Wrench size={18} />,
  "Funcionários":       <User size={18} />,
  "Equipes":            <Users size={18} />,
  "Frotas":             <Car size={18} />,
  "Relatórios":         <FileSpreadsheet size={18} />,
  "Suprimentos Kobo":   <DownloadCloud size={18} />,
  "Pedidos de Compra":  <ShoppingCart size={18} />,
  "Meus Pedidos":       <FileText size={18} />,
  "EPI":                <ShieldAlert size={18} />,
  "Obras & Projetos":   <Building2 size={18} />,
  "Fornecedores":       <Factory size={18} />,
  "Débitos Oficina":    <AlertTriangle size={18} />,
  "Backup":             <Database size={18} />,
  "Usuários":           <UserCheck size={18} />,
};

const MENUS_BY_SECTOR: Record<string, string[]> = {
  ALMOXARIFADO_ADMIN: [
    "Dashboard", "Consultar", "Entrada", "Saída", "Histórico Cupons",
    "Devolução", "Entregas Pend.", "Combustíveis", "Produtos",
    "Valor Estoque", "Inventário", "Funcionários", "Equipes", "Frotas",
    "Suprimentos Kobo", "Pedidos de Compra", "EPI", "Backup", "Usuários",
  ],
  ALMOXARIFADO_OPERADOR: [
    "Dashboard", "Consultar", "Entrada", "Saída", "Histórico Cupons",
    "Devolução", "Entregas Pend.", "Combustíveis", "Produtos",
    "Funcionários", "Equipes", "Frotas", "Pedidos de Compra", "EPI",
  ],
  ENGENHARIA_ADMIN: [
    "Dashboard", "Obras & Projetos", "Fornecedores", "Pedidos de Compra",
    "EPI", "Equipamentos", "Débitos Oficina", "Suprimentos Kobo",
    "Relatórios", "Backup",
  ],
  ENGENHARIA_OPERADOR: [
    "Dashboard", "Obras & Projetos", "Pedidos de Compra",
    "EPI", "Equipamentos", "Débitos Oficina", "Suprimentos Kobo", "Relatórios",
  ],
  MANUTENCAO_ADMIN: [
    "Dashboard", "Meus Pedidos", "Pedidos de Compra",
    "EPI", "Equipamentos", "Débitos Oficina",
  ],
  MANUTENCAO_OPERADOR: [
    "Dashboard", "Meus Pedidos", "Pedidos de Compra",
    "EPI", "Equipamentos", "Débitos Oficina",
  ],
};

const SECTOR_LABELS: Record<string, string> = {
  ALMOXARIFADO: "📦 Almoxarifado",
  ENGENHARIA:   "🏗️ Engenharia",
  MANUTENCAO:   "🔧 Manutenção",
};

export default function Sidebar({ user, setor, activePage, setActivePage, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const nivel = user.nivel || "OPERADOR";

  const key = `${setor}_${nivel}`;
  const baseMenus = MENUS_BY_SECTOR[key] ?? MENUS_BY_SECTOR["ALMOXARIFADO_OPERADOR"];
  const menus = user.modulos?.length && nivel !== "ADMIN"
    ? baseMenus.filter((m) => user.modulos.includes(m))
    : baseMenus;

  return (
    <div
      style={{ minWidth: collapsed ? 70 : 260, maxWidth: collapsed ? 70 : 260 }}
      className="bg-[#0F172A] border-r border-[#1E293B] text-slate-300 flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-50 select-none"
    >
      <div className="flex flex-col min-h-0">
        {/* Brand */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E293B] min-h-[64px]">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xl text-[#EA6C0A]">⚙️</span>
              <div>
                <div className="text-sm font-black text-white tracking-widest leading-none">
                  GE<span className="text-[#EA6C0A]">PLAN</span>
                </div>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  {SECTOR_LABELS[setor] ?? setor}
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <span className="text-xl text-center w-full text-[#EA6C0A]">⚙️</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 hover:text-white p-1 rounded-md hidden md:block"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menus.map((menu) => {
            const isActive = activePage === menu;
            return (
              <button
                key={menu}
                onClick={() => setActivePage(menu)}
                title={collapsed ? menu : ""}
                className={`w-full flex items-center px-4 py-3 text-sm transition-all duration-150 border-l-4 ${
                  isActive
                    ? "bg-[#1E293B] text-white font-semibold border-[#EA6C0A]"
                    : "border-transparent text-slate-400 hover:bg-[#1E293B]/40 hover:text-white"
                }`}
              >
                <span className={`${isActive ? "text-[#EA6C0A]" : "text-slate-500"} mr-3 shrink-0`}>
                  {ICONS[menu] ?? "·"}
                </span>
                {!collapsed && <span>{menu}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User footer */}
      <div className="border-t border-[#1E293B] bg-[#0A0F1D]/50 p-3">
        {!collapsed && (
          <div className="mb-3">
            <div className="text-xs font-bold text-slate-200 truncate">{user.nome}</div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">{nivel}</div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-500/20"
        >
          <LogOut size={14} />
          {!collapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </div>
  );
}
