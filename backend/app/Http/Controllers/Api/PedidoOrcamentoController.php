<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AprovarManutencaoPedidoOrcamentoRequest;
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
            'solicitante', 'cotadoPor', 'aprovadoManutencaoPor', 'aprovadoCompraPor', 'compradoPor', 'recebidoPor', 'retiradoPor',
        ])->orderByDesc('created_at')->get()->map(fn ($p) => $this->serialize($p));

        return response()->json(['data' => $pedidos, 'message' => 'OK']);
    }

    public function store(CriarPedidoOrcamentoRequest $request): JsonResponse
    {
        try {
            $pedido = $this->service->criar($request->validated(), $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

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

    /**
     * A responsabilidade exigida depende do setor do pedido: para MANUTENCAO
     * (e demais setores), quem aprova o orçamento é a Manutenção; para
     * ALMOXARIFADO (Reposição Automática), não existe uma Manutenção externa
     * envolvida — quem aprova é o próprio responsável de Suprimentos.
     */
    public function aprovarManutencao(AprovarManutencaoPedidoOrcamentoRequest $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        if ($erro = $this->garantirStatus($pedidoOrcamento, 'AGUARDANDO_APROVACAO_MANUTENCAO')) {
            return $erro;
        }

        $responsabilidadeExigida = $pedidoOrcamento->setor === 'ALMOXARIFADO' ? 'aprovador_suprimentos' : 'aprovador_manutencao';
        if (! $request->user()->temResponsabilidade('pedido_orcamento', $responsabilidadeExigida)) {
            return $this->erroResponsabilidade();
        }

        try {
            $this->service->aprovarManutencao($pedidoOrcamento, $request->user(), $request->validated('escolhas'));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Aprovado.']);
    }

    /**
     * A responsabilidade exigida para rejeitar depende do estágio atual do
     * pedido (Manutenção rejeita o orçamento, Suprimentos rejeita a compra) —
     * por isso a checagem acontece aqui, e não em uma rota/middleware fixos.
     * Pedidos do ALMOXARIFADO não passam pela Manutenção: quem rejeita o
     * orçamento nesse caso também é o aprovador de Suprimentos.
     */
    public function rejeitar(RejeitarPedidoOrcamentoRequest $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        $responsabilidadeExigida = match ($pedidoOrcamento->status) {
            'AGUARDANDO_APROVACAO_MANUTENCAO' => $pedidoOrcamento->setor === 'ALMOXARIFADO' ? 'aprovador_suprimentos' : 'aprovador_manutencao',
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

        try {
            $this->service->registrarCompra($pedidoOrcamento, $request->validated(), $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

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

    public function confirmarRetirada(Request $request, PedidoOrcamento $pedidoOrcamento): JsonResponse
    {
        try {
            $this->service->confirmarRetirada($pedidoOrcamento, $request->user());
        } catch (\InvalidArgumentException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $this->serialize($pedidoOrcamento->fresh()), 'message' => 'Retirada confirmada.']);
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
            'id'            => $p->id,
            'numero_sc'     => $p->numero_sc,
            'data'          => $p->data?->format('Y-m-d'),
            'data_desejada' => $p->data_desejada?->format('Y-m-d'),
            'setor'         => $p->setor,
            'solicitante'  => $p->solicitante?->nome,
            'destino'      => $p->destino,
            'tipo_destino' => $p->tipo_destino,
            'urgencia'     => $p->urgencia,
            'status'       => $p->status,
            'itens'        => $p->itens,
            'valor_total'  => (float) $p->valor_total,
            'desconto_negociacao' => (float) $p->desconto_negociacao,
            'valor_final'  => (float) $p->valor_total - (float) $p->desconto_negociacao,
            'timeline'     => $p->timeline,

            'cotacao_fornecedores' => $p->cotacao_fornecedores,
            'cotacao_itens'        => $p->cotacao_itens,

            'data_cotacao' => $p->data_cotacao?->format('d/m/Y H:i'),
            'cotado_por'   => $p->cotadoPor?->nome,

            'data_aprovacao_manutencao' => $p->data_aprovacao_manutencao?->format('d/m/Y H:i'),
            'aprovado_manutencao_por'   => $p->aprovadoManutencaoPor?->nome,
            'fornecedor_escolhido'      => $p->fornecedor_escolhido,

            'data_aprovacao_compra' => $p->data_aprovacao_compra?->format('d/m/Y H:i'),
            'aprovado_compra_por'   => $p->aprovadoCompraPor?->nome,

            'data_compra'               => $p->data_compra?->format('d/m/Y H:i'),
            'comprado_por'              => $p->compradoPor?->nome,
            'data_prevista_recebimento' => $p->data_prevista_recebimento?->format('Y-m-d'),

            'data_recebimento' => $p->data_recebimento?->format('d/m/Y H:i'),
            'recebido_por'     => $p->recebidoPor?->nome,

            'data_retirada' => $p->data_retirada?->format('d/m/Y H:i'),
            'retirado_por'  => $p->retiradoPor?->nome,

            'motivo_rejeicao' => $p->motivo_rejeicao,
        ];
    }
}
