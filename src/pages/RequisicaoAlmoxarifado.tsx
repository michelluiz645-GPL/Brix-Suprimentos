import React, { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";
import { today } from "@/utils/formatters";
import type { User, Employee, Vehicle, Team } from "@/types";
import { Plus, Trash2, Check, X, PackageCheck } from "lucide-react";

const inp = "w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#EA6C0A] transition-colors";
const lbl = "text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1";

const DESTINOS = ["Para a Equipe", "Roçada", "Obra", "Administração", "Manutenção", "Consumível", "Frota", "Outros"];
const URGENCIAS = ["Baixa", "Média", "Alta"];

const STATUS_COR: Record<string, string> = {
  PENDENTE:  "bg-amber-100 text-amber-700",
  APROVADA:  "bg-sky-100 text-sky-700",
  REJEITADA: "bg-rose-100 text-rose-700",
  CANCELADA: "bg-rose-100 text-rose-600",
  CONCLUIDA: "bg-emerald-100 text-emerald-700",
};

interface ObraOpcao { id?: number; nome: string; status: string }

interface Variacao { id: number; marca: string | null; codigo_fabricante: string | null; preco: number; estoque: number; reservado: number; disponivel: number }
interface ProdutoDisponivel {
  id: number; codigo_produto: string; nome: string; categoria: string; unid: string;
  armario: string | null; prateleira: string | null; marca_obrigatoria: boolean;
  estoque_total: number; reservado: number; disponivel: number; variacoes: Variacao[];
}

interface ItemForm {
  produto_id: number | null; produto_variacao_id: number | null; quantidade: number;
  destino: string; destino_equipe: string; destino_frota: string; destino_obra: string; colaborador_epi: string; observacao: string;
}
const itemFormVazio = (): ItemForm => ({
  produto_id: null, produto_variacao_id: null, quantidade: 1,
  destino: DESTINOS[0], destino_equipe: "", destino_frota: "", destino_obra: "", colaborador_epi: "", observacao: "",
});

interface ItemRequisicao {
  id: number; produto_id: number; produto_codigo: string; produto_nome: string; produto_categoria: string;
  produto_unid: string; produto_armario: string | null; produto_prateleira: string | null;
  produto_variacao_id: number | null; marca: string | null; quantidade: number;
  destino: string; destino_equipe: string | null; destino_frota: string | null; destino_obra: string | null;
  centro_custo: string | null;
  colaborador_epi: string | null; observacao: string | null;
  status: "PENDENTE" | "SEPARADO" | "INDISPONIVEL"; numero_pedido_saida: string | null;
}
interface Requisicao {
  id: number; numero: string; setor: string;
  solicitante: { id: number; nome: string } | null;
  data: string; data_desejada: string | null; urgencia: string; justificativa: string | null; status: string;
  aprovado_por: string | null; data_aprovacao: string | null;
  rejeitado_por: string | null; data_rejeicao: string | null; motivo_rejeicao: string | null;
  cancelado_por: string | null; data_cancelamento: string | null; motivo_cancelamento: string | null;
  separado_por: string | null; data_separacao: string | null; numero_pedido_saida: string | null;
  itens: ItemRequisicao[]; criado_em: string | null;
}

interface Props { user: User; setor: string }

export default function RequisicaoAlmoxarifado({ user }: Props) {
  const toast = useToast();

  // "Enviar" (solicitante) e "receber" (aprovador) são responsabilidades
  // independentes, configuráveis por usuário em Usuários — não fixas pelo
  // setor da tela. admin_geral acumula as duas automaticamente.
  const minhasResp = user.papel === "admin_geral"
    ? new Set(["solicitante", "aprovador"])
    : new Set(user.responsabilidades?.requisicao_almoxarifado ?? []);
  const podeEnviar = minhasResp.has("solicitante");
  const podeReceber = minhasResp.has("aprovador");

  const [lista, setLista] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<ProdutoDisponivel[]>([]);
  const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
  const [obras, setObras] = useState<ObraOpcao[]>([]);
  const [equipes, setEquipes] = useState<Team[]>([]);
  const [funcionarios, setFuncionarios] = useState<Employee[]>([]);

  const abas = [
    ...(podeEnviar ? ["Nova Requisição", "Minhas Requisições"] : []),
    ...(podeReceber ? ["Fila de Aprovação", "Separação", "Histórico"] : []),
  ];
  const [aba, setAba] = useState(abas[0] ?? "");

  const [data, setData] = useState(today());
  const [dataDesejada, setDataDesejada] = useState("");
  const [urgencia, setUrgencia] = useState("Média");
  const [justificativa, setJustificativa] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([itemFormVazio()]);
  const [salvando, setSalvando] = useState(false);

  const [sel, setSel] = useState<Requisicao | null>(null);
  const [modal, setModal] = useState<"ver" | "rejeitar" | "cancelar" | "separar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [separacao, setSeparacao] = useState({ almoxarifado: "", resp_almox: "", entregador: "" });
  const [marcaEscolhida, setMarcaEscolhida] = useState<Record<number, number>>({});
  const [acaoItem, setAcaoItem] = useState<Record<number, "separar" | "indisponivel" | "pendente">>({});

  const carregar = () => {
    setLoading(true);
    api.requisicoesAlmoxarifado.list().then((r) => {
      setLista(Array.isArray(r) ? r as Requisicao[] : []);
    }).catch(() => setLista([])).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    api.requisicoesAlmoxarifado.produtosDisponiveis().then((r) => {
      setProdutos(Array.isArray(r) ? r as ProdutoDisponivel[] : []);
    }).catch(() => setProdutos([]));
    api.veiculos.list().then((r) => {
      const d = (r as { data: Vehicle[] }).data ?? [];
      const l: Vehicle[] = Array.isArray(d) ? d : Object.values(d);
      setVeiculos(l.filter((v) => v.status === "ATIVO"));
    }).catch(() => {});
    api.obras.list().then((r) => {
      const d = (r as { data: ObraOpcao[] }).data ?? [];
      const l: ObraOpcao[] = Array.isArray(d) ? d : Object.values(d);
      setObras(l.filter((o) => o.status === "ATIVA"));
    }).catch(() => {});
    api.equipes.list().then((r) => {
      const d = (r as { data: Team[] }).data ?? [];
      setEquipes(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => {});
    api.funcionarios.list("status=ATIVO").then((r) => {
      const d = (r as { data: Employee[] }).data ?? [];
      setFuncionarios(Array.isArray(d) ? d : Object.values(d));
    }).catch(() => {});
  }, []);

  const produtoPorId = (id: number | null) => produtos.find((p) => p.id === id);

  const selectProduto = (idx: number, id: string) => {
    const produtoId = id ? Number(id) : null;
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, produto_id: produtoId, produto_variacao_id: null } : it));
  };

  const selectVariacao = (idx: number, variacaoId: string) => {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, produto_variacao_id: variacaoId ? Number(variacaoId) : null } : it));
  };

  const updateItem = (idx: number, field: keyof ItemForm, value: string | number) =>
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const addItem = () => setItens((prev) => [...prev, itemFormVazio()]);
  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.some((i) => !i.produto_id)) { toast.error("Todos os itens precisam ter um item selecionado."); return; }
    if (itens.some((i) => i.quantidade <= 0)) { toast.error("Todos os itens precisam ter quantidade maior que zero."); return; }
    if (itens.some((i) => !i.destino)) { toast.error("Todos os itens precisam ter um destino selecionado."); return; }
    if (!dataDesejada.trim()) { toast.error("Data desejada para retirada é obrigatória."); return; }
    if (itens.some((i) => i.destino === "Para a Equipe" && !i.destino_equipe.trim())) { toast.error('Selecione a equipe para itens com destino "Para a Equipe".'); return; }
    if (itens.some((i) => i.destino === "Frota" && !i.destino_frota.trim())) { toast.error('Informe a placa da frota para itens com destino "Frota".'); return; }
    if (itens.some((i) => i.destino === "Obra" && !i.destino_obra.trim())) { toast.error('Selecione a obra para itens com destino "Obra".'); return; }
    const itemEpiSemColaborador = itens.find((i) => produtoPorId(i.produto_id)?.categoria === "EPI" && !i.colaborador_epi.trim());
    if (itemEpiSemColaborador) { toast.error("Selecione o colaborador para o item de EPI."); return; }
    const itemMarcaObrigatoria = itens.find((i) => produtoPorId(i.produto_id)?.marca_obrigatoria && !i.produto_variacao_id);
    if (itemMarcaObrigatoria) { toast.error(`"${produtoPorId(itemMarcaObrigatoria.produto_id)?.nome}" exige a escolha da marca.`); return; }
    const over = itens.find((i) => {
      const p = produtoPorId(i.produto_id);
      if (!p) return false;
      if (i.produto_variacao_id) {
        const v = p.variacoes.find((v) => v.id === i.produto_variacao_id);
        return v ? i.quantidade > v.disponivel : false;
      }
      return i.quantidade > p.disponivel;
    });
    if (over) { toast.error(`"${produtoPorId(over.produto_id)?.nome}" — quantidade maior que o saldo disponível.`); return; }

    setSalvando(true);
    try {
      await api.requisicoesAlmoxarifado.create({
        data, data_desejada: dataDesejada, urgencia, justificativa: justificativa || null,
        itens: itens.map((i) => ({
          produto_id: i.produto_id, produto_variacao_id: i.produto_variacao_id,
          quantidade: i.quantidade, destino: i.destino,
          destino_equipe: i.destino_equipe || null,
          destino_frota: i.destino_frota || null, destino_obra: i.destino_obra || null,
          colaborador_epi: i.colaborador_epi || null, observacao: i.observacao || null,
        })),
      });
      toast.success("Requisição enviada para o Almoxarifado!");
      setData(today()); setDataDesejada(""); setUrgencia("Média"); setJustificativa(""); setItens([itemFormVazio()]);
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a requisição.");
    } finally { setSalvando(false); }
  };

  const aprovar = async (r: Requisicao) => {
    try {
      await api.requisicoesAlmoxarifado.aprovar(r.id);
      toast.success("Requisição aprovada!");
      carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aprovar.");
    }
  };

  const abrirModal = (r: Requisicao, tipo: "ver" | "rejeitar" | "cancelar" | "separar") => {
    setSel(r);
    setMotivo("");
    if (tipo === "separar") {
      setSeparacao({ almoxarifado: "", resp_almox: "", entregador: "" });
      const marcas: Record<number, number> = {};
      const acoes: Record<number, "separar" | "indisponivel" | "pendente"> = {};
      r.itens.forEach((i) => {
        if (i.produto_variacao_id) marcas[i.id] = i.produto_variacao_id;
        // Por padrão já vem marcado "Separar" pra quem tem tudo disponível
        // fechar em um clique só — quem não vai ter o item troca pra
        // "Indisponível" ou deixa "Pendente" pra decidir depois.
        if (i.status === "PENDENTE") acoes[i.id] = "separar";
      });
      setMarcaEscolhida(marcas);
      setAcaoItem(acoes);
    }
    setModal(tipo);
  };
  const fecharModal = () => { setModal(null); setSel(null); };

  const confirmarRejeitar = async () => {
    if (!sel) return;
    if (!motivo.trim()) { toast.error("Informe o motivo da rejeição."); return; }
    try {
      await api.requisicoesAlmoxarifado.rejeitar(sel.id, { motivo });
      toast.success("Requisição rejeitada.");
      fecharModal(); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível rejeitar.");
    }
  };

  const confirmarCancelar = async () => {
    if (!sel) return;
    if (!motivo.trim()) { toast.error("Informe o motivo do cancelamento."); return; }
    try {
      await api.requisicoesAlmoxarifado.cancelar(sel.id, { motivo });
      toast.success("Requisição cancelada.");
      fecharModal(); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível cancelar.");
    }
  };

  // Só faz sentido pedir escolha de marca se houver mais de uma variação
  // ativa — com uma só, o Almoxarife (e o backend) usam ela direto.
  const precisaEscolherMarca = (i: ItemRequisicao) =>
    !i.produto_variacao_id && (produtos.find((p) => p.id === i.produto_id)?.variacoes.length ?? 0) > 1;

  const confirmarSeparacao = async () => {
    if (!sel) return;
    if (!separacao.almoxarifado.trim() || !separacao.resp_almox.trim() || !separacao.entregador.trim()) {
      toast.error("Preencha Suprimentos, Resp. Suprimentos e Entregador."); return;
    }
    const itensAcionados = sel.itens.filter((i) => i.status === "PENDENTE" && acaoItem[i.id] && acaoItem[i.id] !== "pendente");
    if (itensAcionados.length === 0) { toast.error("Marque ao menos um item como Separar ou Indisponível."); return; }

    const itensParaSeparar = itensAcionados.filter((i) => acaoItem[i.id] === "separar");
    const semMarca = itensParaSeparar.find((i) => precisaEscolherMarca(i) && !marcaEscolhida[i.id]);
    if (semMarca) { toast.error(`Selecione a marca para "${semMarca.produto_nome}".`); return; }

    try {
      const itensPayload = itensAcionados.map((i) => ({
        item_id: i.id,
        acao: acaoItem[i.id] === "separar" ? "separar" : "indisponivel",
        ...(acaoItem[i.id] === "separar" && precisaEscolherMarca(i) ? { produto_variacao_id: marcaEscolhida[i.id] } : {}),
      }));

      const res = await api.requisicoesAlmoxarifado.confirmarSeparacao(sel.id, {
        ...separacao, itens: itensPayload,
      }) as { data: Requisicao };
      toast.success(res.data?.status === "CONCLUIDA"
        ? `Separação confirmada! Cupom nº ${res.data?.numero_pedido_saida ?? ""}`
        : "Separação parcial registrada — itens restantes seguem pendentes.");
      fecharModal(); carregar();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível confirmar a separação.");
    }
  };

  const listaAba = useMemo(() => {
    if (aba === "Fila de Aprovação") return lista.filter((r) => r.status === "PENDENTE");
    if (aba === "Separação") return lista.filter((r) => r.status === "APROVADA");
    if (aba === "Histórico") return lista.filter((r) => ["REJEITADA", "CANCELADA", "CONCLUIDA"].includes(r.status));
    if (aba === "Minhas Requisições") return lista;
    return [];
  }, [lista, aba]);

  return (
    <>
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
      <div className="space-y-6">
        <PageHeader title="Requisição de Almoxarifado" subtitle="Peça itens que já existem em estoque — EPI, ferramenta, consumível" />

        {abas.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-xs text-slate-400">
            Você ainda não tem permissão de enviar ou receber requisições. Peça a um Admin para liberar em Usuários.
          </div>
        ) : (
        <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 shadow-sm w-fit">
          {abas.map((a) => (
            <button key={a} onClick={() => setAba(a)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${aba === a ? "bg-[#EA6C0A] text-white" : "text-slate-500 hover:bg-slate-50"}`}>
              {a}
            </button>
          ))}
        </div>
        )}

        {aba === "Nova Requisição" && (
          <form onSubmit={handleCriar} className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Dados da Requisição</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={lbl}>Data do Pedido</label>
                  <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Data Desejada p/ Retirada *</label>
                  <input type="date" min={data} value={dataDesejada} onChange={(e) => setDataDesejada(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Urgência</label>
                  <select value={urgencia} onChange={(e) => setUrgencia(e.target.value)} className={inp}>
                    {URGENCIAS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Justificativa</label>
                  <input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Opcional" className={inp} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Itens Solicitados</h3>
                <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs font-bold text-[#EA6C0A] hover:underline">
                  <Plus size={14} /> Adicionar item
                </button>
              </div>
              <div className="space-y-3">
                {itens.map((item, idx) => {
                  const produto = produtoPorId(item.produto_id);
                  const variacoes = produto?.variacoes ?? [];
                  const isEpi = produto?.categoria === "EPI";
                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-start">
                        <div className="col-span-4">
                          <label className={lbl}>Item</label>
                          <select value={item.produto_id ?? ""} onChange={(e) => selectProduto(idx, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]">
                            <option value="">— Selecione —</option>
                            {produtos.map((p) => <option key={p.id} value={p.id}>{p.codigo_produto} — {p.nome}</option>)}
                          </select>
                          {produto && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              {(produto.armario || produto.prateleira) && `📍 ${produto.armario ?? "—"}/${produto.prateleira ?? "—"} · `}
                              Disponível: {produto.disponivel} {produto.unid}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className={lbl}>Qtd *</label>
                          <input type="number" min={0.01} step={0.01} value={item.quantidade}
                            onChange={(e) => updateItem(idx, "quantidade", Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs text-center font-mono focus:outline-none focus:border-[#EA6C0A]" />
                        </div>
                        <div className="col-span-3">
                          <label className={lbl}>Destino</label>
                          <select value={item.destino} onChange={(e) => updateItem(idx, "destino", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]">
                            {DESTINOS.map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          {item.destino === "Para a Equipe" && (
                            <select value={item.destino_equipe}
                              onChange={(e) => {
                                updateItem(idx, "destino_equipe", e.target.value);
                                updateItem(idx, "colaborador_epi", "");
                              }}
                              className="w-full mt-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#EA6C0A]">
                              <option value="">— Equipe —</option>
                              {equipes.map((eq) => <option key={eq.numero} value={eq.numero}>{eq.numero} — {eq.nome}</option>)}
                            </select>
                          )}
                          {item.destino === "Frota" && (
                            <select value={item.destino_frota} onChange={(e) => updateItem(idx, "destino_frota", e.target.value)}
                              className="w-full mt-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#EA6C0A]">
                              <option value="">— Veículo —</option>
                              {veiculos.map((v) => <option key={v.id} value={v.placa}>{v.placa} — {v.modelo}</option>)}
                            </select>
                          )}
                          {item.destino === "Obra" && (
                            <select value={item.destino_obra} onChange={(e) => updateItem(idx, "destino_obra", e.target.value)}
                              className="w-full mt-1 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#EA6C0A]">
                              <option value="">— Obra —</option>
                              {obras.map((o) => <option key={o.nome} value={o.nome}>{o.nome}</option>)}
                            </select>
                          )}
                        </div>
                        <div className="col-span-2">
                          {isEpi && (() => {
                            const colaboradoresDaEquipe = item.destino === "Para a Equipe" && item.destino_equipe
                              ? funcionarios.filter((f) => f.equipe_num === item.destino_equipe)
                              : funcionarios;
                            return (
                              <>
                                <label className={lbl}>Colaborador (EPI)</label>
                                <select value={item.colaborador_epi} onChange={(e) => updateItem(idx, "colaborador_epi", e.target.value)}
                                  className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]">
                                  <option value="">— Colaborador —</option>
                                  {colaboradoresDaEquipe.map((f) => <option key={f.id} value={f.nome}>{f.nome} — {f.funcao}</option>)}
                                </select>
                              </>
                            );
                          })()}
                        </div>
                        <div className="col-span-1 flex items-end justify-end pt-4">
                          {itens.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-600 p-1"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>

                      {produto && produto.marca_obrigatoria && (
                        <div className="pl-1">
                          <label className={lbl}>Marca * <span className="font-normal normal-case text-slate-400">(esse item exige marca específica)</span></label>
                          <select value={item.produto_variacao_id ?? ""} onChange={(e) => selectVariacao(idx, e.target.value)}
                            className="w-full max-w-xs bg-amber-50 border border-amber-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#EA6C0A]">
                            <option value="">— Marca —</option>
                            {variacoes.map((v) => (
                              <option key={v.id} value={v.id}>{v.marca || "(sem marca)"} — disponível: {v.disponivel}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {produto && !produto.marca_obrigatoria && variacoes.length > 0 && (
                        <div className="pl-1 text-[10px] text-slate-400">
                          Marcas disponíveis (o Almoxarifado escolhe na separação): {variacoes.map((v) => `${v.marca || "sem marca"} (${v.disponivel})`).join(" · ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={salvando}
                className={`px-8 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${salvando ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#C75B12] to-[#EA6C0A] hover:-translate-y-0.5 shadow-orange-500/20"}`}>
                {salvando ? "Enviando..." : "Enviar Requisição →"}
              </button>
            </div>
          </form>
        )}

        {aba !== "Nova Requisição" && aba !== "" && (
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
            ) : listaAba.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">Nenhuma requisição encontrada.</div>
            ) : (
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Nº", "Data", "Retirada Desejada", "Solicitante", "Setor", "Itens", "Urgência", "Status", ""].map((h) => (
                    <th key={h} className="p-3 font-semibold text-slate-500 text-left">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {listaAba.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#EA6C0A]">{r.numero}</td>
                      <td className="p-3 text-slate-500">{r.criado_em ?? r.data}</td>
                      <td className="p-3 text-slate-500">{r.data_desejada ?? "—"}</td>
                      <td className="p-3 font-medium">{r.solicitante?.nome ?? "—"}</td>
                      <td className="p-3 text-slate-500">{r.setor}</td>
                      <td className="p-3 text-slate-500">
                        {r.itens.filter((i) => i.status !== "PENDENTE").length}/{r.itens.length} {r.itens.length === 1 ? "item" : "itens"}
                      </td>
                      <td className="p-3 text-slate-500">{r.urgencia}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => abrirModal(r, "ver")} className="text-xs font-bold text-slate-500 hover:text-[#EA6C0A]">Ver</button>
                          {aba === "Fila de Aprovação" && (
                            <>
                              <button onClick={() => aprovar(r)} title="Aprovar" className="text-emerald-500 hover:text-emerald-700"><Check size={16} /></button>
                              <button onClick={() => abrirModal(r, "rejeitar")} title="Rejeitar" className="text-rose-500 hover:text-rose-700"><X size={16} /></button>
                            </>
                          )}
                          {aba === "Separação" && (
                            <>
                              <button onClick={() => abrirModal(r, "separar")} title="Confirmar Separação" className="text-sky-500 hover:text-sky-700"><PackageCheck size={16} /></button>
                              <button onClick={() => abrirModal(r, "cancelar")} title="Cancelar" className="text-rose-500 hover:text-rose-700"><X size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal ver detalhe */}
      <Modal isOpen={modal === "ver" && !!sel} onClose={fecharModal} title={`Requisição ${sel?.numero ?? ""}`} size="lg">
        {sel && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="font-bold text-slate-500 block">Solicitante</span>{sel.solicitante?.nome ?? "—"}</div>
              <div><span className="font-bold text-slate-500 block">Setor</span>{sel.setor}</div>
              <div><span className="font-bold text-slate-500 block">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COR[sel.status] ?? "bg-slate-100 text-slate-500"}`}>{sel.status}</span>
              </div>
              <div><span className="font-bold text-slate-500 block">Urgência</span>{sel.urgencia}</div>
              <div><span className="font-bold text-slate-500 block">Data do Pedido</span>{sel.data}</div>
              <div><span className="font-bold text-slate-500 block">Retirada Desejada</span>{sel.data_desejada ?? "—"}</div>
            </div>
            {sel.justificativa && <div><span className="font-bold text-slate-500 block mb-1">Justificativa</span>{sel.justificativa}</div>}
            {sel.motivo_rejeicao && <div><span className="font-bold text-rose-500 block mb-1">Motivo da Rejeição</span>{sel.motivo_rejeicao} — {sel.rejeitado_por}</div>}
            {sel.motivo_cancelamento && <div><span className="font-bold text-rose-500 block mb-1">Motivo do Cancelamento</span>{sel.motivo_cancelamento} — {sel.cancelado_por}</div>}
            {sel.numero_pedido_saida && <div><span className="font-bold text-emerald-600 block mb-1">Saída gerada</span>Cupom nº {sel.numero_pedido_saida} — separado por {sel.separado_por}</div>}
            <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden mt-2">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Item", "Marca", "Qtd", "Localização", "Destino", "Centro de Custo", "Colaborador (EPI)", "Status"].map((h) => (
                  <th key={h} className="p-2 font-semibold text-slate-500 text-left">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {sel.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="p-2 font-medium">{i.produto_nome}</td>
                    <td className="p-2 text-slate-500">{i.marca ?? "—"}</td>
                    <td className="p-2 font-mono text-center">{i.quantidade} {i.produto_unid}</td>
                    <td className="p-2 font-mono text-slate-500">{i.produto_armario || i.produto_prateleira ? `${i.produto_armario ?? "—"}/${i.produto_prateleira ?? "—"}` : "—"}</td>
                    <td className="p-2 text-slate-500">{i.destino}{i.destino_equipe ? ` — ${i.destino_equipe}` : ""}{i.destino_obra ? ` — ${i.destino_obra}` : ""}{i.destino_frota ? ` — ${i.destino_frota}` : ""}</td>
                    <td className="p-2 font-mono text-slate-500">{i.centro_custo ?? "—"}</td>
                    <td className="p-2 text-slate-500">{i.colaborador_epi ?? "—"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        i.status === "SEPARADO" ? "bg-emerald-100 text-emerald-700"
                          : i.status === "INDISPONIVEL" ? "bg-slate-200 text-slate-600"
                          : "bg-amber-100 text-amber-700"
                      }`}>{i.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Modal rejeitar */}
      <Modal isOpen={modal === "rejeitar"} onClose={fecharModal} title={`Rejeitar Requisição ${sel?.numero ?? ""}`}>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Motivo *</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className={`${inp} resize-none`} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={fecharModal} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
            <button onClick={confirmarRejeitar} className="px-4 py-2 text-xs font-bold text-white bg-rose-500 rounded-lg hover:bg-rose-600">Rejeitar</button>
          </div>
        </div>
      </Modal>

      {/* Modal cancelar */}
      <Modal isOpen={modal === "cancelar"} onClose={fecharModal} title={`Cancelar Requisição ${sel?.numero ?? ""}`}>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Motivo *</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className={`${inp} resize-none`} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={fecharModal} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Voltar</button>
            <button onClick={confirmarCancelar} className="px-4 py-2 text-xs font-bold text-white bg-rose-500 rounded-lg hover:bg-rose-600">Cancelar Requisição</button>
          </div>
        </div>
      </Modal>

      {/* Modal separação */}
      <Modal isOpen={modal === "separar"} onClose={fecharModal} title={`Confirmar Separação — ${sel?.numero ?? ""}`} size="lg">
        {sel && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Suprimentos *</label>
                <input value={separacao.almoxarifado} onChange={(e) => setSeparacao((p) => ({ ...p, almoxarifado: e.target.value }))} placeholder="Ex: Almox Central" className={inp} />
              </div>
              <div>
                <label className={lbl}>Resp. Suprimentos *</label>
                <input value={separacao.resp_almox} onChange={(e) => setSeparacao((p) => ({ ...p, resp_almox: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className={lbl}>Entregador *</label>
                <input value={separacao.entregador} onChange={(e) => setSeparacao((p) => ({ ...p, entregador: e.target.value }))} className={inp} />
              </div>
            </div>
            <div className="space-y-2">
              {sel.itens.map((i) => {
                const produto = produtos.find((p) => p.id === i.produto_id);
                const resolvido = i.status !== "PENDENTE";
                return (
                  <div key={i.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${resolvido ? "bg-white border-slate-100 opacity-70" : "bg-slate-50 border-slate-200"}`}>
                    <div className="text-xs">
                      <span className="font-bold">{i.produto_nome}</span> — {i.quantidade} {i.produto_unid}
                      {i.marca && <span className="text-slate-400"> ({i.marca})</span>}
                      {(i.produto_armario || i.produto_prateleira) && (
                        <div className="mt-0.5 font-mono text-[10px] font-bold text-[#C75B12]">
                          📍 {i.produto_armario || "—"} / {i.produto_prateleira || "—"}
                        </div>
                      )}
                      {i.colaborador_epi && (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          Para: <span className="font-semibold">{i.colaborador_epi}</span>
                        </div>
                      )}
                    </div>
                    {resolvido ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${i.status === "SEPARADO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {i.status === "SEPARADO" ? "Já separado" : "Indisponível"}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex gap-1">
                          {(["separar", "indisponivel", "pendente"] as const).map((a) => (
                            <button key={a} type="button" onClick={() => setAcaoItem((p) => ({ ...p, [i.id]: a }))}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                                acaoItem[i.id] === a
                                  ? a === "separar" ? "bg-emerald-500 border-emerald-500 text-white"
                                    : a === "indisponivel" ? "bg-rose-500 border-rose-500 text-white"
                                    : "bg-slate-400 border-slate-400 text-white"
                                  : "bg-white border-slate-200 text-slate-500"
                              }`}>
                              {a === "separar" ? "Separar" : a === "indisponivel" ? "Indisponível" : "Pendente"}
                            </button>
                          ))}
                        </div>
                        {acaoItem[i.id] === "separar" && precisaEscolherMarca(i) && (
                          <select value={marcaEscolhida[i.id] ?? ""} onChange={(e) => setMarcaEscolhida((p) => ({ ...p, [i.id]: Number(e.target.value) }))}
                            className="bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#EA6C0A]">
                            <option value="">— Escolha a marca —</option>
                            {(produto?.variacoes ?? []).map((v) => (
                              <option key={v.id} value={v.id}>{v.marca || "(sem marca)"} — disponível: {v.disponivel}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={fecharModal} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Voltar</button>
              <button onClick={confirmarSeparacao} className="px-4 py-2 text-xs font-bold text-white bg-[#EA6C0A] rounded-lg hover:bg-[#C75B12]">Confirmar Separação</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
