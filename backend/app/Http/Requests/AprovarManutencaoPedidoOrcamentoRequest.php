<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AprovarManutencaoPedidoOrcamentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'escolhas'                     => ['required', 'array', 'min:1'],
            'escolhas.*.fornecedor_indice' => ['required', 'integer', 'between:0,2'],
            'escolhas.*.justificativa'     => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'escolhas.required' => 'Escolha o fornecedor vencedor de cada item.',
            'escolhas.*.fornecedor_indice.required' => 'Escolha o fornecedor vencedor de cada item.',
        ];
    }
}
