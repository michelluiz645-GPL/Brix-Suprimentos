import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatDate, epiStatus, today } from "@/utils/formatters";
import type { EpiRecord } from "@/types";
import { Plus, AlertTriangle, CheckCircle, Search } from "lucide-react";

const TIPOS_EPI = [
  "CAPACETE", "ÓCULOS DE SEGURANÇA", "PROTETOR AURICULAR", "LUVAS", "BOTINA DE SEGURANÇA",
  "COLETE REFLETIVO", "CINTO DE SEGURANÇA", "MÁSCARA PFF2", "MANGA DE RASPA", "PERNEIRA",
  "ÓCULOS SOLAR", "CALÇA", "CAMISA", "BOTA DE BORRACHA", "OUTRO",
];

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyForm = () => ({
  funcionario: "", epi: TIPOS_EPI[0], data_entrega: today(), proxima_troca: "",
  responsavel: "", obs: "", registrado_por: "",
});

export default function SegurancaEPI() {
  const toast = useToast();
  const [registros, setReg] = useState<EpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroSit, setFiltroSit] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<"novo" | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    api.epi.list().then((r) => {
      const d = (r as { data: EpiRecord[] }).data ?? [];
      setReg(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os registros de EPI."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.funcionario.trim()) { toast.error("Nome do funcionário é obrigatório."); return; }
    if (!form.proxima_troca) { toast.error("Data da próxima troca é obrigatória."); return; }
    if (!form.responsavel.trim()) { toast.error("Responsável é obrigatório."); return; }
    setSalvando(true);
    try {
      await api.epi.create({ ...form, registrado_por: form.responsavel });
      toast.success("Entrega de EPI registrada!");
      setModal(null); setForm(emptyForm()); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally { setSalvando(false); }
  };

  const setF = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const statusInfo = {
    ok:      { label: "Válido",          cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle size={11} /> },
    alerta:  { label: "Vence em 30 dias", cls: "bg-amber-100 text-amber-700",    icon: <AlertTriangle size={11} /> },
    vencido: { label: "Vencido",          cls: "bg-rose-100 text-rose-700",      icon: <AlertTriangle size={11} /> },
  };

  const filtered = registros.filter((r) => {
    const sit = epiStatus(r.proxima_troca);
    if (filtroSit && sit !== filtroSit) return false;
    if (filtroTipo && r.epi !== filtroTipo) return false;
    if (busca && !r.funcionario.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const totais = { ok: 0, alerta: 0, vencido: 0 };
  registros.forEach((r) => { totais[epiStatus(r.proxima_troca)]++; });

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Segurança & EPI" subtitle="Controle de validade e entregas de EPIs"
          action={
            <button onClick={() => setModal("novo")} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Registrar Entrega
            </button>
          } />

        <div className="grid grid-cols-3 gap-4">
          {([
            ["Válidos",   totais.ok,      "bg-emerald-50 border-emerald-100 text-emerald-700"],
            ["Alertas",   totais.alerta,  "bg-amber-50 border-amber-100 text-amber-700"],
            ["Vencidos",  totais.vencido, "bg-rose-50 border-rose-100 text-rose-700"],
          ] as [string, number, string][]).map(([label, val, cls]) => (
            <div key={label} className={`border rounded-xl p-4 ${cls}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
              <p className="text-2xl font-black font-mono">{val}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-40 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os EPIs</option>
              {TIPOS_EPI.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filtroSit} onChange={(e) => setFiltroSit(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todas as situações</option>
              <option value="ok">Válidos</option>
              <option value="alerta">Próximos ao vencimento</option>
              <option value="vencido">Vencidos</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando registros...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum registro encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Funcionário", "EPI", "Entrega", "Próxima Troca", "Situação", "Responsável"].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((r) => {
                  const sit = epiStatus(r.proxima_troca);
                  const si = statusInfo[sit];
                  return (
                    <tr key={r.id} className={`transition-colors ${sit === "vencido" ? "bg-rose-50/30" : sit === "alerta" ? "bg-amber-50/30" : "hover:bg-slate-50"}`}>
                      <td className="p-3 font-medium text-slate-800">{r.funcionario}</td>
                      <td className="p-3 text-slate-600">{r.epi}</td>
                      <td className="p-3 text-slate-500">{formatDate(r.data_entrega)}</td>
                      <td className="p-3 font-mono text-slate-600">{formatDate(r.proxima_troca)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${si.cls}`}>
                          {si.icon} {si.label}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{r.responsavel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal === "novo" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Registrar Entrega de EPI</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Funcionário *</label>
                <input value={form.funcionario} onChange={setF("funcionario")} placeholder="Nome completo" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Tipo de EPI</label>
                <select value={form.epi} onChange={setF("epi")} className={inp}>
                  {TIPOS_EPI.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Data de Entrega</label>
                <input type="date" value={form.data_entrega} onChange={setF("data_entrega")} className={inp} />
              </div>
              <div>
                <label className={lbl}>Próxima Troca *</label>
                <input type="date" value={form.proxima_troca} onChange={setF("proxima_troca")} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Responsável *</label>
                <input value={form.responsavel} onChange={setF("responsavel")} placeholder="Nome do responsável" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Observações</label>
                <textarea value={form.obs} onChange={setF("obs")} rows={2} placeholder="Tamanho, lote, etc."
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Registrando..." : "Registrar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
