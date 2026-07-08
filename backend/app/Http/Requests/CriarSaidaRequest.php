<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarSaidaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tipo_saida'   => ['required', Rule::in(['Retirada', 'Entrega'])],
            'equipe'       => ['required', 'string', 'max:150'],
            'colaborador'  => ['nullable', 'string', 'max:150'],
            'entregador'   => ['required', 'string', 'max:150'],
            'resp_almox'   => ['required', 'string', 'max:150'],
            'almoxarifado' => ['required', 'string', 'max:150'],
            'data'         => ['required', 'date'],

            'itens'                => ['required', 'array', 'min:1'],
            'itens.*.codigo'       => ['required', 'string'],
            'itens.*.variacao_id'  => ['required', 'integer'],
            'itens.*.nome'         => ['nullable', 'string'],
            'itens.*.unid'         => ['nullable', 'string'],
            'itens.*.qtd'          => ['required', 'numeric', 'min:0.01'],
            'itens.*.preco'        => ['nullable', 'numeric', 'min:0'],
            'itens.*.obs'          => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'equipe.required'      => 'Campo obrigatório: Equipe / Destinatário.',
            'entregador.required'  => 'Campo obrigatório: Entregador.',
            'resp_almox.required'  => 'Campo obrigatório: Resp. Suprimentos.',
            'almoxarifado.required' => 'Campo obrigatório: Suprimentos.',
            'itens.*.variacao_id.required' => 'Selecione a marca de cada item.',
        ];
    }
}
