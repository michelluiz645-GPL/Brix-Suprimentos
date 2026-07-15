import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatDate, today } from "@/utils/formatters";
import type { Equipment, Vehicle } from "@/types";
import { Plus, Edit2, History } from "lucide-react";

type Aba = "equipamentos" | "frotas";

const TIPOS = ["RETROESCAVADEIRA", "MOTONIVELADORA", "PÁ CARREGADEIRA", "TRATOR", "ROLO COMPACTADOR", "ESCAVADEIRA", "CAMINHÃO BASCULANTE", "CAMINHÃO PIPA", "OUTRO"];
const TIPOS_MOV = ["MANUTENÇÃO", "DESLOCAMENTO", "RETORNO", "PARADO", "EM OPERAÇÃO"];

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

interface Movimentacao { data: string; tipo: string; responsavel: string; obs: string; }
interface EquipExt extends Equipment { movimentacoes?: Movimentacao[]; }

const emptyForm = (): Omit<EquipExt, "id"> => ({ nome: "", tipo: TIPOS[0], serie: "", equipe: "", obs: "", status: "ATIVO", movimentacoes: [] });
const emptyMov = (): Movimentacao => ({ data: today(), tipo: TIPOS_MOV[0], responsavel: "", obs: "" });
const emptyVeiculo = (): Omit<Vehicle, "id" | "status"> => ({ placa: "", modelo: "", tipo: "", ano: "", equipe: "" });

