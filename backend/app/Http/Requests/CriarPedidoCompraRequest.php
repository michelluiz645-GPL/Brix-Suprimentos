<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CriarPedidoCompraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'data_pedido'     => ['nullable', 'date'],
            'solicitante'     => ['required', 'string', 'max:150'],
            'setor_origem'    => ['required', 'string', 'max:100'],
            'obra'            => ['nullable', 'string', 'max:150'],
            'centro_custo'    => ['nullable', 'string', 'max:100'],
            'num_sc_ref'      => ['nullable', 'string', 'max:50'],
            // Pedidos gerados automaticamente (Reposição Automática, KOBO) ainda não
            // têm fornecedor/local/condição de pagamento decididos — só o formulário
            // manual exige esses campos, e já faz isso no próprio frontend.
            'forn_nome'       => ['nullable', 'string', 'max:255'],
            'forn_cnpj'       => ['nullable', 'string', 'max:20'],
            'forn_tel'        => ['nullable', 'string', 'max:30'],
            'forn_contato'    => ['nullable', 'string', 'max:150'],
            'forn_email'      => ['nullable', 'email', 'max:255'],
            'local_entrega'   => ['nullable', 'string', 'max:255'],
            'data_desejada'   => ['nullable', 'date'],
            'cond_pagamento'  => ['nullable', 'string', 'max:150'],
            'frete'           => ['nullable', 'numeric', 'min:0'],
            'outras_despesas' => ['nullable', 'numeric', 'min:0'],
            'desconto_total'  => ['nullable', 'numeric', 'min:0'],
            'origem'          => ['nullable', 'string', 'in:MANUAL,AUTOMATICO'],
            'urgencia'        => ['nullable', 'string', 'max:20'],

            'itens'                => ['required', 'array', 'min:1'],
            'itens.*.nome'         => ['required', 'string'],
            'itens.*.qtd'          => ['required', 'numeric', 'min:0.01'],
            'itens.*.unidade'      => ['required', 'string'],
            'itens.*.preco_unit'   => ['nullable', 'numeric', 'min:0'],
            'itens.*.desconto'     => ['nullable', 'numeric', 'min:0'],
            'itens.*.data_entrega' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'solicitante.required'   => 'Campo obrigatório: Solicitante.',
            'setor_origem.required'  => 'Campo obrigatório: Setor Origem.',
            'itens.*.nome.required'    => 'Todos os itens precisam ter nome/descrição.',
            'itens.*.unidade.required' => 'Todos os itens precisam ter unidade de medida.',
        ];
    }
}
