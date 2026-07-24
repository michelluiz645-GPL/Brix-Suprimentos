<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejeitarRequisicaoAlmoxarifadoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'motivo' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'motivo.required' => 'O motivo da rejeição é obrigatório.',
            'motivo.min'      => 'Descreva o motivo com pelo menos 5 caracteres.',
        ];
    }
}
