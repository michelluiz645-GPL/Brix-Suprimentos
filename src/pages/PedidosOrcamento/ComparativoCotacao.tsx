import React, { useMemo, useState } from "react";

export interface Fornecedor { nome: string; forma_pagamento: string; }
export interface PrecoFornecedor { preco: number; marca: string; }
export interface ItemComparativo {
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_referencia_mercado?: number | null;
  fornecedores: PrecoFornecedor[];
  fornecedor_escolhido_indice?: number | null;
  justificativa_escolha?: string | null;
}

interface Props {
  numeroSc: string;
  setor: string;
  destino: string;
  data: string;
  dataDesejada?: string | null;
  itensIniciais: { descricao: string; quantidade: number; unidade: string }[];
  fornecedores?: Fornecedor[] | null;
  itensComparativo?: ItemComparativo[] | null;
  fornecedorEscolhido?: string | null;
  /**
   * "editar"   — cotador preenche o comparativo (Suprimentos).
   * "aprovar"  — Manutenção revisa e escolhe o fornecedor vencedor de cada item.
   * "visualizar" — somente leitura, com as escolhas já feitas destacadas.
   */
  modo: "editar" | "aprovar" | "visualizar";
  onSalvar?: (dados: { fornecedores: Fornecedor[]; itens: ItemComparativo[] }) => void;
  onAprovar?: (escolhas: { fornecedor_indice: number; justificativa: string | null }[]) => void;
  salvando?: boolean;
}

