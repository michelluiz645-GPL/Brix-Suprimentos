<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarCotacaoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'cotacao_fornecedor'          => ['required', 'string', 'max:255'],
            'cotacao_fornecedor_telefone'  => ['nullable', 'string', 'max:20'],
            'cotacao_fornecedor_email'     => ['nullable', 'email', 'max:255'],
            'valor_cotado'                => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'cotacao_fornecedor.required' => 'Nome do fornecedor é obrigatório.',
            'valor_cotado.required'       => 'Valor cotado é obrigatório.',
        ];
    }
}
