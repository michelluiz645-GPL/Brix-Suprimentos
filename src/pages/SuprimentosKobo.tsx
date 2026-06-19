import React, { useState, useEffect } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { formatDate } from "@/utils/formatters";
import { RefreshCw, Eye, ArrowRight, CheckCircle } from "lucide-react";

interface KoboItem { nome?: string; descricao?: string; quantidade?: number | string; unidade?: string; }
interface KoboPedido {
  id?: string | number;
  _id?: string | number;
  solicitante?: string;
  obra?: string;
  data?: string;
  _submission_time?: string;
  itens?: KoboItem[];
  status?: string;
  [key: string]: unknown;
}

export default function SuprimentosKobo() {
  const toast = useToast();
  const [pedidos, setPedidos] = useState<KoboPedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState<string | number | null>(null);
  const [sel, setSel] = useState<KoboPedido | null>(null);
  const [processados, setProcessados] = useState<Set<string | number>>(new Set());

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.kobo.suprimentos() as { data?: KoboPedido[]; results?: KoboPedido[] };
      const d = r.data ?? (r as { results?: KoboPedido[] }).results ?? [];
      setPedidos(Array.isArray(d) ? d : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível conectar ao KoboToolbox. Verifique as credenciais em Segurança de Dados.");
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const getId = (p: KoboPedido) => p.id ?? p._id ?? "";
  const getData = (p: KoboPedido) => p.data ?? p._submission_time ?? "";

  const converterEmPC = async (p: KoboPedido) => {
    const id = getId(p);
    setProcessando(id);
    try {
      const itens = (p.itens ?? []).map((it) => ({
        nome: it.nome ?? it.descricao ?? "Item sem nome",
        qtd: String(it.quantidade ?? 1),
        unidade: it.unidade ?? "UNID",
        preco_unit: 0,
        desconto: 0,
      }));

      if (itens.length === 0) {
        const campos = Object.entries(p).filter(([k]) =>
          !["id", "_id", "solicitante", "obra", "data", "_submission_time", "status", "itens"].includes(k)
        );
        campos.forEach(([k, v]) => {
          if (typeof v === "string" || typeof v === "number") {
            itens.push({ nome: k, qtd: "1", unidade: "UNID", preco_unit: 0, desconto: 0 });
          }
        });
      }

      await api.pedidosCompra.create({
        num_pc: `KOBO-${id}`,
        data_pedido: getData(p).split("T")[0] || new Date().toISOString().split("T")[0],
        solicitante: p.solicitante ?? "KoboToolbox",
        setor_origem: "ENGENHARIA",
        obra: p.obra ?? "",
        forn_nome: "A definir",
        frete: 0,
        outras_despesas: 0,
        desconto_total: 0,
        itens,
        status: "PENDENTE",
        num_sc_ref: `KOBO-${id}`,
      });

      toast.success("Pedido convertido em PC com sucesso!");
      setProcessados((prev) => new Set(prev).add(id));
      setSel(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível converter o pedido.");
    } finally { setProcessando(null); }
  };

  const pendentes = pedidos.filter((p) => !processados.has(getId(p)) && p.status !== "processado");

  const renderValorCampo = (v: unknown): string => {
    if (typeof v === "string" || typeof v === "number") return String(v);
    if (Array.isArray(v)) return v.join(", ");
    return "";
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title="Suprimentos KOBO" subtitle="Pedidos de campo via KoboToolbox"
          action={
            <button onClick={carregar} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#EA6C0A] text-white text-xs font-bold rounded-lg hover:bg-[#C75B12] transition-colors disabled:opacity-60">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
            </button>
          } />

        <div className="flex items-center gap-3 p-4 bg-[#0F172A] rounded-xl text-white">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-xs font-bold">{pendentes.length} pedido(s) pendente(s) de processamento</p>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-slate-300" />
            Buscando pedidos no KoboToolbox...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Nenhum pedido pendente no KoboToolbox.</p>
            <p className="text-[11px] text-slate-400 mt-1">Clique em "Atualizar" para buscar novos pedidos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => {
              const id = getId(p);
              const jaProcessado = processados.has(id) || p.status === "processado";
              return (
                <div key={String(id)} className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${jaProcessado ? "border-emerald-100 opacity-60" : "border-slate-100"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-[#EA6C0A] text-xs">#{String(id)}</span>
                        {jaProcessado && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle size={10} /> Processado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
                        {p.solicitante && <span><span className="font-bold">Solicitante:</span> {p.solicitante}</span>}
                        {p.obra && <span><span className="font-bold">Obra:</span> {p.obra}</span>}
                        {getData(p) && <span><span className="font-bold">Data:</span> {formatDate(getData(p).split("T")[0])}</span>}
                      </div>
                      {p.itens && p.itens.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.itens.slice(0, 4).map((it, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                              {it.nome ?? it.descricao} ({it.quantidade} {it.unidade})
                            </span>
                          ))}
                          {p.itens.length > 4 && <span className="text-[10px] text-slate-400">+{p.itens.length - 4} itens</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setSel(p)} className="p-2 text-slate-400 hover:text-[#EA6C0A] transition-colors border border-slate-100 rounded-lg"><Eye size={14} /></button>
                      {!jaProcessado && (
                        <button onClick={() => converterEmPC(p)} disabled={processando === id}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#EA6C0A] rounded-lg hover:bg-[#C75B12] transition-colors disabled:opacity-60">
                          {processando === id ? "Convertendo..." : <><ArrowRight size={13} /> Converter em PC</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pedido #{String(getId(sel))}</h2>
                {getData(sel) && <p className="text-xs text-slate-400 mt-0.5">{formatDate(getData(sel).split("T")[0])}</p>}
              </div>
              {!processados.has(getId(sel)) && sel.status !== "processado" && (
                <button onClick={() => converterEmPC(sel)} disabled={processando === getId(sel)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#EA6C0A] rounded-lg hover:bg-[#C75B12] transition-colors disabled:opacity-60">
                  <ArrowRight size={13} /> Converter em PC
                </button>
              )}
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(sel)
                  .filter(([k, v]) => !["itens", "status"].includes(k) && (typeof v === "string" || typeof v === "number") && renderValorCampo(v))
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="font-bold text-slate-500 block capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="text-slate-700">{renderValorCampo(v)}</span>
                    </div>
                  ))}
              </div>
              {sel.itens && sel.itens.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Itens</h3>
                  <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                    <thead><tr className="bg-slate-50 border-b border-slate-100">
                      {["Descrição", "Qtd", "Unid."].map((h) => <th key={h} className="p-2.5 font-semibold text-slate-500 text-left">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {sel.itens.map((it, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-medium">{it.nome ?? it.descricao ?? "—"}</td>
                          <td className="p-2.5 font-mono text-center">{it.quantidade ?? "—"}</td>
                          <td className="p-2.5 font-mono text-slate-500">{it.unidade ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSel(null)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </>
  );
}
