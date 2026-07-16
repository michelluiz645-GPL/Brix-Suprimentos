<?php

namespace App\Http\Requests;

use App\Models\Produto;
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
            'nome_equipe'  => ['nullable', 'string', 'max:150'],
            'colaborador'  => ['nullable', 'string', 'max:150'],
            'entregador'   => ['required', 'string', 'max:150'],
            'resp_almox'   => ['required', 'string', 'max:150'],
            'almoxarifado' => ['required', 'string', 'max:150'],
            'data'         => ['required', 'date'],

            'itens'                 => ['required', 'array', 'min:1'],
            'itens.*.codigo'        => ['required', 'string'],
            'itens.*.variacao_id'   => ['required', 'integer'],
            'itens.*.nome'          => ['nullable', 'string'],
            'itens.*.unid'          => ['nullable', 'string'],
            'itens.*.qtd'           => ['required', 'numeric', 'min:0.01'],
            'itens.*.preco'         => ['nullable', 'numeric', 'min:0'],
            'itens.*.obs'           => ['nullable', 'string'],
            'itens.*.destino'       => ['required', Rule::in(['Para a Equipe', 'Roçada', 'Obra', 'Administração', 'Manutenção', 'Consumível', 'Frota', 'Outros'])],
            'itens.*.destino_frota' => ['nullable', 'string', 'max:20'],
            'itens.*.destino_obra'  => ['nullable', 'string', 'max:150'],
            'itens.*.colaborador_epi' => ['nullable', 'string', 'max:150'],
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
            'itens.*.destino.required'      => 'Selecione o destino de cada item.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach ($this->input('itens', []) as $i => $item) {
                if (($item['destino'] ?? null) === 'Frota' && empty($item['destino_frota'])) {
                    $validator->errors()->add("itens.{$i}.destino_frota", 'Informe a placa da frota para itens com destino "Frota".');
                }
                if (($item['destino'] ?? null) === 'Obra' && empty($item['destino_obra'])) {
                    $validator->errors()->add("itens.{$i}.destino_obra", 'Selecione a obra para itens com destino "Obra".');
                }

                $produto = Produto::where('codigo_produto', $item['codigo'] ?? null)->first();
                if ($produto?->categoria === 'EPI' && empty($item['colaborador_epi'])) {
                    $validator->errors()->add("itens.{$i}.colaborador_epi", 'Selecione o colaborador para o item de EPI.');
                }
            }
        });
    }
}
