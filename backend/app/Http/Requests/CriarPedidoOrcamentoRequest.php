<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CriarPedidoOrcamentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'numero_sc'    => ['nullable', 'string', 'unique:pedidos_orcamento,numero_sc'],
            'data'         => ['required', 'date'],
            'data_desejada' => ['nullable', 'date', 'after_or_equal:data'],
            'setor'        => ['nullable', 'in:MANUTENCAO,ALMOXARIFADO,ENGENHARIA'],
            'destino'      => ['required', 'string', 'max:150'],
            'tipo_destino' => ['required', 'in:FROTA,OBRA,EQUIPAMENTO,ESTOQUE'],
            'urgencia'     => ['required', 'in:CRITICA,ALTA,MEDIA,BAIXA'],
            'itens'                 => ['required', 'array', 'min:1'],
            'itens.*.descricao'     => ['required', 'string'],
            'itens.*.quantidade'    => ['required', 'numeric', 'min:0.01'],
            'itens.*.unidade'       => ['required', 'string'],
            // Só preenchido pela Reposição Automática (RF-029) — usado para
            // bloquear um novo pedido enquanto já houver um em aberto para o produto.
            'itens.*.codigo_produto' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero_sc.unique'  => 'Este número de SC já existe.',
            'itens.required'    => 'Adicione ao menos um item.',
            'destino.required'  => 'O destino é obrigatório.',
            'data_desejada.after_or_equal' => 'A data desejada não pode ser anterior à data do pedido.',
        ];
    }
}
