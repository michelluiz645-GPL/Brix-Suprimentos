import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, today } from "@/utils/formatters";
import type { Product } from "@/types";
import { Plus, Trash2 } from "lucide-react";

interface EntradaItem { codigo: string; nome: string; unid: string; qtd: number; preco: number; }

export default function Entrada() {
  const toast = useToast();
  const [products, setProducts]   = useState<Product[]>([]);
  const [numeroNf, setNumeroNf]   = useState("");
  const [data, setData]           = useState(today());
  const [fornecedor, setFornecedor] = useState("");
  const [almoxarifado, setAlmoxarifado] = useState("");
  const [responsavel, setResponsavel]   = useState("");
  const [itens, setItens]         = useState<EntradaItem[]>([{ codigo: "", nome: "", unid: "", qtd: 1, preco: 0 }]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.produtos.list().then((r) => {
      const d = (r as { data: Product[] }).data ?? [];
      setProducts(Array.isArray(d) ? d : Object.values(d));
    });
  }, []);

  const total = itens.reduce((s, i) => s + i.qtd * i.preco, 0);

  const selectProduct = (idx: number, codigo: string) => {
    const prod = products.find((p) => p.codigo_produto === codigo || p.id === Number(codigo));
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: prod?.codigo_produto ?? codigo, nome: prod?.nome ?? "", unid: prod?.unid ?? "", preco: prod?.preco ?? 0 } : it));
  };

  const updateItem = (idx: number, field: keyof EntradaItem, value: string | number) => {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem    = () => setItens((p) => [...p, { codigo: "", nome: "", unid: "", qtd: 1, preco: 0 }]);
  const removeItem = (idx: number) => setItens((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroNf.trim())       { toast.error("Campo obrigatório: Número da NF."); return; }
    if (!fornecedor.trim())     { toast.error("Campo obrigatório: Fornecedor."); return; }
    if (!almoxarifado.trim())   { toast.error("Campo obrigatório: Almoxarifado."); return; }
    if (!responsavel.trim())    { toast.error("Campo obrigatório: Responsável."); return; }
    if (!data)                  { toast.error("Campo obrigatório: Data de recebimento."); return; }
    if (itens.some((i) => !i.codigo)) { toast.error("Todos os itens precisam ter um produto selecionado."); return; }
    if (itens.some((i) => i.qtd <= 0)) { toast.error("Todos os itens precisam ter quantidade maior que zero."); return; }
    setLoading(true);
    try {
      const res = await api.movimentos.create({ tipo: "ENTRADA", numero_nf: numeroNf, data, fornecedor, almoxarifado, responsavel, itens }) as { data: { numero_pedido: string } };
      toast.success(`Entrada registrada! Pedido nº ${res.data?.numero_pedido ?? ""}`);
      setNumeroNf(""); setFornecedor(""); setAlmoxarifado(""); setResponsavel("");
      setItens([{ codigo: "", nome: "", unid: "", qtd: 1, preco: 0 }]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a entrada. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <PageHeader title="Registrar Entrada" subtitle="Recebimento de materiais via nota fiscal" />

        {/* Header fields */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Dados da Nota Fiscal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Número da NF *", value: numeroNf, set: setNumeroNf, placeholder: "Ex: 000123" },
              { label: "Fornecedor *",    value: fornecedor, set: setFornecedor, placeholder: "Nome do fornecedor" },
              { label: "Almoxarifado *",  value: almoxarifado, set: setAlmoxarifado, placeholder: "Ex: Almox Central" },
              { label: "Responsável *",   value: responsavel, set: setResponsavel, placeholder: "Responsável pelo recebimento" },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Data de Recebimento</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens da Entrada</h3>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-[#EA6C0A] hover:underline">
              <Plus size={14} /> Adicionar item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Código", "Nome do Produto", "Unid.", "Quantidade", "Preço Unit.", "Subtotal", ""].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select value={item.codigo} onChange={(e) => selectProduct(idx, e.target.value)}
                        className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:border-[#EA6C0A]">
                        <option value="">— Código —</option>
                        {products.map((p) => <option key={p.codigo_produto} value={p.codigo_produto}>{p.codigo_produto}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input value={item.nome} onChange={(e) => updateItem(idx, "nome", e.target.value)} placeholder="Descrição"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]" />
                    </td>
                    <td className="p-2">
                      <input value={item.unid} onChange={(e) => updateItem(idx, "unid", e.target.value)} placeholder="UN"
                        className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:border-[#EA6C0A]" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={1} value={item.qtd} onChange={(e) => updateItem(idx, "qtd", Number(e.target.value))}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-center font-mono focus:outline-none focus:border-[#EA6C0A]" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step="0.01" value={item.preco} onChange={(e) => updateItem(idx, "preco", Number(e.target.value))}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-right font-mono focus:outline-none focus:border-[#EA6C0A]" />
                    </td>
                    <td className="p-2 font-mono font-bold text-slate-700">{formatCurrency(item.qtd * item.preco)}</td>
                    <td className="p-2">
                      {itens.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <div className="text-sm font-bold text-slate-800">
              Total: <span className="font-mono text-[#EA6C0A] text-base">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading}
            className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
            {loading ? "Registrando..." : "Confirmar Entrada →"}
          </button>
        </div>
      </form>

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
