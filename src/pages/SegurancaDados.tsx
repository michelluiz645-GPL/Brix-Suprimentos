import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { Database, RefreshCw, Download, CheckCircle, XCircle, Clock } from "lucide-react";

interface SyncLog { data: string; tipo: string; status: "sucesso" | "erro"; mensagem: string; }

export default function SegurancaDados() {
  const toast = useToast();
  const [status, setStatus] = useState<{ connected: boolean; message: string; kobo_configurado: boolean } | null>(null);
  const [checando, setChecando] = useState(true);
  const [baixandoBackup, setBaixandoBackup] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [carregandoLogs, setCarregandoLogs] = useState(true);

  const verificarStatus = () => {
    setChecando(true);
    api.sistema.status()
      .then((r) => setStatus(r))
      .catch(() => setStatus({ connected: false, message: "Não foi possível conectar ao servidor.", kobo_configurado: false }))
      .finally(() => setChecando(false));
  };

  const carregarHistorico = () => {
    setCarregandoLogs(true);
    api.sistema.historico()
      .then((r) => setLogs((r as SyncLog[]) ?? []))
      .catch(() => {})
      .finally(() => setCarregandoLogs(false));
  };

  useEffect(() => { verificarStatus(); carregarHistorico(); }, []);

  const handleBackup = async () => {
    setBaixandoBackup(true);
    try {
      const res = await api.sistema.backup();
      const bytes = atob(res.conteudo_base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: "application/gzip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = res.arquivo; a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado e baixado com sucesso!");
      carregarHistorico();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o backup.");
    } finally { setBaixandoBackup(false); }
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
        <PageHeader title="Segurança de Dados" subtitle="Backup e status de conectividade — acesso restrito ao Admin" />

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

        {/* Status da integração KoboToolbox — só o booleano, nunca o token */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800">Integração KoboToolbox</h3>
            <p className="text-[11px] text-slate-400">Credenciais configuradas via variáveis de ambiente do servidor (.env) — nunca pela interface.</p>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${status?.kobo_configurado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {status?.kobo_configurado ? "Configurada" : "Não configurada"}
          </span>
        </div>

        {/* Backup */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 bg-orange-50 rounded-lg"><Download size={16} className="text-[#EA6C0A]" /></div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Backup do Banco de Dados</h3>
              <p className="text-[11px] text-slate-400">Gera e baixa um backup completo dos dados (também roda automaticamente todo dia às 02:00)</p>
            </div>
          </div>
          <button onClick={handleBackup} disabled={baixandoBackup}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors ${baixandoBackup ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] text-white hover:bg-[#C75B12]"}`}>
            {baixandoBackup ? "Gerando backup..." : "Baixar Backup Agora"}
          </button>
        </div>

        {/* Log de backups */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Histórico de Backups</h2>
          </div>
          {carregandoLogs ? (
            <div className="p-8 text-center text-xs text-slate-400">Carregando histórico...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Nenhum backup registrado ainda.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
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
          )}
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
