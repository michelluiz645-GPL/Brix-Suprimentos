<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AtualizarProdutoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nome'              => ['sometimes', 'string', 'max:255'],
            'categoria'         => ['sometimes', 'string', 'max:100'],
            'unid'              => ['sometimes', 'string', 'max:20'],
            'estoque_min'       => ['sometimes', 'numeric', 'min:0'],
            'estoque_max'       => ['sometimes', 'numeric', 'min:0'],
            'armario'           => ['sometimes', 'nullable', 'string', 'max:50'],
            'prateleira'        => ['sometimes', 'nullable', 'string', 'max:50'],
            'dias_validade_epi' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'marca_obrigatoria' => ['sometimes', 'boolean'],
            'status'            => ['sometimes', Rule::in(['ATIVO', 'INATIVO'])],

            // Se enviado, substitui o conjunto de marcas/variações do produto
            // (sync: atualiza quem tem "id", cria quem não tem, remove quem
            // ficou de fora — ver ProdutoController::sincronizarVariacoes).
            'variacoes'                     => ['sometimes', 'array', 'min:1'],
            'variacoes.*.id'                => ['sometimes', 'nullable', 'integer'],
            'variacoes.*.marca'             => ['nullable', 'string', 'max:100'],
            'variacoes.*.codigo_fabricante' => ['nullable', 'string', 'max:100'],
            'variacoes.*.preco'             => ['required_with:variacoes', 'numeric', 'min:0'],
            'variacoes.*.estoque'           => ['required_with:variacoes', 'numeric', 'min:0'],
        ];
    }
}