const FORNECEDOR_VAZIO: Fornecedor = { nome: "", forma_pagamento: "" };
const PRECO_VAZIO: PrecoFornecedor = { preco: 0, marca: "" };
const UNIDADES = ["Un", "Kg", "Lt", "Cx", "Mt", "Par", "Jg", "Rolo", "Pç", "Gl", "Balde", "Saco"];
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDataBR = (iso: string) => { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

const inp = "w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-[#EA6C0A]";

export default function ComparativoCotacao({
  numeroSc, setor, destino, data, dataDesejada,
  itensIniciais, fornecedores, itensComparativo, fornecedorEscolhido,
  modo, onSalvar, onAprovar, salvando,
}: Props) {
  const editavel = modo === "editar";
  const aprovando = modo === "aprovar";

  const [fornecedoresForm, setFornecedoresForm] = useState<Fornecedor[]>(
    fornecedores?.length === 3 ? fornecedores : [{ ...FORNECEDOR_VAZIO }, { ...FORNECEDOR_VAZIO }, { ...FORNECEDOR_VAZIO }]
  );
  const [itensForm, setItensForm] = useState<ItemComparativo[]>(
    itensComparativo?.length
      ? itensComparativo
      : itensIniciais.map(i => ({
          descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade,
          valor_referencia_mercado: null, fornecedores: [{ ...PRECO_VAZIO }, { ...PRECO_VAZIO }, { ...PRECO_VAZIO }],
        }))
  );
  // Escolha por item (modo "aprovar"): índice do fornecedor + justificativa, uma entrada por item
  const [escolhas, setEscolhas] = useState<{ indice: number | null; justificativa: string }[]>(
    itensForm.map(it => ({ indice: it.fornecedor_escolhido_indice ?? null, justificativa: it.justificativa_escolha ?? "" }))
  );

  const setFornecedorCampo = (i: number, campo: keyof Fornecedor, valor: string) =>
    setFornecedoresForm(prev => prev.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));

  const setItemDescricao = (i: number, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => idx === i ? { ...it, descricao: valor } : it));

  const setItemQuantidade = (i: number, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => idx === i ? { ...it, quantidade: Number(valor) || 0 } : it));

  const setItemUnidade = (i: number, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => idx === i ? { ...it, unidade: valor } : it));

  const setItemReferencia = (i: number, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => idx === i ? { ...it, valor_referencia_mercado: Number(valor) || null } : it));

  const setItemFornecedorCampo = (i: number, fi: number, campo: keyof PrecoFornecedor, valor: string) =>
    setItensForm(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const fornecedoresItem = [...it.fornecedores];
      fornecedoresItem[fi] = {
        ...fornecedoresItem[fi],
        [campo]: campo === "preco" ? (Number(valor) || 0) : valor,
      };
      return { ...it, fornecedores: fornecedoresItem };
    }));

  const addLinha = () => setItensForm(prev => [...prev, {
    descricao: "", quantidade: 1, unidade: "Un", valor_referencia_mercado: null,
    fornecedores: [{ ...PRECO_VAZIO }, { ...PRECO_VAZIO }, { ...PRECO_VAZIO }],
  }]);
  const removeLinha = (i: number) => {
    setItensForm(prev => prev.filter((_, idx) => idx !== i));
    setEscolhas(prev => prev.filter((_, idx) => idx !== i));
  };

  const setEscolhaIndice = (i: number, indice: number) =>
    setEscolhas(prev => prev.map((e, idx) => idx === i ? { ...e, indice } : e));
  const setEscolhaJustificativa = (i: number, justificativa: string) =>
    setEscolhas(prev => prev.map((e, idx) => idx === i ? { ...e, justificativa } : e));

  // Índice do menor preço unitário por linha (a quantidade é a mesma nas 3
  // colunas, então comparar unitário já equivale a comparar o total da linha)
  const indiceMaisBaratoPorLinha = useMemo(
    () => itensForm.map(it => {
      const precos = it.fornecedores.map(f => f.preco);
      return precos.every(p => p > 0) ? precos.indexOf(Math.min(...precos)) : -1;
    }),
    [itensForm]
  );

  // Total de cada linha por fornecedor = preço unitário × quantidade solicitada
  const totalLinhaPorFornecedor = useMemo(
    () => itensForm.map(it => it.fornecedores.map(f => f.preco * it.quantidade)),
    [itensForm]
  );

  // Saving por item (em valor de linha, já considerando a quantidade): contra
  // o valor de referência de mercado (se informado, também unitário) ou entre
  // o maior e o menor total cotado
  const savingPorLinha = useMemo(
    () => itensForm.map((it, i) => {
      const totais = totalLinhaPorFornecedor[i];
      const menorIndice = indiceMaisBaratoPorLinha[i];
      if (menorIndice === -1) return { valor: 0, percentual: 0 };
      const menor = totais[menorIndice];
      if (it.valor_referencia_mercado && it.valor_referencia_mercado > 0) {
        const totalReferencia = it.valor_referencia_mercado * it.quantidade;
        const valor = totalReferencia - menor;
        return { valor, percentual: totalReferencia > 0 ? (valor / totalReferencia) * 100 : 0 };
      }
      const maior = Math.max(...totais);
      const valor = maior - menor;
      return { valor, percentual: maior > 0 ? (valor / maior) * 100 : 0 };
    }),
    [itensForm, indiceMaisBaratoPorLinha, totalLinhaPorFornecedor]
  );

  const totalPorFornecedor = useMemo(
    () => [0, 1, 2].map(fi => totalLinhaPorFornecedor.reduce((soma, totais) => soma + (totais[fi] || 0), 0)),
    [totalLinhaPorFornecedor]
  );
  const indiceMenorTotal = useMemo(() => {
    const validos = totalPorFornecedor.filter(t => t > 0);
    return validos.length === 3 ? totalPorFornecedor.indexOf(Math.min(...validos)) : -1;
  }, [totalPorFornecedor]);

  // Saving total da cotação = soma dos savings de cada item (RN: regra sensível, revisar com o time antes de mudar)
  const savingTotal = useMemo(
    () => savingPorLinha.reduce((soma, s) => soma + s.valor, 0),
    [savingPorLinha]
  );

  const validarESalvar = () => {
    onSalvar?.({ fornecedores: fornecedoresForm, itens: itensForm });
  };

  const escolhasValidas = escolhas.every(e => e.indice !== null);
  const faltaJustificativa = escolhas.some((e, i) => e.indice !== null && e.indice !== indiceMaisBaratoPorLinha[i] && !e.justificativa.trim());

  const confirmarAprovacao = () => {
    if (!escolhasValidas || faltaJustificativa) return;
    onAprovar?.(escolhas.map(e => ({ fornecedor_indice: e.indice as number, justificativa: e.justificativa.trim() || null })));
  };

  const nomeFornecedor = (i: number) => fornecedoresForm[i]?.nome || `Fornecedor ${i + 1}`;

  return (
    <div className="space-y-5">
      <div className="print-area">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-slate-800">
          <img src="/logo-terrabrix.jpg" alt="TerraBrix Engenharia" className="h-10 object-contain" />
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº orçamento</p>
            <p className="font-mono font-black text-slate-800">{numeroSc}</p>
          </div>
        </div>

        <p className="text-sm font-bold text-slate-700 mb-3">Cotação comparativa de compra</p>

        <div className="grid grid-cols-2 gap-2 text-xs mb-4 bg-slate-50 rounded-lg p-3">
          <p><span className="text-slate-400">Solicitação</span> <strong className="text-slate-700">{numeroSc}</strong></p>
          <p><span className="text-slate-400">Setor</span> <strong className="text-slate-700">{setor === "MANUTENCAO" ? "Manutenção" : setor === "ENGENHARIA" ? "Engenharia" : "Almoxarifado"}</strong></p>
          <p><span className="text-slate-400">Destino</span> <strong className="text-slate-700">{destino}</strong></p>
          <p><span className="text-slate-400">Data</span> <strong className="text-slate-700">{data}</strong></p>
          {dataDesejada && (
            <p><span className="text-slate-400">Data desejada do material</span> <strong className="text-slate-700">{fmtDataBR(dataDesejada)}</strong></p>
          )}
          {fornecedorEscolhido && (
            <p><span className="text-slate-400">Fornecedor(es) escolhido(s)</span> <strong className="text-emerald-700">{fornecedorEscolhido}</strong></p>
          )}
        </div>

        {/* Nome + forma de pagamento por fornecedor (edição fica no topo; prazo de entrega é por item, na tabela) */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {fornecedoresForm.map((f, i) => (
            <div key={i} className="space-y-1.5">
              {editavel ? (
                <input value={f.nome} onChange={e => setFornecedorCampo(i, "nome", e.target.value)}
                  placeholder={`Fornecedor ${i + 1}`} className={`${inp} font-bold`} />
              ) : (
                <p className="text-xs font-bold text-slate-800">{nomeFornecedor(i)}</p>
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

        {/* Tabela comparativa: marca, preço unitário e data de entrega por fornecedor, por item */}
        <table className="w-full text-[11px] mb-3">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2 px-1.5 font-bold text-slate-500">#</th>
              <th className="text-left py-2 px-1.5 font-bold text-slate-500">Item</th>
              {aprovando && <th className="text-center py-2 px-1.5 font-bold text-slate-500">Escolher</th>}
              {[0, 1, 2].map(fi => (
                <th key={fi} className="text-right py-2 px-1.5 font-bold text-slate-500" colSpan={1}>{nomeFornecedor(fi)}</th>
              ))}
              {editavel && <th className="w-6"></th>}
            </tr>
          </thead>
          <tbody>
            {itensForm.map((it, i) => {
              const escolhido = it.fornecedor_escolhido_indice ?? escolhas[i]?.indice ?? null;
              return (
                <tr key={i} className="border-b border-slate-50 align-top">
                  <td className="py-2 px-1.5 font-bold text-[#EA6C0A]">{i + 1}</td>
                  <td className="py-2 px-1.5">
                    {editavel ? (
                      <div className="space-y-1">
                        <input value={it.descricao} onChange={e => setItemDescricao(i, e.target.value)}
                          placeholder="Descrição do item" className={inp} />
                        <div className="flex gap-1">
                          <input type="number" min={0.01} step="0.01" value={it.quantidade || ""} onChange={e => setItemQuantidade(i, e.target.value)}
                            placeholder="Qtd" className={`${inp} w-16`} />
                          <select value={it.unidade} onChange={e => setItemUnidade(i, e.target.value)} className={inp}>
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <input type="number" min={0} step="0.01" value={it.valor_referencia_mercado ?? ""}
                          onChange={e => setItemReferencia(i, e.target.value)}
                          placeholder="Ref. mercado unitária (opcional)" className={inp} />
                      </div>
                    ) : (
                      <div>
                        <p className="text-slate-700 font-medium">{it.descricao}</p>
                        <p className="text-[#EA6C0A] text-[10px] font-bold">Qtd. solicitada: {it.quantidade} {it.unidade}</p>
                        {!!it.valor_referencia_mercado && (
                          <p className="text-slate-400 text-[10px]">Ref. mercado (unit.): {fmtMoeda(it.valor_referencia_mercado)}</p>
                        )}
                      </div>
                    )}
                  </td>
                  {aprovando && (
                    <td className="py-2 px-1.5 align-top no-print">
                      <select value={escolhas[i]?.indice ?? ""} onChange={e => setEscolhaIndice(i, Number(e.target.value))} className={inp}>
                        <option value="">Selecione...</option>
                        {[0, 1, 2].map(fi => <option key={fi} value={fi}>{nomeFornecedor(fi)}</option>)}
                      </select>
                      {escolhas[i]?.indice !== null && escolhas[i]?.indice !== indiceMaisBaratoPorLinha[i] && (
                        <textarea value={escolhas[i]?.justificativa ?? ""} onChange={e => setEscolhaJustificativa(i, e.target.value)}
                          rows={2} placeholder="Justifique (obrigatório: não é o mais barato)"
                          className={`${inp} mt-1 resize-none border-amber-300`} />
                      )}
                    </td>
                  )}
                  {it.fornecedores.map((pf, fi) => (
                    <td key={fi} className={`py-2 px-1.5 text-right ${indiceMaisBaratoPorLinha[i] === fi ? "bg-emerald-50 rounded-lg" : ""} ${escolhido === fi ? "ring-2 ring-inset ring-blue-400 rounded-lg" : ""}`}>
                      {editavel ? (
                        <div className="space-y-1">
                          <input value={pf.marca} onChange={e => setItemFornecedorCampo(i, fi, "marca", e.target.value)}
                            placeholder="Marca" className={inp} />
                          <input type="number" min={0} step="0.01" value={pf.preco || ""} onChange={e => setItemFornecedorCampo(i, fi, "preco", e.target.value)}
                            className={`${inp} text-right`} placeholder="Preço unitário" />
                          {pf.preco > 0 && it.quantidade > 0 && (
                            <p className="text-slate-400 text-[10px]">Total: {fmtMoeda(pf.preco * it.quantidade)}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className={`font-bold ${indiceMaisBaratoPorLinha[i] === fi ? "text-emerald-700" : "text-slate-700"}`}>
                            {indiceMaisBaratoPorLinha[i] === fi && "✓ "}{fmtMoeda(totalLinhaPorFornecedor[i][fi])}
                          </p>
                          <p className="text-slate-400 text-[10px]">Unit.: {fmtMoeda(pf.preco)}</p>
                          {pf.marca && <p className="text-slate-400 text-[10px]">{pf.marca}</p>}
                          {escolhido === fi && <p className="text-blue-600 text-[10px] font-bold">Escolhido</p>}
                        </div>
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
              );
            })}
          </tbody>
        </table>

        {editavel && (
          <button onClick={addLinha} className="text-[10px] font-bold text-[#EA6C0A] hover:underline mb-3 no-print">
            + Adicionar linha (frete, instalação, taxas...)
          </button>
        )}

        {/* Justificativas já registradas (modo visualizar, após aprovação) */}
        {modo === "visualizar" && itensForm.some(it => it.justificativa_escolha) && (
          <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg space-y-1.5">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Aprovação — Gestor de Manutenção</p>
            {itensForm.map((it, i) => it.fornecedor_escolhido_indice != null && (
              <p key={i} className="text-xs text-slate-700">
                <strong>{it.descricao}:</strong> {nomeFornecedor(it.fornecedor_escolhido_indice)}
                {it.justificativa_escolha && <span className="text-slate-500"> — {it.justificativa_escolha}</span>}
              </p>
            ))}
          </div>
        )}

        {/* Condições de entrega e pagamento por fornecedor (depois dos itens) */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {fornecedoresForm.map((f, i) => (
            <div key={i} className={`rounded-lg border p-3 ${indiceMenorTotal === i ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
              <p className="text-xs font-bold text-slate-800">{nomeFornecedor(i)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Pagamento: {f.forma_pagamento || "—"}</p>
            </div>
          ))}
        </div>

        {/* Totais por fornecedor */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {totalPorFornecedor.map((total, i) => (
            <div key={i} className={`rounded-lg border-l-4 p-3 ${indiceMenorTotal === i ? "bg-emerald-50 border-emerald-500" : "bg-slate-50 border-[#EA6C0A]"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${indiceMenorTotal === i ? "text-emerald-700" : "text-slate-500"}`}>
                {indiceMenorTotal === i && "✓ "}{nomeFornecedor(i)} Total
              </p>
              <p className={`text-sm font-black ${indiceMenorTotal === i ? "text-emerald-700" : "text-slate-800"}`}>{fmtMoeda(total)}</p>
            </div>
          ))}
        </div>

        {/* Saving estimado */}
        {savingTotal > 0 && (
          <div className="bg-amber-50 border-l-4 border-[#EA6C0A] rounded-lg px-4 py-3 mb-3">
            <p className="text-xs font-semibold text-slate-600">Saving Estimado (melhor preço vs. maior valor ou referência de mercado)</p>
            <p className="text-xl font-black text-[#EA6C0A]">{fmtMoeda(savingTotal)}</p>
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
        <p className="text-[9px] text-slate-400 text-center mt-4 print-only">Geplan Terraplenagem © 2026 | Assinado digitalmente</p>
      </div>

      {/* Ações (fora da área impressa) */}
      <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-100 no-print">
        <button onClick={() => window.print()}
          className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          Imprimir / Salvar PDF
        </button>

        {editavel && (
          <button onClick={validarESalvar} disabled={salvando}
            className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {salvando ? "Enviando..." : "Enviar para Aprovação"}
          </button>
        )}

        {aprovando && (
          <button onClick={confirmarAprovacao} disabled={salvando || !escolhasValidas || faltaJustificativa}
            className="px-6 py-2 text-xs font-bold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all disabled:opacity-60">
            {salvando ? "Aprovando..." : "Aprovar com estas escolhas"}
          </button>
        )}
      </div>
    </div>
  );
}
