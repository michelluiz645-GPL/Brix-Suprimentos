<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarMaterialObraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'          => ['sometimes', 'string', 'max:255'],
            'categoria'     => ['sometimes', 'string', 'max:100'],
            'unidade'       => ['sometimes', 'nullable', 'string', 'max:20'],
            'especificacao' => ['sometimes', 'nullable', 'string'],
            'obs'           => ['sometimes', 'nullable', 'string'],
            'status'        => ['sometimes', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }
}
