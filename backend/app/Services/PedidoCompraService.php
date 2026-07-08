<?php

namespace App\Services;

use App\Models\Numerador;
use App\Models\PedidoCompra;
use App\Models\User;

class PedidoCompraService
{
    public function criar(array $dados, User $usuario): PedidoCompra
    {
        return PedidoCompra::create([
            ...$dados,
            'num_pc'        => $this->gerarNumero(),
            'data_pedido'   => $dados['data_pedido'] ?? now()->format('Y-m-d'),
            'origem'        => $dados['origem'] ?? 'MANUAL',
            'status'        => 'PENDENTE',
            'criado_por_id' => $usuario->id,
        ]);
    }

    private function gerarNumero(): string
    {
        $ano   = date('Y');
        $chave = "PC-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }
}
