<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

class KategoriController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Daftar kategori berhasil diambil.',
            'data' => Kategori::withCount('obat')
                ->orderBy('nama_kategori')
                ->get()
                ->map(fn(Kategori $kategori) => $this->kategoriData($kategori)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);
        if ($validated instanceof JsonResponse) {
            return $validated;
        }

        $kategori = Kategori::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil ditambahkan.',
            'data' => $this->kategoriData($kategori->loadCount('obat')),
        ], 201);
    }

    public function update(Request $request, Kategori $kategori): JsonResponse
    {
        $validated = $this->validatedData($request, $kategori);
        if ($validated instanceof JsonResponse) {
            return $validated;
        }

        $kategori->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil diperbarui.',
            'data' => $this->kategoriData($kategori->fresh()->loadCount('obat')),
        ]);
    }

    public function destroy(Kategori $kategori): JsonResponse
    {
        if ($kategori->obat()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Kategori yang masih digunakan obat tidak dapat dihapus.',
                'errors' => [],
            ], 409);
        }

        $kategori->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil dihapus.',
            'data' => null,
        ]);
    }

    /** @return array<string, mixed> */
    private function validatedData(Request $request, ?Kategori $kategori = null): array|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nama_kategori' => [
                'required',
                'string',
                'max:50',
                Rule::unique('kategori', 'nama_kategori')->ignore($kategori?->id_kategori, 'id_kategori'),
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Data kategori tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        return $validator->validated();
    }

    /** @return array<string, mixed> */
    private function kategoriData(Kategori $kategori): array
    {
        return [
            'id_kategori' => $kategori->id_kategori,
            'nama_kategori' => $kategori->nama_kategori,
            'obat_count' => $kategori->obat_count ?? $kategori->obat()->count(),
        ];
    }
}
