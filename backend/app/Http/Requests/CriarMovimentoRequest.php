<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarMovimentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tipo'         => ['required', Rule::in(['ENTRADA', 'SAÍDA', 'DEVOLUÇÃO', 'AJUSTE'])],
            'data'         => ['required', 'date'],
            'almoxarifado' => ['required', 'string', 'max:150'],
            'responsavel'  => ['nullable', 'string', 'max:150'],
            'numero_nf'    => ['nullable', 'string', 'max:50'],
            'fornecedor'   => ['nullable', 'string', 'max:255'],
            'usuario'      => ['nullable', 'string', 'max:150'],
            'obs'          => ['nullable', 'string'],

            // Forma em lote (Registrar Entrada: vários itens numa mesma NF)
            'itens'                 => ['sometimes', 'array', 'min:1'],
            'itens.*.codigo'        => ['required_with:itens', 'string'],
            'itens.*.variacao_id'   => ['nullable', 'integer'],
            'itens.*.nome'          => ['nullable', 'string'],
            'itens.*.unid'          => ['nullable', 'string'],
            'itens.*.qtd'           => ['required_with:itens', 'numeric'],
            'itens.*.preco'         => ['nullable', 'numeric', 'min:0'],

            // Forma avulsa (Inventário/Ajuste: um item só, sem "itens")
            'codigo'       => ['required_without:itens', 'string'],
            'variacao_id'  => ['nullable', 'integer'],
            'nome'         => ['nullable', 'string'],
            'unid'         => ['nullable', 'string'],
            'qtd'          => ['required_without:itens', 'numeric'],
            'preco'        => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo.required'         => 'O tipo de movimentação é obrigatório.',
            'almoxarifado.required' => 'Campo obrigatório: Suprimentos.',
            'codigo.required_without' => 'Todos os itens precisam ter um produto selecionado.',
            'qtd.required_without'    => 'Informe a quantidade.',
        ];
    }
}
