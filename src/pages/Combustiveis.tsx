import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate, today } from "@/utils/formatters";
import type { FuelMovement } from "@/types";
import { ArrowDown, ArrowUp } from "lucide-react";

const COMBUSTIVEIS = ["DIESEL S10", "DIESEL COMUM", "GASOLINA", "ETANOL", "ARLA 32"];
type Tab = "historico" | "entrada" | "abastecimento";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyForm = () => ({
  combustivel: COMBUSTIVEIS[0], quantidade: 0, valor: 0,
  fornecedor: "", frota: "", equipe: "", km_ho: "", responsavel: "", data: today(),
});

export default function Combustiveis() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("historico");
  const [movimentos, setMovimentos] = useState<FuelMovement[]>([]);
  const [saldo, setSaldo] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [form, setForm] = useState(emptyForm());

  const carregar = () => {
    setLoading(true);
    Promise.all([
      api.combustiveis.list().then((r) => {
        const d = (r as { data: FuelMovement[] }).data ?? [];
        setMovimentos(Array.isArray(d) ? d : Object.values(d));
      }),
      api.combustiveis.saldo().then((r) => {
        setSaldo((r as { data: Record<string, number> }).data ?? {});
      }),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.responsavel.trim()) { toast.error("Campo obrigatório: Responsável."); return; }
    if (form.quantidade <= 0) { toast.error("Quantidade deve ser maior que zero."); return; }
    if (tab === "abastecimento" && !form.frota.trim()) { toast.error("Informe a placa/identificação da frota."); return; }
    setSalvando(true);
    try {
      await api.combustiveis.create({ ...form, tipo: tab === "entrada" ? "ENTRADA" : "ABASTECIMENTO", usuario: "sistema" });
      toast.success(tab === "entrada" ? "Entrada de combustível registrada!" : "Abastecimento registrado!");
      setForm(emptyForm());
      setTab("historico");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally { setSalvando(false); }
  };

  const filtered = movimentos.filter((m) => !filtroTipo || m.tipo === filtroTipo);

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Combustíveis" subtitle="Controle de estoque e abastecimentos da frota" />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {COMBUSTIVEIS.map((c) => (
            <div key={c} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 leading-tight">{c}</p>
              <p className="text-2xl font-black font-mono text-slate-800">{(saldo[c] ?? 0).toFixed(0)}</p>
              <p className="text-[10px] text-slate-400">litros</p>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([["historico", "Histórico"], ["entrada", "Nova Entrada"], ["abastecimento", "Abastecer"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? "bg-white shadow text-[#EA6C0A]" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === "historico" && (
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50">
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Todos os tipos</option>
                <option value="ENTRADA">Entrada</option>
                <option value="ABASTECIMENTO">Abastecimento</option>
              </select>
            </div>
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">Nenhuma movimentação registrada.</div>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Tipo", "Combustível", "Qtd (L)", "Valor", "Frota / Fornecedor", "Responsável", "Data"].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                          {m.tipo === "ENTRADA" ? <ArrowDown size={10} /> : <ArrowUp size={10} />}{m.tipo}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{m.combustivel}</td>
                      <td className="p-3 font-mono">{m.quantidade}</td>
                      <td className="p-3 font-mono">{formatCurrency(m.valor)}</td>
                      <td className="p-3 text-slate-500">{m.frota || m.fornecedor || "—"}</td>
                      <td className="p-3">{m.responsavel}</td>
                      <td className="p-3 text-slate-500">{formatDate(m.data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {(tab === "entrada" || tab === "abastecimento") && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {tab === "entrada" ? "Nova Entrada de Combustível" : "Registrar Abastecimento"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Combustível</label>
                <select value={form.combustivel} onChange={setF("combustivel")} className={inp}>
                  {COMBUSTIVEIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Quantidade (Litros) *</label>
                <input type="number" min={0} step={0.1} value={form.quantidade} onChange={setF("quantidade")} className={inp} />
              </div>
              <div>
                <label className={lbl}>Valor (R$)</label>
                <input type="number" min={0} step={0.01} value={form.valor} onChange={setF("valor")} className={inp} />
              </div>
              {tab === "entrada" ? (
                <div>
                  <label className={lbl}>Fornecedor</label>
                  <input value={form.fornecedor} onChange={setF("fornecedor")} placeholder="Nome do fornecedor" className={inp} />
                </div>
              ) : (
                <>
                  <div>
                    <label className={lbl}>Placa / Identificação *</label>
                    <input value={form.frota} onChange={setF("frota")} placeholder="Ex: ABC-1234" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Equipe</label>
                    <input value={form.equipe} onChange={setF("equipe")} placeholder="Equipe responsável" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>KM / Horômetro</label>
                    <input value={form.km_ho} onChange={setF("km_ho")} placeholder="Ex: 12.450 km" className={inp} />
                  </div>
                </>
              )}
              <div>
                <label className={lbl}>Responsável *</label>
                <input value={form.responsavel} onChange={setF("responsavel")} placeholder="Nome do responsável" className={inp} />
              </div>
              <div>
                <label className={lbl}>Data</label>
                <input type="date" value={form.data} onChange={setF("data")} className={inp} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={salvando}
                className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
                {salvando ? "Salvando..." : tab === "entrada" ? "Registrar Entrada →" : "Registrar Abastecimento →"}
              </button>
            </div>
          </form>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
