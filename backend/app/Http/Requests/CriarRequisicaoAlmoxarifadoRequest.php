<?php

namespace App\Http\Requests;

use App\Models\Produto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarRequisicaoAlmoxarifadoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'data'          => ['required', 'date'],
            'data_desejada' => ['required', 'date', 'after_or_equal:data'],
            'urgencia'      => ['required', Rule::in(['Baixa', 'Média', 'Alta'])],
            'justificativa' => ['nullable', 'string'],

            'itens'                    => ['required', 'array', 'min:1'],
            'itens.*.produto_id'       => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.produto_variacao_id' => ['nullable', 'integer', 'exists:produto_variacoes,id'],
            'itens.*.quantidade'       => ['required', 'numeric', 'min:0.01'],
            'itens.*.destino'          => ['required', Rule::in(['Para a Equipe', 'Roçada', 'Obra', 'Administração', 'Manutenção', 'Consumível', 'Frota', 'Outros'])],
            'itens.*.destino_equipe'   => ['nullable', 'string', 'max:150'],
            'itens.*.destino_frota'    => ['nullable', 'string', 'max:20'],
            'itens.*.destino_obra'     => ['nullable', 'string', 'max:150'],
            'itens.*.colaborador_epi'  => ['nullable', 'string', 'max:150'],
            'itens.*.observacao'       => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'data_desejada.required'     => 'A data desejada para retirada é obrigatória.',
            'data_desejada.after_or_equal' => 'A data desejada não pode ser anterior à data do pedido.',
            'itens.required'             => 'Adicione ao menos um item.',
            'itens.*.produto_id.required' => 'Selecione o item do catálogo.',
            'itens.*.quantidade.required' => 'Informe a quantidade de cada item.',
            'itens.*.destino.required'    => 'Selecione o destino de cada item.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach ($this->input('itens', []) as $i => $item) {
                if (($item['destino'] ?? null) === 'Para a Equipe' && empty($item['destino_equipe'])) {
                    $validator->errors()->add("itens.{$i}.destino_equipe", 'Selecione a equipe para itens com destino "Para a Equipe".');
                }
                if (($item['destino'] ?? null) === 'Frota' && empty($item['destino_frota'])) {
                    $validator->errors()->add("itens.{$i}.destino_frota", 'Informe a placa da frota para itens com destino "Frota".');
                }
                if (($item['destino'] ?? null) === 'Obra' && empty($item['destino_obra'])) {
                    $validator->errors()->add("itens.{$i}.destino_obra", 'Selecione a obra para itens com destino "Obra".');
                }

                $produto = Produto::find($item['produto_id'] ?? null);
                if (! $produto) {
                    continue;
                }

                if ($produto->categoria === 'EPI' && empty($item['colaborador_epi'])) {
                    $validator->errors()->add("itens.{$i}.colaborador_epi", 'Selecione o colaborador para o item de EPI.');
                }

                if ($produto->marca_obrigatoria && empty($item['produto_variacao_id'])) {
                    $validator->errors()->add("itens.{$i}.produto_variacao_id", 'Este item exige a escolha da marca no pedido.');
                }

                if (! empty($item['produto_variacao_id']) && ! $produto->variacoes()->where('id', $item['produto_variacao_id'])->exists()) {
                    $validator->errors()->add("itens.{$i}.produto_variacao_id", 'A marca selecionada não pertence a este item.');
                }
            }
        });
    }
}
