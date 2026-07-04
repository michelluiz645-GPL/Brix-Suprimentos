<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['data' => null, 'message' => 'API GEPLAN em execução.']);
});
