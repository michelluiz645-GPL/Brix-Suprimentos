<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConfirmarSeparacaoRequisicaoAlmoxarifadoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    /**
     * Cada item é resolvido individualmente: "separar" (entra na saída
     * agora), "indisponivel" (não vamos ter — encerra sem debitar) ou
     * simplesmente não aparece na lista (fica PENDENTE pra decidir depois).
     * A separação vira parcial sempre que nem todos os itens forem
     * resolvidos na mesma chamada.
     */
    public function rules(): array
    {
        return [
            'almoxarifado' => ['required', 'string', 'max:150'],
            'resp_almox'   => ['required', 'string', 'max:150'],
            'entregador'   => ['required', 'string', 'max:150'],

            'itens'                       => ['required', 'array', 'min:1'],
            'itens.*.item_id'             => ['required', 'integer'],
            'itens.*.acao'                => ['required', Rule::in(['separar', 'indisponivel'])],
            'itens.*.produto_variacao_id' => ['nullable', 'integer', 'exists:produto_variacoes,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'almoxarifado.required' => 'Campo obrigatório: Suprimentos.',
            'resp_almox.required'   => 'Campo obrigatório: Resp. Suprimentos.',
            'entregador.required'   => 'Campo obrigatório: Entregador.',
            'itens.required'        => 'Selecione ao menos um item pra separar ou marcar como indisponível.',
        ];
    }
}
