import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, today } from "@/utils/formatters";
import type { Product } from "@/types";
import { Plus, Trash2 } from "lucide-react";

interface EntradaItem { codigo: string; variacao_id: number | null; nome: string; unid: string; qtd: number; preco: number; }
interface PedidoPendente {
  id: number; numero_sc: string; destino: string; status: string;
  fornecedor_escolhido?: string | null;
  itens: { descricao: string; quantidade: number; unidade: string }[];
}

export default function Entrada() {
  const toast = useToast();
  const [products, setProducts]   = useState<Product[]>([]);
  const [numeroNf, setNumeroNf]   = useState("");
  const [data, setData]           = useState(today());
  const [fornecedor, setFornecedor] = useState("");
  const [almoxarifado, setAlmoxarifado] = useState("");
  const [responsavel, setResponsavel]   = useState("");
  const [itens, setItens]         = useState<EntradaItem[]>([{ codigo: "", variacao_id: null, nome: "", unid: "", qtd: 1, preco: 0 }]);
  const [loading, setLoading]     = useState(false);
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoPendente[]>([]);
  const [pedidoVinculado, setPedidoVinculado]   = useState("");

  useEffect(() => {
    api.produtos.list().then((r) => {
      const d = (r as { data: Product[] }).data ?? [];
      setProducts(Array.isArray(d) ? d : Object.values(d));
    });
    api.pedidosOrcamento.list().then((r) => {
      const lista = Array.isArray(r) ? r as PedidoPendente[] : [];
      setPedidosPendentes(lista.filter((p) => p.status === "EM_TRANSITO"));
    }).catch(() => { /* módulo opcional — se falhar, só some o dropdown */ });
  }, []);

  // Ao vincular um pedido de orçamento pendente, pré-preenche fornecedor e
  // itens (o código do produto fica em branco — o almoxarife escolhe o
  // correspondente do catálogo, ou cadastra um novo em Fichas de Produtos).
  const selecionarPedidoPendente = (valor: string) => {
    setPedidoVinculado(valor);
    if (!valor) return;
    const pedido = pedidosPendentes.find((p) => p.id === Number(valor));
    if (!pedido) return;
    setFornecedor(pedido.fornecedor_escolhido ?? "");
    setItens(pedido.itens.map((i) => ({ codigo: "", variacao_id: null, nome: i.descricao, unid: i.unidade, qtd: i.quantidade, preco: 0 })));
  };

  const total = itens.reduce((s, i) => s + i.qtd * i.preco, 0);

  const nomeComMarca = (prod: Product, variacaoId: number) => {
    const v = prod.variacoes.find((x) => x.id === variacaoId);
    if (!v) return prod.nome;
    const sufixo = [v.marca, v.codigo_fabricante && `(${v.codigo_fabricante})`].filter(Boolean).join(" ");
    return sufixo ? `${prod.nome} — ${sufixo}` : prod.nome;
  };

  // Um código pode ter várias marcas/variações equivalentes cadastradas — se
  // tiver só uma, escolhe ela direto; se tiver mais, obriga a selecionar qual
  // está chegando antes de liberar o preço/nome do item.
  const selectProduct = (idx: number, codigo: string) => {
    const prod = products.find((p) => p.codigo_produto === codigo || String(p.id) === codigo);
    if (!prod) {
      setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: "", variacao_id: null, nome: "", unid: "", preco: 0 } : it));
      return;
    }
    const variacoes = prod.variacoes ?? [];
    if (variacoes.length === 1) {
      const v = variacoes[0];
      setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: prod.codigo_produto, variacao_id: v.id ?? null, nome: nomeComMarca(prod, v.id ?? -1), unid: prod.unid, preco: v.preco } : it));
    } else {
      setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: prod.codigo_produto, variacao_id: null, nome: prod.nome, unid: prod.unid, preco: 0 } : it));
    }
  };

  const selectVariacao = (idx: number, variacaoId: string) => {
    const item = itens[idx];
    const prod = products.find((p) => p.codigo_produto === item.codigo);
    const v = prod?.variacoes.find((x) => String(x.id) === variacaoId);
    if (!prod || !v) return;
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, variacao_id: v.id ?? null, nome: nomeComMarca(prod, v.id ?? -1), preco: v.preco } : it));
  };

  const updateItem = (idx: number, field: keyof EntradaItem, value: string | number) => {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const addItem    = () => setItens((p) => [...p, { codigo: "", variacao_id: null, nome: "", unid: "", qtd: 1, preco: 0 }]);
  const removeItem = (idx: number) => setItens((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroNf.trim())       { toast.error("Campo obrigatório: Número da NF."); return; }
    if (!fornecedor.trim())     { toast.error("Campo obrigatório: Fornecedor."); return; }
    if (!almoxarifado.trim())   { toast.error("Campo obrigatório: Suprimentos."); return; }
    if (!responsavel.trim())    { toast.error("Campo obrigatório: Responsável."); return; }
    if (!data)                  { toast.error("Campo obrigatório: Data de recebimento."); return; }
    if (itens.some((i) => !i.codigo)) { toast.error("Todos os itens precisam ter um produto selecionado."); return; }
    if (itens.some((i) => !i.variacao_id)) { toast.error("Selecione a marca de cada item — o produto tem mais de uma cadastrada."); return; }
    if (itens.some((i) => i.qtd <= 0)) { toast.error("Todos os itens precisam ter quantidade maior que zero."); return; }
    setLoading(true);
    try {
      const res = await api.movimentos.create({ tipo: "ENTRADA", numero_nf: numeroNf, data, fornecedor, almoxarifado, responsavel, itens }) as { data: { numero_pedido: string } };

      if (pedidoVinculado) {
        try {
          await api.pedidosOrcamento.confirmarRecebimento(Number(pedidoVinculado));
        } catch {
          toast.error("Entrada registrada, mas não foi possível concluir o pedido de orçamento vinculado — confirme manualmente em Ped. Orçamento.");
        }
      }

      toast.success(`Entrada registrada! Pedido nº ${res.data?.numero_pedido ?? ""}`);
      setNumeroNf(""); setFornecedor(""); setAlmoxarifado(""); setResponsavel(""); setPedidoVinculado("");
      setItens([{ codigo: "", variacao_id: null, nome: "", unid: "", qtd: 1, preco: 0 }]);
      setPedidosPendentes((prev) => prev.filter((p) => p.id !== Number(pedidoVinculado)));
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

        {pedidosPendentes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block mb-2">
              Vincular a um Pedido de Orçamento pendente de chegada (opcional)
            </label>
            <select value={pedidoVinculado} onChange={(e) => selecionarPedidoPendente(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors">
              <option value="">Nenhum — entrada avulsa</option>
              {pedidosPendentes.map((p) => (
                <option key={p.id} value={p.id}>{p.numero_sc} — {p.destino}{p.fornecedor_escolhido ? ` (${p.fornecedor_escolhido})` : ""}</option>
              ))}
            </select>
            {pedidoVinculado && (
              <p className="text-[11px] text-amber-700 mt-2">
                Itens e fornecedor pré-preenchidos abaixo. Confira o código de cada produto no catálogo antes de confirmar —
                ao registrar esta entrada, o pedido também será marcado como concluído.
              </p>
            )}
          </div>
        )}

        {/* Header fields */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Dados da Nota Fiscal</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Número da NF *", value: numeroNf, set: setNumeroNf, placeholder: "Ex: 000123" },
              { label: "Fornecedor *",    value: fornecedor, set: setFornecedor, placeholder: "Nome do fornecedor" },
              { label: "Suprimentos *",  value: almoxarifado, set: setAlmoxarifado, placeholder: "Ex: Almox Central" },
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
                  {["Código", "Marca", "Nome do Produto", "Unid.", "Quantidade", "Preço Unit.", "Subtotal", ""].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {itens.map((item, idx) => {
                  const prod = products.find((p) => p.codigo_produto === item.codigo);
                  const variacoes = prod?.variacoes ?? [];
                  return (
                  <tr key={idx}>
                    <td className="p-2">
                      <select value={item.codigo} onChange={(e) => selectProduct(idx, e.target.value)}
                        className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:border-[#EA6C0A]">
                        <option value="">— Código —</option>
                        {products.map((p) => <option key={p.codigo_produto} value={p.codigo_produto}>{p.codigo_produto}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      {variacoes.length > 1 ? (
                        <select value={item.variacao_id ?? ""} onChange={(e) => selectVariacao(idx, e.target.value)}
                          className="w-36 bg-amber-50 border border-amber-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]">
                          <option value="">— Marca —</option>
                          {variacoes.map((v) => (
                            <option key={v.id} value={v.id}>{v.marca || "(sem marca)"}{v.codigo_fabricante ? ` (${v.codigo_fabricante})` : ""}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{variacoes[0]?.marca || "—"}</span>
                      )}
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
                  );
                })}
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
