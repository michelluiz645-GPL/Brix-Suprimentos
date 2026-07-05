<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AprovarManutencaoPedidoOrcamentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'fornecedor_escolhido' => ['required', 'string', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'fornecedor_escolhido.required' => 'Selecione o fornecedor vencedor desta cotação.',
        ];
    }
}
