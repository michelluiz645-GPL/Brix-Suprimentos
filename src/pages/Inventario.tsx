import React, { useState, useEffect } from "react";
import api from "../services/api";
import { Product } from "../types";
import { CATEGORIAS } from "./Produtos";

export default function Inventario() {
  const [products, setProducts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("📋 Visualizar");

  // Filters State
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todas");
  const [filterCabinet, setFilterCabinet] = useState("Todos");
  const [filterShelf, setFilterShelf] = useState("Todas");

  // Edit State
  const [editBc, setEditBc] = useState("");
  const [editCabinet, setEditCabinet] = useState("");
  const [editShelf, setEditShelf] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("produtos");
      setProducts(res || {});
    } catch (e) {
      console.error("Failed to load inventory closet layout", e);
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

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBc) return;

    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updated = { ...products };
      updated[editBc].armario = editCabinet.trim().toUpperCase();
      updated[editBc].prateleira = editShelf.trim().toUpperCase();

      await api.set("produtos", updated);
      setSuccessMsg(`Localização de "${products[editBc].nome}" salva com sucesso!`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro rede ao salvar localização do produto.");
    }
  };

  const handleEditSelectChange = (bc: string) => {
    setEditBc(bc);
    if (!bc) return;
    setEditCabinet(products[bc].armario || "");
    setEditShelf(products[bc].prateleira || "");
  };

  // Compile list and unique filters
  const cabinets = sortedUniqueValues(Object.values(products as Record<string, any>).map((p) => p.armario).filter(Boolean));
  const shelves = sortedUniqueValues(Object.values(products as Record<string, any>).map((p) => p.prateleira).filter(Boolean));

  const rowsList: any[] = [];
  Object.entries(products as Record<string, any>).forEach(([bc, p]) => {
    if (search && !bc.toUpperCase().includes(search.toUpperCase()) && !p.nome.toUpperCase().includes(search.toUpperCase())) return;
    if (filterCat !== "Todas" && p.categoria !== filterCat) return;
    if (filterCabinet !== "Todos" && (p.armario || "─") !== filterCabinet) return;
    if (filterShelf !== "Todas" && (p.prateleira || "─") !== filterShelf) return;

    const est = Number(p.estoque || 0);
    const min = Number(p.estoque_min || 0);
    const isCritical = min > 0 && est <= min;

    rowsList.push({
      barcode: bc,
      internal: p.codigo_produto || "─",
      nome: p.nome,
      categoria: p.categoria || "─",
      armario: p.armario || "─",
      prateleira: p.prateleira || "─",
      estoque: est,
      unid: p.unid || "UND",
      min: min,
      critical: isCritical,
      preco: Number(p.preco || 0),
    });
  });

  const totalValue = rowsList.reduce((acc, r) => acc + (r.estoque * r.preco), 0);
  const criticalCount = rowsList.filter((r) => r.critical).length;

  // Build physical print sheet HTML
  const dateStr = new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR").slice(0, 5);
  const printSheetRows = rowsList
    .map((r, i) => {
      const corLine = i % 2 === 0 ? "#F8FAFC" : "#FFFFFF";
      const badgeSt = r.critical ? "<span style='color:#EF4444;font-weight:bold'>Crítico</span>" : "<span style='color:#10B981'>OK</span>";
      return `
      <tr style="background:${corLine}">
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px">${r.barcode}</td>
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;font-weight:bold">${r.nome}</td>
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:center">${r.armario}</td>
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:center">${r.prateleira}</td>
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:center"><b>${r.estoque} ${r.unid}</b></td>
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:center">${badgeSt}</td>
        <td style="padding:6px;border:1px solid #E2E8F0;font-size:11px;text-align:center;font-weight:bold">__________</td>
      </tr>
    `;
    })
    .join("");

  const printSheetHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family:Arial,sans-serif; margin:20px; color:#1E293B; background:#fff; }
          .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:10px; border-bottom:3px solid #e8680a; }
          .logo { font-size:26px; font-weight:900; color:#1e293b; }
          .logo span { color:#e8680a; }
          table { width:100%; border-collapse:collapse; margin-top:12px; }
          th { background:#1E293B; color:#fff; padding:8px; font-size:11px; text-align:left; border:1px solid #1E293B; }
          td { border:1px solid #E2E8F0; }
          .print-btn { display:block; width:100%; background:#1565c0; color:#fff; border:none; border-radius:6px; padding:12px; font-weight:bold; cursor:pointer; font-size:14px; margin-top:16px; text-transform:uppercase; text-align:center; text-decoration:none; }
          @media print { .print-btn { display:none !important; } .header { margin-bottom:10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">GE<span>PLAN</span></div>
            <div style="font-size:14px;font-weight:bold;color:#1e293b;margin-top:2px">Relatório de Inventário Físico</div>
            <div style="font-size:11px;color:#64748B">Folha de conferência de materiais nas gavetas/prateleiras</div>
          </div>
          <div style="text-align:right;font-size:11px;color:#64748B;line-height:1.5">
            <div><b>Data:</b> ${dateStr}</div>
            <div><b>Produtos listados:</b> ${rowsList.length}</div>
            <div><b>Filtro filtro:</b> ${filterCat}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Código Barras</th>
              <th>Descrição do Item</th>
              <th style="text-align:center">Armário</th>
              <th style="text-align:center">Prateleira</th>
              <th style="text-align:center">Qtd Sitema</th>
              <th style="text-align:center">Status</th>
              <th style="text-align:center">Qtd Física (Conferida)</th>
            </tr>
          </thead>
          <tbody>
            ${printSheetRows}
          </tbody>
        </table>
        
        <div style="margin-top:30px;font-size:11px;color:#94A3B8;text-align:center;border-top:1.5px solid #E2E8F0;padding-top:10px">
          GEPLAN &bull; Relatório emitido em ${dateStr} &bull; Auditor: ___________________________
        </div>
        
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir Folhas de Contagem</button>
      </body>
    </html>
  `;

  const sheetB64 = btoa(unescape(encodeURIComponent(printSheetHtml)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin text-3xl">⚙️</div>
        <span className="ml-3 font-semibold text-slate-500">Buscando armários e prateleiras...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-bold rounded-xl animate-fade-in">
          ✅ {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm font-bold rounded-xl animate-fade-in">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Overview totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-l-4 border-slate-700 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">
            Total Produtos
          </span>
          <div className="text-xl font-bold text-slate-800">{rowsList.length}</div>
        </div>
        <div className="bg-white border-l-4 border-[#C75B12] rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">
            Valor Total
          </span>
          <div className="text-xl font-bold text-[#C75B12]">{formatPrice(totalValue)}</div>
        </div>
        <div className="bg-white border-l-4 border-rose-500 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">
            Itens Críticos
          </span>
          <div className="text-xl font-bold text-rose-500">{criticalCount}</div>
        </div>
        <div className="bg-white border-l-4 border-blue-500 rounded-xl p-4 shadow-sm">
          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-1">
            Armários Cadastrados
          </span>
          <div className="text-xl font-bold text-blue-500">{cabinets.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex border-b border-slate-150 pb-2 overflow-x-auto gap-2">
          {["📋 Visualizar", "✏️ Editar Armário/Prateleira", "📄 Gerar PDF"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`py-2 px-4 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                tab === t
                  ? "bg-[#C75B12] text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Global Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white placeholder-slate-400"
            placeholder="🔍 Filtrar produto por nome ou barcode..."
          />

          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
          >
            <option value="Todas">Categorias (Todas)</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterCabinet}
            onChange={(e) => setFilterCabinet(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
          >
            <option value="Todos">Armários (Todos)</option>
            {cabinets.map((arm) => (
              <option key={arm} value={arm}>
                🗄️ Armário {arm}
              </option>
            ))}
          </select>

          <select
            value={filterShelf}
            onChange={(e) => setFilterShelf(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:bg-white"
          >
            <option value="Todas">Prateleiras (Todas)</option>
            {shelves.map((prat) => (
              <option key={prat} value={prat}>
                📦 Prateleira {prat}
              </option>
            ))}
          </select>
        </div>

        {/* Tab 1: Visualizar */}
        {tab === "📋 Visualizar" && (
          <div className="space-y-4 animate-fade-in pt-2">
            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 font-semibold text-slate-500">Cód. Barras</th>
                    <th className="p-3 font-semibold text-slate-500">Item</th>
                    <th className="p-3 font-semibold text-slate-500">Categoria</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Armário</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Prateleira</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Qtd Sistema</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Nível Mínimo</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rowsList.map((row) => (
                    <tr key={row.barcode} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-500">{row.barcode}</td>
                      <td className="p-3 font-bold text-slate-800">{row.nome}</td>
                      <td className="p-3 text-slate-500">{row.categoria}</td>
                      <td className="p-3 text-center text-slate-700 font-bold">🗄️ {row.armario}</td>
                      <td className="p-3 text-center text-slate-700 font-bold">📦 {row.prateleira}</td>
                      <td className={`p-3 text-center font-black ${row.critical ? "text-rose-600" : "text-slate-800"}`}>
                        {row.estoque}
                      </td>
                      <td className="p-3 text-center text-slate-500 font-bold">{row.min || "─"}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            row.critical
                              ? "bg-red-100 text-red-800"
                              : row.status.includes("Baixo")
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <a
                href={`data:text/html;base64,${sheetB64}`}
                download={`comprovante_inventario_${Date.now()}.html`}
                className="flex-1"
              >
                <button className="w-full text-center py-3 bg-[#1e293b] text-white hover:bg-[#0f172a] text-xs font-bold rounded-xl cursor-pointer">
                  📢EXPORTAR FOLHA CONFERÊNCIA INVENTÁRIO (CSV / HTML)
                </button>
              </a>
            </div>
          </div>
        )}

        {/* Tab 2: Editar */}
        {tab === "✏️ Editar Armário/Prateleira" && (
          <div className="space-y-4 pt-4 border-t border-slate-50 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Mapear Endereço no Almoxarifado
            </h4>

            <div className="max-w-xl space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                  Selecione o Produto para Localização
                </label>
                <select
                  value={editBc}
                  onChange={(e) => handleEditSelectChange(e.target.value)}
                  className="w-full bg-[#1E293B]/5 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="">─ Escolha o produto...</option>
                  {rowsList.map((r) => (
                    <option key={r.barcode} value={r.barcode}>
                      {r.barcode} &mdash; {r.nome} [At: {r.estoque}]
                    </option>
                  ))}
                </select>
              </div>

              {editBc && (
                <form onSubmit={handleSaveLocation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Armário 🗄️
                    </label>
                    <input
                      type="text"
                      value={editCabinet}
                      onChange={(e) => setEditCabinet(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      placeholder="Armário ex: A1, B2"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-widest">
                      Prateleira 📦
                    </label>
                    <input
                      type="text"
                      value={editShelf}
                      onChange={(e) => setEditShelf(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white"
                      placeholder="Prateleira ex: P3, P4"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Salvar Nova Localização
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="overflow-x-auto text-xs pt-4">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 font-semibold text-slate-500">Cód. Barras</th>
                    <th className="p-3 font-semibold text-slate-500">Item</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Armário atual</th>
                    <th className="p-3 font-semibold text-slate-500 text-center">Prateleira atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rowsList.map((row) => (
                    <tr key={row.barcode} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-slate-500">{row.barcode}</td>
                      <td className="p-3 font-bold text-slate-800">{row.nome}</td>
                      <td className="p-3 text-center text-slate-700 font-bold">🗄️ {row.armario}</td>
                      <td className="p-3 text-center text-slate-700 font-bold">📦 {row.prateleira}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Gerar PDF */}
        {tab === "📄 Gerar PDF" && (
          <div className="space-y-4 pt-2 animate-fade-in">
            <a
              href={`data:text/html;base64,${sheetB64}`}
              download={`inventario_GEPLAN_${Date.now()}.html`}
              className="block w-full"
            >
              <button className="w-full text-center py-3 bg-[#e8680a] text-white hover:bg-orange-600 text-sm font-black rounded-xl cursor-pointer shadow-lg shadow-orange-500/10">
                🖨️ BAIXAR FOLHA FÍSICA INVENTÁRIO (IMPRIMIR)
              </button>
            </a>
            <p className="text-xs text-slate-400 text-center leading-normal">
              O arquivo HTML baixado pode ser aberto em qualquer navegador. Pressione as teclas <b>Ctrl+P</b> e selecione &ldquo;Salvar como PDF&rdquo; ou direcione para a sua impressora padrão.
            </p>
            <iframe
              srcDoc={printSheetHtml}
              className="w-full h-[500px] border border-slate-200 rounded-xl bg-white shadow-sm"
              title="Folha de Contagem Inventário"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helpers
function sortedUniqueValues(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}
