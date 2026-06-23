import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate, today } from "@/utils/formatters";
import type { FuelMovement } from "@/types";
import { ArrowDown, ArrowUp } from "lucide-react";

const COMBUSTIVEIS = ["DIESEL S500", "DIESEL S10", "GASOLINA"];
type Tab = "historico" | "entrada" | "saida";
type DestinoTipo = "frota" | "outros";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyEntrada = () => ({
  combustivel: COMBUSTIVEIS[0], quantidade: 0, valor_litro: 0,
  fornecedor: "", responsavel: "", data: today(),
});

const emptySaida = () => ({
  combustivel: COMBUSTIVEIS[0], quantidade: 0,
  destino_tipo: "frota" as DestinoTipo,
  frota: "", outros: "", responsavel: "", data: today(),
});

export default function Combustiveis() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("historico");
  const [movimentos, setMovimentos] = useState<FuelMovement[]>([]);
  const [saldo, setSaldo] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroComb, setFiltroComb] = useState("");
  const [entrada, setEntrada] = useState(emptyEntrada());
  const [saida, setSaida] = useState(emptySaida());

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

  const setE = (k: keyof ReturnType<typeof emptyEntrada>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      setEntrada((p) => ({ ...p, [k]: v }));
    };

  const setS = (k: keyof ReturnType<typeof emptySaida>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      setSaida((p) => ({ ...p, [k]: v }));
    };

  const handleEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entrada.fornecedor.trim()) { toast.error("Fornecedor é obrigatório."); return; }
    if (entrada.quantidade <= 0) { toast.error("Quantidade deve ser maior que zero."); return; }
    if (entrada.valor_litro <= 0) { toast.error("Valor por litro deve ser maior que zero."); return; }
    if (!entrada.responsavel.trim()) { toast.error("Responsável é obrigatório."); return; }
    setSalvando(true);
    try {
      await api.combustiveis.create({
        ...entrada,
        valor: entrada.quantidade * entrada.valor_litro,
        tipo: "ENTRADA",
        usuario: "sistema",
      });
      toast.success("Entrada de combustível registrada!");
      setEntrada(emptyEntrada());
      setTab("historico");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally { setSalvando(false); }
  };

  const handleSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saida.destino_tipo === "frota" && !saida.frota.trim()) { toast.error("Informe a placa/identificação da frota."); return; }
    if (saida.destino_tipo === "outros" && !saida.outros.trim()) { toast.error("Informe o destino em Outros."); return; }
    if (saida.quantidade <= 0) { toast.error("Quantidade deve ser maior que zero."); return; }
    if (!saida.responsavel.trim()) { toast.error("Responsável é obrigatório."); return; }
    setSalvando(true);
    try {
      const destino = saida.destino_tipo === "frota" ? saida.frota : `OUTROS: ${saida.outros}`;
      await api.combustiveis.create({
        combustivel: saida.combustivel,
        quantidade: saida.quantidade,
        frota: destino,
        responsavel: saida.responsavel,
        data: saida.data,
        tipo: "ABASTECIMENTO",
        usuario: "sistema",
      });
      toast.success("Saída de combustível registrada!");
      setSaida(emptySaida());
      setTab("historico");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally { setSalvando(false); }
  };

  const filtered = movimentos.filter((m) => {
    if (filtroTipo && m.tipo !== filtroTipo) return false;
    if (filtroComb && m.combustivel !== filtroComb) return false;
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Combustíveis" subtitle="Controle de estoque e abastecimentos da frota" />

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-4">
          {COMBUSTIVEIS.map((c) => (
            <div key={c} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 leading-tight">{c}</p>
              <p className="text-3xl font-black font-mono text-slate-800">{(saldo[c] ?? 0).toFixed(0)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">litros em estoque</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {([
            ["historico", "Histórico"],
            ["entrada",   "Nova Entrada"],
            ["saida",     "Registrar Saída"],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? "bg-white shadow text-[#EA6C0A]" : "text-slate-500 hover:text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Histórico */}
        {tab === "historico" && (
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex gap-3">
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Entrada + Saída</option>
                <option value="ENTRADA">Apenas Entradas</option>
                <option value="ABASTECIMENTO">Apenas Saídas</option>
              </select>
              <select value={filtroComb} onChange={(e) => setFiltroComb(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                <option value="">Todos os combustíveis</option>
                {COMBUSTIVEIS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">Nenhuma movimentação registrada.</div>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Tipo", "Combustível", "Qtd (L)", "Valor Total", "Fornecedor / Destino", "Responsável", "Data"].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                          {m.tipo === "ENTRADA" ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                          {m.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{m.combustivel}</td>
                      <td className="p-3 font-mono">{Number(m.quantidade).toFixed(1)}</td>
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

        {/* Formulário Entrada */}
        {tab === "entrada" && (
          <form onSubmit={handleEntrada} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ArrowDown size={14} className="text-emerald-500" /> Nova Entrada de Combustível
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Tipo de Combustível *</label>
                <select value={entrada.combustivel} onChange={setE("combustivel")} className={inp}>
                  {COMBUSTIVEIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Fornecedor *</label>
                <input value={entrada.fornecedor} onChange={setE("fornecedor")} placeholder="Nome do fornecedor" className={inp} />
              </div>
              <div>
                <label className={lbl}>Quantidade (Litros) *</label>
                <input type="number" min={0} step={0.1} value={entrada.quantidade || ""} onChange={setE("quantidade")} placeholder="0,0" className={`${inp} font-mono`} />
              </div>
              <div>
                <label className={lbl}>Valor por Litro (R$) *</label>
                <input type="number" min={0} step={0.001} value={entrada.valor_litro || ""} onChange={setE("valor_litro")} placeholder="0,000" className={`${inp} font-mono`} />
              </div>
              <div>
                <label className={lbl}>Responsável *</label>
                <input value={entrada.responsavel} onChange={setE("responsavel")} placeholder="Nome do responsável" className={inp} />
              </div>
              <div>
                <label className={lbl}>Data</label>
                <input type="date" value={entrada.data} onChange={setE("data")} className={inp} />
              </div>
            </div>

            {/* Total calculado */}
            {entrada.quantidade > 0 && entrada.valor_litro > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">Valor total da entrada</span>
                <span className="text-xl font-black font-mono text-emerald-700">{formatCurrency(entrada.quantidade * entrada.valor_litro)}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={salvando}
                className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
                {salvando ? "Salvando..." : "Registrar Entrada →"}
              </button>
            </div>
          </form>
        )}

        {/* Formulário Saída */}
        {tab === "saida" && (
          <form onSubmit={handleSaida} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <ArrowUp size={14} className="text-sky-500" /> Registrar Saída de Combustível
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Tipo de Combustível *</label>
                <select value={saida.combustivel} onChange={setS("combustivel")} className={inp}>
                  {COMBUSTIVEIS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Quantidade (Litros) *</label>
                <input type="number" min={0} step={0.1} value={saida.quantidade || ""} onChange={setS("quantidade")} placeholder="0,0" className={`${inp} font-mono`} />
              </div>

              {/* Destino: Frota ou Outros */}
              <div className="md:col-span-2">
                <label className={lbl}>Destino *</label>
                <div className="flex gap-3 mb-3">
                  <button type="button"
                    onClick={() => setSaida((p) => ({ ...p, destino_tipo: "frota", outros: "" }))}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${saida.destino_tipo === "frota" ? "bg-[#EA6C0A] text-white border-[#EA6C0A]" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#EA6C0A]"}`}>
                    Frota (veículo)
                  </button>
                  <button type="button"
                    onClick={() => setSaida((p) => ({ ...p, destino_tipo: "outros", frota: "" }))}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${saida.destino_tipo === "outros" ? "bg-[#EA6C0A] text-white border-[#EA6C0A]" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-[#EA6C0A]"}`}>
                    Outros
                  </button>
                </div>
                {saida.destino_tipo === "frota" ? (
                  <input value={saida.frota} onChange={setS("frota")} placeholder="Placa ou identificação do veículo (ex: ABC-1234)"
                    className={`${inp} font-mono uppercase`} />
                ) : (
                  <input value={saida.outros} onChange={setS("outros")} placeholder="Descreva o destino (ex: gerador, equipamento, obra...)"
                    className={inp} />
                )}
              </div>

              <div>
                <label className={lbl}>Responsável *</label>
                <input value={saida.responsavel} onChange={setS("responsavel")} placeholder="Nome do responsável" className={inp} />
              </div>
              <div>
                <label className={lbl}>Data</label>
                <input type="date" value={saida.data} onChange={setS("data")} className={inp} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={salvando}
                className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-sky-500 to-sky-400 hover:-translate-y-0.5 shadow-sky-500/20"}`}>
                {salvando ? "Salvando..." : "Registrar Saída →"}
              </button>
            </div>
          </form>
        )}
      </div>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
