import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatDate } from "@/utils/formatters";
import type { Project } from "@/types";
import { Plus, Edit2, Eye } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const STATUS_CORES: Record<string, string> = {
  ATIVA: "bg-emerald-100 text-emerald-700",
  CONCLUÍDA: "bg-sky-100 text-sky-700",
  SUSPENSA: "bg-amber-100 text-amber-700",
};

const emptyForm = (): Omit<Project, "id"> => ({
  setor: "ENGENHARIA", nome: "", endereco: "", tipo: "PUBLICA", descricao: "",
  responsavel: "", data_inicio: "", data_prev: "", centro_custo: "", status: "ATIVA",
});

export default function ObrasProjetos() {
  const toast = useToast();
  const [obras, setObras] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [modal, setModal] = useState<"novo" | "editar" | "ver" | null>(null);
  const [sel, setSel] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroStatus) params.set("status", filtroStatus);
    if (filtroTipo) params.set("tipo", filtroTipo);
    api.obras.list(params.toString() || undefined).then((r) => {
      const d = (r as { data: Project[] }).data ?? [];
      setObras(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar as obras."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroStatus, filtroTipo]);

  const abrirNovo = () => { setForm(emptyForm()); setSel(null); setModal("novo"); };
  const abrirEditar = (o: Project) => {
    setForm({
      setor: o.setor, nome: o.nome, endereco: o.endereco ?? "", tipo: o.tipo ?? "PUBLICA", descricao: o.descricao ?? "",
      responsavel: o.responsavel ?? "", data_inicio: o.data_inicio ?? "",
      data_prev: o.data_prev ?? "", centro_custo: o.centro_custo ?? "", status: o.status,
    });
    setSel(o); setModal("editar");
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome da obra é obrigatório."); return; }
    if (!form.endereco?.trim()) { toast.error("Endereço da obra é obrigatório."); return; }
    if (!form.centro_custo?.trim()) { toast.error("Centro de custo é obrigatório."); return; }
    setSalvando(true);
    try {
      if (modal === "novo") {
        await api.obras.create(form);
        toast.success("Obra cadastrada com sucesso!");
      } else if (sel?.id) {
        await api.obras.update(sel.id, form);
        toast.success("Obra atualizada com sucesso!");
      }
      setModal(null); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const filtered = obras;

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Obras & Projetos" subtitle="Gestão de obras públicas e privadas"
          action={
            <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Nova Obra
            </button>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os status</option>
              <option value="ATIVA">Ativa</option>
              <option value="CONCLUÍDA">Concluída</option>
              <option value="SUSPENSA">Suspensa</option>
            </select>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os tipos</option>
              <option value="PUBLICA">Pública</option>
              <option value="PRIVADA">Privada</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">Carregando obras...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">Nenhuma obra encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((o) => (
              <div key={o.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CORES[o.status] ?? "bg-slate-100 text-slate-500"}`}>{o.status}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{o.tipo === "PUBLICA" ? "Pública" : "Privada"}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 truncate">{o.nome}</h3>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-2">
                    <button onClick={() => { setSel(o); setModal("ver"); }} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Eye size={14} /></button>
                    <button onClick={() => abrirEditar(o)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Edit2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-500">
                  {o.endereco && <p><span className="font-bold">Endereço:</span> {o.endereco}</p>}
                  {o.responsavel && <p><span className="font-bold">Responsável:</span> {o.responsavel}</p>}
                  {o.centro_custo && <p><span className="font-bold">Centro de Custo:</span> <span className="font-mono">{o.centro_custo}</span></p>}
                  <div className="flex gap-4 mt-2">
                    {o.data_inicio && <p><span className="font-bold">Início:</span> {formatDate(o.data_inicio)}</p>}
                    {o.data_prev && <p><span className="font-bold">Prev. Conclusão:</span> {formatDate(o.data_prev)}</p>}
                  </div>
                  {o.descricao && <p className="text-slate-400 mt-1 line-clamp-2">{o.descricao}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(modal === "novo" || modal === "editar") && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {modal === "novo" ? "Nova Obra / Projeto" : "Editar Obra / Projeto"}
              </h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={lbl}>Nome da Obra *</label>
                <input value={form.nome} onChange={setF("nome")} placeholder="Ex: Pavimentação Av. Central" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Endereço *</label>
                <input value={form.endereco} onChange={setF("endereco")} placeholder="Ex: Av. Central, Km 12 — Bairro Centro" className={inp} />
              </div>
              <div>
                <label className={lbl}>Tipo</label>
                <select value={form.tipo} onChange={setF("tipo")} className={inp}>
                  <option value="PUBLICA">Pública</option>
                  <option value="PRIVADA">Privada</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select value={form.status} onChange={setF("status")} className={inp}>
                  <option value="ATIVA">Ativa</option>
                  <option value="CONCLUÍDA">Concluída</option>
                  <option value="SUSPENSA">Suspensa</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Responsável</label>
                <input value={form.responsavel} onChange={setF("responsavel")} placeholder="Nome do engenheiro responsável" className={inp} />
              </div>
              <div>
                <label className={lbl}>Centro de Custo *</label>
                <input value={form.centro_custo} onChange={setF("centro_custo")} placeholder="Ex: CC-2025-001" className={`${inp} font-mono`} />
              </div>
              <div>
                <label className={lbl}>Data de Início</label>
                <input type="date" value={form.data_inicio} onChange={setF("data_inicio")} className={inp} />
              </div>
              <div>
                <label className={lbl}>Prev. Conclusão</label>
                <input type="date" value={form.data_prev} onChange={setF("data_prev")} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Descrição</label>
                <textarea value={form.descricao} onChange={setF("descricao")} rows={3}
                  placeholder="Descrição da obra ou projeto..."
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] resize-none" />
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

      {modal === "ver" && sel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CORES[sel.status] ?? "bg-slate-100 text-slate-500"}`}>{sel.status}</span>
                <h2 className="text-sm font-bold text-slate-800 mt-1">{sel.nome}</h2>
              </div>
              <button onClick={() => abrirEditar(sel)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#EA6C0A] border border-[#EA6C0A] rounded-lg hover:bg-orange-50 transition-colors">
                <Edit2 size={12} /> Editar
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              {([
                ["Endereço", sel.endereco || "—"],
                ["Tipo", sel.tipo === "PUBLICA" ? "Pública" : "Privada"],
                ["Responsável", sel.responsavel || "—"],
                ["Centro de Custo", sel.centro_custo || "—"],
                ["Data de Início", sel.data_inicio ? formatDate(sel.data_inicio) : "—"],
                ["Prev. Conclusão", sel.data_prev ? formatDate(sel.data_prev) : "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="font-bold text-slate-500 w-36 shrink-0">{k}</span>
                  <span className="text-slate-700 font-mono">{v}</span>
                </div>
              ))}
              {sel.descricao && (
                <div className="pt-2 border-t border-slate-50">
                  <span className="font-bold text-slate-500 block mb-1">Descrição</span>
                  <p className="text-slate-600 leading-relaxed">{sel.descricao}</p>
                </div>
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
