import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatCurrency, today } from "@/utils/formatters";
import type { Product } from "@/types";
import { Plus, Trash2 } from "lucide-react";

interface SaidaItem { codigo: string; variacao_id: number | null; nome: string; unid: string; qtd: number; preco: number; obs?: string; estoque_disponivel?: number; }

const TIPOS_SAIDA = ["Retirada", "Entrega"];

export default function Saida() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [tipoSaida, setTipoSaida] = useState(TIPOS_SAIDA[0]);
  const [equipe, setEquipe]     = useState("");
  const [colaborador, setColab] = useState("");
  const [entregador, setEntreg] = useState("");
  const [respAlmox, setResp]    = useState("");
  const [almox, setAlmox]       = useState("");
  const [data, setData]         = useState(today());
  const [itens, setItens]       = useState<SaidaItem[]>([{ codigo: "", variacao_id: null, nome: "", unid: "", qtd: 1, preco: 0 }]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    api.produtos.list().then((r) => {
      const d = (r as { data: Product[] }).data ?? [];
      setProducts(Array.isArray(d) ? d : Object.values(d));
    });
  }, []);

  const nomeComMarca = (prod: Product, variacaoId: number) => {
    const v = prod.variacoes.find((x) => x.id === variacaoId);
    if (!v) return prod.nome;
    const sufixo = [v.marca, v.codigo_fabricante && `(${v.codigo_fabricante})`].filter(Boolean).join(" ");
    return sufixo ? `${prod.nome} — ${sufixo}` : prod.nome;
  };

  const selectProduct = (idx: number, codigo: string) => {
    const p = products.find((p) => p.codigo_produto === codigo);
    if (!p) {
      setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: "", variacao_id: null, nome: "", unid: "", preco: 0, estoque_disponivel: undefined } : it));
      return;
    }
    const variacoes = p.variacoes ?? [];
    if (variacoes.length === 1) {
      const v = variacoes[0];
      setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: p.codigo_produto, variacao_id: v.id ?? null, nome: nomeComMarca(p, v.id ?? -1), unid: p.unid, preco: v.preco, estoque_disponivel: v.estoque } : it));
    } else {
      setItens((prev) => prev.map((it, i) => i === idx ? { ...it, codigo: p.codigo_produto, variacao_id: null, nome: p.nome, unid: p.unid, preco: 0, estoque_disponivel: undefined } : it));
    }
  };

  const selectVariacao = (idx: number, variacaoId: string) => {
    const item = itens[idx];
    const p = products.find((p) => p.codigo_produto === item.codigo);
    const v = p?.variacoes.find((x) => String(x.id) === variacaoId);
    if (!p || !v) return;
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, variacao_id: v.id ?? null, nome: nomeComMarca(p, v.id ?? -1), preco: v.preco, estoque_disponivel: v.estoque } : it));
  };

  const updateItem = (idx: number, field: keyof SaidaItem, value: string | number) =>
    setItens((p) => p.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const addItem    = () => setItens((p) => [...p, { codigo: "", variacao_id: null, nome: "", unid: "", qtd: 1, preco: 0 }]);
  const removeItem = (idx: number) => setItens((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipe.trim())     { toast.error("Campo obrigatório: Equipe / Destinatário."); return; }
    if (!entregador.trim()) { toast.error("Campo obrigatório: Entregador."); return; }
    if (!respAlmox.trim())  { toast.error("Campo obrigatório: Resp. Suprimentos."); return; }
    if (!almox.trim())      { toast.error("Campo obrigatório: Suprimentos."); return; }
    if (!data)              { toast.error("Campo obrigatório: Data."); return; }
    if (itens.some((i) => !i.codigo))   { toast.error("Todos os itens precisam ter um produto selecionado."); return; }
    if (itens.some((i) => !i.variacao_id)) { toast.error("Selecione a marca de cada item — o produto tem mais de uma cadastrada."); return; }
    if (itens.some((i) => i.qtd <= 0))  { toast.error("Todos os itens precisam ter quantidade maior que zero."); return; }
    const over = itens.find((it) => it.estoque_disponivel !== undefined && it.qtd > it.estoque_disponivel);
    if (over) { toast.error(`"${over.nome}" — quantidade solicitada (${over.qtd}) maior que o estoque disponível (${over.estoque_disponivel}).`); return; }
    setLoading(true);
    try {
      const res = await api.saidas.create({ tipo: "SAÍDA", tipo_saida: tipoSaida, equipe, colaborador, entregador, resp_almox: respAlmox, almoxarifado: almox, data, itens }) as { data: { numero_pedido: string } };
      toast.success(`Saída registrada! Cupom nº ${res.data?.numero_pedido ?? ""}`);
      setEquipe(""); setColab(""); setEntreg(""); setResp(""); setAlmox("");
      setItens([{ codigo: "", variacao_id: null, nome: "", unid: "", qtd: 1, preco: 0 }]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a saída. Tente novamente.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <PageHeader title="Registrar Saída" subtitle="Retirada de materiais com emissão de cupom" />

        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Dados da Saída</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo *</label>
              <select value={tipoSaida} onChange={(e) => setTipoSaida(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]">
                {TIPOS_SAIDA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {[
              { label: "Equipe / Destinatário *", value: equipe, set: setEquipe, placeholder: "Ex: Equipe 01" },
              { label: "Colaborador", value: colaborador, set: setColab, placeholder: "Nome do colaborador" },
              { label: "Entregador *", value: entregador, set: setEntreg, placeholder: "Quem entregou" },
              { label: "Resp. Suprimentos *", value: respAlmox, set: setResp, placeholder: "Responsável Suprimentos" },
              { label: "Suprimentos *", value: almox, set: setAlmox, placeholder: "Ex: Almox Central" },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">{f.label}</label>
                <input value={f.value} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens da Saída</h3>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-[#EA6C0A] hover:underline">
              <Plus size={14} /> Adicionar item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Produto", "Marca", "Disponível", "Qtd", "Unid.", "Observação", ""].map((h) => (
                  <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {itens.map((item, idx) => {
                  const over = item.estoque_disponivel !== undefined && item.qtd > item.estoque_disponivel;
                  const prod = products.find((p) => p.codigo_produto === item.codigo);
                  const variacoes = prod?.variacoes ?? [];
                  return (
                    <tr key={idx}>
                      <td className="p-2">
                        <select value={item.codigo} onChange={(e) => selectProduct(idx, e.target.value)}
                          className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-mono focus:outline-none focus:border-[#EA6C0A]">
                          <option value="">— Selecione —</option>
                          {products.map((p) => <option key={p.codigo_produto} value={p.codigo_produto}>{p.codigo_produto} — {p.nome}</option>)}
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
                      <td className="p-2 font-mono text-center text-slate-500">{item.estoque_disponivel ?? "—"}</td>
                      <td className="p-2">
                        <input type="number" min={1} value={item.qtd} onChange={(e) => updateItem(idx, "qtd", Number(e.target.value))}
                          className={`w-16 bg-slate-50 border rounded-lg px-2 py-2 text-xs text-center font-mono focus:outline-none transition-colors ${over ? "border-rose-400 bg-rose-50" : "border-slate-200 focus:border-[#EA6C0A]"}`} />
                        {over && <div className="text-[10px] text-rose-500 font-bold mt-0.5">Excede estoque!</div>}
                      </td>
                      <td className="p-2 font-mono text-slate-500">{item.unid || "—"}</td>
                      <td className="p-2">
                        <input value={item.obs ?? ""} onChange={(e) => updateItem(idx, "obs", e.target.value)} placeholder="Observação"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]" />
                      </td>
                      <td className="p-2">
                        {itens.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600"><Trash2 size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading}
            className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${loading ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
            {loading ? "Registrando..." : "Confirmar Saída →"}
          </button>
        </div>
      </form>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
