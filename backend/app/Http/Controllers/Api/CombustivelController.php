<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarCombustivelMovimentoRequest;
use App\Models\CombustivelMovimento;
use Illuminate\Http\JsonResponse;

class CombustivelController extends Controller
{
    private const TIPOS = ['DIESEL S500', 'DIESEL S10', 'GASOLINA'];

    public function index(): JsonResponse
    {
        $movimentos = CombustivelMovimento::orderByDesc('data')->orderByDesc('id')->get();

        return response()->json([
            'data' => [
                'data'         => $movimentos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $movimentos->count(),
                'total'        => $movimentos->count(),
            ],
            'message' => 'OK',
        ]);
    }

    public function store(CriarCombustivelMovimentoRequest $request): JsonResponse
    {
        $dados = $request->validated();

        if ($dados['tipo'] === 'ABASTECIMENTO') {
            $saldo = $this->saldoDe($dados['combustivel']);
            if ($dados['quantidade'] > $saldo) {
                return response()->json([
                    'data'    => null,
                    'message' => "Saldo insuficiente de {$dados['combustivel']} — disponível: {$saldo}L.",
                ], 422);
            }

            // Abastecimento não tem preço próprio — usa o valor/litro da
            // última entrada desse combustível pra calcular o valor consumido.
            $dados['valor'] = $dados['quantidade'] * $this->ultimoValorLitro($dados['combustivel']);
        }

        $movimento = CombustivelMovimento::create([
            ...$dados,
            'valor' => $dados['valor'] ?? (($dados['valor_litro'] ?? 0) * $dados['quantidade']),
        ]);

        return response()->json(['data' => $movimento, 'message' => 'Movimentação de combustível registrada com sucesso.'], 201);
    }

    public function saldo(): JsonResponse
    {
        $saldos = collect(self::TIPOS)->mapWithKeys(fn ($tipo) => [$tipo => $this->saldoDe($tipo)]);

        return response()->json(['data' => ['data' => $saldos], 'message' => 'OK']);
    }

    private function saldoDe(string $combustivel): float
    {
        $entradas = CombustivelMovimento::where('combustivel', $combustivel)->where('tipo', 'ENTRADA')->sum('quantidade');
        $saidas   = CombustivelMovimento::where('combustivel', $combustivel)->where('tipo', 'ABASTECIMENTO')->sum('quantidade');

        return (float) $entradas - (float) $saidas;
    }

    private function ultimoValorLitro(string $combustivel): float
    {
        $ultimaEntrada = CombustivelMovimento::where('combustivel', $combustivel)->where('tipo', 'ENTRADA')
            ->orderByDesc('data')->orderByDesc('id')->first();

        if (! $ultimaEntrada || (float) $ultimaEntrada->quantidade <= 0) {
            return 0;
        }

        return (float) $ultimaEntrada->valor / (float) $ultimaEntrada->quantidade;
    }
}
