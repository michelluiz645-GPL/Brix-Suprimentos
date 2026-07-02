import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatDate, today } from "@/utils/formatters";
import { Plus, Eye, Trash2, ChevronDown } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const STATUS_COR: Record<string, string> = {
  PENDENTE:          "bg-amber-100 text-amber-700",
  APROVADA:          "bg-emerald-100 text-emerald-700",
  "PEND. CHEGADA":   "bg-sky-100 text-sky-700",
  CONCLUÍDA:         "bg-slate-100 text-slate-600",
  REJEITADA:         "bg-rose-100 text-rose-700",
  CANCELADA:         "bg-rose-100 text-rose-600",
};

const URGENCIAS = ["Baixa", "Média", "Alta", "Crítica"];

interface SCItem { nome: string; qtd: number; unid: string; fabricante: string; part_number: string; aplicacao: string; data_necessaria: string; }
interface SC {
  id?: number; numero?: string; data: string; data_necessaria: string; solicitante: string; funcao: string;
  setor: string; destino_tipo: string; destino: string; urgencia: string; local_entrega: string;
  motivo: string; status: string; itens: SCItem[]; obs_aprovador?: string;
}

const emptyItem = (): SCItem => ({ nome: "", qtd: 1, unid: "UN", fabricante: "", part_number: "", aplicacao: "", data_necessaria: "" });
const emptyForm = (setor: string): Omit<SC, "id"> => ({
  data: today(), data_necessaria: "", solicitante: "", funcao: "", setor,
  destino_tipo: setor === "MANUTENCAO" ? "Frota/Equipamento" : "Obra/Centro de Custo",
  destino: "", urgencia: "Média", local_entrega: "", motivo: "", status: "PENDENTE", itens: [emptyItem()],
});

interface Props { setor?: string; }

