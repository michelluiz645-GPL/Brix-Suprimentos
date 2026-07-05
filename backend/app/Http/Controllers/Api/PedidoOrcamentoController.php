<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarPedidoOrcamentoRequest;
use App\Http\Requests\EnviarAprovacaoManutencaoRequest;
use App\Http\Requests\RegistrarCompraPedidoOrcamentoRequest;
use App\Http\Requests\RejeitarPedidoOrcamentoRequest;
use App\Models\PedidoOrcamento;
use App\Services\PedidoOrcamentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoOrcamentoController extends Controller
{
    public function __construct(private PedidoOrcamentoService $service) {}

    public function index(): JsonResponse
    {
        $pedidos = PedidoOrcamento::with([
            'solicitante', 'cotadoPor', 'aprovadoManutencaoPor', 'aprovadoCompraPor', 'compradoPor', 'recebidoPor',
        ])->orderByDesc('created_at')->get()->map(fn ($p) => $this->serialize($p));

        return response()->json(['data' => $pedidos, 'message' => 'OK']);
    }

    public function store(CriarPedidoOrcamentoRequest $request): JsonResponse
    {
        $pedido = $this->service->criar($request->validated(), $request->user());

        return response()->json([
            'data'    => $this->serialize($pedido),
            'message' => 'Pedido de orçamento criado com sucesso.',
        ], 201);
    }

    public function iniciarCotacao(Request $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'PENDENTE')) {
            return $erro;
        }

        $this->service->iniciarCotacao($pedidoOrcamento, $request->user());

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Cotação iniciada.']);
    }

    public function enviarAprovacaoManutencao(EnviarAprovacaoManutencaoRequest $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'COTANDO')) {
            return $erro;
        }

        $this->service->enviarParaAprovacaoManutencao($pedidoOrcamento, $request->validated(), $request->user());

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Enviado para aprovação da Manutenção.']);
    }

    public function aprovarManutencao(Request $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'AGUARDANDO_APROVACAO_MANUTENCAO')) {
            return $erro;
        }

        $this->service->aprovarManutencao($pedidoOrcamento, $request->user());

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Aprovado pela Manutenção.']);
    }

    /**
     * A responsabilidade exigida para rejeitar depende do estágio atual do
     * pedido (Manutenção rejeita o orçamento, Suprimentos rejeita a compra) —
     * por isso a checagem acontece aqui, e não em uma rota/middleware fixos.
     */
    public function rejeitar(RejeitarPedidoOrcamentoRequest $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        $responsabilidadeExigida = match ($pedidoOrcamento->status) {
            'AGUARDANDO_APROVACAO_MANUTENCAO' => 'aprovador_manutencao',
            'AGUARDANDO_APROVACAO_COMPRA'      => 'aprovador_suprimentos',
            default => null,
        };

        if (! $responsabilidadeExigida) {
            return response()->json(['data' => null, 'message' => 'Este pedido não pode ser rejeitado no estágio atual.'], 422);
        }
        if (! $request->user()->temResponsabilidade('pedido_orcamento', $responsabilidadeExigida)) {
            return $this->erroResponsabilidade();
        }

        $this->service->rejeitar($pedidoOrcamento, $request->user(), $request->validated('motivo'));

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Pedido rejeitado.']);
    }

    public function aprovarCompra(Request $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'AGUARDANDO_APROVACAO_COMPRA')) {
            return $erro;
        }

        $this->service->aprovarCompra($pedidoOrcamento, $request->user());

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Compra aprovada.']);
    }

    public function registrarCompra(RegistrarCompraPedidoOrcamentoRequest $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'APROVADO')) {
            return $erro;
        }

        $this->service->registrarCompra($pedidoOrcamento, $request->validated(), $request->user());

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Compra registrada.']);
    }

    public function confirmarRecebimento(Request $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'EM_TRANSITO')) {
            return $erro;
        }

        $this->service->confirmarRecebimento($pedidoOrcamento, $request->user());

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Recebimento confirmado.']);
    }

    private function garantirStatus(PedidoOrcamento $pedido, string $statusEsperado): ?JsonResponse
    {
        if ($pedido->status !== $statusEsperado) {
            return response()->json([
                'data'    => null,
                'message' => 'Este pedido já não está mais nesta etapa do fluxo.',
            ], 422);
        }

        return null;
    }

    private function erroResponsabilidade(): JsonResponse
    {
        return response()->json([
            'data'    => null,
            'message' => 'Você não tem a responsabilidade necessária para esta ação.',
        ], 403);
    }

    private function serialize(PedidoOrcamento $p): array
    {
        return [
            'id'           => $p->id,
            'numero_sc'    => $p->numero_sc,
            'data'         => $p->data?->format('Y-m-d'),
            'setor'        => $p->setor,
            'solicitante'  => $p->solicitante?->nome,
            'destino'      => $p->destino,
            'tipo_destino' => $p->tipo_destino,
            'urgencia'     => $p->urgencia,
            'status'       => $p->status,
            'itens'        => $p->itens,
            'valor_total'  => (float) $p->valor_total,
            'timeline'     => $p->timeline,

            'data_cotacao' => $p->data_cotacao?->format('d/m/Y H:i'),
            'cotado_por'   => $p->cotadoPor?->nome,

            'data_aprovacao_manutencao' => $p->data_aprovacao_manutencao?->format('d/m/Y H:i'),
            'aprovado_manutencao_por'   => $p->aprovadoManutencaoPor?->nome,

            'data_aprovacao_compra' => $p->data_aprovacao_compra?->format('d/m/Y H:i'),
            'aprovado_compra_por'   => $p->aprovadoCompraPor?->nome,

            'data_compra'               => $p->data_compra?->format('d/m/Y H:i'),
            'comprado_por'              => $p->compradoPor?->nome,
            'data_prevista_recebimento' => $p->data_prevista_recebimento?->format('Y-m-d'),

            'data_recebimento' => $p->data_recebimento?->format('d/m/Y H:i'),
            'recebido_por'     => $p->recebidoPor?->nome,

            'motivo_rejeicao' => $p->motivo_rejeicao,
        ];
    }
}
