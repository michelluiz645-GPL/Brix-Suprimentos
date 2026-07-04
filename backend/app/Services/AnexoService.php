<?php

namespace App\Services;

use App\Models\Setor;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AnexoService
{
    private const SETORES_VALIDOS = [
        Setor::ALMOXARIFADO,
        Setor::ENGENHARIA,
        Setor::MANUTENCAO,
    ];

    /**
     * Armazena um anexo em storage/app/anexos/{setor}/{segmento}/{ano}/{mes}/.
     *
     * @param  string  $setor Um dos valores de Setor::ALMOXARIFADO|ENGENHARIA|MANUTENCAO
     * @param  string  $segmento Módulo de origem do anexo (ex.: "entradas", "epi", "pedido-compra")
     * @return string Caminho relativo do arquivo no disco "anexos"
     */
    public function armazenar(UploadedFile $arquivo, string $setor, string $segmento): string
    {
        $setor = strtoupper($setor);

        if (! in_array($setor, self::SETORES_VALIDOS, true)) {
            throw new InvalidArgumentException("Setor inválido para anexo: {$setor}");
        }

        $pasta = sprintf(
            '%s/%s/%s',
            strtolower($setor),
            Str::slug($segmento),
            now()->format('Y/m'),
        );

        $nomeArquivo = sprintf('%s_%s', now()->format('YmdHis'), $arquivo->hashName());

        return Storage::disk('anexos')->putFileAs($pasta, $arquivo, $nomeArquivo);
    }

    public function excluir(string $caminho): bool
    {
        return Storage::disk('anexos')->delete($caminho);
    }

    public function caminhoAbsoluto(string $caminho): ?string
    {
        return Storage::disk('anexos')->exists($caminho)
            ? Storage::disk('anexos')->path($caminho)
            : null;
    }
}
