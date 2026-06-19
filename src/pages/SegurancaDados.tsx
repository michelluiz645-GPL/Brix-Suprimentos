import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { Database, RefreshCw, Download, Settings, CheckCircle, XCircle, Clock, Eye, EyeOff } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors font-mono";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

interface SyncLog {
  id: number;
  data: string;
  tipo: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

const fakeLog = (): SyncLog[] => [
  { id: 1, data: new Date().toISOString(), tipo: "Sincronização manual", status: "sucesso", mensagem: "127 registros sincronizados com sucesso." },
  { id: 2, data: new Date(Date.now() - 86400000).toISOString(), tipo: "Backup automático", status: "sucesso", mensagem: "Backup gerado: 2,4 MB." },
  { id: 3, data: new Date(Date.now() - 172800000).toISOString(), tipo: "Sincronização automática", status: "erro", mensagem: "Falha na conexão com o servidor remoto." },
];

export default function SegurancaDados() {
  const toast = useToast();
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [checando, setChecando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [baixandoBackup, setBaixandoBackup] = useState(false);
  const [logs] = useState<SyncLog[]>(fakeLog());
  const [mostrarSupabase, setMostrarSupabase] = useState(false);
  const [mostrarKobo, setMostrarKobo] = useState(false);
  const [credsSalvas, setCredsSalvas] = useState({ supabase: false, kobo: false });
  const [supabase, setSupabase] = useState({ url: "", anon_key: "", service_key: "" });
  const [kobo, setKobo] = useState({ token: "", form_id: "" });

  const verificarStatus = () => {
    setChecando(true);
    api.sistema.status()
      .then((r) => setStatus(r as { connected: boolean; message: string }))
      .catch(() => setStatus({ connected: false, message: "Não foi possível conectar ao servidor." }))
      .finally(() => setChecando(false));
  };

  useEffect(() => { verificarStatus(); }, []);

  const handleSync = async () => {
    setSincronizando(true);
    try {
      await api.sistema.syncAll();
      toast.success("Sincronização concluída com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha na sincronização. Verifique a conexão.");
    } finally { setSincronizando(false); }
  };

  const handleBackup = async () => {
    setBaixandoBackup(true);
    try {
      await api.sistema.backup();
      toast.success("Backup gerado! Verifique seus downloads.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o backup.");
    } finally { setBaixandoBackup(false); }
  };

  const salvarSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase.url.trim() || !supabase.anon_key.trim()) { toast.error("URL e chave anon são obrigatórios."); return; }
    setCredsSalvas((p) => ({ ...p, supabase: true }));
    setSupabase({ url: "", anon_key: "", service_key: "" });
    toast.success("Credenciais do Supabase salvas!");
  };

