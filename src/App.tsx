import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ToastContainer from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import type { User, Setor } from "@/types";

import LandingPage    from "@/pages/LandingPage";
import Login          from "@/pages/Login";
import Dashboard      from "@/pages/Dashboard";
import Consultar      from "@/pages/Consultar";
import Entrada        from "@/pages/Entrada";
import Saida          from "@/pages/Saida";
import HistoricoCupons    from "@/pages/HistoricoCupons";
import Devolucao          from "@/pages/Devolucao";
import EntregasPendentes  from "@/pages/EntregasPendentes";
import Combustiveis   from "@/pages/Combustiveis";
import Produtos       from "@/pages/Produtos";
import ValorEstoque   from "@/pages/ValorEstoque";
import Inventario     from "@/pages/Inventario";
import Funcionarios   from "@/pages/Funcionarios";
import Equipes        from "@/pages/Equipes";
import Frotas         from "@/pages/Frotas";
import ObrasProjetos  from "@/pages/ObrasProjetos";
import Fornecedores   from "@/pages/Fornecedores";
import RelatoriosAbastecimento from "@/pages/RelatoriosAbastecimento";
import SuprimentosKobo from "@/pages/SuprimentosKobo";
import MeusPedidos    from "@/pages/MeusPedidos";
import PedidosCompra  from "@/pages/PedidosCompra";
import SegurancaEPI   from "@/pages/SegurancaEPI";
import EquipamentosPesados from "@/pages/EquipamentosPesados";
import DebitosOficina from "@/pages/DebitosOficina";
import SegurancaDados from "@/pages/SegurancaDados";
import Relatorios     from "@/pages/Relatorios";
import Usuarios       from "@/pages/Usuarios";

interface AuthState {
  user: User;
  setor: Setor | string;
}

function AppShell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token  = localStorage.getItem("geplan_token");
    const stored = localStorage.getItem("geplan_user");
    const setor  = localStorage.getItem("geplan_setor") as Setor ?? "ALMOXARIFADO";
    const page   = localStorage.getItem("geplan_page") ?? "Dashboard";

    if (token && stored) {
      try {
        const user = JSON.parse(stored) as User;
        setAuth({ user, setor });
        setActivePage(page);
      } catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: object, token: string, setor: Setor) => {
    const u = user as User;
    localStorage.setItem("geplan_token",  token);
    localStorage.setItem("geplan_user",   JSON.stringify(u));
    localStorage.setItem("geplan_setor",  setor);

    const defaultPage = setor === "ENGENHARIA" ? "Obras & Projetos" : setor === "MANUTENCAO" ? "Meus Pedidos" : "Dashboard";
    localStorage.setItem("geplan_page", defaultPage);

    setAuth({ user: u, setor });
    setActivePage(defaultPage);
    navigate("/app");
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
    navigate("/login");
  };

  const changePage = (page: string) => {
    setActivePage(page);
    localStorage.setItem("geplan_page", page);
  };

  const renderPage = () => {
    if (!auth) return null;
    switch (activePage) {
      case "Dashboard":          return <Dashboard user={auth.user} setor={auth.setor} setActivePage={changePage} />;
      case "Consultar":          return <Consultar />;
      case "Entrada":            return <Entrada />;
      case "Saída":              return <Saida />;
      case "Histórico Cupons":   return <HistoricoCupons />;
      case "Devolução":          return <Devolucao />;
      case "Entregas Pend.":     return <EntregasPendentes />;
      case "Combustíveis":       return <Combustiveis />;
      case "Produtos":           return <Produtos />;
      case "Valor Estoque":      return <ValorEstoque />;
      case "Inventário":         return <Inventario />;
      case "Funcionários":       return <Funcionarios />;
      case "Equipes":            return <Equipes />;
      case "Frotas":             return <Frotas />;
      case "Obras & Projetos":   return <ObrasProjetos />;
      case "Fornecedores":       return <Fornecedores />;
      case "Relatórios":         return <Relatorios />;
      case "Rel. Abastecimento": return <RelatoriosAbastecimento />;
      case "Suprimentos Kobo":   return <SuprimentosKobo />;
      case "Meus Pedidos":       return <MeusPedidos />;
      case "Pedidos de Compra":  return <PedidosCompra />;
      case "EPI":                return <SegurancaEPI />;
      case "Equipamentos":       return <EquipamentosPesados />;
      case "Débitos Oficina":    return <DebitosOficina />;
      case "Backup":             return <SegurancaDados />;
      case "Usuários":           return <Usuarios />;
      default:
        return (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center max-w-xl mx-auto my-8 shadow-sm">
            <span className="text-4xl block mb-3">🚧</span>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-2">{activePage}</h3>
            <p className="text-xs text-slate-400">Este módulo está em homologação. Use o menu lateral para acessar outras funcionalidades.</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-400 text-sm">Validando sessão...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={
        auth ? <Navigate to="/app" replace /> : <Login onLoginSuccess={handleLogin} />
      } />

      <Route path="/app" element={
        !auth ? <Navigate to="/login" replace /> : (
          <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar user={auth.user} setor={auth.setor} activePage={activePage} setActivePage={changePage} onLogout={handleLogout} />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="bg-white border-b border-slate-100 min-h-[64px] flex items-center justify-between px-6 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#C75B12]">{activePage}</span>
                  <span className="text-slate-200">|</span>
                  <span className="text-[11px] font-bold text-slate-400">Setor: {auth.setor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Operador Ativo</span>
                    <span className="text-xs font-bold text-slate-800">{auth.user.login}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 uppercase border border-slate-200">
                    {auth.user.login.substring(0, 2)}
                  </div>
                </div>
              </header>
              <main className="p-6 overflow-y-auto max-w-7xl w-full mx-auto flex-1">
                {renderPage()}
              </main>
            </div>
            <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
          </div>
        )
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
