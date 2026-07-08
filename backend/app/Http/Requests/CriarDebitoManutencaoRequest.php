<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CriarDebitoManutencaoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'numero'         => ['nullable', 'string', 'max:50'],
            'pedido_origem'  => ['nullable', 'string', 'max:50'],
            'data'           => ['required', 'date'],
            'equipe'         => ['required', 'string', 'max:100'],
            'nome_equipe'    => ['nullable', 'string', 'max:150'],
            'colaborador'    => ['nullable', 'string', 'max:150'],
            'almoxarifado'   => ['nullable', 'string', 'max:150'],
            'registrado_por' => ['required', 'string', 'max:150'],

            'itens'              => ['required', 'array', 'min:1'],
            'itens.*.nome'       => ['required', 'string'],
            'itens.*.qtd'        => ['required', 'numeric', 'min:0.01'],
            'itens.*.unid'       => ['nullable', 'string'],
            'itens.*.preco'      => ['nullable', 'numeric', 'min:0'],
            'itens.*.destino_frota' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'equipe.required'         => 'Equipe é obrigatória.',
            'registrado_por.required' => 'Registrado por é obrigatório.',
            'itens.*.nome.required'   => 'Todos os itens precisam ter um nome.',
        ];
    }
}
