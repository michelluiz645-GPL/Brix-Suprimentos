<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarCombustivelMovimentoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tipo'        => ['required', Rule::in(['ENTRADA', 'ABASTECIMENTO'])],
            'combustivel' => ['required', Rule::in(['DIESEL S500', 'DIESEL S10', 'GASOLINA'])],
            'quantidade'  => ['required', 'numeric', 'min:0.01'],
            'valor_litro' => ['nullable', 'numeric', 'min:0'],
            'valor'       => ['nullable', 'numeric', 'min:0'],
            'fornecedor'  => ['required_if:tipo,ENTRADA', 'nullable', 'string', 'max:255'],
            'frota'       => ['required_if:tipo,ABASTECIMENTO', 'nullable', 'string', 'max:150'],
            'responsavel' => ['required', 'string', 'max:150'],
            'data'        => ['required', 'date'],
            'usuario'     => ['nullable', 'string', 'max:150'],
        ];
    }

    public function messages(): array
    {
        return [
            'fornecedor.required_if' => 'Fornecedor é obrigatório.',
            'frota.required_if'      => 'Informe o destino (frota ou outros).',
            'responsavel.required'   => 'Responsável é obrigatório.',
        ];
    }
}
