<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarFuncionarioRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'       => ['sometimes', 'string', 'max:255'],
            'funcao'     => ['sometimes', 'string', 'max:150'],
            'equipe_num' => ['sometimes', 'nullable', 'string', 'max:50'],
            'cpf'        => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('funcionarios', 'cpf')->ignore($this->route('funcionario'))],
            'tel'        => ['sometimes', 'nullable', 'string', 'max:30'],
            'status'     => ['sometimes', Rule::in(['ATIVO', 'INATIVO'])],
            'demitido'   => ['sometimes', 'boolean'],
        ];
    }
}
