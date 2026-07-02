<?php

namespace App\Services;

use App\Models\ItensSc;
use App\Models\Numerador;
use App\Models\SolicitacaoCompra;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SolicitacaoCompraService
{
    public function abrir(array $dados, User $solicitante): SolicitacaoCompra
    {
        return DB::transaction(function () use ($dados, $solicitante) {
            $numero = $this->gerarNumero('MNT');

            $sc = SolicitacaoCompra::create([
                'numero'            => $numero,
                'data_necessaria'   => $dados['data_necessaria'] ?? null,
                'solicitante_id'    => $solicitante->id,
                'funcao_cargo'      => $dados['funcao_cargo'] ?? null,
                'destino'           => $dados['destino'],
                'veiculo_frota'     => $dados['veiculo_frota'] ?? null,
                'urgencia'          => $dados['urgencia'] ?? 'Média',
                'local_entrega'     => $dados['local_entrega'] ?? null,
                'ponto_referencia'  => $dados['ponto_referencia'] ?? null,
                'horario_recebimento' => $dados['horario_recebimento'] ?? null,
                'motivo'            => $dados['motivo'] ?? null,
                'ordem_servico'     => $dados['ordem_servico'] ?? null,
                'status'            => 'pendente',
            ]);

            foreach ($dados['itens'] as $item) {
                ItensSc::create([
                    'sc_id'                  => $sc->id,
                    'descricao'              => $item['descricao'],
                    'quantidade'             => $item['quantidade'],
                    'unidade'                => $item['unidade'],
                    'fabricante'             => $item['fabricante'] ?? null,
                    'part_number'            => $item['part_number'] ?? null,
                    'aplicacao_equipamento'  => $item['aplicacao_equipamento'] ?? null,
                ]);
            }

            $this->notificar(['op_suprimentos', 'admin_suprimentos'], "Nova SC aberta: {$numero}");

            return $sc->load('itens', 'solicitante');
        });
    }

    public function iniciarCotacao(SolicitacaoCompra $sc, User $responsavel): void
    {
        $sc->update(['status' => 'cotando']);
        Log::info("SC {$sc->numero} em cotação por {$responsavel->nome}");
    }

    public function registrarCotacao(SolicitacaoCompra $sc, array $dados, User $responsavel): void
    {
        $sc->update([
            'cotacao_fornecedor'         => $dados['cotacao_fornecedor'],
            'cotacao_fornecedor_telefone'=> $dados['cotacao_fornecedor_telefone'] ?? null,
            'cotacao_fornecedor_email'   => $dados['cotacao_fornecedor_email'] ?? null,
            'valor_cotado'               => $dados['valor_cotado'],
            'data_cotacao'               => now(),
            'status'                     => 'aguardando_aprovacao_mnt',
        ]);

        $this->notificar(['admin_manutencao'], "SC {$sc->numero} aguardando aprovação da Manutenção.");
    }

    public function aprovarMnt(SolicitacaoCompra $sc, User $aprovador, ?string $obs = null): void
    {
        $sc->update([
            'status'             => 'aguardando_aprovacao_sup',
            'data_aprovacao_mnt' => now(),
            'aprovado_mnt_por'   => $aprovador->id,
            'observacao_rejeicao'=> null,
        ]);

        $this->notificar(['admin_suprimentos'], "SC {$sc->numero} aprovada pela Manutenção.");
    }

    public function rejeitarMnt(SolicitacaoCompra $sc, User $aprovador, string $motivo): void
    {
        $sc->update([
            'status'              => 'rejeitado',
            'observacao_rejeicao' => $motivo,
            'aprovado_mnt_por'    => $aprovador->id,
            'data_aprovacao_mnt'  => now(),
        ]);

        $this->notificarUsuario($sc->solicitante_id, "Sua SC {$sc->numero} foi rejeitada: {$motivo}");
    }

    public function aprovarSup(SolicitacaoCompra $sc, User $aprovador, ?string $obs = null): void
    {
        $sc->update([
            'status'             => 'aprovado',
            'data_aprovacao_sup' => now(),
            'aprovado_sup_por'   => $aprovador->id,
        ]);

        $this->notificar(['op_suprimentos'], "SC {$sc->numero} aprovada pelo Supervisor — pronta para compra.");
    }

    public function registrarCompra(SolicitacaoCompra $sc, array $dados, User $comprador): void
    {
        $sc->update([
            'status'           => 'em_transito',
            'data_compra'      => now(),
            'comprado_por'     => $comprador->id,
            'previsao_entrega' => $dados['previsao_entrega'] ?? null,
        ]);

        $this->notificarUsuario($sc->solicitante_id, "SC {$sc->numero} comprada — previsão de entrega: {$sc->previsao_entrega}.");
        $this->notificar(['almoxarife', 'op_suprimentos'], "SC {$sc->numero} em trânsito — aguardando entrada.");
    }

    public function darEntrada(SolicitacaoCompra $sc, array $itensRecebidos, User $responsavel): void
    {
        DB::transaction(function () use ($sc, $itensRecebidos, $responsavel) {
            foreach ($itensRecebidos as $itemData) {
                $item = ItensSc::where('sc_id', $sc->id)->findOrFail($itemData['id']);
                $item->update([
                    'recebido'           => true,
                    'quantidade_recebida'=> $itemData['quantidade_recebida'],
                ]);
            }

            $sc->refresh();
            $novoStatus = $sc->todosItensRecebidos() ? 'concluido' : 'em_transito';

            $sc->update([
                'status'      => $novoStatus,
                'data_entrada'=> now(),
                'entrada_por' => $responsavel->id,
            ]);

            if ($novoStatus === 'concluido') {
                $this->notificarUsuario($sc->solicitante_id, "SC {$sc->numero} concluída — todos os itens entregues.");
            }
        });
    }

    private function gerarNumero(string $setor): string
    {
        $ano  = date('Y');
        $chave = "SC-{$setor}-{$ano}";

        $numerador = Numerador::lockForUpdate()->firstOrCreate(
            ['chave' => $chave],
            ['ultimo' => 0]
        );

        $numerador->increment('ultimo');
        $numerador->refresh();

        return sprintf('%s-%04d', $chave, $numerador->ultimo);
    }

    private function notificar(array $papeis, string $mensagem): void
    {
        $usuarios = User::whereIn('papel', $papeis)->where('ativo', true)->get();
        foreach ($usuarios as $usuario) {
            Log::info("[NOTIF] → {$usuario->nome} ({$usuario->papel}): {$mensagem}");
        }
    }

    private function notificarUsuario(int $userId, string $mensagem): void
    {
        $usuario = User::find($userId);
        if ($usuario) {
            Log::info("[NOTIF] → {$usuario->nome}: {$mensagem}");
        }
    }
}
