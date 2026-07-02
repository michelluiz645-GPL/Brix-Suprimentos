<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AbrirSCRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'data_necessaria'    => ['nullable', 'date'],
            'funcao_cargo'       => ['nullable', 'string', 'max:255'],
            'destino'            => ['required', 'in:Frota,Obra,Administração,Manutenção,Outros'],
            'veiculo_frota'      => ['nullable', 'string', 'max:255'],
            'urgencia'           => ['required', 'in:Baixa,Média,Alta,Crítica'],
            'local_entrega'      => ['nullable', 'string', 'max:255'],
            'ponto_referencia'   => ['nullable', 'string', 'max:255'],
            'horario_recebimento'=> ['nullable', 'date_format:H:i'],
            'motivo'             => ['nullable', 'string'],
            'ordem_servico'      => ['nullable', 'string', 'max:100'],
            'itens'              => ['required', 'array', 'min:1'],
            'itens.*.descricao'  => ['required', 'string'],
            'itens.*.quantidade' => ['required', 'numeric', 'min:0.01'],
            'itens.*.unidade'    => ['required', 'string', 'max:20'],
            'itens.*.fabricante' => ['nullable', 'string', 'max:255'],
            'itens.*.part_number'=> ['nullable', 'string', 'max:100'],
            'itens.*.aplicacao_equipamento' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'destino.required'        => 'Destino é obrigatório.',
            'urgencia.required'       => 'Urgência é obrigatória.',
            'itens.required'          => 'Adicione pelo menos um item.',
            'itens.*.descricao.required' => 'Descrição do item é obrigatória.',
            'itens.*.quantidade.required'=> 'Quantidade é obrigatória.',
            'itens.*.unidade.required'   => 'Unidade é obrigatória.',
        ];
    }
}
