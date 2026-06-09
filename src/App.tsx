import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Consultar from "./pages/Consultar";
import Entrada from "./pages/Entrada";
import Saida from "./pages/Saida";
import Combustiveis from "./pages/Combustiveis";
import Produtos from "./pages/Produtos";
import Estoque from "./pages/Estoque";
import Inventario from "./pages/Inventario";
import CrewsAndStaff from "./pages/CrewsAndStaff";
import PedidosCompra from "./pages/PedidosCompra";
import KoboSync from "./pages/KoboSync";
import Relatorios from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";

import { User as UserType } from "./types";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentSector, setCurrentSector] = useState<string>("ALMOXARIFADO");
  const [activePage, setActivePage] = useState<string>("Dashboard");
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent operational logins
    const savedUser = localStorage.getItem("geplan_username");
    const savedRole = localStorage.getItem("geplan_role") || "OPERADOR";
    const savedSector = localStorage.getItem("geplan_sector") || "ALMOXARIFADO";

    if (savedUser) {
      setCurrentUser({
        username: savedUser,
        nome: savedUser.toUpperCase(),
        nivel: savedRole as any,
        modulos: [],
      });
      setCurrentSector(savedSector);
      
      // Route default landing depending on sector
      if (savedSector === "ENGENHARIA") {
        setActivePage("Engenharia");
      } else if (savedSector === "MANUTENCAO") {
        setActivePage("Pedidos de Compra");
      } else {
        setActivePage("Dashboard");
      }
    }
    setSessionLoading(false);
  }, []);

  const handleLoginSuccess = (user: any, sector: string) => {
    const username = typeof user === "string" ? user : user.username || "";
    const role = typeof user === "string" ? "OPERADOR" : user.nivel || "OPERADOR";

    localStorage.setItem("geplan_username", username);
    localStorage.setItem("geplan_role", role || "OPERADOR");
    localStorage.setItem("geplan_sector", sector);

    setCurrentUser({
      username,
      nome: username.toUpperCase(),
      nivel: role as any,
      modulos: [],
    });
    setCurrentSector(sector);

    if (sector === "ENGENHARIA") {
      setActivePage("Engenharia");
    } else if (sector === "MANUTENCAO") {
      setActivePage("Pedidos de Compra");
    } else {
      setActivePage("Dashboard");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("geplan_username");
    localStorage.removeItem("geplan_role");
    localStorage.removeItem("geplan_sector");
    setCurrentUser(null);
    setActivePage("Dashboard");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin text-4xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500 text-sm">Validando chaves de segurança...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Routing matrix returning page components depending on menu selection tag
  const renderContentPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <Dashboard
            user={currentUser}
            setor={currentSector}
            setActivePage={setActivePage}
          />
        );
      case "Consultar":
        return <Consultar />;
      case "Entrada":
        return <Entrada setor={currentSector} />;
      case "Saída":
        return <Saida setor={currentSector} />;
      case "Combustíveis":
        return <Combustiveis />;
      case "Produtos":
        return <Produtos />;
      case "Estoque":
        return <Estoque />;
      case "Inventário":
        return <Inventario />;
      case "Equipes":
      case "Funcionários":
      case "Veículos":
      case "Equipamentos":
        return <CrewsAndStaff />;
      case "Pedidos de Compra":
      case "Meus Pedidos":
      case "Engenharia":
        return <PedidosCompra />;
      case "Suprimentos Kobo":
        return <KoboSync />;
      case "Relatórios":
        return <Relatorios />;
      case "Usuários":
      case "Backup":
        return <Usuarios />;
      default:
        return (
          <div className="bg-white border border-slate-150 rounded-xl p-8 text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
            <span className="text-4xl">🚧</span>
            <h3 className="text-md font-bold text-slate-800 uppercase tracking-widest">Módulo {activePage}</h3>
            <p className="text-xs text-slate-500 leading-normal">
              Este submódulo está passando por homologação e certificação regulatória corporativa ou se encontra incorporado dentro dos menus primários. Use o painel esquerdo para acessar outras funcionalidades.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Collapsible sticky Left Navigation bar */}
      <Sidebar
        user={currentUser}
        setor={currentSector}
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={handleLogout}
      />

      {/* Primary right panel space */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Superior Header panel */}
        <header className="bg-white border-b border-slate-100 min-h-[64px] flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm/5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold uppercase Tracking-widest text-[#C75B12]">
              {activePage}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-bold text-slate-400">
              Setor de Acesso: {currentSector}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Operador Ativo</span>
              <span className="text-xs font-bold text-slate-800">{currentUser.username}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 uppercase border border-slate-200">
              {currentUser.username.substring(0, 2)}
            </div>
          </div>
        </header>

        {/* Content canvas container */}
        <main className="p-6 overflow-y-auto max-w-7xl w-full mx-auto flex-1">
          {renderContentPage()}
        </main>
      </div>
    </div>
  );
}
