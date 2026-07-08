<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class SistemaController extends Controller
{
    /**
     * RF-026: status da conexão + se a integração KoboToolbox está
     * configurada — nunca expõe o token, só um booleano.
     */
    public function status(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $connected = true;
            $message = 'Conexão com o banco de dados estabelecida com sucesso.';
        } catch (\Throwable) {
            $connected = false;
            $message = 'Não foi possível conectar ao banco de dados.';
        }

        return response()->json([
            'connected'        => $connected,
            'message'          => $message,
            'kobo_configurado' => (bool) (config('services.kobo.token') && config('services.kobo.uid_suprim')),
        ]);
    }

    /**
     * Gera um backup sob demanda e devolve o conteúdo em base64 — o
     * frontend já sabe montar um Blob/link de download a partir disso
     * (mesmo padrão usado na exportação de CSV em Valor de Estoque).
     */
    public function backup(Request $request): JsonResponse
    {
        if ($erro = $this->erroSePermissaoInsuficiente($request)) {
            return $erro;
        }

        $saida = Artisan::call('backup:database');

        if ($saida !== 0) {
            return response()->json([
                'data'    => null,
                'message' => 'Não foi possível gerar o backup. Verifique se DB_BACKUP_USERNAME/DB_BACKUP_PASSWORD estão configurados.',
            ], 500);
        }

        $pasta = storage_path('app/backups');
        $arquivos = collect(File::files($pasta))->sortByDesc(fn ($f) => $f->getMTime());
        $ultimo = $arquivos->first();

        if (! $ultimo) {
            return response()->json(['data' => null, 'message' => 'Backup gerado, mas o arquivo não foi encontrado.'], 500);
        }

        return response()->json([
            'data' => [
                'arquivo'         => $ultimo->getFilename(),
                'tamanho_kb'      => round($ultimo->getSize() / 1024, 1),
                'conteudo_base64' => base64_encode(File::get($ultimo->getPathname())),
            ],
            'message' => 'Backup gerado com sucesso.',
        ]);
    }

    /**
     * Histórico dos backups já gerados (manuais ou automáticos via schedule).
     */
    public function historico(Request $request): JsonResponse
    {
        if ($erro = $this->erroSePermissaoInsuficiente($request)) {
            return $erro;
        }

        $pasta = storage_path('app/backups');
        File::ensureDirectoryExists($pasta);

        $logs = collect(File::files($pasta))
            ->sortByDesc(fn ($f) => $f->getMTime())
            ->take(30)
            ->map(fn ($f) => [
                'data'     => date('c', $f->getMTime()),
                'tipo'     => 'Backup do banco de dados',
                'status'   => 'sucesso',
                'mensagem' => sprintf('%s (%s KB)', $f->getFilename(), round($f->getSize() / 1024, 1)),
            ])
            ->values();

        return response()->json(['data' => $logs, 'message' => 'OK']);
    }

    /**
     * RF-026: Segurança de Dados é exclusiva do Admin do Almoxarifado ou da Engenharia.
     */
    private function erroSePermissaoInsuficiente(Request $request): ?JsonResponse
    {
        $user = $request->user();
        $setorPermitido = in_array($user->setor?->codigo, [Setor::ALMOXARIFADO, Setor::ENGENHARIA], true);

        if ($setorPermitido && $user->isAdmin()) {
            return null;
        }

        return response()->json(['data' => null, 'message' => 'Acesso restrito ao administrador do Almoxarifado ou da Engenharia.'], 403);
    }
}
