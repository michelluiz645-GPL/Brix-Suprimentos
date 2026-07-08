<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarEquipamentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'   => ['sometimes', 'string', 'max:255'],
            'tipo'   => ['sometimes', 'string', 'max:100'],
            'serie'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'equipe' => ['sometimes', 'nullable', 'string', 'max:100'],
            'obs'    => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }
}
