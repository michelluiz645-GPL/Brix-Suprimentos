import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import type { Setor } from "@/types";
import logoTerrabrix from "@/assets/logo-terrabrix.png";
import bgLogin from "@/assets/bg-login.png";

interface LoginProps {
  onLoginSuccess: (user: object, token: string, setor: Setor) => void;
}

const SETORES: { key: Setor; label: string; icon: React.ReactNode }[] = [
  {
    key: "ALMOXARIFADO",
    label: "Suprimentos",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    key: "ENGENHARIA",
    label: "Engenharia",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    key: "MANUTENCAO",
    label: "Manutenção",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const PILARES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: "Terraplanagem",
    desc: "Movimentação de terra e nivelamento",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: "Obras Públicas e Privadas",
    desc: "Construção e infraestrutura",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: "Conservação",
    desc: "Manutenção e reparos",
  },
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate();
  const [setor, setSetor]         = useState<Setor>("ALMOXARIFADO");
  const [login, setLogin]         = useState("");
  const [senha, setSenha]         = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !senha) {
      setError("Preencha o usuário e a senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.auth.login(login.trim(), senha, setor) as { token: string; user: object };
      onLoginSuccess(res.user, res.token, setor);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Usuário ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex select-none">
      {/* Painel esquerdo — imagem de fundo */}
      <div className="hidden md:flex w-3/5 relative flex-col justify-between p-12 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{
            backgroundImage:
              `url('${bgLogin}')`,
          }}
        />
        <div className="absolute inset-0 bg-[#0D1420]/75 z-0" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          <div>
            {/* Logo */}
            <button onClick={() => navigate("/")} className="mb-6 block">
              <img
                src={logoTerrabrix}
                alt="Terrabrix Engenharia"
                className="h-16 w-auto drop-shadow-lg"
              />
            </button>

            <div className="flex flex-col gap-1 mb-10">
              <div className="w-8 h-0.5 bg-[#2563EB] rounded" />
              <div className="w-8 h-0.5 bg-[#EA6C0A] rounded" />
            </div>

            {/* Pilares */}
            <div className="space-y-6">
              {PILARES.map((p) => (
                <div key={p.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-[#EA6C0A] shrink-0">
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

          <p className="text-[10px] text-slate-500">
            GEPLAN &copy; {new Date().getFullYear()} &ndash; Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="w-full md:w-2/5 flex flex-col justify-center p-8 md:p-12 bg-[#0B0F1A]">
        <div className="max-w-sm w-full mx-auto">
          <h2 className="text-2xl font-extrabold text-white mb-1">Acesso ao Sistema</h2>
          <p className="text-sm text-slate-400 mb-8">
            Selecione seu setor e entre com suas credenciais
          </p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Setor */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">
                Setor
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SETORES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSetor(s.key)}
                    className={`py-3 px-2 text-xs font-semibold rounded-lg border flex flex-col items-center gap-1.5 transition-all duration-150 ${
                      setor === s.key
                        ? "bg-[#EA6C0A]/15 border-[#EA6C0A] text-[#EA6C0A]"
                        : "bg-[#1E293B] border-[#1E293B] text-slate-400 hover:text-white hover:border-slate-600"
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Usuário */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Usuário
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#EA6C0A] transition-colors placeholder-slate-500"
                placeholder="Digite seu usuário"
                autoComplete="username"
                required
              />
            </div>

            {/* Senha */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#1E293B] rounded-lg px-4 py-3 pr-11 text-sm text-white focus:outline-none focus:border-[#EA6C0A] transition-colors placeholder-slate-500"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showSenha ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 font-bold text-sm text-white rounded-lg transition-all duration-150 flex items-center justify-center gap-2 ${
                loading
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-[#EA6C0A] hover:bg-[#C75B12] active:scale-[0.99] cursor-pointer"
              }`}
            >
              {loading ? "Entrando..." : "Entrar →"}
            </button>
          </form>

          <div className="text-center mt-5">
            <button className="text-xs text-slate-500 hover:text-slate-400 transition-colors">
              Esqueceu sua senha?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
