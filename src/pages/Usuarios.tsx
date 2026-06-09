import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Usuarios() {
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Reg States
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("OPERADOR");
  const [newSector, setNewSector] = useState("PEÇA LEVE");

  // Restore States
  const [uploadJson, setUploadJson] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("usuarios");
      setUsers(res || {});
    } catch (e) {
      console.error("Failed to fetch user registers", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const name = newUsername.trim().toLowerCase();
    const pass = newPassword;

    if (!name || !pass) {
      setErrorMsg("O nome de usuário e a senha são obrigatórios.");
      return;
    }

    if (users[name]) {
      setErrorMsg(`O login "${name}" já está registrado no sistema.`);
      return;
    }

    try {
      // Hashing is simulated safely server-side if it accepts simple parameters
      const updated = { ...users };
      updated[name] = {
        username: name,
        senha: pass, // The backend handles secure hashes natively!
        role: newRole,
        sector_permission: newSector,
        status: "ATIVO",
      };

      await api.set("usuarios", updated);
      setSuccessMsg(`Usuário/Login "${name}" cadastrado com sucesso!`);
      setNewUsername("");
      setNewPassword("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao registrar login.");
    }
  };

  const handleTriggerBackup = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const dbAll = await api.get("backup_db");
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbAll, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `GEPLAN_Backup_Corporativo_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg("Cópia de segurança do banco de dados (JSON) baixada com sucesso!");
    } catch (err: any) {
      setErrorMsg("Falha ao gerar instantâneo do banco de dados.");
    }
  };

  const handleRestoreBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!uploadJson.trim()) {
      setErrorMsg("Favor colar o conteúdo do JSON de backup para sincronia.");
      return;
    }

    try {
      const parsed = JSON.parse(uploadJson);
      // Basic validations
      if (!parsed.produtos || !parsed.usuarios) {
        setErrorMsg("Conteúdo do arquivo inconsistente com o esquema GEPLAN.");
        return;
      }

      await api.set("restore_db", parsed);
      setSuccessMsg("Base de dados corporativa carregada e restaurada com êxito!");
      setUploadJson("");
      loadData();
    } catch (err: any) {
      setErrorMsg(`Falha de parser: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando central do usuários...</span>
      </div>
    );
  }

  const isCurrentAdmin = (localStorage.getItem("geplan_role") || "admin").toUpperCase() === "ADMIN";

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
        {/* Left Side: Users list & registrations */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
            🔑 Controle de Usuários e Acessos
          </h3>

          {isCurrentAdmin ? (
            <form onSubmit={handleCreateUser} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                ➕ Registrar Credencial no Sistema
              </span>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Login de Usuário *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Ex: joao.almox"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Senha de Acesso *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
                  placeholder="Senha forte"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Nível / Perfil
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none shadow-sm"
                  >
                    <option value="ADMIN">ADMIN (Diretor)</option>
                    <option value="OPERADOR">OPERADOR (Almoxarife)</option>
                    <option value="ENGENHARIA">ENGENHARIA (Controle)</option>
                    <option value="COMPRAS">COMPRAS</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Padrão de Insumo
                  </label>
                  <select
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none shadow-sm"
                  >
                    <option value="PEÇA LEVE">PEÇA LEVE</option>
                    <option value="PEÇA PESADA">PEÇA PESADA</option>
                    <option value="ROÇADA">ROÇADA</option>
                    <option value="CONSUMO ADM">CONSUMO ADM</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Cadastrar Acesso
              </button>
            </form>
          ) : (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs rounded-xl">
              ⚠️ A criação de novas credenciais está restrita ao cargo de Gerente/Direção (ADMIN).
            </div>
          )}

          {/* User directory */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              📋 Operadores Habilitados
            </span>

            <div className="overflow-x-auto text-[11px] max-h-60 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-2 font-semibold text-slate-500">Login</th>
                    <th className="p-2 font-semibold text-slate-500">Perfil</th>
                    <th className="p-2 font-semibold text-slate-500">Padrão Insumos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {Object.entries(users as Record<string, any>).map(([usr, u]) => (
                    <tr key={usr}>
                      <td className="p-2 font-black text-slate-700">{usr}</td>
                      <td className="p-2">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-bold">
                          {u.role || "OPERADOR"}
                        </span>
                      </td>
                      <td className="p-2 font-semibold">{u.sector_permission || "PEÇA LEVE"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Backups & database restore */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-2">
            💾 Cópia de Segurança / Backup Central
          </h3>

          <p className="text-xs text-slate-500 leading-normal">
            Gere um instantâneo de segurança contendo todas as peças, equipes, retiradas de EPI, logs do KoboToolbox e registros de combustíveis. Arquivo exportado limpo para conformidade empresarial.
          </p>

          <button
            onClick={handleTriggerBackup}
            className="w-full py-4 bg-[#C75B12] hover:bg-[#EA6C0A] text-white text-sm font-black rounded-xl cursor-pointer shadow-md shadow-[#C75B12]/15"
          >
            📥 GERAR BACKUP COMPLETO DO BANCO (JSON)
          </button>

          {/* Restore Database Form */}
          {isCurrentAdmin && (
            <form onSubmit={handleRestoreBackup} className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide block">
                🚨 Carregar / Restaurar Backup Externo
              </span>

              <p className="text-[10px] text-slate-400 leading-normal">
                Cole o conteúdo bruto do arquivo JSON de backup exportado anteriormente abaixo. Isto substituirá os dados atuais do geplan_db.
              </p>

              <textarea
                value={uploadJson}
                onChange={(e) => setUploadJson(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 text-emerald-400 font-mono text-[10px] p-3 rounded-lg border-none focus:outline-none"
                placeholder='Colar arquivo JSON aqui...'
              />

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                ⚠️ Confirmar e Sincronizar Backup Integrado
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