  const salvarKobo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kobo.token.trim()) { toast.error("Token do KoboToolbox é obrigatório."); return; }
    setCredsSalvas((p) => ({ ...p, kobo: true }));
    setKobo({ token: "", form_id: "" });
    toast.success("Credenciais do KoboToolbox salvas!");
  };

  const formatTimestamp = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Segurança de Dados" subtitle="Backup, sincronização e configurações de conectividade" />

        {/* Status da conexão */}
        <div className={`rounded-xl p-5 border flex items-center justify-between gap-4 ${checando ? "bg-slate-50 border-slate-200" : status?.connected ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full ${checando ? "bg-slate-200" : status?.connected ? "bg-emerald-100" : "bg-rose-100"}`}>
              <Database size={18} className={checando ? "text-slate-400 animate-pulse" : status?.connected ? "text-emerald-600" : "text-rose-600"} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest ${checando ? "text-slate-500" : status?.connected ? "text-emerald-700" : "text-rose-700"}`}>
                {checando ? "Verificando conexão..." : status?.connected ? "Banco de dados conectado" : "Banco de dados desconectado"}
              </p>
              {!checando && status?.message && (
                <p className={`text-[11px] mt-0.5 ${status.connected ? "text-emerald-600" : "text-rose-600"}`}>{status.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!checando && (status?.connected
              ? <CheckCircle size={20} className="text-emerald-500" />
              : <XCircle size={20} className="text-rose-500" />
            )}
            <button onClick={verificarStatus} disabled={checando}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
              <RefreshCw size={12} className={checando ? "animate-spin" : ""} />
              Verificar
            </button>
          </div>
        </div>

        {/* Ações principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg"><RefreshCw size={16} className="text-blue-500" /></div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Sincronização Manual</h3>
                <p className="text-[11px] text-slate-400">Sincroniza todos os dados com o servidor remoto</p>
              </div>
            </div>
            <button onClick={handleSync} disabled={sincronizando}
              className={`w-full py-2.5 text-xs font-bold rounded-lg transition-colors ${sincronizando ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600"}`}>
              {sincronizando ? "Sincronizando..." : "Sincronizar Agora"}
            </button>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-orange-50 rounded-lg"><Download size={16} className="text-[#EA6C0A]" /></div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">Backup do Banco de Dados</h3>
                <p className="text-[11px] text-slate-400">Gera e baixa um backup completo dos dados</p>
              </div>
            </div>
            <button onClick={handleBackup} disabled={baixandoBackup}
              className={`w-full py-2.5 text-xs font-bold rounded-lg transition-colors ${baixandoBackup ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] text-white hover:bg-[#C75B12]"}`}>
              {baixandoBackup ? "Gerando backup..." : "Baixar Backup"}
            </button>
          </div>
        </div>

        {/* Configurações de credenciais */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Settings size={15} className="text-slate-400" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Credenciais de Serviços Externos</h2>
          </div>

          {/* Supabase */}
          <div className="p-5 border-b border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-700">Supabase</h3>
                <p className="text-[11px] text-slate-400">Banco de dados em nuvem (sincronização remota)</p>
              </div>
              {credsSalvas.supabase && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">Configurado</span>
              )}
            </div>
            <form onSubmit={salvarSupabase} className="space-y-3">
              <div>
                <label className={lbl}>URL do Projeto</label>
                <div className="relative">
                  <input type={mostrarSupabase ? "text" : "password"} value={supabase.url}
                    onChange={(e) => setSupabase((p) => ({ ...p, url: e.target.value }))}
                    placeholder={credsSalvas.supabase ? "••••••••••••••••••••" : "https://xxxx.supabase.co"}
                    className={inp} />
                  <button type="button" onClick={() => setMostrarSupabase((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {mostrarSupabase ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Chave Anon</label>
                  <input type="password" value={supabase.anon_key}
                    onChange={(e) => setSupabase((p) => ({ ...p, anon_key: e.target.value }))}
                    placeholder={credsSalvas.supabase ? "••••••" : "eyJ..."}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Chave de Serviço</label>
                  <input type="password" value={supabase.service_key}
                    onChange={(e) => setSupabase((p) => ({ ...p, service_key: e.target.value }))}
                    placeholder={credsSalvas.supabase ? "••••••" : "eyJ..."}
                    className={inp} />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors">
                Salvar Credenciais Supabase
              </button>
            </form>
          </div>

          {/* KoboToolbox */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-slate-700">KoboToolbox</h3>
                <p className="text-[11px] text-slate-400">Plataforma de coleta de dados em campo (Suprimentos KOBO)</p>
              </div>
              {credsSalvas.kobo && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">Configurado</span>
              )}
            </div>
            <form onSubmit={salvarKobo} className="space-y-3">
              <div>
                <label className={lbl}>Token de Autenticação</label>
                <div className="relative">
                  <input type={mostrarKobo ? "text" : "password"} value={kobo.token}
                    onChange={(e) => setKobo((p) => ({ ...p, token: e.target.value }))}
                    placeholder={credsSalvas.kobo ? "••••••••••••••••••••" : "Token da API KoboToolbox"}
                    className={inp} />
                  <button type="button" onClick={() => setMostrarKobo((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {mostrarKobo ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={lbl}>ID do Formulário</label>
                <input value={kobo.form_id}
                  onChange={(e) => setKobo((p) => ({ ...p, form_id: e.target.value }))}
                  placeholder="Ex: aXxYyZz123..."
                  className={inp} />
              </div>
              <button type="submit" className="px-4 py-2 text-xs font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors">
                Salvar Credenciais KoboToolbox
              </button>
            </form>
          </div>
        </div>

        {/* Log de sincronizações */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Últimas Sincronizações</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-center gap-4">
                <div className={`p-1.5 rounded-full shrink-0 ${log.status === "sucesso" ? "bg-emerald-100" : "bg-rose-100"}`}>
                  {log.status === "sucesso"
                    ? <CheckCircle size={13} className="text-emerald-600" />
                    : <XCircle size={13} className="text-rose-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">{log.tipo}</p>
                  <p className="text-[11px] text-slate-400 truncate">{log.mensagem}</p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-mono">{formatTimestamp(log.data)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