export default function EquipamentosPesados() {
  const toast = useToast();
  const [aba, setAba] = useState<Aba>("equipamentos");
  const [equipamentos, setEq] = useState<EquipExt[]>([]);
  const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal] = useState<"novo" | "editar" | "historico" | null>(null);
  const [modalVeiculo, setModalVeiculo] = useState(false);
  const [sel, setSel] = useState<EquipExt | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formVeiculo, setFormVeiculo] = useState(emptyVeiculo());
  const [novaMov, setNovaMov] = useState(emptyMov());
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.equipamentos.list(),
      api.veiculos.list(),
    ]).then(([eqRes, veicRes]) => {
      const d = (eqRes as { data: EquipExt[] }).data ?? [];
      const list = (Array.isArray(d) ? d : Object.values(d)) as EquipExt[];
      setEq(list.map((e) => {
        let movs: Movimentacao[] = [];
        try { if (e.obs && e.obs.startsWith("{")) { const p = JSON.parse(e.obs); movs = p.movimentacoes ?? []; } } catch { /* nop */ }
        return { ...e, movimentacoes: movs };
      }));

      const v = (veicRes as { data: Vehicle[] }).data ?? [];
      setVeiculos(Array.isArray(v) ? v : Object.values(v));
    }).catch(() => toast.error("Não foi possível carregar os equipamentos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const abrirNovo = () => { setForm(emptyForm()); setSel(null); setModal("novo"); };
  const abrirEditar = (e: EquipExt) => { setForm({ nome: e.nome, tipo: e.tipo, serie: e.serie ?? "", equipe: e.equipe ?? "", obs: e.obs ?? "", status: e.status as "ATIVO", movimentacoes: e.movimentacoes ?? [] }); setSel(e); setModal("editar"); };
  const abrirHistorico = (e: EquipExt) => { setSel(e); setNovaMov(emptyMov()); setModal("historico"); };

  const persistirObs = (movs: Movimentacao[], obs_orig: string): string => {
    let base = obs_orig;
    try { if (obs_orig.startsWith("{")) { base = JSON.parse(obs_orig).descricao ?? ""; } } catch { /* nop */ }
    return JSON.stringify({ descricao: base, movimentacoes: movs });
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome do equipamento é obrigatório."); return; }
    setSalvando(true);
    try {
      const obsJson = persistirObs(form.movimentacoes ?? [], form.obs ?? "");
      const payload = { ...form, obs: obsJson };
      if (modal === "novo") {
        await api.equipamentos.create(payload);
        toast.success("Equipamento cadastrado!");
      } else if (sel?.id) {
        await api.equipamentos.update(sel.id, payload);
        toast.success("Equipamento atualizado!");
      }
      setModal(null); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const adicionarMovimento = async () => {
    if (!novaMov.responsavel.trim()) { toast.error("Responsável é obrigatório."); return; }
    if (!sel?.id) return;
    setSalvando(true);
    try {
      const movs = [...(sel.movimentacoes ?? []), novaMov];
      const obsJson = persistirObs(movs, sel.obs ?? "");
      await api.equipamentos.update(sel.id, { ...sel, obs: obsJson });
      toast.success("Movimentação registrada!");
      setNovaMov(emptyMov());
      carregar();
      setSel((prev) => prev ? { ...prev, movimentacoes: movs } : null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally { setSalvando(false); }
  };

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const setFVeiculo = (k: keyof typeof formVeiculo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormVeiculo((p) => ({ ...p, [k]: e.target.value }));

  const handleSalvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVeiculo.placa.trim()) { toast.error("Placa é obrigatória."); return; }
    if (!formVeiculo.modelo.trim()) { toast.error("Modelo é obrigatório."); return; }
    setSalvando(true);
    try {
      await api.veiculos.create(formVeiculo);
      toast.success("Veículo cadastrado! A edição fica a cargo do Almoxarifado.");
      setModalVeiculo(false); setFormVeiculo(emptyVeiculo());
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar o veículo.");
    } finally { setSalvando(false); }
  };

  const filtered = equipamentos.filter((e) => {
    if (filtroStatus && e.status !== filtroStatus) return false;
    if (filtroTipo && e.tipo !== filtroTipo) return false;
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Equipamentos Pesados" subtitle="Cadastro e histórico de movimentações"
          action={
            aba === "equipamentos" ? (
              <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
                <Plus size={14} /> Novo Equipamento
              </button>
            ) : (
              <button onClick={() => setModalVeiculo(true)} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
                <Plus size={14} /> Novo Veículo
              </button>
            )
          } />

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            ["equipamentos", "Equipamentos"],
            ["frotas", "Frotas (Almoxarifado)"],
          ] as [Aba, string][]).map(([a, label]) => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${aba === a ? "bg-white shadow text-[#EA6C0A]" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {aba === "frotas" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
            Você pode cadastrar um novo veículo aqui, mas a edição dos já existentes é feita pelo Almoxarifado.
          </div>
        )}

        {aba === "equipamentos" && (
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os tipos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os status</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        </div>
        )}

        {aba === "equipamentos" && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum equipamento encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Equipamento", "Tipo", "Série", "Equipe", "Status", "Movimentos", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-800">{e.nome}</td>
                    <td className="p-3 text-slate-500">{e.tipo}</td>
                    <td className="p-3 font-mono text-slate-500">{e.serie || "—"}</td>
                    <td className="p-3 text-slate-500">{e.equipe || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.status === "ATIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-center text-slate-500">{(e.movimentacoes ?? []).length}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirHistorico(e)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors" title="Ver histórico"><History size={14} /></button>
                        <button onClick={() => abrirEditar(e)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Edit2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}

        {aba === "frotas" && (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
          ) : veiculos.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum veículo cadastrado no Almoxarifado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Placa", "Modelo", "Tipo", "Ano", "Equipe", "Status"].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {veiculos.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#EA6C0A]">{v.placa}</td>
                    <td className="p-3 font-medium text-slate-800">{v.modelo}</td>
                    <td className="p-3 text-slate-500">{v.tipo}</td>
                    <td className="p-3 font-mono text-slate-500">{v.ano || "—"}</td>
                    <td className="p-3 text-slate-500">{v.equipe || "—"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === "ATIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}
      </div>

      {/* Modal cadastro/edição */}
      {(modal === "novo" || modal === "editar") && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{modal === "novo" ? "Novo Equipamento" : "Editar Equipamento"}</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Nome *</label>
                <input value={form.nome} onChange={setF("nome")} placeholder="Ex: Retroescavadeira JD 310" className={inp} />
              </div>
              <div>
                <label className={lbl}>Tipo</label>
                <select value={form.tipo} onChange={setF("tipo")} className={inp}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Número de Série</label>
                <input value={form.serie} onChange={setF("serie")} placeholder="Nº de série" className={`${inp} font-mono`} />
              </div>
              <div>
                <label className={lbl}>Equipe Responsável</label>
                <input value={form.equipe} onChange={setF("equipe")} placeholder="Nº da equipe" className={inp} />
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select value={form.status} onChange={setF("status")} className={inp}>
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal histórico */}
      {modal === "historico" && sel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{sel.nome}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{sel.tipo} — Série: {sel.serie || "—"}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nova Movimentação</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Tipo de Evento</label>
                    <select value={novaMov.tipo} onChange={(e) => setNovaMov((p) => ({ ...p, tipo: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                      {TIPOS_MOV.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Data</label>
                    <input type="date" value={novaMov.data} onChange={(e) => setNovaMov((p) => ({ ...p, data: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                  </div>
                  <div>
                    <label className={lbl}>Responsável *</label>
                    <input value={novaMov.responsavel} onChange={(e) => setNovaMov((p) => ({ ...p, responsavel: e.target.value }))} placeholder="Nome"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                  </div>
                  <div>
                    <label className={lbl}>Observação</label>
                    <input value={novaMov.obs} onChange={(e) => setNovaMov((p) => ({ ...p, obs: e.target.value }))} placeholder="Detalhe do evento"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={adicionarMovimento} disabled={salvando}
                    className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                    {salvando ? "Salvando..." : "Registrar"}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Histórico ({(sel.movimentacoes ?? []).length} evento(s))</h3>
                {(sel.movimentacoes ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma movimentação registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {[...(sel.movimentacoes ?? [])].reverse().map((m, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                        <div className="w-1 rounded-full bg-[#EA6C0A] shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-700">{m.tipo}</span>
                            <span className="text-slate-400">{formatDate(m.data)}</span>
                          </div>
                          <p className="text-slate-500">{m.responsavel}{m.obs ? ` — ${m.obs}` : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo veículo */}
      {modalVeiculo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalVeiculo(false)}>
          <form onSubmit={handleSalvarVeiculo} className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Novo Veículo</h2>
              <p className="text-xs text-slate-400 mt-1">Entra direto na frota do Almoxarifado.</p>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Placa *</label>
                <input value={formVeiculo.placa} onChange={setFVeiculo("placa")} placeholder="Ex: ABC-1234" className={`${inp} font-mono uppercase`} />
              </div>
              <div>
                <label className={lbl}>Modelo *</label>
                <input value={formVeiculo.modelo} onChange={setFVeiculo("modelo")} placeholder="Ex: Iveco Daily" className={inp} />
              </div>
              <div>
                <label className={lbl}>Tipo</label>
                <input value={formVeiculo.tipo} onChange={setFVeiculo("tipo")} placeholder="Ex: Caminhão, Retroescavadeira" className={inp} />
              </div>
              <div>
                <label className={lbl}>Ano</label>
                <input value={formVeiculo.ano} onChange={setFVeiculo("ano")} placeholder="Ex: 2020" className={`${inp} font-mono`} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Equipe</label>
                <input value={formVeiculo.equipe} onChange={setFVeiculo("equipe")} placeholder="Nº da equipe" className={inp} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setModalVeiculo(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
