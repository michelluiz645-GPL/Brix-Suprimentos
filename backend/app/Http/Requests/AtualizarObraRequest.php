<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarObraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'setor'        => ['sometimes', 'string', 'max:50'],
            'nome'         => ['sometimes', 'string', 'max:255'],
            'tipo'         => ['sometimes', Rule::in(['PUBLICA', 'PRIVADA'])],
            'descricao'    => ['sometimes', 'nullable', 'string'],
            'responsavel'  => ['sometimes', 'nullable', 'string', 'max:150'],
            'data_inicio'  => ['sometimes', 'nullable', 'date'],
            'data_prev'    => ['sometimes', 'nullable', 'date'],
            'centro_custo' => ['sometimes', 'string', 'max:100'],
            'status'       => ['sometimes', Rule::in(['ATIVA', 'CONCLUÍDA', 'SUSPENSA'])],
        ];
    }
}
