<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnviarAprovacaoManutencaoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'fornecedores'                  => ['required', 'array', 'size:3'],
            'fornecedores.*.nome'            => ['required', 'string', 'max:150'],
            'fornecedores.*.forma_pagamento' => ['nullable', 'string', 'max:100'],

            'itens'                              => ['required', 'array', 'min:1'],
            'itens.*.descricao'                  => ['required', 'string', 'max:255'],
            'itens.*.quantidade'                 => ['required', 'numeric', 'min:0.01'],
            'itens.*.unidade'                    => ['required', 'string', 'max:20'],
            'itens.*.valor_referencia_mercado'    => ['nullable', 'numeric', 'min:0'],
            'itens.*.fornecedores'                => ['required', 'array', 'size:3'],
            'itens.*.fornecedores.*.preco'        => ['required', 'numeric', 'min:0'],
            'itens.*.fornecedores.*.marca'         => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'fornecedores.required'   => 'Informe os 3 fornecedores da cotação.',
            'fornecedores.size'       => 'A cotação comparativa exige exatamente 3 fornecedores.',
            'fornecedores.*.nome.required' => 'Informe o nome de cada fornecedor.',
            'itens.required'          => 'Adicione ao menos um item ao comparativo.',
            'itens.*.fornecedores.size' => 'Informe o preço desse item para os 3 fornecedores.',
        ];
    }
}
