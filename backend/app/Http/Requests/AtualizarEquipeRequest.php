<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarEquipeRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'        => ['sometimes', 'string', 'max:150'],
            'numero'      => ['sometimes', 'string', 'max:20', Rule::unique('equipes', 'numero')->ignore($this->route('equipe'))],
            'responsavel' => ['sometimes', 'nullable', 'string', 'max:150'],
            'veiculo'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'tipo'        => ['sometimes', Rule::in(['Manutenção', 'Conservação', 'Terraplanagem', 'Roçada', 'Outro'])],
        ];
    }
}
