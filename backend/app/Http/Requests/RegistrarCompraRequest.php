<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegistrarCompraRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'previsao_entrega' => ['required', 'date', 'after_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'previsao_entrega.required'        => 'Previsão de entrega é obrigatória.',
            'previsao_entrega.after_or_equal'  => 'A data de entrega não pode ser no passado.',
        ];
    }
}
