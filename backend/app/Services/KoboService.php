<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class KoboService
{
    /**
     * Busca as submissões (pedidos) de um formulário do KoboToolbox.
     *
     * @param string $uidKey 'uid_suprim' ou 'uid_compras' (config/services.php)
     * @throws \RuntimeException se a integração não estiver configurada ou a chamada falhar —
     *                            a mensagem nunca inclui o token, só orienta a checar as credenciais
     */
    public function buscarSubmissoes(string $uidKey): array
    {
        $token = config('services.kobo.token');
        $uid   = config("services.kobo.{$uidKey}");
        $base  = config('services.kobo.base_url');

        if (! $token || ! $uid) {
            throw new \RuntimeException('Integração com o KoboToolbox não está configurada. Verifique as credenciais em Segurança de Dados.');
        }

        try {
            $response = Http::withHeaders(['Authorization' => "Token {$token}"])
                ->timeout(15)
                ->get("{$base}/assets/{$uid}/data.json");
        } catch (\Throwable) {
            throw new \RuntimeException('Não foi possível conectar ao KoboToolbox. Tente novamente mais tarde.');
        }

        if (! $response->successful()) {
            throw new \RuntimeException('Não foi possível conectar ao KoboToolbox. Verifique as credenciais em Segurança de Dados.');
        }

        return $response->json('results') ?? [];
    }
}
