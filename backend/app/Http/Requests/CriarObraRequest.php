<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarObraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'setor'        => ['nullable', 'string', 'max:50'],
            'nome'         => ['required', 'string', 'max:255'],
            'tipo'         => ['nullable', Rule::in(['PUBLICA', 'PRIVADA'])],
            'descricao'    => ['nullable', 'string'],
            'responsavel'  => ['nullable', 'string', 'max:150'],
            'data_inicio'  => ['nullable', 'date'],
            'data_prev'    => ['nullable', 'date'],
            'centro_custo' => ['required', 'string', 'max:100'],
            'status'       => ['nullable', Rule::in(['ATIVA', 'CONCLUÍDA', 'SUSPENSA'])],
        ];
    }

    public function messages(): array
    {
        return [
            'nome.required'         => 'O nome da obra é obrigatório.',
            'centro_custo.required' => 'O centro de custo é obrigatório.',
        ];
    }
}
