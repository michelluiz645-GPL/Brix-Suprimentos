<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AprovarSCRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'observacao' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
