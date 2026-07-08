<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AtualizarEpiRegistroRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'funcionario'    => ['sometimes', 'string', 'max:255'],
            'epi'            => ['sometimes', 'string', 'max:100'],
            'data_entrega'   => ['sometimes', 'nullable', 'date'],
            'proxima_troca'  => ['sometimes', 'date'],
            'responsavel'    => ['sometimes', 'string', 'max:150'],
            'obs'            => ['sometimes', 'nullable', 'string'],
            'registrado_por' => ['sometimes', 'nullable', 'string', 'max:150'],
        ];
    }
}
