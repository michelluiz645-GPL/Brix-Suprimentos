<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AbrirSCRequest;
use App\Http\Requests\AprovarSCRequest;
use App\Http\Requests\DarEntradaRequest;
use App\Http\Requests\RegistrarCotacaoRequest;
use App\Http\Requests\RegistrarCompraRequest;
use App\Http\Requests\RejeitarSCRequest;
use App\Models\SolicitacaoCompra;
use App\Services\SolicitacaoCompraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SolicitacaoCompraController extends Controller
{
    public function __construct(private SolicitacaoCompraService $service) {}

    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();
        $query   = SolicitacaoCompra::with(['solicitante', 'itens'])->latest();

        match ($usuario->papel) {
            'op_manutencao'    => $query->where('solicitante_id', $usuario->id),
            'admin_manutencao' => $query->whereHas('solicitante', fn($q) =>
                                        $q->whereIn('papel', ['op_manutencao', 'admin_manutencao'])),
            'almoxarife'       => $query->whereIn('status', ['em_transito', 'comprado']),
            default            => null, // op_suprimentos, admin_suprimentos, admin_geral veem tudo
        };

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('urgencia')) {
            $query->where('urgencia', $request->urgencia);
        }

        $lista = $query->get()->map(fn($sc) => $this->serialize($sc));

        return response()->json(['data' => $lista, 'message' => 'OK']);
    }

    public function store(AbrirSCRequest $request): JsonResponse
    {
        $sc = $this->service->abrir($request->validated(), $request->user());

        return response()->json([
            'data'    => $this->serialize($sc),
            'message' => 'Solicitação de compra aberta com sucesso.',
        ], 201);
    }

    public function show(SolicitacaoCompra $sc): JsonResponse
    {
        $sc->load(['solicitante', 'itens', 'aprovadorMnt', 'aprovadorSup', 'comprador', 'responsavelEntrada']);

        return response()->json(['data' => $this->serialize($sc), 'message' => 'OK']);
    }

    public function registrarCotacao(RegistrarCotacaoRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->registrarCotacao($sc, $request->validated(), $request->user());

        return response()->json(['data' => $this->serialize($sc->fresh()), 'message' => 'Cotação registrada.']);
    }

    public function aprovarMnt(AprovarSCRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->aprovarMnt($sc, $request->user(), $request->observacao);

        return response()->json(['data' => $this->serialize($sc->fresh()), 'message' => 'Aprovado pela Manutenção.']);
    }

    public function rejeitarMnt(RejeitarSCRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->rejeitarMnt($sc, $request->user(), $request->motivo);

        return response()->json(['data' => $this->serialize($sc->fresh()), 'message' => 'Solicitação rejeitada.']);
    }

    public function aprovarSup(AprovarSCRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->aprovarSup($sc, $request->user(), $request->observacao);

        return response()->json(['data' => $this->serialize($sc->fresh()), 'message' => 'Aprovado pelo Suprimentos.']);
    }

    public function registrarCompra(RegistrarCompraRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->registrarCompra($sc, $request->validated(), $request->user());

        return response()->json(['data' => $this->serialize($sc->fresh()), 'message' => 'Compra registrada.']);
    }

    public function darEntrada(DarEntradaRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->darEntrada($sc, $request->itens, $request->user());

        return response()->json(['data' => $this->serialize($sc->fresh(['itens'])), 'message' => 'Entrada registrada.']);
    }

    public function darEntradaParcial(DarEntradaRequest $request, SolicitacaoCompra $sc): JsonResponse
    {
        $this->service->darEntrada($sc, $request->itens, $request->user());

        return response()->json(['data' => $this->serialize($sc->fresh(['itens'])), 'message' => 'Entrada parcial registrada.']);
    }

    private function serialize(SolicitacaoCompra $sc): array
    {
        return [
            'id'              => $sc->id,
            'numero'          => $sc->numero,
            'data_necessaria' => $sc->data_necessaria?->format('Y-m-d'),
            'solicitante'     => $sc->solicitante ? [
                'id'   => $sc->solicitante->id,
                'nome' => $sc->solicitante->nome,
                'papel'=> $sc->solicitante->papel,
            ] : null,
            'funcao_cargo'         => $sc->funcao_cargo,
            'destino'              => $sc->destino,
            'veiculo_frota'        => $sc->veiculo_frota,
            'urgencia'             => $sc->urgencia,
            'local_entrega'        => $sc->local_entrega,
            'ponto_referencia'     => $sc->ponto_referencia,
            'horario_recebimento'  => $sc->horario_recebimento,
            'motivo'               => $sc->motivo,
            'ordem_servico'        => $sc->ordem_servico,
            'status'               => $sc->status,
            'cotacao_fornecedor'   => $sc->cotacao_fornecedor,
            'cotacao_fornecedor_telefone' => $sc->cotacao_fornecedor_telefone,
            'cotacao_fornecedor_email'    => $sc->cotacao_fornecedor_email,
            'valor_cotado'         => $sc->valor_cotado,
            'data_cotacao'         => $sc->data_cotacao?->format('d/m/Y H:i'),
            'data_aprovacao_mnt'   => $sc->data_aprovacao_mnt?->format('d/m/Y H:i'),
            'aprovado_mnt_por'     => $sc->aprovadorMnt?->nome,
            'data_aprovacao_sup'   => $sc->data_aprovacao_sup?->format('d/m/Y H:i'),
            'aprovado_sup_por'     => $sc->aprovadorSup?->nome,
            'data_compra'          => $sc->data_compra?->format('d/m/Y H:i'),
            'comprado_por'         => $sc->comprador?->nome,
            'previsao_entrega'     => $sc->previsao_entrega?->format('Y-m-d'),
            'data_entrada'         => $sc->data_entrada?->format('d/m/Y H:i'),
            'entrada_por'          => $sc->responsavelEntrada?->nome,
            'observacao_rejeicao'  => $sc->observacao_rejeicao,
            'itens'                => $sc->itens?->map(fn($i) => [
                'id'                   => $i->id,
                'descricao'            => $i->descricao,
                'quantidade'           => $i->quantidade,
                'unidade'              => $i->unidade,
                'fabricante'           => $i->fabricante,
                'part_number'          => $i->part_number,
                'aplicacao_equipamento'=> $i->aplicacao_equipamento,
                'foto_path'            => $i->foto_path,
                'recebido'             => $i->recebido,
                'quantidade_recebida'  => $i->quantidade_recebida,
            ])->toArray() ?? [],
            'criado_em' => $sc->created_at?->format('d/m/Y H:i'),
        ];
    }
}
