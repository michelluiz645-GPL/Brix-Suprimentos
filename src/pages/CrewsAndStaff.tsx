import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Employee, Crew, Vehicle, Equipment } from "../types";
import { TIPOS_EQUIP } from "./Produtos";

export default function CrewsAndStaff() {
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [crews, setCrews] = useState<Record<string, Crew>>({});
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [equipments, setEquipments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("👥 Equipes");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Crews Form State
  const [crewNum, setCrewNum] = useState("");
  const [crewName, setCrewName] = useState("");
  const [crewResp, setCrewResp] = useState("");
  const [crewVeic, setCrewVeic] = useState("");

  // Staff Form State
  const [empCod, setEmpCod] = useState("");
  const [empNome, setEmpName] = useState("");
  const [empFuncao, setEmpFuncao] = useState("");
  const [empEqNum, setEmpEqNum] = useState("");
  const [empCpf, setEmpCpf] = useState("");
  const [empTel, setEmpTel] = useState("");

  // Edit Staff Form State
  const [editEmpId, setEditEmpId] = useState("");
  const [editEmpNome, setEditEmpName] = useState("");
  const [editEmpFuncao, setEditEmpFuncao] = useState("");
  const [editEmpEqNum, setEditEmpEqNum] = useState("");
  const [editEmpStatus, setEditEmpStatus] = useState("ATIVO");

  // Vehicles Form State
  const [vFrota, setVFrota] = useState("");
  const [vPlaca, setVPlaca] = useState("");
  const [vModelo, setVModelo] = useState("");
  const [vTipo, setVTipo] = useState("CAMINHÃO");
  const [vEquipe, setVEquipe] = useState("");
  const [vAno, setVAno] = useState("");

  // Equipment Form State
  const [eqId, setEqId] = useState("");
  const [eqNome, setEqNome] = useState("");
  const [eqTipo, setEqTipo] = useState("ROÇADEIRA");
  const [eqSerie, setEqSerie] = useState("");
  const [eqEquipe, setEqEquipe] = useState("");
  const [eqObs, setEqObs] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [empsRes, crewsRes, veicsRes, equipRes] = await Promise.all([
        api.get("funcionarios"),
        api.get("equipes"),
        api.get("veiculos"),
        api.get("equipamentos"),
      ]);

      setEmployees(empsRes || {});
      setCrews(crewsRes || {});
      setVehicles(veicsRes || {});
      setEquipments(equipRes || {});
    } catch (e) {
      console.error("Failed to load crews and personnel dependencies", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Submit Handlers
  const handleCreateCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const num = crewNum.trim();
    const name = crewName.trim();

    if (!num || !name) {
      setErrorMsg("O número e o nome descritivo da equipe são obrigatórios.");
      return;
    }

    if (crews[num]) {
      setErrorMsg(`A equipe de número "${num}" já está cadastrada.`);
      return;
    }

    try {
      const updated = { ...crews };
      updated[num] = {
        nome: name,
        responsavel: crewResp.trim(),
        veiculo: crewVeic.trim(),
      };

      await api.set("equipes", updated);
      setSuccessMsg(`Equipe ${num} — "${name}" criada com sucesso!`);
      setCrewNum("");
      setCrewName("");
      setCrewResp("");
      setCrewVeic("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Falha de rede ao salvar equipe.");
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cod = empCod.trim();
    const nome = empNome.trim();

    if (!cod || !nome) {
      setErrorMsg("O código e o nome completo do funcionário são obrigatórios.");
      return;
    }

    if (employees[cod]) {
      setErrorMsg(`O código de colaborador "${cod}" já é utilizado.`);
      return;
    }

    try {
      const updated = { ...employees };
      updated[cod] = {
        nome,
        funcao: empFuncao.trim(),
        equipe_num: empEqNum.trim().toUpperCase(),
        cpf: empCpf.trim(),
        tel: empTel.trim(),
        status: "ATIVO",
        demitido: false,
      };

      await api.set("funcionarios", updated);
      setSuccessMsg(`Colaborador "${nome}" cadastrado com sucesso!`);
      setEmpCod("");
      setEmpName("");
      setEmpFuncao("");
      setEmpEqNum("");
      setEmpCpf("");
      setEmpTel("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao salvar funcionário.");
    }
  };

  const handleEditSelectStaff = (cod: string) => {
    setEditEmpId(cod);
    if (!cod) return;
    const f = employees[cod];
    setEditEmpName(f.nome || "");
    setEditEmpFuncao(f.funcao || "");
    setEditEmpEqNum(f.equipe_num || "");
    setEditEmpStatus(f.status || "ATIVO");
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!editEmpId) return;
    const nome = editEmpNome.trim();
    if (!nome) {
      setErrorMsg("O nome do funcionário é obrigatório.");
      return;
    }

    try {
      const updated = { ...employees };
      updated[editEmpId].nome = nome;
      updated[editEmpId].funcao = editEmpFuncao.trim();
      updated[editEmpId].equipe_num = editEmpEqNum.trim().toUpperCase();
      updated[editEmpId].status = editEmpStatus;

      await api.set("funcionarios", updated);
      setSuccessMsg(`Colaborador "${nome}" atualizado com sucesso!`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de rede ao salvar cadastro.");
    }
  };

  const handleDemissaoEmployee = async () => {
    if (!editEmpId) return;
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updated = { ...employees };
      const nome = updated[editEmpId].nome;
      updated[editEmpId].demitido = true;
      updated[editEmpId].status = "INATIVO";

      await api.set("funcionarios", updated);
      setSuccessMsg(`Colaborador "${nome}" desligado e inativado no sistema!`);
      setEditEmpId("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao desligar o colaborador.");
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const fr = vFrota.trim().toUpperCase();
    const pl = vPlaca.trim().toUpperCase();

    if (!fr || !pl) {
      setErrorMsg("Os campos Frota e Placa são obrigatórios.");
      return;
    }

    if (vehicles[fr]) {
      setErrorMsg(`O número de Frota "${fr}" já está cadastrado.`);
      return;
    }

    try {
      const updated = { ...vehicles };
      updated[fr] = {
        placa: pl,
        modelo: vModelo.trim(),
        tipo: vTipo,
        equipe: vEquipe.trim().toUpperCase(),
        ano: vAno.trim(),
        status: "ATIVO",
      };

      await api.set("veiculos", updated);
      setSuccessMsg(`Veículo/Máquina Placa ${pl} cadastrado na frota!`);
      setVFrota("");
      setVPlaca("");
      setVModelo("");
      setVEquipe("");
      setVAno("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao salvar veículo.");
    }
  };

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const id = eqId.trim().toUpperCase();
    const nome = eqNome.trim();

    if (!id || !nome) {
      setErrorMsg("O ID do equipamento e o Nome/Modelo são obrigatórios.");
      return;
    }

    if (equipments[id]) {
      setErrorMsg(`O equipamento com ID "${id}" já está cadastrado.`);
      return;
    }

    try {
      const updated = { ...equipments };
      updated[id] = {
        nome,
        tipo: eqTipo,
        serie: eqSerie.trim(),
        equipe: eqEquipe.trim().toUpperCase(),
        obs: eqObs.trim(),
        status: "ATIVO",
      };

      await api.set("equipamentos", updated);
      setSuccessMsg(`Equipamento "${nome}" [${id}] cadastrado com sucesso!`);
      setEqId("");
      setEqNome("");
      setEqSerie("");
      setEqEquipe("");
      setEqObs("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao salvar equipamento.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando cadastros operacionais...</span>
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

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex border-b border-slate-150 pb-2 overflow-x-auto gap-2">
          {["👥 Equipes", "👤 Colaboradores", "🚛 Frota / Veículos", "🔧 Ferramentas / Equipamentos"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setErrorMsg("");
                setSuccessMsg("");
                setEditEmpId("");
              }}
              className={`py-2 px-4 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                activeTab === tab
                  ? "bg-[#C75B12] text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab 1: Equipes */}
        {activeTab === "👥 Equipes" && (
          <div className="space-y-6 animate-fade-in">
            {/* Create Crew Form */}
            <form onSubmit={handleCreateCrew} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-4 max-w-3xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                ➕ Registrar Nova Equipe de Campo
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Número ID da Equipe *
                  </label>
                  <input
                    type="text"
                    value={crewNum}
                    onChange={(e) => setCrewNum(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: 09, 12B"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Nome descritivo da Equipe *
                  </label>
                  <input
                    type="text"
                    value={crewName}
                    onChange={(e) => setCrewName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Conserva / Roçada Leste"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Encarregado / Responsável
                  </label>
                  <input
                    type="text"
                    value={crewResp}
                    onChange={(e) => setCrewResp(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Carlos Silva"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Veículo / Máquina Vinculada
                  </label>
                  <input
                    type="text"
                    value={crewVeic}
                    onChange={(e) => setCrewVeic(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Placa ex: HGT-9J21"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Cadastrar Nova Equipe
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                📋 Equipes Cadastradas e Integrantes
              </h4>

              {Object.keys(crews).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(crews as Record<string, any>).sort((a, b) => a[0].localeCompare(b[0])).map(([num, c]: [string, any]) => {
                    const members = Object.entries(employees as Record<string, any>).filter(
                      ([_, f]: [string, any]) => String(f.equipe_num).trim() === num.trim() && !f.demitido
                    );

                    return (
                      <div key={num} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-extrabold text-slate-800 leading-tight">
                              Equipe {num} &mdash; {c.nome}
                            </h5>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Encarregado: {c.responsavel || "─"} &bull; Veículo: {c.veiculo || "─"}
                            </span>
                          </div>
                          <span className="bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                            {members.length} membro(s)
                          </span>
                        </div>

                        <div className="border-t border-slate-50 pt-2 text-xs space-y-1">
                          {members.length > 0 ? (
                            members.map(([id, f]) => (
                              <div key={id} className="text-slate-600 flex justify-between">
                                <span>&bull; {f.nome}</span>
                                <span className="text-[10px] text-slate-400">{f.funcao || "─"}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Nenhum membro vinculado a esta equipe.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                  Nenhuma equipe cadastrada ainda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Colaboradores */}
        {activeTab === "👤 Colaboradores" && (
          <div className="space-y-6 animate-fade-in">
            {/* Forms sub selection */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setEditEmpId("");
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                className={`flex-1 py-3 text-xs font-bold rounded-lg border text-center transition-all ${
                  !editEmpId ? "bg-slate-200 border-slate-200 text-slate-800" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                }`}
              >
                ➕ Cadastrar Novo Colaborador
              </button>
              <button
                onClick={() => handleEditSelectStaff("")}
                className={`flex-1 py-3 text-xs font-bold rounded-lg border text-center transition-all ${
                  editEmpId ? "bg-slate-200 border-slate-200 text-slate-800" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                }`}
              >
                ✏️ Editar / Desligar Membro
              </button>
            </div>

            {/* Create Staff */}
            {!editEmpId && (
              <form onSubmit={handleCreateEmployee} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-4 max-w-3xl animate-fade-in">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  ➕ Cadastrar Novo Funcionário
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Código ID do Colaborador *
                    </label>
                    <input
                      type="text"
                      value={empCod}
                      onChange={(e) => setEmpCod(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="Ex: FUNC-056"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={empNome}
                      onChange={(e) => setEmpName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Função / Cargo
                    </label>
                    <input
                      type="text"
                      value={empFuncao}
                      onChange={(e) => setEmpFuncao(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="Ex: Operador Roçadeira, Motorista"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Vincular à Equipe (Nº)
                    </label>
                    <select
                      value={empEqNum}
                      onChange={(e) => setEmpEqNum(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="">─ Avulso (Sem equipe)</option>
                      {Object.keys(crews).map((num) => (
                        <option key={num} value={num}>
                          Equipe {num} &mdash; {crews[num].nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      CPF (opcional)
                    </label>
                    <input
                      type="text"
                      value={empCpf}
                      onChange={(e) => setEmpCpf(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={empTel}
                      onChange={(e) => setEmpTel(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cadastrar Colaborador
                </button>
              </form>
            )}

            {/* Edit / Dismiss Staff */}
            {editEmpId !== undefined && editEmpId !== "" && (
              <form onSubmit={handleEditEmployee} className="p-4 border border-rose-100 bg-rose-500/5 rounded-xl space-y-4 max-w-3xl animate-fade-in">
                <h4 className="text-xs font-bold text-red-500 uppercase tracking-widest block mb-2">
                  ✏️ Modificar / Desligar Colaborador
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={editEmpNome}
                      onChange={(e) => setEditEmpName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Função
                    </label>
                    <input
                      type="text"
                      value={editEmpFuncao}
                      onChange={(e) => setEditEmpFuncao(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Nº da Equipe
                    </label>
                    <select
                      value={editEmpEqNum}
                      onChange={(e) => setEditEmpEqNum(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="">─ Sem equipe</option>
                      {Object.keys(crews).map((num) => (
                        <option key={num} value={num}>
                          Equipe {num} &mdash; {crews[num].nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Status da Conta
                    </label>
                    <select
                      value={editEmpStatus}
                      onChange={(e) => setEditEmpStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Salvar Alterações
                  </button>

                  <button
                    type="button"
                    onClick={handleDemissaoEmployee}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md"
                  >
                    ❌ Desligar e Inativar Membro
                  </button>
                </div>
              </form>
            )}

            {/* Select for edit list */}
            {editEmpId === "" && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Escolha o colaborador para alteração
                </label>
                <select
                  onChange={(e) => handleEditSelectStaff(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="">─ Selecionar funcionário...</option>
                  {Object.entries(employees as Record<string, any>).map(([id, emp]) => (
                    <option key={id} value={id}>
                      {id} &mdash; {emp.nome} {emp.demitido ? "(Inativo/Demitido)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Grid display */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                📋 Registro Geral de Funcionários
              </h4>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">ID</th>
                      <th className="p-3 font-semibold text-slate-500">Nome Colaborador</th>
                      <th className="p-3 font-semibold text-slate-500">Função / Cargo</th>
                      <th className="p-3 font-semibold text-slate-500">Equipe Atual</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(employees as Record<string, any>).map(([id, emp]) => (
                      <tr key={id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-500">{id}</td>
                        <td className="p-3 font-bold text-slate-800">{emp.nome}</td>
                        <td className="p-3 text-slate-600">{emp.funcao || "─"}</td>
                        <td className="p-3 text-slate-500 font-bold">
                          {emp.equipe_num ? `👥 Equipe ${emp.equipe_num} ${crews[emp.equipe_num] ? '— ' + crews[emp.equipe_num].nome : ''}` : "─"}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              emp.demitido
                                ? "bg-red-100 text-red-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {emp.demitido ? "❌ DESLIGADO" : "🟢 ATIVO"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Frota / Veículos */}
        {activeTab === "BC" || activeTab === "🚛 Frota / Veículos" && (
          <div className="space-y-6 animate-fade-in">
            {/* Create form */}
            <form onSubmit={handleCreateVehicle} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-4 max-w-3xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                ➕ Cadastrar Novo Veículo na Frota
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    ID da Frota (Patrimônio) *
                  </label>
                  <input
                    type="text"
                    value={vFrota}
                    onChange={(e) => setVFrota(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: F-01, TRATOR-03"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    value={vPlaca}
                    onChange={(e) => setVPlaca(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: ABC-1234, MERCOSUL"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Fabricante / Modelo
                  </label>
                  <input
                    type="text"
                    value={vModelo}
                    onChange={(e) => setVModelo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Hilux 4x4, Ford Cargo"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Tipo de Frota
                  </label>
                  <select
                    value={vTipo}
                    onChange={(e) => setVTipo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                  >
                    {["CAMINHÃO", "PICKUP", "VAN", "MOTO", "EQUIPAMENTO", "OUTRO"].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Equipe Vinculada (Nº)
                  </label>
                  <select
                    value={vEquipe}
                    onChange={(e) => setVEquipe(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="">─ Avulso (Sem equipe)</option>
                    {Object.keys(crews).map((num) => (
                      <option key={num} value={num}>
                        Equipe {num} &mdash; {crews[num].nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Ano Fab
                  </label>
                  <input
                    type="text"
                    value={vAno}
                    onChange={(e) => setVAno(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: 2018"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Cadastrar Frota
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                📋 Relação de Veículos e Frotas Ativas
              </h4>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">Frota / Patr.</th>
                      <th className="p-3 font-semibold text-slate-500">Placa Licenciada</th>
                      <th className="p-3 font-semibold text-slate-500">Fabricante / Modelo</th>
                      <th className="p-3 font-semibold text-slate-500">Tipo de Frota</th>
                      <th className="p-3 font-semibold text-slate-500">Equipe Vinculada</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(vehicles as Record<string, any>).map(([frota, v]) => (
                      <tr key={frota} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-500">{frota}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{v.placa}</td>
                        <td className="p-3 text-slate-700">{v.modelo || "─"}</td>
                        <td className="p-3 text-slate-500">{v.tipo}</td>
                        <td className="p-3 text-slate-500 font-bold">
                          {v.equipe ? `👥 Equipe ${v.equipe}` : "─"}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            🟢 ATIVO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Ferramentas / Equipamentos */}
        {activeTab === "🔧 Ferramentas / Equipamentos" && (
          <div className="space-y-6 animate-fade-in">
            {/* Create machinery */}
            <form onSubmit={handleCreateEquipment} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-4 max-w-3xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                ➕ Registrar Nova Máquina ou Equipamento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    ID / Número de Patrimônio *
                  </label>
                  <input
                    type="text"
                    value={eqId}
                    onChange={(e) => setEqId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: ROC-12, EXP45"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Equipamento / Modelo *
                  </label>
                  <input
                    type="text"
                    value={eqNome}
                    onChange={(e) => setEqNome(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Stihl FS 220"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Categoria da Máquina
                  </label>
                  <select
                    value={eqTipo}
                    onChange={(e) => setEqTipo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                  >
                    {TIPOS_EQUIP.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Número de Série
                  </label>
                  <input
                    type="text"
                    value={eqSerie}
                    onChange={(e) => setEqSerie(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Número de fabricação"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Equipe Responsável (Nº)
                  </label>
                  <select
                    value={eqEquipe}
                    onChange={(e) => setEqEquipe(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="">─ Almoxarifado central</option>
                    {Object.keys(crews).map((num) => (
                      <option key={num} value={num}>
                        Equipe {num} &mdash; {crews[num].nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                    Observações de Segurança / Manutenção
                  </label>
                  <input
                    type="text"
                    value={eqObs}
                    onChange={(e) => setEqObs(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                    placeholder="Ex: Misturar óleo 2 tempos na gasolina (1:50)"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Cadastrar Equipamento
              </button>
            </form>

            {/* List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                📋 Inventário de Equipamentos
              </h4>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">ID / Patrimônio</th>
                      <th className="p-3 font-semibold text-slate-500">Equipamento / Modelo</th>
                      <th className="p-3 font-semibold text-slate-500">Tipo</th>
                      <th className="p-3 font-semibold text-slate-500">Série</th>
                      <th className="p-3 font-semibold text-slate-500">Equipe Alocada</th>
                      <th className="p-3 font-semibold text-slate-500">Notas Adicionais</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(equipments as Record<string, any>).map(([id, eq]: [string, any]) => (
                      <tr key={id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-500">{id}</td>
                        <td className="p-3 font-bold text-slate-800">{eq.nome}</td>
                        <td className="p-3 text-slate-500">{eq.tipo}</td>
                        <td className="p-3 font-mono">{eq.serie || "─"}</td>
                        <td className="p-3 text-slate-500 font-bold">
                          {eq.equipe ? `👥 Equipe ${eq.equipe}` : "─ Central"}
                        </td>
                        <td className="p-3 text-slate-400 italic max-w-xs truncate">{eq.obs || "─"}</td>
                        <td className="p-3 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            🟢 ATIVO
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
