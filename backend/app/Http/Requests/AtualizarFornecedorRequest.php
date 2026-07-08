<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarFornecedorRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'    => ['sometimes', 'string', 'max:255'],
            'cnpj'    => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('fornecedores', 'cnpj')->ignore($this->route('fornecedor'))],
            'tel'     => ['sometimes', 'nullable', 'string', 'max:30'],
            'email'   => ['sometimes', 'nullable', 'email', 'max:255'],
            'contato' => ['sometimes', 'nullable', 'string', 'max:150'],
            'cidade'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'estado'  => ['sometimes', 'nullable', 'string', 'size:2'],
            'obs'     => ['sometimes', 'nullable', 'string'],
            'status'  => ['sometimes', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }
}
