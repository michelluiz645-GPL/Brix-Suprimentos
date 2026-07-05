import React, { useMemo, useState } from "react";

export interface Fornecedor { nome: string; prazo_entrega: string; forma_pagamento: string; }
export interface ItemComparativo { descricao: string; precos: number[]; }

interface Props {
  numeroSc: string;
  setor: string;
  destino: string;
  data: string;
  itensIniciais: { descricao: string }[];
  fornecedores?: Fornecedor[] | null;
  itensComparativo?: ItemComparativo[] | null;
  fornecedorEscolhido?: string | null;
  /**
   * "editar"   — cotador preenche o comparativo (Suprimentos).
   * "aprovar"  — Manutenção revisa e escolhe o fornecedor vencedor.
   * "visualizar" — somente leitura, com o fornecedor já escolhido destacado.
   */
  modo: "editar" | "aprovar" | "visualizar";
  onSalvar?: (dados: { fornecedores: Fornecedor[]; itens: ItemComparativo[] }) => void;
  onAprovar?: (fornecedorEscolhido: string) => void;
  salvando?: boolean;
}

const FORNECEDOR_VAZIO: Fornecedor = { nome: "", prazo_entrega: "", forma_pagamento: "" };
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const inp = "w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]";

export default function ComparativoCotacao({
  numeroSc, setor, destino, data,
  itensIniciais, fornecedores, itensComparativo, fornecedorEscolhido,
  modo, onSalvar, onAprovar, salvando,
}: Props) {
  const editavel = modo === "editar";

  const [fornecedoresForm, setFornecedoresForm] = useState<Fornecedor[]>(
    fornecedores?.length === 3 ? fornecedores : [{ ...FORNECEDOR_VAZIO }, { ...FORNECEDOR_VAZIO }, { ...FORNECEDOR_VAZIO }]
  );
  const [itensForm, setItensForm] = useState<ItemComparativo[]>(
    itensComparativo?.length ? itensComparativo : itensIniciais.map(i => ({ descricao: i.descricao, precos: [0, 0, 0] }))
  );
  const [vencedor, setVencedor] = useState<string>(fornecedorEscolhido ?? "");

  const setFornecedorCampo = (i: number, campo: keyof Fornecedor, valor: string) =>
    setFornecedoresForm(prev => prev.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));

  const setItemDescricao = (i: number, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => idx === i ? { ...it, descricao: valor } : it));

  const setItemPreco = (i: number, fornecedorIdx: number, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const precos = [...it.precos];
      precos[fornecedorIdx] = Number(valor) || 0;
      return { ...it, precos };
    }));

  const addLinha = () => setItensForm(prev => [...prev, { descricao: "", precos: [0, 0, 0] }]);
  const removeLinha = (i: number) => setItensForm(prev => prev.filter((_, idx) => idx !== i));

  // Índice do menor preço por linha (para destaque visual) — só quando todos os preços da linha estão preenchidos
  const menorIndicePorLinha = useMemo(
    () => itensForm.map(it => it.precos.every(p => p > 0) ? it.precos.indexOf(Math.min(...it.precos)) : -1),
    [itensForm]
  );

  const totalPorFornecedor = useMemo(
    () => [0, 1, 2].map(fi => itensForm.reduce((soma, it) => soma + (it.precos[fi] || 0), 0)),
    [itensForm]
  );

  const economiaTotal = useMemo(() => {
    const validos = totalPorFornecedor.filter(t => t > 0);
    return validos.length === 3 ? Math.max(...validos) - Math.min(...validos) : 0;
  }, [totalPorFornecedor]);

  const validarESalvar = () => {
    onSalvar?.({ fornecedores: fornecedoresForm, itens: itensForm });
  };

  const nomesValidos = fornecedoresForm.map(f => f.nome.trim()).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Cabeçalho do documento (também usado na impressão) */}
      <div className="print-area">
        <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            <img src="/logo-terrabrix.jpg" alt="TerraBrix Engenharia" className="h-10 object-contain" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº orçamento</p>
            <p className="font-mono font-black text-slate-800">{numeroSc}</p>
          </div>
        </div>

        <p className="text-sm font-bold text-slate-700 mb-3">Cotação comparativa de compra</p>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
          <p><span className="text-slate-400">Solicitação</span> <strong className="text-slate-700">{numeroSc}</strong></p>
          <p><span className="text-slate-400">Setor</span> <strong className="text-slate-700">{setor === "MANUTENCAO" ? "Manutenção" : setor === "ENGENHARIA" ? "Engenharia" : "Almoxarifado"}</strong></p>
          <p><span className="text-slate-400">Destino</span> <strong className="text-slate-700">{destino}</strong></p>
          <p><span className="text-slate-400">Data</span> <strong className="text-slate-700">{data}</strong></p>
        </div>

        {/* Fornecedores: nome, prazo de entrega, forma de pagamento */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {fornecedoresForm.map((f, i) => (
            <div key={i} className="space-y-1.5">
              {editavel ? (
                <input value={f.nome} onChange={e => setFornecedorCampo(i, "nome", e.target.value)}
                  placeholder={`Fornecedor ${i + 1}`} className={`${inp} font-bold`} />
              ) : (
                <p className="text-xs font-bold text-slate-800">{f.nome || `Fornecedor ${i + 1}`}</p>
              )}
              {editavel ? (
                <input value={f.prazo_entrega} onChange={e => setFornecedorCampo(i, "prazo_entrega", e.target.value)}
                  placeholder="Prazo de entrega" className={inp} />
              ) : (
                <p className="text-[11px] text-slate-500">Prazo: {f.prazo_entrega || "—"}</p>
              )}
              {editavel ? (
                <input value={f.forma_pagamento} onChange={e => setFornecedorCampo(i, "forma_pagamento", e.target.value)}
                  placeholder="Forma de pagamento" className={inp} />
              ) : (
                <p className="text-[11px] text-slate-500">Pagamento: {f.forma_pagamento || "—"}</p>
              )}
            </div>
          ))}
        </div>

        {/* Tabela comparativa de itens */}
        <table className="w-full text-xs mb-3">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 font-bold text-slate-500">Item</th>
              {fornecedoresForm.map((f, i) => (
                <th key={i} className="text-right py-2 font-bold text-slate-500">{f.nome || `Fornecedor ${i + 1}`}</th>
              ))}
              {editavel && <th className="w-6"></th>}
            </tr>
          </thead>
          <tbody>
            {itensForm.map((it, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="py-2 pr-2">
                  {editavel ? (
                    <input value={it.descricao} onChange={e => setItemDescricao(i, e.target.value)}
                      placeholder="Descrição do item" className={inp} />
                  ) : (
                    <span className="text-slate-700 font-medium">{it.descricao}</span>
                  )}
                </td>
                {it.precos.map((preco, fi) => (
                  <td key={fi} className={`py-2 pl-2 text-right ${menorIndicePorLinha[i] === fi ? "bg-emerald-50 font-bold text-emerald-700 rounded-lg" : "text-slate-600"}`}>
                    {editavel ? (
                      <input type="number" min={0} step="0.01" value={preco || ""} onChange={e => setItemPreco(i, fi, e.target.value)}
                        className={`${inp} text-right`} placeholder="0,00" />
                    ) : (
                      fmtMoeda(preco)
                    )}
                  </td>
                ))}
                {editavel && (
                  <td className="pl-2">
                    <button onClick={() => removeLinha(i)} disabled={itensForm.length === 1}
                      className="text-slate-300 hover:text-red-500 transition-colors text-lg font-bold disabled:opacity-30">×</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {editavel && (
          <button onClick={addLinha} className="text-[10px] font-bold text-[#EA6C0A] hover:underline mb-3 no-print">
            + Adicionar linha (frete, instalação, taxas...)
          </button>
        )}

        {economiaTotal > 0 && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5 mb-3">
            <span className="text-xs font-semibold text-slate-600">Economia entre o maior e o menor total</span>
            <span className="text-sm font-black text-emerald-700">{fmtMoeda(economiaTotal)}</span>
          </div>
        )}

        {/* Escolha do fornecedor vencedor — só no modo aprovar */}
        {modo === "aprovar" && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg no-print">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Escolha o fornecedor vencedor</p>
            <div className="flex flex-wrap gap-3">
              {nomesValidos.map(nome => (
                <label key={nome} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="radio" name="fornecedor_vencedor" value={nome} checked={vencedor === nome}
                    onChange={() => setVencedor(nome)} />
                  {nome} — {fmtMoeda(totalPorFornecedor[fornecedoresForm.findIndex(f => f.nome === nome)])}
                </label>
              ))}
            </div>
          </div>
        )}

        {(modo === "visualizar" && fornecedorEscolhido) && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 mb-3">
            <span className="text-xs font-semibold text-slate-600">Fornecedor escolhido</span>
            <span className="text-sm font-black text-slate-800">{fornecedorEscolhido}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8 mt-8 pt-6 print-only">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500">Aprovação — Gestor de Manutenção</div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500">Aprovação — Gestor de Suprimentos</div>
          </div>
        </div>
      </div>

      {/* Ações (fora da área impressa) */}
      <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-100 no-print">
        <button onClick={() => window.print()}
          className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          Imprimir / Salvar PDF
        </button>

        {modo === "editar" && (
          <button onClick={validarESalvar} disabled={salvando}
            className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {salvando ? "Enviando..." : "Enviar para Aprovação"}
          </button>
        )}

        {modo === "aprovar" && (
          <button onClick={() => vencedor && onAprovar?.(vencedor)} disabled={salvando || !vencedor}
            className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {salvando ? "Aprovando..." : "Aprovar com este fornecedor"}
          </button>
        )}
      </div>
    </div>
  );
}
