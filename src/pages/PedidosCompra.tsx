import React, { useState, useEffect } from "react";
import api from "@/services/api";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, formatDate, today } from "@/utils/formatters";
import type { PurchaseOrder, PCItem } from "@/types";
import { Plus, Trash2, Eye, CheckCircle, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDENTE:  { label: "Pendente",  color: "bg-amber-100 text-amber-800" },
  APROVADO:  { label: "Aprovado",  color: "bg-blue-100 text-blue-800" },
  CONCLUÍDO: { label: "Concluído", color: "bg-emerald-100 text-emerald-800" },
  CANCELADO: { label: "Cancelado", color: "bg-rose-100 text-rose-800" },
};

const EMPTY_ITEM: PCItem = { nome: "", qtd: "1", unidade: "", preco_unit: 0, desconto: 0 };

export default function PedidosCompra() {
  const toast = useToast();
  const [orders, setOrders]         = useState<PurchaseOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [filterStatus, setFilter]   = useState("TODOS");
  const [showForm, setShowForm]     = useState(false);
  const [viewing, setViewing]       = useState<PurchaseOrder | null>(null);

  const [form, setForm] = useState<Partial<PurchaseOrder>>({
    data_pedido: today(), frete: 0, outras_despesas: 0, desconto_total: 0, itens: [{ ...EMPTY_ITEM }],
  });

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.pedidosCompra.list() as { data: PurchaseOrder[] };
      setOrders(Array.isArray(r.data) ? r.data : Object.values(r.data ?? {}));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter((o) => filterStatus === "TODOS" || o.status === filterStatus);

  const totalPC = (o: PurchaseOrder) => {
    const sub = (o.itens ?? []).reduce((s, i) => s + Number(i.qtd) * (i.preco_unit - i.desconto), 0);
    return sub + (o.frete ?? 0) + (o.outras_despesas ?? 0) - (o.desconto_total ?? 0);
  };

  const setField = (field: keyof PurchaseOrder, value: unknown) => setForm((p) => ({ ...p, [field]: value }));
  const setItem  = (idx: number, field: keyof PCItem, value: string | number) =>
    setForm((p) => ({ ...p, itens: (p.itens ?? []).map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const handleSave = async () => {
    if (!form.solicitante?.trim())   { toast.error("Campo obrigatório: Solicitante."); return; }
    if (!form.setor_origem?.trim())  { toast.error("Campo obrigatório: Setor Origem."); return; }
    if (!form.forn_nome?.trim())     { toast.error("Campo obrigatório: Fornecedor."); return; }
    if (!form.obra?.trim())          { toast.error("Campo obrigatório: Obra / Centro de Custo."); return; }
    if (!form.local_entrega?.trim()) { toast.error("Campo obrigatório: Local de Entrega."); return; }
    if (!form.data_desejada)         { toast.error("Campo obrigatório: Data Desejada."); return; }
    if (!form.cond_pagamento?.trim()) { toast.error("Campo obrigatório: Condição de Pagamento."); return; }
    if (!(form.itens ?? []).length)  { toast.error("Adicione pelo menos um item."); return; }
    if ((form.itens ?? []).some((i) => !i.nome?.trim())) { toast.error("Todos os itens precisam ter nome/descrição."); return; }
    if ((form.itens ?? []).some((i) => Number(i.qtd) <= 0)) { toast.error("Todos os itens precisam ter quantidade maior que zero."); return; }
    if ((form.itens ?? []).some((i) => !i.unidade?.trim())) { toast.error("Todos os itens precisam ter unidade de medida."); return; }
    setSaving(true);
    try {
      await api.pedidosCompra.create(form);
      toast.success("Pedido de compra criado com sucesso!");
      setShowForm(false);
      setForm({ data_pedido: today(), frete: 0, outras_despesas: 0, desconto_total: 0, itens: [{ ...EMPTY_ITEM }] });
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o pedido. Tente novamente.");
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.pedidosCompra.updateStatus(id, status);
      toast.success(`Pedido marcado como ${status}.`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Pedidos de Compra"
          subtitle="Criação, cotação e aprovação de pedidos"
          action={
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 transition-all">
              <Plus size={16} /> Novo Pedido
            </button>
          }
        />

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["TODOS", "PENDENTE", "APROVADO", "CONCLUÍDO", "CANCELADO"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${filterStatus === s ? "bg-[#1E293B] text-white border-[#1E293B]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              {s === "TODOS" ? "Todos" : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Carregando pedidos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["Nº PC", "Data", "Solicitante", "Fornecedor", "Obra/CC", "Total", "Status", ""].map((h) => (
                      <th key={h} className="p-3 font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((o) => {
                    const sc = STATUS_CONFIG[o.status] ?? { label: o.status, color: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-700">{o.num_pc}</td>
                        <td className="p-3 text-slate-500">{formatDate(o.data_pedido)}</td>
                        <td className="p-3 text-slate-700">{o.solicitante}</td>
                        <td className="p-3 font-semibold text-slate-800">{o.forn_nome}</td>
                        <td className="p-3 text-slate-500">{o.obra ?? o.centro_custo ?? "—"}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{formatCurrency(totalPC(o))}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="p-3 flex items-center gap-2">
                          <button onClick={() => setViewing(o)} title="Ver detalhes" className="text-slate-400 hover:text-[#EA6C0A]"><Eye size={14} /></button>
                          {o.status === "PENDENTE" && (
                            <button onClick={() => updateStatus(o.id!, "APROVADO")} title="Aprovar" className="text-blue-400 hover:text-blue-600"><CheckCircle size={14} /></button>
                          )}
                          {o.status !== "CANCELADO" && o.status !== "CONCLUÍDO" && (
                            <button onClick={() => updateStatus(o.id!, "CANCELADO")} title="Cancelar" className="text-rose-400 hover:text-rose-600"><XCircle size={14} /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-sm">Nenhum pedido encontrado.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New PC modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Novo Pedido de Compra" size="xl">
        <div className="space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Solicitante *", field: "solicitante" as keyof PurchaseOrder, placeholder: "Nome do solicitante" },
              { label: "Setor Origem *", field: "setor_origem" as keyof PurchaseOrder, placeholder: "Ex: Engenharia" },
              { label: "Fornecedor *", field: "forn_nome" as keyof PurchaseOrder, placeholder: "Razão social" },
              { label: "CNPJ Fornecedor", field: "forn_cnpj" as keyof PurchaseOrder, placeholder: "00.000.000/0001-00" },
              { label: "Obra / Centro de Custo *", field: "obra" as keyof PurchaseOrder, placeholder: "Nome da obra" },
              { label: "Local de Entrega *", field: "local_entrega" as keyof PurchaseOrder, placeholder: "Endereço ou referência" },
              { label: "Data Desejada *", field: "data_desejada" as keyof PurchaseOrder, placeholder: "", type: "date" },
              { label: "Cond. Pagamento *", field: "cond_pagamento" as keyof PurchaseOrder, placeholder: "Ex: 30 dias" },
            ].map((f) => (
              <div key={String(f.field)}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                <input type={f.type ?? "text"} value={String(form[f.field] ?? "")} onChange={(e) => setField(f.field, e.target.value)} placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]" />
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Itens</span>
              <button type="button" onClick={() => setForm((p) => ({ ...p, itens: [...(p.itens ?? []), { ...EMPTY_ITEM }] }))}
                className="flex items-center gap-1 text-xs font-bold text-[#EA6C0A] hover:underline">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {(form.itens ?? []).map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <input value={item.nome} onChange={(e) => setItem(idx, "nome", e.target.value)} placeholder="Item"
                  className="flex-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#EA6C0A]" />
                <input value={item.qtd} onChange={(e) => setItem(idx, "qtd", e.target.value)} placeholder="Qtd" type="number" min={1}
                  className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#EA6C0A]" />
                <input value={item.unidade} onChange={(e) => setItem(idx, "unidade", e.target.value)} placeholder="UN"
                  className="w-14 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#EA6C0A]" />
                <input value={item.preco_unit} onChange={(e) => setItem(idx, "preco_unit", Number(e.target.value))} placeholder="Preço" type="number" min={0} step="0.01"
                  className="w-24 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-mono focus:outline-none focus:border-[#EA6C0A]" />
                {(form.itens?.length ?? 0) > 1 && (
                  <button onClick={() => setForm((p) => ({ ...p, itens: (p.itens ?? []).filter((_, i) => i !== idx) }))} className="text-rose-400 hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {[
              { label: "Frete", field: "frete" as keyof PurchaseOrder },
              { label: "Outras Despesas", field: "outras_despesas" as keyof PurchaseOrder },
              { label: "Desconto Total", field: "desconto_total" as keyof PurchaseOrder },
            ].map((f) => (
              <div key={String(f.field)}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                <input type="number" min={0} step="0.01" value={Number(form[f.field] ?? 0)} onChange={(e) => setField(f.field, Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#EA6C0A]" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className={`px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${saving ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5"}`}>
              {saving ? "Salvando..." : "Criar Pedido"}
            </button>
          </div>
        </div>
      </Modal>

      {/* View modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={`Pedido ${viewing?.num_pc ?? ""}`} size="xl">
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Solicitante", viewing.solicitante], ["Fornecedor", viewing.forn_nome],
                ["Obra", viewing.obra ?? "—"], ["Centro de Custo", viewing.centro_custo ?? "—"],
                ["Data", formatDate(viewing.data_pedido)], ["Status", viewing.status],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</div>
                  <div className="font-semibold text-slate-800">{v}</div>
                </div>
              ))}
            </div>
            <table className="w-full text-xs border-collapse mt-4">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Item", "Qtd", "Unid.", "Preço Unit.", "Total"].map((h) => <th key={h} className="p-2 font-semibold text-slate-500 text-left">{h}</th>)}
              </tr></thead>
              <tbody>{(viewing.itens ?? []).map((it, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="p-2 text-slate-700">{it.nome}</td>
                  <td className="p-2 text-center font-mono">{it.qtd}</td>
                  <td className="p-2 text-slate-500">{it.unidade}</td>
                  <td className="p-2 font-mono">{formatCurrency(it.preco_unit)}</td>
                  <td className="p-2 font-mono font-bold">{formatCurrency(Number(it.qtd) * it.preco_unit)}</td>
                </tr>
              ))}</tbody>
            </table>
            <div className="flex justify-end text-sm font-bold">
              Total: <span className="font-mono text-[#EA6C0A] ml-2">{formatCurrency(totalPC(viewing))}</span>
            </div>
          </div>
        )}
      </Modal>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
