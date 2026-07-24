<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CriarProdutoRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'codigo_produto'    => ['required', 'string', 'max:100', 'unique:produtos,codigo_produto'],
            'nome'              => ['required', 'string', 'max:255'],
            'categoria'         => ['required', 'string', 'max:100'],
            'unid'              => ['required', 'string', 'max:20'],
            'estoque_min'       => ['nullable', 'numeric', 'min:0'],
            'estoque_max'       => ['nullable', 'numeric', 'min:0'],
            'armario'           => ['nullable', 'string', 'max:50'],
            'prateleira'        => ['nullable', 'string', 'max:50'],
            'dias_validade_epi' => ['nullable', 'integer', 'min:0'],
            'marca_obrigatoria' => ['nullable', 'boolean'],
            'status'            => ['nullable', Rule::in(['ATIVO', 'INATIVO'])],

            // Um mesmo produto interno pode ter várias marcas equivalentes
            // (ex.: filtro WEGA FCD4000 e TECFIL PSC706) — cada uma com seu
            // próprio preço e estoque físico.
            'variacoes'                     => ['required', 'array', 'min:1'],
            'variacoes.*.marca'             => ['nullable', 'string', 'max:100'],
            'variacoes.*.codigo_fabricante' => ['nullable', 'string', 'max:100'],
            'variacoes.*.preco'             => ['required', 'numeric', 'min:0'],
            'variacoes.*.estoque'           => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo_produto.required' => 'O código do produto é obrigatório.',
            'codigo_produto.unique'   => 'Já existe um produto com este código.',
            'nome.required'           => 'O nome é obrigatório.',
            'categoria.required'      => 'A categoria é obrigatória.',
            'variacoes.required'      => 'Cadastre ao menos uma marca/variação para o produto.',
            'variacoes.min'           => 'Cadastre ao menos uma marca/variação para o produto.',
        ];
    }
}
