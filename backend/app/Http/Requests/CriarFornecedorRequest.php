<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarFornecedorRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'    => ['required', 'string', 'max:255'],
            'cnpj'    => ['nullable', 'string', 'max:20', 'unique:fornecedores,cnpj'],
            'tel'     => ['nullable', 'string', 'max:30'],
            'email'   => ['nullable', 'email', 'max:255'],
            'contato' => ['nullable', 'string', 'max:150'],
            'cidade'  => ['nullable', 'string', 'max:100'],
            'estado'  => ['nullable', 'string', 'size:2'],
            'obs'     => ['nullable', 'string'],
            'status'  => ['nullable', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required' => 'A razão social é obrigatória.',
            'cnpj.unique'   => 'Já existe um fornecedor com este CNPJ.',
        ];
    }
}
