<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarDebitoManutencaoRequest;
use App\Models\DebitoManutencao;
use App\Models\Movimento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DebitoManutencaoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $dataDe  = $request->query('data_de');
        $dataAte = $request->query('data_ate');

        $query = DebitoManutencao::orderByDesc('data');
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($dataDe) {
            $query->whereDate('data', '>=', $dataDe);
        }
        if ($dataAte) {
            $query->whereDate('data', '<=', $dataAte);
        }
        $debitos = $query->get();

        return response()->json([
            'data' => [
                'data'         => $debitos,
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $debitos->count(),
                'total'        => $debitos->count(),
                // RF-025 exclui EPI do débito cobrado (é item de segurança
                // obrigatório, não custo repassado à equipe) — mas o gasto
                // continua visível à parte, respeitando o mesmo período filtrado.
                'gasto_epi'    => $this->gastoEpi($dataDe, $dataAte),
            ],
            'message' => 'OK',
        ]);
    }

    private function gastoEpi(?string $dataDe, ?string $dataAte): float
    {
        $query = Movimento::where('tipo', 'SAÍDA')
            ->where('status', '!=', 'CANCELADO')
            ->whereHas('produtoVariacao.produto', fn ($q) => $q->where('categoria', 'EPI'));

        if ($dataDe) {
            $query->whereDate('data', '>=', $dataDe);
        }
        if ($dataAte) {
            $query->whereDate('data', '<=', $dataAte);
        }

        return (float) $query->get()->sum(fn ($m) => $m->qtd * $m->preco);
    }

    public function store(CriarDebitoManutencaoRequest $request): JsonResponse
    {
        $dados = $request->validated();
        $total = collect($dados['itens'])->sum(fn ($i) => $i['qtd'] * ($i['preco'] ?? 0));

        $debito = DebitoManutencao::create([...$dados, 'total' => $total, 'status' => 'ABERTO']);

        return response()->json(['data' => $debito, 'message' => 'Débito registrado com sucesso.'], 201);
    }

    /**
     * RF-025: somente Admin marca como pago.
     */
    public function pagar(Request $request, DebitoManutencao $debito): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['data' => null, 'message' => 'Somente administradores podem marcar débitos como pagos.'], 403);
        }
        if ($debito->status === 'PAGO') {
            return response()->json(['data' => null, 'message' => 'Este débito já está pago.'], 422);
        }

        $debito->update(['status' => 'PAGO', 'data_pagamento' => now()->format('Y-m-d')]);

        return response()->json(['data' => $debito->fresh(), 'message' => 'Débito marcado como pago.']);
    }
}
