<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'setor' => ['required', 'string'],
            'login' => ['required', 'string'],
            'senha' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'setor.required' => 'Selecione o setor.',
            'login.required' => 'Informe o usuário.',
            'senha.required' => 'Informe a senha.',
        ];
    }
}
