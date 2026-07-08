<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarEquipamentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'   => ['required', 'string', 'max:255'],
            'tipo'   => ['required', 'string', 'max:100'],
            'serie'  => ['nullable', 'string', 'max:100'],
            'equipe' => ['nullable', 'string', 'max:100'],
            'obs'    => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }

    public function messages(): array
    {
        return ['nome.required' => 'O nome do equipamento é obrigatório.'];
    }
}
