<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use App\Models\Obat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ObatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('obat.lihat'), 403);

        $sortableColumns = [
            'kode' => 'kode_obat',
            'nama' => 'nama_obat',
            'stok' => 'stok',
            'kategori' => 'kategori.nama_kategori',
            'satuan' => 'satuan',
            'harga_jual' => 'harga_jual',
        ];
        $sortOption = $request->string('sort_option')->toString();
        $sort = $request->string('sort_by')->toString() ?: $request->string('sort')->toString();
        $direction = $request->string('direction')->lower()->toString();

        if ($sortOption !== '') {
            [$sort, $direction] = array_pad(explode('|', $sortOption, 2), 2, 'asc');
        }

        $sort = array_key_exists($sort, $sortableColumns) ? $sort : 'kode';
        $direction = $direction === 'desc' ? 'desc' : 'asc';

        $obat = Obat::query()
            ->forUser($request->user())
            ->with('kategoriRelasi')
            ->when($request->filled('kategori_id'), fn($query) => $query->where('obat.kategori_id', $request->integer('kategori_id')))
            ->when($request->filled('satuan'), fn($query) => $query->where('satuan', $request->string('satuan')->toString()))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->trim();

                $query->where(function ($query) use ($search) {
                    $query->where('kode_obat', 'like', "%{$search}%")
                        ->orWhere('nama_obat', 'like', "%{$search}%")
                        ->orWhereHas('kategoriRelasi', fn($query) => $query->where('nama_kategori', 'like', "%{$search}%"));
                });
            })
            ->when($sort === 'kategori', fn($query) => $query->leftJoin('kategori', 'obat.kategori_id', '=', 'kategori.id_kategori')->select('obat.*'))
            ->orderBy($sortableColumns[$sort], $direction)
            ->paginate(10)
            ->withQueryString();

        $kategori = Kategori::query()->orderBy('nama_kategori')->get(['id_kategori', 'nama_kategori']);
        $satuan = Obat::query()
            ->forUser($request->user())
            ->whereNotNull('satuan')
            ->distinct()
            ->orderBy('satuan')
            ->pluck('satuan')
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Daftar obat berhasil diambil.',
            'data' => $obat->getCollection()->map(fn(Obat $item) => $this->obatData($item))->values(),
            'meta' => [
                'current_page' => $obat->currentPage(),
                'per_page' => $obat->perPage(),
                'total' => $obat->total(),
                'last_page' => $obat->lastPage(),
                'from' => $obat->firstItem(),
                'to' => $obat->lastItem(),
                'filters' => [
                    'kategori' => $kategori,
                    'satuan' => $satuan,
                ],
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function show(Request $request, int $obat): JsonResponse
    {
        abort_unless($request->user()?->can('obat.lihat'), 403);

        $item = Obat::query()
            ->forUser($request->user())
            ->with('kategoriRelasi')
            ->whereKey($obat)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'message' => 'Detail obat berhasil diambil.',
            'data' => $this->obatData($item),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('obat.kelola'), 403);

        $validated = $this->validatedData($request);
        $obat = Obat::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data obat berhasil ditambahkan.',
            'data' => $this->obatData($obat->load('kategoriRelasi')),
        ], 201);
    }

    public function update(Request $request, int $obat): JsonResponse
    {
        abort_unless($request->user()?->can('obat.kelola'), 403);

        $item = Obat::query()
            ->forUser($request->user())
            ->whereKey($obat)
            ->firstOrFail();

        $validated = $this->validatedData($request, $item);
        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data obat berhasil diperbarui.',
            'data' => $this->obatData($item->fresh('kategoriRelasi')),
        ]);
    }

    public function destroy(Request $request, int $obat): JsonResponse
    {
        abort_unless($request->user()?->can('obat.kelola'), 403);

        $item = Obat::query()
            ->forUser($request->user())
            ->whereKey($obat)
            ->firstOrFail();

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data obat berhasil dihapus.',
            'data' => null,
        ]);
    }

    private function validatedData(Request $request, ?Obat $obat = null): array
    {
        $data = $request->validate([
            'kode_obat' => ['required', 'string', 'max:20', 'unique:obat,kode_obat,' . ($obat?->id ?? 'NULL') . ',id'],
            'nama_obat' => ['required', 'string', 'max:255'],
            'kategori_id' => ['nullable', 'integer', 'exists:kategori,id_kategori'],
            'satuan' => ['required', 'string', 'max:20'],
            'harga_beli' => ['required', 'numeric', 'min:0'],
            'harga_jual' => ['required', 'numeric', 'min:0'],
            'stok' => ['required', 'integer', 'min:0'],
            'stok_minimum' => ['required', 'integer', 'min:0'],
            'tanggal_kadaluarsa' => ['nullable', 'date'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $data['apotek'] = $request->user()->apotek;

        return $data;
    }

    /** @return array<string, mixed> */
    private function obatData(Obat $obat): array
    {
        return [
            'id' => $obat->id,
            'kode_obat' => $obat->kode_obat,
            'nama_obat' => $obat->nama_obat,
            'apotek' => $obat->apotek,
            'kategori' => $obat->kategoriRelasi ? [
                'id' => $obat->kategoriRelasi->id_kategori,
                'nama' => $obat->kategoriRelasi->nama_kategori,
            ] : null,
            'satuan' => $obat->satuan,
            'harga_beli' => $obat->harga_beli,
            'harga_jual' => $obat->harga_jual,
            'stok' => $obat->stok,
            'stok_minimum' => $obat->stok_minimum,
            'tanggal_kadaluarsa' => $obat->tanggal_kadaluarsa?->toDateString(),
            'keterangan' => $obat->keterangan,
        ];
    }
}
