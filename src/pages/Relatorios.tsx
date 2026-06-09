import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Relatorios() {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [movements, setMovements] = useState<any[]>([]);
  const [poOrders, setPoOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedReport, setSelectedReport] = useState("Estoque em Recomposição");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodsRes, movsRes, poRes, fuelRes] = await Promise.all([
        api.get("produtos"),
        api.get("movimentos"),
        api.get("pedidos_compra"),
        api.get("mov_combustiveis"),
      ]);

      setProducts(prodsRes || {});

      // Combine general movements and fuel movements for holistic log tables
      const listA = Object.values(movsRes || {}).map((m: any) => ({ ...m, source: "WAREHOUSE" }));
      const listB = Object.values(fuelRes || {}).map((m: any) => ({
        ...m,
        source: "FUEL",
        nome: `${m.combustivel} (${m.responsavel || 'abastecimento'})`,
        tipo: m.tipo,
        quantidade_saida: m.tipo.includes("SAÍDA") ? m.quantidade : 0,
        quantidade_entrada: m.tipo.includes("ENTRADA") ? m.quantidade : 0,
        preco: m.valor / (m.quantidade || 1),
      }));

      setMovements([...listA, ...listB].sort((a,b) => b.data.localeCompare(a.data)));
      setPoOrders(Object.values(poRes || {}));
    } catch (e) {
      console.error("Failed to compile BI report aggregates", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatPrice = (v: any) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Compilando estatísticas corporativas...</span>
      </div>
    );
  }

  // Report 1: "Estoque em Recomposição"
  const understockList = Object.entries(products)
    .filter(([_, p]: any) => p.estoque_min > 0 && p.estoque <= p.estoque_min)
    .map(([bc, p]: any) => ({
      barcode: bc,
      nome: p.nome,
      categoria: p.categoria,
      estoque: p.estoque,
      min: p.estoque_min,
      repor: p.estoque_max > 0 ? (p.estoque_max - p.estoque) : (p.estoque_min * 2 - p.estoque),
      unid: p.unid || "UNID",
      armario: p.armario || "─",
    }));

  // Report 2: "Movimentação Semanal de Insumos"
  const recentMovementsList = movements.slice(0, 50);

  // Report 3: "Eficiência de Refil e Telemetria de Frota"
  const fuelMovementsList = movements.filter((m) => m.source === "FUEL");

  // Report 4: "Saving de Compras por Categoria"
  const savingByCatHash: Record<string, number> = {};
  poOrders.forEach((po) => {
    if (po.cotacoes_fornecedores && po.cotacoes_fornecedores.saving_previsto > 0) {
      const cat = po.itens?.[0]?.medida || "GERAL"; // Category is saved in measure
      savingByCatHash[cat] = (savingByCatHash[cat] || 0) + po.cotacoes_fornecedores.saving_previsto;
    }
  });

  const totalSavingValue = Object.values(savingByCatHash).reduce((acc, v) => acc + v, 0);

  // Build PDF HTML template based on report selection
  const titleReport = selectedReport.toUpperCase();
  const dateStr = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR").slice(0, 5);

  let printTableRowsHtml = "";
  let printHeaderHtml = "";

  if (selectedReport === "Estoque em Recomposição") {
    printHeaderHtml = `
      <tr>
        <th>Código Barras</th>
        <th>Descrição Produto</th>
        <th>Categoria</th>
        <th style="text-align:center">Almoxar. Armário/Prat.</th>
        <th style="text-align:right">Em Estoque</th>
        <th style="text-align:right">Nível Mínimo</th>
        <th style="text-align:right font-weight:bold">Sugestão de Reposição</th>
      </tr>
    `;

    printTableRowsHtml = understockList
      .map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'}">
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px">${r.barcode}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;font-weight:bold">${r.nome}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px">${r.categoria}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:center">${r.armario}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:right;color:#EF4444;font-weight:bold">${r.estoque} ${r.unid}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:right">${r.min}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:right;font-weight:bold;color:#D97706">+${r.repor} ${r.unid}</td>
        </tr>
      `)
      .join("");
  } else if (selectedReport === "Movimentação Semanal de Insumos") {
    printHeaderHtml = `
      <tr>
        <th>Data</th>
        <th>Ficha / Origem</th>
        <th>Tipo</th>
        <th>Descrição do Item</th>
        <th style="text-align:right">Volume / Qtd</th>
        <th style="text-align:right">Preço Custo Unit.</th>
        <th>Vínculo / O.S</th>
      </tr>
    `;

    printTableRowsHtml = recentMovementsList
      .map((r, i) => `
        <tr style="background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'}">
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px">${r.data}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px">${r.source} ${r.numero_ficha || '─'}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;font-weight:bold">${r.tipo}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;font-weight:bold">${r.nome}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:right">${r.quantidade_saida || r.quantidade_entrada || r.quantidade || 1}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:right">${formatPrice(r.preco)}</td>
          <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px">${r.frota || r.equipe || r.fornecedor || '─'}</td>
        </tr>
      `)
      .join("");
  } else {
    // Compras Saving
    printHeaderHtml = `
      <tr>
        <th style="width:70%">Categoria / Registro</th>
        <th style="text-align:right;width:30%">Total de Saving Acumulado</th>
      </tr>
    `;

    printTableRowsHtml = Object.entries(savingByCatHash)
      .map(([cat, val], i) => `
        <tr style="background:${i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'}">
          <td style="padding:8px;border:1px solid #E2E8F0;font-size:12px;font-weight:bold">${cat}</td>
          <td style="padding:8px;border:1px solid #E2E8F0;font-size:12px;text-align:right;color:#059669;font-weight:bold">${formatPrice(val)}</td>
        </tr>
      `)
      .join("");
  }

  const printDocumentHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family:Arial,sans-serif; margin:30px; color:#1e293b; background:#fff; }
          .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; padding-bottom:12px; border-bottom:4px solid #C75B12; }
          .logo { font-size:28px; font-weight:900; color:#1e293b; }
          .logo span { color:#C75B12; }
          table { width:100%; border-collapse:collapse; margin-top:15px; }
          th { background:#1E293B; color:#fff; padding:10px; font-size:11px; text-align:left; border:1px solid #1E293B; }
          td { border:1px solid #E2E8F0; }
          .btn-print { display:block; width:100%; background:#1e293b; color:#fff; border:none; padding:14px; font-size:13px; font-weight:bold; border-radius:8px; cursor:pointer; text-transform:uppercase; margin-top:24px; text-align:center; text-decoration:none; }
          @media print { .btn-print { display:none !important; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">GE<span>PLAN</span></div>
            <div style="font-size:16px;font-weight:extrabold;color:#1e293b;margin-top:2px">${titleReport}</div>
            <div style="font-size:11px;color:#64748B">Relatórios consolidado de almoxarifado, combustíveis e engenharia</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#64748B;line-height:1.5">
            <div><b>Emitido em:</b> ${dateStr}</div>
            <div><b>Corporativo:</b> GEPLAN ERP</div>
          </div>
        </div>

        <table>
          <thead>
            ${printHeaderHtml}
          </thead>
          <tbody>
            ${printTableRowsHtml}
          </tbody>
        </table>

        <div style="margin-top:40px;font-size:11px;color:#94a3b8;text-align:center;border-top:1.5px solid #E2E8F0;padding-top:12px">
          GEPLAN &bull; Relatório exportado em conformidade com as diretrizes do ERP &bull; Assinatura doretoria: __________________
        </div>

        <button class="btn-print" onclick="window.print()">🖨️ Imprimir ou Salvar Como PDF</button>
      </body>
    </html>
  `;

  const docB64 = btoa(unescape(encodeURIComponent(printDocumentHtml)));

  return (
    <div className="space-y-6">
      {/* Report Switch */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              📊 Selecionar Relatório Gerencial
            </h3>
            <span className="text-xs text-slate-400">
              Escolha qual matriz de dados gerará na folha física para auditoria.
            </span>
          </div>

          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="bg-[#1E293B] text-white font-bold border-none rounded-lg px-4 py-2.5 text-xs focus:outline-none"
          >
            <option value="Estoque em Recomposição">Estoque em Recomposição</option>
            <option value="Movimentação Semanal de Insumos">Movimentação Semanal de Insumos</option>
            <option value="Saving de Compras por Categoria">Saving de Compras por Categoria</option>
          </select>
        </div>
      </div>

      {/* Screen view content */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        {selectedReport === "Estoque em Recomposição" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Estoque em Recomposição (Alerta)
              </span>
              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                {understockList.length} itens afetados
              </span>
            </div>

            {understockList.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">Cód. Barras</th>
                      <th className="p-3 font-semibold text-slate-500">Descrição do Item</th>
                      <th className="p-3 font-semibold text-slate-500">Categoria</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Armário</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Estoque</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Nível Mínimo</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Sugestão de Compra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {understockList.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-500">{r.barcode}</td>
                        <td className="p-3 font-bold text-slate-800">{r.nome}</td>
                        <td className="p-3 text-slate-500">{r.categoria}</td>
                        <td className="p-3 text-center text-slate-700 font-bold">🗄️ {r.armario}</td>
                        <td className="p-3 text-right font-bold text-rose-600">{r.estoque} {r.unid}</td>
                        <td className="p-3 text-right text-slate-400 font-bold">{r.min}</td>
                        <td className="p-3 text-right font-bold text-amber-600">+{r.repor} {r.unid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Excelente! Nenhum produto operando abaixo do nível mínimo de compras sugerido.
              </div>
            )}
          </div>
        )}

        {selectedReport === "Movimentação Semanal de Insumos" && (
          <div className="space-y-4 animate-fade-in">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block border-b border-slate-50 pb-2">
              Histórico Integral de Lançamentos de Insumos
            </span>

            {recentMovementsList.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-3 font-semibold text-slate-500">Data</th>
                      <th className="p-3 font-semibold text-slate-500">Setor/Origem</th>
                      <th className="p-3 font-semibold text-slate-500">Operação</th>
                      <th className="p-3 font-semibold text-slate-500">Insumo</th>
                      <th className="p-3 font-semibold text-slate-500 text-center">Qtd / Volume</th>
                      <th className="p-3 font-semibold text-slate-500 text-right">Custo Unit</th>
                      <th className="p-3 font-semibold text-slate-500">Destinatário / Placa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentMovementsList.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-500">{r.data}</td>
                        <td className="p-3 font-bold text-slate-500">{r.source === "FUEL" ? "⛽ Telemetria Tanques" : "📦 Armário Central"}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              r.tipo.includes("ENTRADA")
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {r.tipo}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{r.nome}</td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {r.quantidade_saida || r.quantidade_entrada || r.quantidade || 1}
                        </td>
                        <td className="p-3 text-right text-slate-600 font-semibold">{formatPrice(r.preco)}</td>
                        <td className="p-3 text-slate-500 font-bold">{r.frota || r.equipe || r.fornecedor || "─"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Nenhuma movimentação registrada no banco central até o momento.
              </div>
            )}
          </div>
        )}

        {selectedReport === "Saving de Compras por Categoria" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Consolidação de saving Comercial (Dívida Comum vs Gasto ERP)
              </span>
              <span className="text-xs font-bold text-slate-500">
                Lojas parceiras analisadas: 3 Lojas
              </span>
            </div>

            {Object.keys(savingByCatHash).length > 0 ? (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(savingByCatHash).map(([cat, val]) => (
                    <div key={cat} className="bg-slate-50 border border-slate-100 rounded-xl p-4 shadow-sm">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">{cat}</span>
                      <div className="text-lg font-black text-emerald-600 mt-1">{formatPrice(val)} saving</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-800 text-sm font-bold flex justify-between">
                  <span>SALDO CORPORATIVO SALVO (SAVING TOTAL):</span>
                  <span>{formatPrice(totalSavingValue)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-50 text-slate-400 rounded-lg">
                Nenhum pedido de compras fechou cotação comercial com saving superior a zero ainda.
              </div>
            )}
          </div>
        )}

        {/* PDF Frame container */}
        <div className="pt-4 border-t border-slate-100">
          <a
            href={`data:text/html;base64,${docB64}`}
            download={`relatorio_GEPLAN_${selectedReport.replace(/\s+/g, "_")}_${Date.now()}.html`}
            className="block"
          >
            <button className="w-full text-center py-3 bg-[#e8680a] text-white hover:bg-orange-600 text-sm font-black rounded-xl cursor-pointer shadow-lg shadow-orange-500/10">
              🖨️ GERAR DOCUMENTO E IMPRIMIR RELATÓRIO (PDF)
            </button>
          </a>
          <iframe
            srcDoc={printDocumentHtml}
            className="w-full h-[450px] border border-slate-100 rounded-xl bg-white shadow-sm mt-4"
            title="Preview Impressão Relatório"
          />
        </div>
      </div>
    </div>
  );
}
