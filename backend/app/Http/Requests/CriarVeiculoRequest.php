<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarVeiculoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'placa'  => ['required', 'string', 'max:20', 'unique:veiculos,placa'],
            'modelo' => ['required', 'string', 'max:150'],
            'tipo'   => ['nullable', 'string', 'max:50'],
            'equipe' => ['nullable', 'string', 'max:100'],
            'ano'    => ['nullable', 'string', 'max:4'],
            'status' => ['nullable', Rule::in(['ATIVO', 'INATIVO'])],
        ];
    }

    public function messages(): array
    {
        return [
            'placa.required' => 'A placa é obrigatória.',
            'placa.unique'   => 'Já existe um veículo com esta placa.',
            'modelo.required'=> 'O modelo é obrigatório.',
        ];
    }
}
