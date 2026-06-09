import React, { useState } from "react";
import api from "../services/api";

interface LoginProps {
  onLoginSuccess: (user: any, sector: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [selectedSetor, setSelectedSetor] = useState<"ALMOXARIFADO" | "ENGENHARIA" | "MANUTENCAO">("ALMOXARIFADO");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Por favor, preencha o usuário e a senha.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.login(username.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user, selectedSetor);
      } else {
        setError("Erro desconhecido ao realizar login.");
      }
    } catch (err: any) {
      setError(err.message || "Usuário ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col md:flex-row select-none">
      {/* Left branding panel */}
      <div className="w-full md:w-3/5 bg-gradient-to-r from-[#0d1b2a]/95 to-[#0d1b2a]/65 p-12 flex flex-col justify-between text-slate-300 relative overflow-hidden min-h-[300px] md:min-h-screen">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center mix-blend-overlay opacity-30 z-0"></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl text-[#EA6C0A]">⚙️</span>
              <span className="text-4xl font-black tracking-tight text-white">
                GE<span className="text-[#EA6C0A]">PLAN</span>
              </span>
            </div>
            <div className="text-sm text-slate-400 mb-8 font-medium">
              SISTEMA DE GESTÃO OPERACIONAL
            </div>

            <div className="w-12 h-1 bg-[#2563EB] rounded mb-1"></div>
            <div className="w-12 h-1 bg-[#F97316] rounded mb-8"></div>

            {/* Core Pillars */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-white">
                  📦
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Almoxarifado & Estoque</h4>
                  <p className="text-xs text-slate-400">Controle total de materiais, EPIs, e frotas</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-white">
                  🏗️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Engenharia & Obras</h4>
                  <p className="text-xs text-slate-400">Gerenciamento de fluxos de insumos para projetos ativos</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-white">
                  🔧
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Suprimentos & Manutenção</h4>
                  <p className="text-xs text-slate-400">Pedidos de reposição, faturamentos, e notas de débitos</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-medium mt-12 md:mt-0">
            GEPLAN &copy; {new Date().getFullYear()} &middot; ERP Corporativo para Infraestrutura
          </div>
        </div>
      </div>

      {/* Right Login form panel */}
      <div className="w-full md:w-2/5 flex flex-col justify-center p-8 md:p-12 bg-[#090D1A] min-h-[450px]">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Acesso ao Sistema
          </h2>
          <p className="text-xs text-slate-500 mb-8">
            Selecione seu setor e entre com suas credenciais corporativas.
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Sector toggle selection */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
                SETOR / DIVISÃO
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "ALMOXARIFADO", label: "Almox" },
                  { key: "ENGENHARIA", label: "Engenharia" },
                  { key: "MANUTENCAO", label: "Manutenção" },
                ].map((s) => {
                  const isSelected = selectedSetor === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSelectedSetor(s.key as any)}
                      className={`py-2.5 px-1 text-xs font-bold rounded-lg border text-center transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-[#C75B12] border-[#C75B12] text-white shadow-lg shadow-orange-500/20"
                          : "bg-[#1E293B] border-[#1E293B] text-slate-400 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  USUÁRIO
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#EA6C0A] transition-colors duration-200 placeholder-slate-500"
                  placeholder="Seu usuário"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  SENHA DE ACESSO
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#EA6C0A] transition-colors duration-200 placeholder-slate-500"
                  placeholder="Sua senha secreta"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 font-bold text-sm text-white rounded-lg transition-all duration-200 shadow-xl ${
                loading
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 active:translate-y-0 hover:shadow-orange-500/20 cursor-pointer"
              }`}
            >
              {loading ? "Entrando..." : "Entrar no Painel  →"}
            </button>
          </form>

          <div className="text-center mt-6">
            <span className="text-xs text-slate-500 hover:text-slate-400 cursor-pointer">
              Esqueceu sua senha? Consulte o suporte interno
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