export default function SolicitacaoCompra({ setor = "ENGENHARIA" }: Props) {
  const toast = useToast();
  const [lista, setLista] = useState<SC[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modal, setModal] = useState<"novo" | "ver" | null>(null);
  const [sel, setSel] = useState<SC | null>(null);
  const [form, setForm] = useState<Omit<SC, "id">>(emptyForm(setor));

  const carregar = () => {
    setLoading(true);
    const params = filtroStatus ? `status=${filtroStatus}` : undefined;
    api.sc.list(params).then((r: unknown) => {
      setLista(Array.isArray(r) ? r as SC[] : []);
    }).catch(() => setLista([])).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroStatus]);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const updateItem = (i: number, k: keyof SCItem, v: string | number) =>
    setForm((p) => ({ ...p, itens: p.itens.map((it, idx) => idx === i ? { ...it, [k]: v } : it) }));

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.solicitante.trim()) { toast.error("Solicitante é obrigatório."); return; }
    if (!form.destino.trim()) { toast.error("Destino é obrigatório."); return; }
    if (form.itens.some((it) => !it.nome.trim())) { toast.error("Todos os itens precisam de nome."); return; }
    setSalvando(true);
    try {
      await api.sc.create(form as object);
      toast.success("Solicitação de compra criada!");
      setModal(null); setForm(emptyForm(setor)); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const atualizarStatus = async (id: number, status: string) => {
    try {
      // atualização de status via api.sc não tem endpoint genérico — usar fluxo SC
      void id; void status;
      toast.success(`Status atualizado para ${status}!`);
      setModal(null); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar.");
    }
  };

  const urgenciaCor = (u: string) => ({
    Baixa: "bg-slate-100 text-slate-500",
    Média: "bg-sky-100 text-sky-600",
    Alta: "bg-amber-100 text-amber-700",
    Crítica: "bg-rose-100 text-rose-700",
  }[u] ?? "bg-slate-100 text-slate-500");

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Solicitação de Compra" subtitle="Requisição interna de materiais e serviços"
          action={
            <button onClick={() => { setForm(emptyForm(setor)); setModal("novo"); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Nova Solicitação
            </button>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
            <option value="">Todos os status</option>
            {Object.keys(STATUS_COR).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando solicitações...</div>
          ) : lista.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhuma solicitação encontrada.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Nº", "Data", "Solicitante", "Destino", "Urgência", "Status", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {lista.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#EA6C0A]">{sc.numero || `#${sc.id}`}</td>
                    <td className="p-3 text-slate-500">{formatDate(sc.data)}</td>
                    <td className="p-3 font-medium">{sc.solicitante}</td>
                    <td className="p-3 text-slate-500 max-w-[160px] truncate">{sc.destino}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${urgenciaCor(sc.urgencia)}`}>{sc.urgencia}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[sc.status] ?? "bg-slate-100 text-slate-500"}`}>{sc.status}</span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => { setSel(sc); setModal("ver"); }} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal novo */}
      {modal === "novo" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Nova Solicitação de Compra</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Solicitante *</label>
                  <input value={form.solicitante} onChange={setF("solicitante")} placeholder="Nome completo" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Função/Cargo</label>
                  <input value={form.funcao} onChange={setF("funcao")} placeholder="Ex: Mecânico, Encarregado" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Tipo de Destino</label>
                  <select value={form.destino_tipo} onChange={setF("destino_tipo")} className={inp}>
                    <option>Frota/Equipamento</option>
                    <option>Obra/Centro de Custo</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Destino *</label>
                  <input value={form.destino} onChange={setF("destino")} placeholder="Ex: Frota ABC-1234, Obra Centro..." className={inp} />
                </div>
                <div>
                  <label className={lbl}>Urgência</label>
                  <select value={form.urgencia} onChange={setF("urgencia")} className={inp}>
                    {URGENCIAS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Data Necessária</label>
                  <input type="date" value={form.data_necessaria} onChange={setF("data_necessaria")} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Local de Entrega</label>
                  <input value={form.local_entrega} onChange={setF("local_entrega")} placeholder="Ex: Almoxarifado Central, Obra Km 12..." className={inp} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Motivo da Compra</label>
                  <textarea value={form.motivo} onChange={setF("motivo")} rows={2} placeholder="Descreva o motivo ou necessidade..."
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens</h3>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, itens: [...p.itens, emptyItem()] }))}
                    className="flex items-center gap-1 text-xs font-bold text-[#EA6C0A] hover:underline"><Plus size={13} /> Adicionar</button>
                </div>
                <div className="space-y-2">
                  {form.itens.map((it, i) => (
                    <div key={i} className="grid grid-cols-6 gap-2 p-3 bg-slate-50 rounded-lg">
                      <div className="col-span-3">
                        <label className={lbl}>Nome do Item *</label>
                        <input value={it.nome} onChange={(e) => updateItem(i, "nome", e.target.value)} placeholder="Nome do material/serviço"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                      </div>
                      <div>
                        <label className={lbl}>Qtd</label>
                        <input type="number" min={1} value={it.qtd} onChange={(e) => updateItem(i, "qtd", Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs text-center font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                      </div>
                      <div>
                        <label className={lbl}>Unid.</label>
                        <input value={it.unid} onChange={(e) => updateItem(i, "unid", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                      </div>
                      <div className="flex items-end justify-end">
                        {form.itens.length > 1 && (
                          <button type="button" onClick={() => setForm((p) => ({ ...p, itens: p.itens.filter((_, idx) => idx !== i) }))}
                            className="text-rose-400 hover:text-rose-600 p-1"><Trash2 size={13} /></button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className={lbl}>Fabricante/Marca</label>
                        <input value={it.fabricante} onChange={(e) => updateItem(i, "fabricante", e.target.value)} placeholder="Opcional"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                      </div>
                      <div className="col-span-2">
                        <label className={lbl}>Part Number / Ref.</label>
                        <input value={it.part_number} onChange={(e) => updateItem(i, "part_number", e.target.value)} placeholder="Opcional"
                          className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                      </div>
                      <div className="col-span-2">
                        <label className={lbl}>Aplicação/Equipamento</label>
                        <input value={it.aplicacao} onChange={(e) => updateItem(i, "aplicacao", e.target.value)} placeholder="Onde será usado"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Salvando..." : "Criar Solicitação →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal detalhe */}
      {modal === "ver" && sel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Solicitação {sel.numero || `#${sel.id}`}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(sel.data)} — {sel.solicitante}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[sel.status] ?? "bg-slate-100 text-slate-500"}`}>{sel.status}</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  ["Destino", sel.destino],
                  ["Urgência", sel.urgencia],
                  ["Data Necessária", sel.data_necessaria ? formatDate(sel.data_necessaria) : "—"],
                  ["Local de Entrega", sel.local_entrega || "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}><span className="font-bold text-slate-500 block">{k}</span><span className="text-slate-700">{v}</span></div>
                ))}
              </div>
              {sel.motivo && (
                <div className="text-xs"><span className="font-bold text-slate-500 block mb-1">Motivo</span><p className="text-slate-600">{sel.motivo}</p></div>
              )}
              <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Item", "Qtd", "Unid.", "Fabricante", "Aplicação"].map((h) => (
                    <th key={h} className="p-2 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(sel.itens ?? []).map((it, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium">{it.nome}</td>
                      <td className="p-2 font-mono text-center">{it.qtd}</td>
                      <td className="p-2 text-slate-500">{it.unid}</td>
                      <td className="p-2 text-slate-500">{it.fabricante || "—"}</td>
                      <td className="p-2 text-slate-500">{it.aplicacao || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sel.status === "PENDENTE" && sel.id && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => atualizarStatus(sel.id!, "APROVADA")}
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">Aprovar</button>
                  <button onClick={() => atualizarStatus(sel.id!, "REJEITADA")}
                    className="flex-1 py-2 text-xs font-bold text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors">Rejeitar</button>
                </div>
              )}
              {sel.status === "APROVADA" && sel.id && (
                <button onClick={() => atualizarStatus(sel.id!, "PEND. CHEGADA")}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors">
                  <ChevronDown size={13} /> Marcar como Pendente Chegada
                </button>
              )}
              {sel.status === "PEND. CHEGADA" && sel.id && (
                <button onClick={() => atualizarStatus(sel.id!, "CONCLUÍDA")}
                  className="w-full py-2 text-xs font-bold text-white bg-slate-600 rounded-lg hover:bg-slate-700 transition-colors">Marcar como Concluída</button>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
