<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnviarAprovacaoManutencaoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'valor_total' => ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'valor_total.required' => 'Informe o valor total cotado.',
            'valor_total.min'      => 'O valor cotado deve ser maior que zero.',
        ];
    }
}
