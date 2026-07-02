<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejeitarSCRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'motivo' => ['required', 'string', 'min:10', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'motivo.required' => 'O motivo da rejeição é obrigatório.',
            'motivo.min'      => 'Descreva o motivo com pelo menos 10 caracteres.',
        ];
    }
}
