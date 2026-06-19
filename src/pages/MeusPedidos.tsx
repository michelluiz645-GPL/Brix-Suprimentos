import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate, today } from "@/utils/formatters";
import type { PurchaseOrder, PCItem } from "@/types";
import { Plus, Eye, Trash2 } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  PENDENTE:  "bg-amber-100 text-amber-700",
  APROVADO:  "bg-sky-100 text-sky-700",
  CONCLUÍDO: "bg-emerald-100 text-emerald-700",
  CANCELADO: "bg-slate-100 text-slate-500",
};

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const emptyItem = (): PCItem => ({ nome: "", qtd: "1", unidade: "UNID", preco_unit: 0, desconto: 0 });

export default function MeusPedidos() {
  const toast = useToast();
  const [pedidos, setPedidos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [sel, setSel] = useState<PurchaseOrder | null>(null);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    solicitante: "", forn_nome: "", forn_tel: "", forn_contato: "",
    cond_pagamento: "", local_entrega: "", data_desejada: "", obs: "",
    data_pedido: today(), frete: 0, outras_despesas: 0, desconto_total: 0,
  });
  const [itens, setItens] = useState<PCItem[]>([emptyItem()]);

  const carregar = () => {
    setLoading(true);
    api.pedidosCompra.list("setor_origem=MANUTENCAO").then((r) => {
      const d = (r as { data: PurchaseOrder[] }).data ?? [];
      setPedidos(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => toast.error("Não foi possível carregar os pedidos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const totalItens = (itens: PCItem[]) =>
    itens.reduce((s, it) => s + Number(it.qtd) * it.preco_unit * (1 - it.desconto / 100), 0);

  const totalPedido = (p: PurchaseOrder) =>
    totalItens(p.itens) + p.frete + p.outras_despesas - p.desconto_total;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.solicitante.trim()) { toast.error("Solicitante é obrigatório."); return; }
    if (!form.forn_nome.trim()) { toast.error("Nome do fornecedor é obrigatório."); return; }
    if (itens.some((it) => !it.nome.trim())) { toast.error("Todos os itens precisam ter um nome."); return; }
    setSalvando(true);
    try {
      const totalForm = totalItens(itens) + form.frete + form.outras_despesas - form.desconto_total;
      await api.pedidosCompra.create({
        ...form, setor_origem: "MANUTENCAO", itens,
        num_pc: `MANUT-${Date.now()}`, status: "PENDENTE",
        total: totalForm,
      });
      toast.success("Pedido de compra criado com sucesso!");
      setCriando(false);
      setForm({ solicitante: "", forn_nome: "", forn_tel: "", forn_contato: "", cond_pagamento: "", local_entrega: "", data_desejada: "", obs: "", data_pedido: today(), frete: 0, outras_despesas: 0, desconto_total: 0 });
      setItens([emptyItem()]);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o pedido.");
    } finally { setSalvando(false); }
  };

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((p) => ({ ...p, [k]: v }));
  };

  const updateItem = (i: number, k: keyof PCItem, v: string | number) =>
    setItens((prev) => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const filtered = pedidos.filter((p) => {
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroData && !p.data_pedido.startsWith(filtroData.slice(0, 7))) return false;
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Meus Pedidos" subtitle="Pedidos de compra do setor de manutenção"
          action={
            <button onClick={() => setCriando(true)} className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors">
              <Plus size={14} /> Novo Pedido
            </button>
          } />

        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
              <option value="">Todos os status</option>
              {["PENDENTE", "APROVADO", "CONCLUÍDO", "CANCELADO"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div>
              <input type="month" value={filtroData} onChange={(e) => setFiltroData(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando pedidos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum pedido encontrado.</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Número", "Data", "Solicitante", "Fornecedor", "Total", "Status", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#EA6C0A]">{p.num_pc}</td>
                    <td className="p-3 text-slate-500">{formatDate(p.data_pedido)}</td>
                    <td className="p-3 font-medium">{p.solicitante}</td>
                    <td className="p-3 text-slate-500">{p.forn_nome}</td>
                    <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(totalPedido(p))}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => setSel(p)} className="text-slate-400 hover:text-[#EA6C0A] transition-colors"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal detalhe */}
      {sel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{sel.num_pc}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(sel.data_pedido)} — {sel.forn_nome}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[sel.status] ?? "bg-slate-100 text-slate-500"}`}>{sel.status}</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {([
                  ["Solicitante", sel.solicitante],
                  ["Fornecedor", sel.forn_nome],
                  ["Telefone", sel.forn_tel || "—"],
                  ["Contato", sel.forn_contato || "—"],
                  ["Cond. Pagamento", sel.cond_pagamento || "—"],
                  ["Local de Entrega", sel.local_entrega || "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}><span className="font-bold text-slate-500 block">{k}</span><span className="text-slate-700">{v}</span></div>
                ))}
              </div>
              <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Item", "Qtd", "Unid.", "Preço Unit.", "Total"].map((h) => (
                    <th key={h} className="p-2.5 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {sel.itens.map((it, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium">{it.nome}</td>
                      <td className="p-2.5 font-mono text-center">{it.qtd}</td>
                      <td className="p-2.5 font-mono text-slate-500">{it.unidade}</td>
                      <td className="p-2.5 font-mono">{formatCurrency(it.preco_unit)}</td>
                      <td className="p-2.5 font-mono font-bold">{formatCurrency(Number(it.qtd) * it.preco_unit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={4} className="p-2.5 font-bold text-slate-700 text-right">Total</td>
                    <td className="p-2.5 font-mono font-bold text-[#EA6C0A]">{formatCurrency(totalPedido(sel))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSel(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal novo pedido */}
      {criando && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCriando(false)}>
          <form onSubmit={handleSalvar} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Novo Pedido de Compra — Manutenção</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Solicitante *</label>
                  <input value={form.solicitante} onChange={setF("solicitante")} placeholder="Nome do solicitante" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Data do Pedido</label>
                  <input type="date" value={form.data_pedido} onChange={setF("data_pedido")} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Fornecedor *</label>
                  <input value={form.forn_nome} onChange={setF("forn_nome")} placeholder="Razão social" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Telefone Fornecedor</label>
                  <input value={form.forn_tel} onChange={setF("forn_tel")} placeholder="(00) 00000-0000" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Cond. Pagamento</label>
                  <input value={form.cond_pagamento} onChange={setF("cond_pagamento")} placeholder="Ex: 30/60 dias" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Data de Entrega</label>
                  <input type="date" value={form.data_desejada} onChange={setF("data_desejada")} className={inp} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens</h3>
                  <button type="button" onClick={() => setItens((p) => [...p, emptyItem()])}
                    className="flex items-center gap-1 text-xs font-bold text-[#EA6C0A] hover:underline"><Plus size={13} /> Adicionar</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 border-b border-slate-100">
                      {["Descrição do Item", "Qtd", "Unid.", "Preço Unit.", ""].map((h) => (
                        <th key={h} className="p-2.5 font-semibold text-slate-500 text-left">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {itens.map((it, i) => (
                        <tr key={i}>
                          <td className="p-1.5">
                            <input value={it.nome} onChange={(e) => updateItem(i, "nome", e.target.value)} placeholder="Nome do item"
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                          </td>
                          <td className="p-1.5">
                            <input type="number" min={1} value={it.qtd} onChange={(e) => updateItem(i, "qtd", e.target.value)}
                              className="w-16 px-2 py-1.5 text-center font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                          </td>
                          <td className="p-1.5">
                            <input value={it.unidade} onChange={(e) => updateItem(i, "unidade", e.target.value)}
                              className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                          </td>
                          <td className="p-1.5">
                            <input type="number" min={0} step={0.01} value={it.preco_unit} onChange={(e) => updateItem(i, "preco_unit", Number(e.target.value))}
                              className="w-28 px-2 py-1.5 font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
                          </td>
                          <td className="p-1.5">
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
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-50">
                {([["Frete (R$)", "frete"], ["Outras Despesas (R$)", "outras_despesas"], ["Desconto Total (R$)", "desconto_total"]] as [string, keyof typeof form][]).map(([label, key]) => (
                  <div key={key}>
                    <label className={lbl}>{label}</label>
                    <input type="number" min={0} step={0.01} value={form[key] as number} onChange={setF(key)}
                      className={`${inp} font-mono`} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end text-xs font-bold text-slate-700">
                Total do Pedido: <span className="font-mono text-[#EA6C0A] ml-2 text-sm">{formatCurrency(totalItens(itens) + form.frete + form.outras_despesas - form.desconto_total)}</span>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setCriando(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={salvando}
                className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                {salvando ? "Salvando..." : "Criar Pedido →"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
