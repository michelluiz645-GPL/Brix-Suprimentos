<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DarEntradaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'itens'                         => ['required', 'array', 'min:1'],
            'itens.*.id'                    => ['required', 'integer', 'exists:itens_sc,id'],
            'itens.*.quantidade_recebida'   => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'itens.required'                       => 'Selecione ao menos um item para dar entrada.',
            'itens.*.id.exists'                    => 'Item inválido.',
            'itens.*.quantidade_recebida.required' => 'Informe a quantidade recebida.',
            'itens.*.quantidade_recebida.min'      => 'Quantidade deve ser maior que zero.',
        ];
    }
}
