<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\KoboService;
use Illuminate\Http\JsonResponse;

class KoboController extends Controller
{
    public function __construct(private KoboService $service) {}

    public function suprimentos(): JsonResponse
    {
        return $this->buscar('uid_suprim');
    }

    public function compras(): JsonResponse
    {
        return $this->buscar('uid_compras');
    }

    private function buscar(string $uidKey): JsonResponse
    {
        try {
            $pedidos = $this->service->buscarSubmissoes($uidKey);
        } catch (\RuntimeException $e) {
            return response()->json(['data' => null, 'message' => $e->getMessage()], 502);
        }

        return response()->json(['data' => ['data' => $pedidos], 'message' => 'OK']);
    }
}
