<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CriarDevolucaoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'numero_pedido_origem' => ['required', 'string'],
            'motivo'                => ['required', 'string', 'max:500'],
            'responsavel'           => ['required', 'string', 'max:150'],
            'data'                  => ['required', 'date'],

            'itens'                  => ['required', 'array', 'min:1'],
            'itens.*.codigo'         => ['required', 'string'],
            'itens.*.variacao_id'    => ['nullable', 'integer'],
            'itens.*.nome'           => ['nullable', 'string'],
            'itens.*.unid'           => ['nullable', 'string'],
            'itens.*.qtd_dev'        => ['required', 'numeric', 'min:0.01'],
            'itens.*.danificado'     => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero_pedido_origem.required' => 'Busque o pedido de saída de origem antes de continuar.',
            'motivo.required'                => 'Campo obrigatório: Motivo da devolução.',
            'responsavel.required'           => 'Campo obrigatório: Responsável.',
        ];
    }
}
