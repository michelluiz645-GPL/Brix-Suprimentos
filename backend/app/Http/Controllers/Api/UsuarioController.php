<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setor;
use App\Models\User;
use App\Services\PermissaoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    public function index()
    {
        $usuarios = User::with('setor', 'modulos')
            ->orderBy('nome')
            ->get()
            ->map(fn (User $u) => $this->serialize($u));

        return response()->json(['data' => $usuarios, 'message' => null]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nome'   => ['required', 'string', 'max:255'],
            'login'  => ['required', 'string', 'max:100', 'unique:users,login'],
            'email'  => ['nullable', 'email', 'unique:users,email'],
            'senha'  => ['required', 'string', 'min:6'],
            'nivel'  => ['required', Rule::in([User::NIVEL_ADMIN, User::NIVEL_OPERADOR])],
            'setor'  => ['required', Rule::in([Setor::ALMOXARIFADO, Setor::ENGENHARIA, Setor::MANUTENCAO])],
            'modulos'=> ['sometimes', 'array'],
        ], [
            'login.unique' => 'Este usuário já está cadastrado.',
            'email.unique' => 'Este e-mail já está em uso.',
            'senha.min'    => 'A senha deve ter no mínimo 6 caracteres.',
        ]);

        $setor = Setor::where('codigo', $data['setor'])->firstOrFail();

        $usuario = User::create([
            'nome'     => $data['nome'],
            'login'    => $data['login'],
            'email'    => $data['email'] ?? null,
            'password' => Hash::make($data['senha']),
            'nivel'    => $data['nivel'],
            'setor_id' => $setor->id,
            'ativo'    => true,
        ]);

        if (isset($data['modulos'])) {
            $usuario->modulos()->sync($data['modulos']);
        } else {
            app(PermissaoService::class)->aplicarTemplatePadrao($usuario);
        }

        return response()->json([
            'data'    => $this->serialize($usuario->fresh(['setor', 'modulos'])),
            'message' => 'Usuário criado com sucesso.',
        ], 201);
    }

    public function update(Request $request, User $usuario)
    {
        $data = $request->validate([
            'nome'   => ['sometimes', 'string', 'max:255'],
            'nivel'  => ['sometimes', Rule::in([User::NIVEL_ADMIN, User::NIVEL_OPERADOR])],
            'ativo'  => ['sometimes', 'boolean'],
            'modulos'=> ['sometimes', 'array'],
        ]);

        $usuario->update(array_filter([
            'nome'  => $data['nome'] ?? null,
            'nivel' => $data['nivel'] ?? null,
            'ativo' => $data['ativo'] ?? null,
        ], fn ($v) => !is_null($v)));

        if (isset($data['modulos'])) {
            $usuario->modulos()->sync($data['modulos']);
        }

        return response()->json([
            'data'    => $this->serialize($usuario->fresh(['setor', 'modulos'])),
            'message' => 'Usuário atualizado com sucesso.',
        ]);
    }

    public function resetSenha(Request $request, User $usuario)
    {
        $data = $request->validate([
            'senha' => ['required', 'string', 'min:6'],
        ], [
            'senha.min' => 'A senha deve ter no mínimo 6 caracteres.',
        ]);

        $usuario->update(['password' => Hash::make($data['senha'])]);

        return response()->json([
            'data'    => null,
            'message' => 'Senha redefinida com sucesso.',
        ]);
    }

    private function serialize(User $u): array
    {
        return [
            'id'      => $u->id,
            'nome'    => $u->nome,
            'login'   => $u->login,
            'email'   => $u->email,
            'nivel'   => $u->nivel,
            'setor'   => $u->setor->codigo,
            'ativo'   => $u->ativo,
            'modulos' => $u->modulos->pluck('chave'),
        ];
    }
}
