import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate, today } from "@/utils/formatters";
import type { MaintenanceDebit, DeliveryItem } from "@/types";
import { Plus, Eye, CheckCircle, Trash2 } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyItem = (): DeliveryItem => ({ nome: "", qtd: 1, unid: "UNID", preco: 0 });
const emptyForm = () => ({
  numero: "", pedido_origem: "", data: today(), equipe: "", nome_equipe: "",
  colaborador: "", almoxarifado: "", registrado_por: "",
});

export default function DebitosOficina() {
  const toast = useToast();
  const [debitos, setDebitos] = useState<MaintenanceDebit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [filtroDataDe, setFiltroDataDe] = useState("");
  const [filtroDataAte, setFiltroDataAte] = useState("");
  const [sel, setSel] = useState<MaintenanceDebit | null>(null);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [itens, setItens] = useState<DeliveryItem[]>([emptyItem()]);

  const carregar = () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (filtroStatus) query.set("status", filtroStatus);
    if (filtroDataDe) query.set("data_de", filtroDataDe);
    if (filtroDataAte) query.set("data_ate", filtroDataAte);
    const params = query.toString() || undefined;
    api.debitos.list(params).then((r) => {
      const d = (r as { data: MaintenanceDebit[] }).data ?? [];
      setDebitos(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os débitos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [filtroStatus, filtroDataDe, filtroDataAte]);

  const totalDebito = (itens: DeliveryItem[]) =>
    itens.reduce((s, it) => s + it.qtd * it.preco, 0);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipe.trim()) { toast.error("Equipe é obrigatória."); return; }
    if (!form.registrado_por.trim()) { toast.error("Registrado por é obrigatório."); return; }
    if (itens.some((it) => !it.nome.trim())) { toast.error("Todos os itens precisam ter um nome."); return; }
    setSalvando(true);
    try {
      const total = totalDebito(itens);
      await api.debitos.create({ ...form, itens, total, status: "ABERTO" });
      toast.success("Débito registrado com sucesso!");
      setCriando(false); setForm(emptyForm()); setItens([emptyItem()]);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o débito.");
    } finally { setSalvando(false); }
  };

  const marcarPago = async (id: number) => {
    if (!confirm("Confirmar pagamento deste débito?")) return;
    try {
      await api.debitos.pagar(id);
      toast.success("Débito marcado como pago!");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível marcar como pago.");
    }
  };

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const updateItem = (i: number, k: keyof DeliveryItem, v: string | number) =>
    setItens((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const filtered = debitos.filter((d) =>
    !filtroEquipe || (d.equipe || d.nome_equipe || "").toLowerCase().includes(filtroEquipe.toLowerCase())
  );

  // RF-025 — EPI nunca é cobrado da equipe: não entra no que está em
  // aberto/pago, só no Total Geral (visão de gasto, não de dívida).
  // d.total vem do backend com cast decimal:2 do Laravel, que serializa como
  // string ("95.00") — Number() garante soma numérica de verdade, não concatenação.
  const materiais = debitos.filter((d) => d.natureza !== "EPI");
  const debitosEpi = debitos.filter((d) => d.natureza === "EPI");
  const totalAberto = materiais.filter((d) => d.status === "ABERTO").reduce((s, d) => s + Number(d.total), 0);
  const totalPago = materiais.filter((d) => d.status === "PAGO").reduce((s, d) => s + Number(d.total), 0);
  const gastoEpi = debitosEpi.reduce((s, d) => s + Number(d.total), 0);
  const totalGeral = totalAberto + totalPago + gastoEpi;

  // Gasto por categoria (Peças Motor, Óleos, Ferramentas, EPI...) — soma
  // todos os débitos (inclusive EPI) independente do status, pra dar visão
  // geral de onde o dinheiro está indo. Itens de débitos lançados
  // manualmente (sem produto vinculado) caem em "Outros".
  const porCategoria = debitos
    .flatMap((d) => d.itens ?? [])
    .reduce<Record<string, number>>((acc, it) => {
      const cat = it.categoria || "Outros";
      acc[cat] = (acc[cat] ?? 0) + it.qtd * it.preco;
      return acc;
    }, {});
  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Débitos Oficina" subtitle="Controle financeiro de serviços de oficina"
          action={
            <button onClick={() => setCriando(true)} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Novo Débito
            </button>
          } />

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Total em Aberto</p>
            <p className="text-2xl font-black font-mono text-rose-600">{formatCurrency(totalAberto)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Pago</p>
            <p className="text-2xl font-black font-mono text-emerald-600">{formatCurrency(totalPago)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4" title="Débitos (Aberto + Pago) + gasto com EPI">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Geral (com EPI)</p>
            <p className="text-2xl font-black font-mono text-slate-700">{formatCurrency(totalGeral)}</p>
          </div>
        </div>

        {categoriasOrdenadas.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Gasto por categoria</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categoriasOrdenadas.map(([cat, valor]) => {
                const isEpi = cat === "EPI";
                return (
                  <div key={cat} className={`border rounded-xl p-3 shadow-sm ${isEpi ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"}`}
                    title={isEpi ? "EPI é equipamento de segurança obrigatório — não é cobrado de nenhuma equipe específica, mas conta no Total Geral." : undefined}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 truncate ${isEpi ? "text-amber-600" : "text-slate-500"}`} title={cat}>{cat}</p>
                    <p className={`text-base font-black font-mono ${isEpi ? "text-amber-700" : "text-slate-700"}`}>{formatCurrency(valor)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os status</option>
              <option value="ABERTO">Aberto</option>
              <option value="PAGO">Pago</option>
            </select>
            <input value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} placeholder="Filtrar por equipe..."
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] w-52" />
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">De</label>
              <input type="date" value={filtroDataDe} onChange={(e) => setFiltroDataDe(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Até</label>
              <input type="date" value={filtroDataAte} onChange={(e) => setFiltroDataAte(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
            {(filtroDataDe || filtroDataAte) && (
              <button type="button" onClick={() => { setFiltroDataDe(""); setFiltroDataAte(""); }}
                className="text-[10px] font-bold text-[#EA6C0A] hover:underline">Limpar período</button>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando débitos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum débito encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Número", "Data", "Equipe", "Colaborador", "Almox.", "Total", "Status", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((d) => {
                  const isEpi = d.natureza === "EPI";
                  return (
                    <tr key={d.id} className={`transition-colors ${isEpi ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-slate-50"}`}>
                      <td className="p-3 font-mono font-bold text-[#EA6C0A]">{d.numero || `#${d.id}`}</td>
                      <td className="p-3 text-slate-500">{formatDate(d.data)}</td>
                      <td className="p-3 font-medium">{d.nome_equipe || d.equipe}</td>
                      <td className="p-3 text-slate-500">{d.colaborador || "—"}</td>
                      <td className="p-3 text-slate-500">{d.almoxarifado || "—"}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(d.total)}</td>
                      <td className="p-3">
                        {isEpi ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700" title="EPI — item de segurança obrigatório, não cobrado da equipe">
                            EPI (informativo)
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === "ABERTO" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {d.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => setSel(d)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Eye size={14} /></button>
                          {!isEpi && d.status === "ABERTO" && d.id && (
                            <button onClick={() => marcarPago(d.id!)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Marcar como pago">
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal detalhe */}
      {sel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Débito {sel.numero || `#${sel.id}`}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(sel.data)} — {sel.nome_equipe || sel.equipe}</p>
              </div>
              {sel.natureza === "EPI" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">EPI (informativo)</span>
              ) : (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sel.status === "ABERTO" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{sel.status}</span>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  ["Equipe", sel.nome_equipe || sel.equipe],
                  ["Colaborador", sel.colaborador || "—"],
                  ["Suprimentos", sel.almoxarifado || "—"],
                  ["Registrado por", sel.registrado_por],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}><span className="font-bold text-slate-500 block">{k}</span><span className="text-slate-700">{v}</span></div>
                ))}
              </div>
              <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Item", "Qtd", "Unid.", "Preço", "Total"].map((h) => (
                    <th key={h} className="p-2.5 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {(sel.itens ?? []).map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium">{it.nome}</td>
                      <td className="p-2.5 font-mono text-center">{it.qtd}</td>
                      <td className="p-2.5 font-mono text-slate-500">{it.unid}</td>
                      <td className="p-2.5 font-mono">{formatCurrency(it.preco)}</td>
                      <td className="p-2.5 font-mono font-bold">{formatCurrency(it.qtd * it.preco)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="p-2.5 font-bold text-slate-700 text-right">Total</td>
                    <td className="p-2.5 font-mono font-bold text-[#EA6C0A]">{formatCurrency(sel.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-between">
              {sel.natureza !== "EPI" && sel.status === "ABERTO" && sel.id && (
                <button onClick={() => { marcarPago(sel.id!); setSel(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors">
                  <CheckCircle size={13} /> Marcar como Pago
                </button>
              )}
              <button onClick={() => setSel(null)} className="ml-auto px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo débito */}
      {criando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCriando(false)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Novo Débito de Oficina</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Número do Débito</label>
                  <input value={form.numero} onChange={setF("numero")} placeholder="Ex: DEB-001" className={`${inp} font-mono`} />
                </div>
                <div>
                  <label className={lbl}>Pedido de Origem</label>
                  <input value={form.pedido_origem} onChange={setF("pedido_origem")} placeholder="Nº pedido" className={`${inp} font-mono`} />
                </div>
                <div>
                  <label className={lbl}>Equipe *</label>
                  <input value={form.equipe} onChange={setF("equipe")} placeholder="Nº da equipe" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Nome da Equipe</label>
                  <input value={form.nome_equipe} onChange={setF("nome_equipe")} placeholder="Nome da equipe" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Colaborador</label>
                  <input value={form.colaborador} onChange={setF("colaborador")} placeholder="Nome do colaborador" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Almoxarifado</label>
                  <input value={form.almoxarifado} onChange={setF("almoxarifado")} placeholder="Ex: Almox Central" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Data</label>
                  <input type="date" value={form.data} onChange={setF("data")} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Registrado por *</label>
                  <input value={form.registrado_por} onChange={setF("registrado_por")} placeholder="Seu nome" className={inp} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens</h3>
                  <button type="button" onClick={() => setItens((p) => [...p, emptyItem()])}
                    className="flex items-center gap-1 text-xs font-bold text-[#EA6C0A] hover:underline"><Plus size={13} /> Adicionar</button>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    {["Item / Serviço", "Qtd", "Unid.", "Preço", "Frota", ""].map((h) => (
                      <th key={h} className="p-2 font-semibold text-slate-500 text-left">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {itens.map((it, i) => (
                      <tr key={i}>
                        <td className="p-1">
                          <input value={it.nome} onChange={(e) => updateItem(i, "nome", e.target.value)} placeholder="Nome do item"
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] text-xs" />
                        </td>
                        <td className="p-1">
                          <input type="number" min={1} value={it.qtd} onChange={(e) => updateItem(i, "qtd", Number(e.target.value))}
                            className="w-14 px-2 py-1.5 text-center font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] text-xs" />
                        </td>
                        <td className="p-1">
                          <input value={it.unid} onChange={(e) => updateItem(i, "unid", e.target.value)}
                            className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] text-xs" />
                        </td>
                        <td className="p-1">
                          <input type="number" min={0} step={0.01} value={it.preco} onChange={(e) => updateItem(i, "preco", Number(e.target.value))}
                            className="w-24 px-2 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] text-xs" />
                        </td>
                        <td className="p-1">
                          <input value={it.destino_frota ?? ""} onChange={(e) => updateItem(i, "destino_frota", e.target.value)} placeholder="Placa"
                            className="w-20 px-2 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] text-xs uppercase" />
                        </td>
                        <td className="p-1">
                          {itens.length > 1 && (
                            <button type="button" onClick={() => setItens((p) => p.filter((_, idx) => idx !== i))} className="text-rose-400 hover:text-rose-600">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end text-xs font-bold text-slate-700 mt-2">
                  Total: <span className="font-mono text-[#EA6C0A] ml-2">{formatCurrency(totalDebito(itens))}</span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setCriando(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Salvando..." : "Registrar Débito →"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
