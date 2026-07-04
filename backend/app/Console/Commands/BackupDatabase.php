<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--keep=30 : Dias de retenção dos backups}';

    protected $description = 'Gera um dump do banco de dados e remove backups mais antigos que a retenção configurada';

    public function handle(): int
    {
        $conexao = config('database.default');
        $config = config("database.connections.{$conexao}");

        if (($config['driver'] ?? null) !== 'mysql') {
            $this->error("Backup automático suportado apenas para conexões mysql (atual: {$conexao}).");

            return self::FAILURE;
        }

        $usuario = env('DB_BACKUP_USERNAME');
        $senha = env('DB_BACKUP_PASSWORD');

        if (! $usuario || ! $senha) {
            $this->error('Defina DB_BACKUP_USERNAME e DB_BACKUP_PASSWORD no .env (usuário dedicado ao mysqldump).');

            return self::FAILURE;
        }

        $destino = storage_path('app/backups');
        File::ensureDirectoryExists($destino);

        $arquivo = sprintf('%s/backup_%s.sql.gz', $destino, now()->format('Y-m-d_His'));

        // "set -o pipefail" garante que uma falha do mysqldump não seja mascarada
        // pelo sucesso do gzip no fim do pipe — por isso o comando roda via bash.
        $script = sprintf(
            'set -o pipefail; mysqldump --no-tablespaces --skip-ssl -h%s -P%s -u%s -p%s %s | gzip > %s',
            escapeshellarg($config['host']),
            escapeshellarg((string) $config['port']),
            escapeshellarg($usuario),
            escapeshellarg($senha),
            escapeshellarg($config['database']),
            escapeshellarg($arquivo),
        );

        $processo = new Process(['bash', '-c', $script]);
        $processo->setTimeout(300);
        $processo->run();

        if (! $processo->isSuccessful()) {
            $this->error('Falha ao gerar backup do banco de dados: '.$processo->getErrorOutput());
            File::delete($arquivo);

            return self::FAILURE;
        }

        $this->info("Backup gerado: {$arquivo}");

        $this->removerBackupsAntigos($destino, (int) $this->option('keep'));

        return self::SUCCESS;
    }

    private function removerBackupsAntigos(string $pasta, int $dias): void
    {
        $limite = now()->subDays($dias)->timestamp;

        foreach (File::files($pasta) as $arquivo) {
            if ($arquivo->getMTime() < $limite) {
                File::delete($arquivo->getPathname());
                $this->info("Backup expirado removido: {$arquivo->getFilename()}");
            }
        }
    }
}
