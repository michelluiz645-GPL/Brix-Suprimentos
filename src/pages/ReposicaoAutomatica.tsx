import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, today } from "@/utils/formatters";
import type { Product } from "@/types";
import { AlertTriangle, ShoppingCart, RefreshCw } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

interface PedidoModal { produto: Product; qtd_sugerida: number; data_entrega: string; }

export default function ReposicaoAutomatica() {
  const toast = useToast();
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [modal, setModal] = useState<PedidoModal | null>(null);

  const carregar = () => {
    setLoading(true);
    api.produtos.list().then((r) => {
      const d = (r as { data: Product[] }).data ?? [];
      const lista: Product[] = Array.isArray(d) ? d : Object.values(d);
      setProdutos(lista);
    }).catch(() => toast.error("Não foi possível carregar os produtos."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const criticos = produtos.filter((p) =>
    p.status !== "INATIVO" &&
    p.estoque_min > 0 &&
    (p.estoque_total ?? 0) <= p.estoque_min
  );

  const qtdSugerida = (p: Product): number => {
    const estoqueTotal = p.estoque_total ?? 0;
    if (p.estoque_max && p.estoque_max > 0) {
      return Math.max(0, p.estoque_max - estoqueTotal);
    }
    return Math.max(0, p.estoque_min * 2 - estoqueTotal);
  };

  const urgencia = (p: Product) => (p.estoque_total ?? 0) === 0 ? "Crítica" : "Normal";

  const abrirModal = (p: Product) => setModal({ produto: p, qtd_sugerida: qtdSugerida(p), data_entrega: today() });

  const handleGerar = async () => {
    if (!modal) return;
    if (!modal.data_entrega) { toast.error("Data de entrega é obrigatória."); return; }
    if (modal.qtd_sugerida <= 0) { toast.error("Quantidade deve ser maior que zero."); return; }
    setGerando(true);
    try {
      await api.pedidosCompra.create({
        data_pedido: today(),
        data_desejada: modal.data_entrega,
        origem: "AUTOMATICO",
        urgencia: urgencia(modal.produto),
        setor_origem: "ALMOXARIFADO",
        solicitante: "Almoxarifado (reposição automática)",
        itens: [{
          nome: modal.produto.nome,
          qtd: modal.qtd_sugerida,
          unidade: modal.produto.unid,
          preco_unit: modal.produto.preco_min ?? 0,
          desconto: 0,
        }],
      });
      toast.success("Pedido de reposição gerado com sucesso!");
      setModal(null);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o pedido.");
    } finally { setGerando(false); }
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Reposição Automática" subtitle="Produtos com estoque crítico aguardando pedido de compra"
          action={
            <button onClick={carregar} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              <RefreshCw size={14} /> Atualizar
            </button>
          } />

        {!loading && criticos.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-700">
              {criticos.length} produto(s) com estoque crítico. Gere pedidos de reposição para evitar ruptura de estoque.
            </p>
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Verificando estoque...</div>
          ) : criticos.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-emerald-600 mb-1">✅ Estoque sob controle</p>
              <p className="text-xs text-slate-400">Nenhum produto está abaixo do estoque mínimo no momento.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Código", "Produto", "Categoria", "Estoque Atual", "Mínimo", "Qtd Sugerida", "Urgência", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {criticos.map((p) => {
                  const urg = urgencia(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[#EA6C0A] font-bold">{p.codigo_produto}</td>
                      <td className="p-3 font-medium text-slate-800">{p.nome}</td>
                      <td className="p-3 text-slate-500">{p.categoria}</td>
                      <td className="p-3">
                        <span className={`font-mono font-bold ${(p.estoque_total ?? 0) === 0 ? "text-rose-600" : "text-amber-600"}`}>
                          {p.estoque_total ?? 0} {p.unid}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{p.estoque_min} {p.unid}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{qtdSugerida(p)} {p.unid}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${urg === "Crítica" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                          {urg}
                        </span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => abrirModal(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#EA6C0A] rounded-lg hover:bg-[#C75B12] transition-colors">
                          <ShoppingCart size={12} /> Gerar Pedido
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal confirmação */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Gerar Pedido de Reposição</h2>
              <p className="text-xs text-slate-400 mt-1">{modal.produto.nome}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estoque atual</span>
                  <span className="font-mono font-bold text-rose-600">{modal.produto.estoque_total ?? 0} {modal.produto.unid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estoque mínimo</span>
                  <span className="font-mono">{modal.produto.estoque_min} {modal.produto.unid}</span>
                </div>
                {modal.produto.estoque_max && modal.produto.estoque_max > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estoque máximo</span>
                    <span className="font-mono">{modal.produto.estoque_max} {modal.produto.unid}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500">Preço estimado</span>
                  <span className="font-mono font-bold">{formatCurrency(modal.produto.preco_min ?? 0)}</span>
                </div>
              </div>

              <div>
                <label className={lbl}>Quantidade a Pedir *</label>
                <input type="number" min={1} value={modal.qtd_sugerida}
                  onChange={(e) => setModal((p) => p ? { ...p, qtd_sugerida: Number(e.target.value) } : null)}
                  className={`${inp} font-mono`} />
                <p className="text-[10px] text-slate-400 mt-1">Quantidade sugerida com base no estoque mínimo/máximo</p>
              </div>
              <div>
                <label className={lbl}>Data Desejada de Entrega *</label>
                <input type="date" value={modal.data_entrega}
                  onChange={(e) => setModal((p) => p ? { ...p, data_entrega: e.target.value } : null)}
                  className={inp} />
              </div>

              <div className={`rounded-xl p-3 text-xs font-bold flex items-center gap-2 ${urgencia(modal.produto) === "Crítica" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                <AlertTriangle size={14} />
                Urgência: {urgencia(modal.produto)} — pedido será gerado como "{urgencia(modal.produto) === "Crítica" ? "Crítico" : "Normal"}"
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={handleGerar} disabled={gerando}
                className={`flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white rounded-lg transition-all ${gerando ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA6C0A] hover:bg-[#C75B12]"}`}>
                <ShoppingCart size={13} /> {gerando ? "Gerando..." : "Confirmar Pedido →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
