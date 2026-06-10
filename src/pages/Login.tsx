import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import type { Setor } from "@/types";

interface LoginProps {
  onLoginSuccess: (user: object, token: string, setor: Setor) => void;
}

const SETORES: { key: Setor; label: string }[] = [
  { key: "ALMOXARIFADO", label: "Almoxarifado" },
  { key: "ENGENHARIA",   label: "Engenharia" },
  { key: "MANUTENCAO",   label: "Manutenção" },
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const [setor, setSetor]     = useState<Setor>("ALMOXARIFADO");
  const [login, setLogin]     = useState("");
  const [senha, setSenha]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !senha) {
      setError("Preencha o usuário e a senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.auth.login(login.trim(), senha) as { token: string; user: object };
      onLoginSuccess(res.user, res.token, setor);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Usuário ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col md:flex-row select-none">
      {/* Left branding panel */}
      <div className="w-full md:w-3/5 relative p-12 flex flex-col justify-between text-slate-300 overflow-hidden min-h-[300px] md:min-h-screen">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center opacity-20 z-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/90 to-[#0F172A]/60 z-0" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            {/* Logo */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 mb-2 group"
            >
              <span className="text-4xl text-[#EA6C0A]">⚙️</span>
              <span className="text-4xl font-black tracking-tight text-white">
                GE<span className="text-[#EA6C0A]">PLAN</span>
              </span>
            </button>
            <div className="text-sm text-slate-400 mb-8 font-medium tracking-wider uppercase">
              Sistema de Gestão Operacional
            </div>

            <div className="w-12 h-1 bg-[#2563EB] rounded mb-1" />
            <div className="w-12 h-1 bg-[#EA6C0A] rounded mb-10" />

            {/* Pillars */}
            <div className="space-y-6">
              {[
                { icon: "📦", title: "Almoxarifado & Estoque", desc: "Controle total de materiais, EPIs e frotas" },
                { icon: "🏗️", title: "Engenharia & Obras", desc: "Gerenciamento de insumos para projetos ativos" },
                { icon: "🔧", title: "Suprimentos & Manutenção", desc: "Pedidos, débitos de oficina e faturamentos" },
              ].map((p) => (
                <div key={p.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                    {p.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{p.title}</h4>
                    <p className="text-xs text-slate-400">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-medium mt-12 md:mt-0">
            GEPLAN &copy; {new Date().getFullYear()} &middot; ERP Corporativo para Infraestrutura
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full md:w-2/5 flex flex-col justify-center p-8 md:p-12 bg-[#090D1A] min-h-[450px]">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">Acesso ao Sistema</h2>
          <p className="text-xs text-slate-500 mb-8">
            Selecione seu setor e entre com suas credenciais corporativas.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Sector selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
                Setor / Divisão
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SETORES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSetor(s.key)}
                    className={`py-2.5 px-1 text-xs font-bold rounded-lg border text-center transition-all duration-150 ${
                      setor === s.key
                        ? "bg-[#C75B12] border-[#C75B12] text-white shadow-lg shadow-orange-500/20"
                        : "bg-[#1E293B] border-[#1E293B] text-slate-400 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Usuário
                </label>
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#EA6C0A] transition-colors placeholder-slate-500"
                  placeholder="Seu usuário"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Senha de Acesso
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#EA6C0A] transition-colors placeholder-slate-500"
                  placeholder="Sua senha"
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
              className={`w-full py-3 px-4 font-bold text-sm text-white rounded-lg transition-all duration-150 shadow-xl ${
                loading
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 active:translate-y-0 hover:shadow-orange-500/20 cursor-pointer"
              }`}
            >
              {loading ? "Entrando..." : "Entrar no Painel →"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate("/")}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              ← Voltar para a página inicial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
