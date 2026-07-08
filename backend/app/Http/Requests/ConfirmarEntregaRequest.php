<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmarEntregaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'confirmado_por'   => ['required', 'string', 'max:150'],
            'data_confirmacao' => ['required', 'date'],
        ];
    }

    public function messages(): array
    {
        return ['confirmado_por.required' => 'Informe quem confirmou o recebimento.'];
    }
}
