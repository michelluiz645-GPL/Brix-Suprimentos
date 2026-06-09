import React, { useState } from "react";
import {
  LayoutDashboard,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  RotateCcw,
  Truck,
  Fuel,
  Package,
  TrendingUp,
  ClipboardList,
  Wrench,
  User,
  Users,
  Car,
  FileSpreadsheet,
  DownloadCloud,
  ShoppingCart,
  FileText,
  ShieldAlert,
  Building2,
  Factory,
  AlertTriangle,
  Database,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import { User as UserType } from "../types";

interface SidebarProps {
  user: UserType;
  setor: string;
  activePage: string;
  setActivePage: (page: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, setor, activePage, setActivePage, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const nivel = user.nivel || "OPERADOR";

  // Match menu text with corresponding icon elements
  const iconsMap: Record<string, React.ReactNode> = {
    "Dashboard": <LayoutDashboard size={18} />,
    "Consultar": <Search size={18} />,
    "Entrada": <ArrowDownToLine size={18} />,
    "Saída": <ArrowUpFromLine size={18} />,
    "Histórico Cupons": <Receipt size={18} />,
    "Devolução": <RotateCcw size={18} />,
    "Entregas Pend.": <Truck size={18} />,
    "Combustíveis": <Fuel size={18} />,
    "Produtos": <Package size={18} />,
    "Estoque": <TrendingUp size={18} />,
    "Inventário": <ClipboardList size={18} />,
    "Equipamentos": <Wrench size={18} />,
    "Funcionários": <User size={18} />,
    "Equipes": <Users size={18} />,
    "Veículos": <Car size={18} />,
    "Relatórios": <FileSpreadsheet size={18} />,
    "Suprimentos Kobo": <DownloadCloud size={18} />,
    "Pedidos de Compra": <ShoppingCart size={18} />,
    "Meus Pedidos": <FileText size={18} />,
    "EPI": <ShieldAlert size={18} />,
    "Engenharia": <Building2 size={18} />,
    "Fornecedores": <Factory size={18} />,
    "Débitos Manut.": <AlertTriangle size={18} />,
    "Backup": <Database size={18} />,
    "Usuários": <UserCheck size={18} />,
  };

  // Determine base list of menus depending on user sector and permission level
  let menusBase: string[] = [];

  if (setor === "ENGENHARIA") {
    menusBase = ["Engenharia", "Dashboard", "Backup"];
  } else if (setor === "MANUTENCAO") {
    menusBase = ["Pedidos de Compra", "Meus Pedidos", "Débitos Manut."];
  } else if (nivel === "ADMIN") {
    menusBase = [
      "Dashboard",
      "Consultar",
      "Entrada",
      "Saída",
      "Histórico Cupons",
      "Devolução",
      "Entregas Pend.",
      "Combustíveis",
      "Produtos",
      "Estoque",
      "Inventário",
      "Equipamentos",
      "Funcionários",
      "Equipes",
      "Veículos",
      "Relatórios",
      "Suprimentos Kobo",
      "Pedidos de Compra",
      "EPI",
      "Engenharia",
      "Fornecedores",
      "Débitos Manut.",
      "Backup",
      "Usuários",
    ];
  } else {
    // OPERADOR in ALMOXARIFADO
    menusBase = [
      "Dashboard",
      "Consultar",
      "Entrada",
      "Saída",
      "Histórico Cupons",
      "Devolução",
      "Entregas Pend.",
      "Produtos",
      "Estoque",
      "Inventário",
      "Combustíveis",
      "Suprimentos Kobo",
      "Pedidos de Compra",
      "EPI",
      "Engenharia",
    ];
  }

  // Filter based on persistent user-specific modules (if they are customized and the user is not ADMIN)
  const menus =
    user.modulos && user.modulos.length > 0 && nivel !== "ADMIN"
      ? menusBase.filter((m) => user.modulos.includes(m))
      : menusBase;

  return (
    <div
      style={{ minWidth: collapsed ? "70px" : "260px", maxWidth: collapsed ? "70px" : "260px" }}
      className="bg-[#0F172A] border-r border-[#1E293B] text-slate-300 flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-50 select-none"
    >
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1E293B] min-h-[64px]">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xl text-[#EA6C0A] font-bold">⚙️</span>
              <div>
                <div className="text-sm font-black text-white tracking-widest leading-none">
                  GE<span className="text-[#EA6C0A]">PLAN</span>
                </div>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  {setor === "ALMOXARIFADO"
                    ? "📦 ALMOX"
                    : setor === "ENGENHARIA"
                    ? "🏗️ ENGENHARIA"
                    : "🔧 MANUTENÇÃO"}
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <span className="text-xl text-center w-full text-[#EA6C0A] font-bold">⚙️</span>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-500 hover:text-white p-1 rounded-md hidden md:block"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar py-2">
          {menus.map((menu) => {
            const isActive = activePage === menu;
            return (
              <button
                key={menu}
                onClick={() => setActivePage(menu)}
                className={`w-full flex items-center px-4 py-3 text-sm transition-all duration-200 border-l-4 ${
                  isActive
                    ? "bg-[#1E293B] text-white font-semibold border-[#EA6C0A]"
                    : "border-transparent text-slate-400 hover:bg-[#1E293B]/40 hover:text-white"
                }`}
                title={collapsed ? menu : ""}
              >
                <span className={`${isActive ? "text-[#EA6C0A]" : "text-slate-500"} mr-3`}>
                  {iconsMap[menu] || "•"}
                </span>
                {!collapsed && <span>{menu}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* User profile footer */}
      <div className="border-t border-[#1E293B] bg-[#0A0F1D]/50 p-3">
        {!collapsed && (
          <div className="mb-3">
            <div className="text-xs font-bold text-slate-200 truncate">{user.nome}</div>
            <div className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
              {nivel}
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 rounded-lg transition-all duration-150 border border-rose-500/20"
        >
          <LogOut size={14} />
          {!collapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </div>
  );
}
