<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarMaterialObraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'codigo'        => ['required', 'string', 'max:50', 'unique:materiais_obra,codigo'],
            'nome'          => ['required', 'string', 'max:255'],
            'categoria'     => ['required', 'string', 'max:100'],
            'unidade'       => ['nullable', 'string', 'max:20'],
            'especificacao' => ['nullable', 'string'],
            'obs'           => ['nullable', 'string'],
            'status'        => ['nullable', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.required' => 'Código é obrigatório.',
            'codigo.unique'   => 'Código já existe no catálogo.',
            'nome.required'   => 'Nome é obrigatório.',
        ];
    }
}
