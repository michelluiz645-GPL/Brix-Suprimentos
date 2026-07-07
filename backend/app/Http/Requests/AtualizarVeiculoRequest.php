<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarVeiculoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'placa'  => ['sometimes', 'string', 'max:20', Rule::unique('veiculos', 'placa')->ignore($this->route('veiculo'))],
            'modelo' => ['sometimes', 'string', 'max:150'],
            'tipo'   => ['sometimes', 'nullable', 'string', 'max:50'],
            'equipe' => ['sometimes', 'nullable', 'string', 'max:100'],
            'ano'    => ['sometimes', 'nullable', 'string', 'max:4'],
            'status' => ['sometimes', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }
}
