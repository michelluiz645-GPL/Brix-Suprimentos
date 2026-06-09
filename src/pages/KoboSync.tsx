import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function KoboSync() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>({
    kobo_token: "",
    kobo_suprim_uid: "",
    kobo_compras_uid: "",
  });

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [syncSummary, setSyncSummary] = useState<any>(null);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get("kobo_config") || {};
      setConfig({
        kobo_token: res.kobo_token || "",
        kobo_suprim_uid: res.kobo_suprim_uid || "",
        kobo_compras_uid: res.kobo_compras_uid || "",
      });
      
      const lastLogs = await api.get("kobo_sync_logs") || [];
      setLogs(lastLogs);
    } catch (e) {
      console.error("Failed to fetch Kobo parameters", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    try {
      await api.set("kobo_config", config);
      setSuccessMsg("Configurações do KoboToolbox persistidas com sucesso!");
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao salvar parâmetros do Kobo.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSaving(true);

    try {
      const resp = await api.get("kobo_test");

      if (resp && resp.status === "ok") {
        setSuccessMsg(`Conectado com sucesso à API KoboToolbox! Conta: "${resp.user || 'Desconhecido'}"`);
      } else {
        setErrorMsg("API KOBO respondeu com dados inconsistentes. Verifique o Token.");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Falha ao atingir endpoint do KoboToolbox.");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncSubmissions = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSyncing(true);
    setSyncSummary(null);

    const logList = [...logs];
    logList.unshift(`[${new Date().toLocaleTimeString("pt-BR")}] Iniciando varredura manual de formulários...`);
    setLogs(logList);

    try {
      const resp: any = await api.set("kobo_pull_sync", {});
      
      const t = new Date().toLocaleTimeString("pt-BR");
      if (resp && resp.success) {
        setSuccessMsg("Sincronização processada com sucesso no almoxarifado!");
        setSyncSummary({
          pulled: resp.count_total || 0,
          nf: resp.count_nf || 0,
          slips: resp.count_slips || 0,
          stockAdjusted: resp.adjusted_stock_items || 0,
        });

        logList.unshift(`[${t}] SUCESSO: Sincronização finalizada. Total de registros lidos: ${resp.count_total || 0}.`);
        if (resp.count_nf > 0) logList.unshift(`[${t}] NF processadas: +${resp.count_nf}. Estoque incrementado.`);
        if (resp.count_slips > 0) logList.unshift(`[${t}] Slips de saída processados: -${resp.count_slips}. Estoque debitado.`);
      } else {
        logList.unshift(`[${t}] ALERTA: Nenhum formulário novo pendente para leitura.`);
      }

      await api.set("kobo_sync_logs", logList.slice(0, 50));
      setLogs(logList);
      loadConfig();
    } catch (err: any) {
      const t = new Date().toLocaleTimeString("pt-BR");
      setErrorMsg(err.message || "Erro durante sincronia forçada.");
      logList.unshift(`[${t}] ERRO: Falha geral. Causa: ${err.message || 'Estouro de timeout'}`);
      await api.set("kobo_sync_logs", logList.slice(0, 50));
      setLogs(logList);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Acessando canal KoboToolbox...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-bold rounded-xl animate-fade-in">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-bold rounded-xl animate-fade-in">
          ⚠️ {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Parameters settings */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
            ⚙️ Credenciais e Endpoints KoboToolbox
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Kobo API Token (Authorized Secret Key)
              </label>
              <input
                type="password"
                value={config.kobo_token}
                onChange={(e) => setConfig({ ...config, kobo_token: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: 9afff69b828... (ou puxará do .env se vazio)"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Formulário Almoxarifado / Suprimentos (Kobo UID Suprim)
              </label>
              <input
                type="text"
                value={config.kobo_suprim_uid}
                onChange={(e) => setConfig({ ...config, kobo_suprim_uid: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: aHjL2Y6bX..."
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                Formulário Requisições / Compras (Kobo UID Compras)
              </label>
              <input
                type="text"
                value={config.kobo_compras_uid}
                onChange={(e) => setConfig({ ...config, kobo_compras_uid: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                placeholder="Ex: aXjO9D5bY..."
              />
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar Parâmetros"}
              </button>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={saving}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                🧪 Testar Conexão API
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Active synchronize trigger and metrics logs */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
            🔄 Sincronizador Ativo (Pull API submissions)
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            Os engenheiros e encarregados em campo registram notas fiscais (NFs) e vales de retirada (Slips) de EPI/materiais nos smartphones off-line usando o aplicativo <b>KoboCollect</b>. Clique no botão de varredura abaixo para importar, verificar CPF de trabalhadores e consolidar o estoque central.
          </p>

          <button
            onClick={handleSyncSubmissions}
            disabled={syncing}
            className={`w-full py-4 text-white text-sm font-black rounded-xl cursor-pointer transition-all shadow-md ${
              syncing
                ? "bg-amber-600 animate-pulse"
                : "bg-[#C75B12] hover:bg-[#EA6C0A] shadow-[#C75B12]/15"
            }`}
          >
            {syncing ? "⏳ BUSCANDO NOVAS SUBMISSÕES DO KOBO..." : "⚡ REALIZAR TRATAMENTO DE REGISTROS DE CAMPO"}
          </button>

          {/* Sync output summary */}
          {syncSummary && (
            <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-xs space-y-2 animate-fade-in">
              <span className="font-extrabold text-emerald-800 uppercase text-[10px] block tracking-wider">
                📊 Resultados do Último Processamento
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-600">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Varridos</span>
                  <b>{syncSummary.pulled}</b> formulários
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Entradas NF</span>
                  <b>{syncSummary.nf}</b> NF
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Saídas Slip</span>
                  <b>{syncSummary.slips}</b> Vales
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase font-black">Estoque Mod</span>
                  <b className="text-emerald-600">+{syncSummary.stockAdjusted} items</b>
                </div>
              </div>
            </div>
          )}

          {/* Console logs */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              📜 Histórico de Sincronia (Console Logs)
            </span>

            <div className="bg-slate-900 text-emerald-400 rounded-lg p-3 h-48 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-1">
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap border-b border-slate-800 pb-1 last:border-0">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic text-center pt-16">
                  Nenhuma varredura registrada na sessão atual.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
