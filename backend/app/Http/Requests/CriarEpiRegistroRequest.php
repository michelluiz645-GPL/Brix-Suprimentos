<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CriarEpiRegistroRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'funcionario'    => ['required', 'string', 'max:255'],
            'epi'            => ['required', 'string', 'max:100'],
            'data_entrega'   => ['nullable', 'date'],
            'proxima_troca'  => ['required', 'date'],
            'responsavel'    => ['required', 'string', 'max:150'],
            'obs'            => ['nullable', 'string'],
            'registrado_por' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'funcionario.required'   => 'Nome do funcionário é obrigatório.',
            'proxima_troca.required' => 'Data da próxima troca é obrigatória.',
            'responsavel.required'   => 'Responsável é obrigatório.',
        ];
    }
}
