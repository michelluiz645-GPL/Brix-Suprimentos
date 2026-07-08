<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarFuncionarioRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'       => ['required', 'string', 'max:255'],
            'funcao'     => ['required', 'string', 'max:150'],
            'equipe_num' => ['nullable', 'string', 'max:50'],
            'cpf'        => ['nullable', 'string', 'max:20', 'unique:funcionarios,cpf'],
            'tel'        => ['nullable', 'string', 'max:30'],
            'status'     => ['nullable', Rule::in(['ATIVO', 'INATIVO'])],
            'demitido'   => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required'   => 'O nome é obrigatório.',
            'funcao.required' => 'A função é obrigatória.',
            'cpf.unique'      => 'Já existe um funcionário com este CPF.',
        ];
    }
}
