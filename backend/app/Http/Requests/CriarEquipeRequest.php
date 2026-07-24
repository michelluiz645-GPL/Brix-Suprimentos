<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarEquipeRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'        => ['required', 'string', 'max:150'],
            'numero'      => ['required', 'string', 'max:20', 'unique:equipes,numero'],
            'centro_custo'=> ['nullable', 'string', 'max:100'],
            'responsavel' => ['nullable', 'string', 'max:150'],
            'veiculo'     => ['nullable', 'string', 'max:100'],
            'tipo'        => ['required', Rule::in(['Manutenção', 'Conservação', 'Terraplanagem', 'Roçada', 'Outro'])],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required'   => 'O nome da equipe é obrigatório.',
            'numero.required' => 'O número da equipe é obrigatório.',
            'numero.unique'   => 'Já existe uma equipe com este número.',
            'tipo.required'   => 'O tipo de operação é obrigatório.',
        ];
    }
}
