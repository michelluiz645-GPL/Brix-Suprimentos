<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarCompraPedidoOrcamentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'data_prevista_recebimento' => ['required', 'date', 'after_or_equal:today'],
            'desconto_negociacao'       => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'data_prevista_recebimento.required'       => 'A data prevista de recebimento é obrigatória.',
            'data_prevista_recebimento.after_or_equal'  => 'A data prevista não pode ser no passado.',
            'desconto_negociacao.min'                   => 'O desconto não pode ser negativo.',
        ];
    }
}
