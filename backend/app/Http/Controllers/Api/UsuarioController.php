<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Modulo;
use App\Models\Setor;
use App\Models\User;
use App\Services\PermissaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    public function index(): JsonResponse
    {
        $usuarios = User::with('setor', 'modulos')
            ->orderBy('nome')
            ->get()
            ->map(fn (User $u) => $this->serialize($u));

        return response()->json(['data' => $usuarios, 'message' => null]);
    }

    public function show(User $usuario): JsonResponse
    {
        $usuario->load('setor', 'modulos');
        return response()->json(['data' => $this->serialize($usuario), 'message' => 'OK']);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nome'      => ['required', 'string', 'max:255'],
            'login'     => ['required', 'string', 'max:100', 'unique:users,login'],
            'email'     => ['nullable', 'email', 'unique:users,email'],
            'whatsapp'  => ['nullable', 'string', 'max:20'],
            'senha'     => ['required', 'string', 'min:6'],
            'nivel'     => ['required', Rule::in([User::NIVEL_ADMIN, User::NIVEL_OPERADOR])],
            'papel'     => ['required', Rule::in(User::PAPEIS)],
            'setor'     => ['required', Rule::in([Setor::ALMOXARIFADO, Setor::ENGENHARIA, Setor::MANUTENCAO])],
            'modulos'   => ['sometimes', 'array'],
            'responsabilidades'                     => ['sometimes', 'array'],
            'responsabilidades.pedido_orcamento'     => ['sometimes', 'array'],
            'responsabilidades.pedido_orcamento.*'   => [Rule::in(Modulo::RESPONSABILIDADES_PEDIDO_ORCAMENTO)],
            'setores_atendidos'                      => ['sometimes', 'array'],
            'setores_atendidos.pedido_orcamento'     => ['sometimes', 'array'],
            'setores_atendidos.pedido_orcamento.*'   => [Rule::in([Setor::MANUTENCAO, Setor::ENGENHARIA])],
        ], [
            'login.unique'  => 'Este usuário já está cadastrado.',
            'email.unique'  => 'Este e-mail já está em uso.',
            'senha.min'     => 'A senha deve ter no mínimo 6 caracteres.',
            'papel.required'=> 'Selecione o papel do usuário no fluxo de compras.',
        ]);

        $setor = Setor::where('codigo', $data['setor'])->firstOrFail();

        $usuario = User::create([
            'nome'      => $data['nome'],
            'login'     => $data['login'],
            'email'     => $data['email'] ?? null,
            'whatsapp'  => $data['whatsapp'] ?? null,
            'password'  => Hash::make($data['senha']),
            'nivel'     => $data['nivel'],
            'papel'     => $data['papel'],
            'setor_id'  => $setor->id,
            'ativo'     => true,
        ]);

        if (isset($data['modulos'])) {
            $this->sincronizarModulos($usuario, $data['modulos'], $data['responsabilidades'] ?? [], $data['setores_atendidos'] ?? []);
        } else {
            app(PermissaoService::class)->aplicarTemplatePadrao($usuario);
        }

        return response()->json([
            'data'    => $this->serialize($usuario->fresh(['setor', 'modulos'])),
            'message' => 'Usuário criado com sucesso.',
        ], 201);
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        $data = $request->validate([
            'nome'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'nullable', 'email', Rule::unique('users', 'email')->ignore($usuario->id)],
            'whatsapp' => ['sometimes', 'nullable', 'string', 'max:20'],
            'nivel'    => ['sometimes', Rule::in([User::NIVEL_ADMIN, User::NIVEL_OPERADOR])],
            'papel'    => ['sometimes', Rule::in(User::PAPEIS)],
            'ativo'    => ['sometimes', 'boolean'],
            'modulos'  => ['sometimes', 'array'],
            'responsabilidades'                     => ['sometimes', 'array'],
            'responsabilidades.pedido_orcamento'     => ['sometimes', 'array'],
            'responsabilidades.pedido_orcamento.*'   => [Rule::in(Modulo::RESPONSABILIDADES_PEDIDO_ORCAMENTO)],
            'setores_atendidos'                      => ['sometimes', 'array'],
            'setores_atendidos.pedido_orcamento'     => ['sometimes', 'array'],
            'setores_atendidos.pedido_orcamento.*'   => [Rule::in([Setor::MANUTENCAO, Setor::ENGENHARIA])],
        ]);

        $campos = array_filter(
            array_intersect_key($data, array_flip(['nome', 'email', 'whatsapp', 'nivel', 'papel', 'ativo'])),
            fn ($v) => ! is_null($v)
        );
        $usuario->update($campos);

        if (isset($data['modulos'])) {
            $this->sincronizarModulos($usuario, $data['modulos'], $data['responsabilidades'] ?? [], $data['setores_atendidos'] ?? []);
        } elseif (isset($data['responsabilidades']) || isset($data['setores_atendidos'])) {
            $this->sincronizarModulos($usuario, $usuario->modulos->pluck('chave')->all(), $data['responsabilidades'] ?? [], $data['setores_atendidos'] ?? []);
        }

        return response()->json([
            'data'    => $this->serialize($usuario->fresh(['setor', 'modulos'])),
            'message' => 'Usuário atualizado com sucesso.',
        ]);
    }

    public function resetSenha(Request $request, User $usuario): JsonResponse
    {
        $data = $request->validate([
            'senha' => ['required', 'string', 'min:6'],
        ], [
            'senha.min' => 'A senha deve ter no mínimo 6 caracteres.',
        ]);

        $usuario->update(['password' => Hash::make($data['senha'])]);

        return response()->json(['data' => null, 'message' => 'Senha redefinida com sucesso.']);
    }

    /**
     * Sincroniza os módulos liberados e, quando informado, grava as
     * responsabilidades granulares de cada módulo no pivô (RN-002.3).
     * Ignora silenciosamente qualquer chave que não pertença ao setor do
     * usuário (RN-002.1) — a tela já filtra isso, mas a API não deve
     * confiar apenas no client.
     */
    private function sincronizarModulos(User $usuario, array $chavesModulos, array $responsabilidadesPorModulo, array $setoresAtendidosPorModulo = []): void
    {
        $codigoSetor = $usuario->setor->codigo;

        $modulos = Modulo::whereIn('chave', $chavesModulos)
            ->get()
            ->filter(fn (Modulo $m) => $m->disponivelParaSetor($codigoSetor));

        $sync = $modulos->mapWithKeys(fn (Modulo $m) => [
            $m->id => [
                'responsabilidades' => $responsabilidadesPorModulo[$m->chave] ?? null,
                'setores_atendidos' => $setoresAtendidosPorModulo[$m->chave] ?? null,
            ],
        ])->all();

        $usuario->modulos()->sync($sync);
    }

    private function serialize(User $u): array
    {
        return [
            'id'       => $u->id,
            'nome'     => $u->nome,
            'login'    => $u->login,
            'email'    => $u->email,
            'whatsapp' => $u->whatsapp,
            'nivel'    => $u->nivel,
            'papel'    => $u->papel,
            'papel_label' => User::PAPEL_LABELS[$u->papel] ?? $u->papel,
            'setor'    => $u->setor?->codigo,
            'ativo'    => $u->ativo,
            'modulos'  => $u->modulos->pluck('chave'),
            'responsabilidades' => $u->responsabilidadesPorModulo(),
            'setores_atendidos' => $u->setoresAtendidosPorModulo(),
        ];
    }
}
