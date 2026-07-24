<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CancelarRequisicaoAlmoxarifadoRequest;
use App\Http\Requests\ConfirmarSeparacaoRequisicaoAlmoxarifadoRequest;
use App\Http\Requests\CriarRequisicaoAlmoxarifadoRequest;
use App\Http\Requests\RejeitarRequisicaoAlmoxarifadoRequest;
use App\Models\Equipe;
use App\Models\Obra;
use App\Models\Produto;
use App\Models\RequisicaoAlmoxarifado;
use App\Services\RequisicaoAlmoxarifadoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequisicaoAlmoxarifadoController extends Controller
{
    private ?array $centroCustoEquipeCache = null;
    private ?array $centroCustoObraCache = null;

    public function __construct(private RequisicaoAlmoxarifadoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $query = RequisicaoAlmoxarifado::with(['solicitante', 'itens.produto', 'itens.produtoVariacao'])->latest();

        // Quem tem a responsabilidade de "receber" (aprovador) vê a fila
        // inteira; quem só "envia" (solicitante) vê as próprias.
        if (! $usuario->temResponsabilidade('requisicao_almoxarifado', 'aprovador')) {
            $query->where('solicitante_id', $usuario->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $lista = $query->get()->map(fn ($r) => $this->serialize($r));

        return response()->json(['data' => $lista, 'message' => 'OK']);
    }

    public function show(RequisicaoAlmoxarifado $requisicao): JsonResponse
    {
        $requisicao->load(['solicitante', 'aprovadoPor', 'rejeitadoPor', 'canceladoPor', 'separadoPor', 'itens.produto', 'itens.produtoVariacao']);

        return response()->json(['data' => $this->serialize($requisicao), 'message' => 'OK']);
    }

    /**
     * Centro de custo não é um campo da requisição em si — vem da Equipe
     * (RF-015) ou da Obra (RF-017) referenciada por cada item, dependendo do
     * destino. Mapas cacheados na instância (uma por request) pra evitar N+1.
     */
    private function centroCustoPorEquipe(): array
    {
        return $this->centroCustoEquipeCache ??= Equipe::whereNotNull('centro_custo')->pluck('centro_custo', 'numero')->all();
    }

    private function centroCustoPorObra(): array
    {
        return $this->centroCustoObraCache ??= Obra::whereNotNull('centro_custo')->pluck('centro_custo', 'nome')->all();
    }

    public function store(CriarRequisicaoAlmoxarifadoRequest $request): JsonResponse
    {
        $requisicao = $this->service->criar($request->validated(), $request->user());

        return response()->json(['data' => $this->serialize($requisicao), 'message' => 'Requisição enviada para o Almoxarifado.'], 201);
    }

    public function aprovar(Request $request, RequisicaoAlmoxarifado $requisicao): JsonResponse
    {
        try {
            $this->service->aprovar($requisicao, $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($requisicao->fresh(['itens.produto', 'itens.produtoVariacao'])), 'message' => 'Requisição aprovada.']);
    }

    public function rejeitar(RejeitarRequisicaoAlmoxarifadoRequest $request, RequisicaoAlmoxarifado $requisicao): JsonResponse
    {
        try {
            $this->service->rejeitar($requisicao, $request->user(), $request->motivo);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($requisicao->fresh()), 'message' => 'Requisição rejeitada.']);
    }

    public function cancelar(CancelarRequisicaoAlmoxarifadoRequest $request, RequisicaoAlmoxarifado $requisicao): JsonResponse
    {
        try {
            $this->service->cancelar($requisicao, $request->user(), $request->motivo);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($requisicao->fresh()), 'message' => 'Requisição cancelada.']);
    }

    public function confirmarSeparacao(ConfirmarSeparacaoRequisicaoAlmoxarifadoRequest $request, RequisicaoAlmoxarifado $requisicao): JsonResponse
    {
        try {
            $this->service->confirmarSeparacao($requisicao, $request->validated(), $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        $requisicao = $requisicao->fresh(['itens.produto', 'itens.produtoVariacao']);
        $mensagem = $requisicao->status === 'CONCLUIDA'
            ? 'Separação confirmada — saída registrada.'
            : 'Separação parcial registrada — itens restantes seguem pendentes.';

        return response()->json(['data' => $this->serialize($requisicao), 'message' => $mensagem]);
    }

    /**
     * Catálogo pronto pro picker da requisição: mesmos dados de
     * ProdutoController::serialize() (armário/prateleira/estoque/marcas),
     * já descontando o que está reservado por requisições aprovadas ainda
     * não separadas (calculado na hora, sem contador armazenado).
     */
    public function produtosDisponiveis(): JsonResponse
    {
        $reservadoVariacao = $this->service->reservadoPorVariacaoBulk();
        $reservadoProduto  = $this->service->reservadoPorProdutoBulk();

        $produtos = Produto::with('variacoes')->where('status', 'ATIVO')->orderBy('nome')->get()
            ->map(function (Produto $p) use ($reservadoVariacao, $reservadoProduto) {
                $ativas       = $p->variacoes->where('status', 'ATIVO');
                $estoqueTotal = (float) $ativas->sum('estoque');
                $reservado    = (float) ($reservadoProduto[$p->id] ?? 0);

                return [
                    'id'                => $p->id,
                    'codigo_produto'    => $p->codigo_produto,
                    'nome'              => $p->nome,
                    'categoria'         => $p->categoria,
                    'unid'              => $p->unid,
                    'armario'           => $p->armario,
                    'prateleira'        => $p->prateleira,
                    'marca_obrigatoria' => (bool) $p->marca_obrigatoria,
                    'estoque_total'     => $estoqueTotal,
                    'reservado'         => $reservado,
                    'disponivel'        => $estoqueTotal - $reservado,
                    'variacoes'         => $ativas->map(function ($v) use ($reservadoVariacao) {
                        $reservadoV = (float) ($reservadoVariacao[$v->id] ?? 0);

                        return [
                            'id'                => $v->id,
                            'marca'             => $v->marca,
                            'codigo_fabricante' => $v->codigo_fabricante,
                            'preco'             => (float) $v->preco,
                            'estoque'           => (float) $v->estoque,
                            'reservado'         => $reservadoV,
                            'disponivel'        => (float) $v->estoque - $reservadoV,
                        ];
                    })->values(),
                ];
            });

        return response()->json(['data' => $produtos, 'message' => 'OK']);
    }

    private function serialize(RequisicaoAlmoxarifado $r): array
    {
        $centroCustoEquipe = $this->centroCustoPorEquipe();
        $centroCustoObra   = $this->centroCustoPorObra();

        return [
            'id'                  => $r->id,
            'numero'              => $r->numero,
            'setor'               => $r->setor,
            'solicitante'         => $r->solicitante ? ['id' => $r->solicitante->id, 'nome' => $r->solicitante->nome] : null,
            'data'                => $r->data?->format('Y-m-d'),
            'data_desejada'       => $r->data_desejada?->format('Y-m-d'),
            'urgencia'            => $r->urgencia,
            'justificativa'       => $r->justificativa,
            'status'              => $r->status,
            'aprovado_por'        => $r->aprovadoPor?->nome,
            'data_aprovacao'      => $r->data_aprovacao?->format('d/m/Y H:i'),
            'rejeitado_por'       => $r->rejeitadoPor?->nome,
            'data_rejeicao'       => $r->data_rejeicao?->format('d/m/Y H:i'),
            'motivo_rejeicao'     => $r->motivo_rejeicao,
            'cancelado_por'       => $r->canceladoPor?->nome,
            'data_cancelamento'   => $r->data_cancelamento?->format('d/m/Y H:i'),
            'motivo_cancelamento' => $r->motivo_cancelamento,
            'separado_por'        => $r->separadoPor?->nome,
            'data_separacao'      => $r->data_separacao?->format('d/m/Y H:i'),
            'numero_pedido_saida' => $r->numero_pedido_saida,
            'itens'               => $r->itens->map(fn ($i) => [
                'id'                 => $i->id,
                'produto_id'         => $i->produto_id,
                'produto_codigo'     => $i->produto?->codigo_produto,
                'produto_nome'       => $i->produto?->nome,
                'produto_categoria'  => $i->produto?->categoria,
                'produto_unid'       => $i->produto?->unid,
                'produto_armario'    => $i->produto?->armario,
                'produto_prateleira' => $i->produto?->prateleira,
                'produto_variacao_id'=> $i->produto_variacao_id,
                'marca'              => $i->produtoVariacao?->marca,
                'quantidade'         => (float) $i->quantidade,
                'destino'            => $i->destino,
                'destino_equipe'     => $i->destino_equipe,
                'destino_frota'      => $i->destino_frota,
                'destino_obra'       => $i->destino_obra,
                'centro_custo'       => $i->destino_equipe
                    ? ($centroCustoEquipe[$i->destino_equipe] ?? null)
                    : ($i->destino_obra ? ($centroCustoObra[$i->destino_obra] ?? null) : null),
                'colaborador_epi'    => $i->colaborador_epi,
                'observacao'         => $i->observacao,
                'status'             => $i->status,
                'numero_pedido_saida'=> $i->numero_pedido_saida,
            ])->values(),
            'criado_em' => $r->created_at?->format('d/m/Y H:i'),
        ];
    }
}
