<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DetailPenjualan;
use App\Models\Obat;
use App\Models\Penjualan;
use App\Models\User;
use Carbon\CarbonImmutable;
use Dompdf\Dompdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TransaksiController extends Controller
{
    /**
     * Mengambil daftar obat yang tersedia untuk dijual pada apotek user yang sedang login.
     */
    public function obatList(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403, 'Akses tidak diizinkan untuk apotek ini.');

        $search = $request->string('search')->trim()->toString();
        $kategoriId = $request->input('kategori_id');

        $obatQuery = Obat::query()
            ->forUser($user)
            ->with('kategoriRelasi')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nama_obat', 'like', "%{$search}%")
                        ->orWhere('kode_obat', 'like', "%{$search}%")
                        ->orWhereHas('kategoriRelasi', fn($kq) => $kq->where('nama_kategori', 'like', "%{$search}%"));
                });
            })
            ->when(!empty($kategoriId), fn($query) => $query->where('kategori_id', (int) $kategoriId))
            ->orderBy('nama_obat');

        $obatList = $obatQuery->get()->map(function (Obat $obat) {
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
                'harga_jual' => (float) $obat->harga_jual,
                'stok' => (int) $obat->stok,
                'stok_minimum' => (int) $obat->stok_minimum,
                'status_stok' => $obat->stok <= 0 ? 'habis' : ($obat->stok <= $obat->stok_minimum ? 'menipis' : 'aman'),
                'keterangan' => $obat->keterangan,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Daftar obat transaksi berhasil diambil.',
            'data' => $obatList,
            'apotek' => $user->apotek,
        ]);
    }

    /**
     * Mengambil isi keranjang belanja dari sesi user saat ini.
     */
    public function getCart(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $cart = $this->sessionCart($request);
        $items = $this->buildCartItems($user, $cart);
        $total = $items->sum('subtotal');

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
                'jumlah_item' => $items->sum('jumlah'),
                'total' => $total,
            ],
        ]);
    }

    /**
     * Menambahkan item ke keranjang sesi.
     */
    public function addToCart(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $validated = $request->validate([
            'obat_id' => ['required', 'integer'],
            'jumlah' => ['nullable', 'integer', 'min:1', 'max:9999'],
        ]);

        $obat = Obat::query()->forUser($user)->findOrFail($validated['obat_id']);
        $tambah = (int) ($validated['jumlah'] ?? 1);

        $cart = $this->sessionCart($request);
        $currentQty = (int) ($cart[$obat->id] ?? 0);
        $newQty = $currentQty + $tambah;

        if ($obat->stok < $newQty) {
            return response()->json([
                'success' => false,
                'message' => "Stok {$obat->nama_obat} tidak mencukupi. Tersedia: {$obat->stok}.",
            ], 422);
        }

        $cart[$obat->id] = $newQty;
        $this->saveSessionCart($request, $cart);

        $items = $this->buildCartItems($user, $cart);

        return response()->json([
            'success' => true,
            'message' => "{$obat->nama_obat} ditambahkan ke keranjang.",
            'data' => [
                'items' => $items,
                'jumlah_item' => $items->sum('jumlah'),
                'total' => $items->sum('subtotal'),
            ],
        ]);
    }

    /**
     * Memperbarui kuantitas obat di keranjang sesi.
     */
    public function updateCartItem(Request $request, int $obatId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $validated = $request->validate([
            'jumlah' => ['required', 'integer', 'min:0', 'max:9999'],
        ]);

        $obat = Obat::query()->forUser($user)->findOrFail($obatId);
        $newQty = (int) $validated['jumlah'];
        $cart = $this->sessionCart($request);

        if ($newQty <= 0) {
            unset($cart[$obatId]);
        } else {
            if ($obat->stok < $newQty) {
                return response()->json([
                    'success' => false,
                    'message' => "Stok {$obat->nama_obat} tidak mencukupi. Tersedia: {$obat->stok}.",
                ], 422);
            }
            $cart[$obatId] = $newQty;
        }

        $this->saveSessionCart($request, $cart);
        $items = $this->buildCartItems($user, $cart);

        return response()->json([
            'success' => true,
            'message' => 'Keranjang berhasil diperbarui.',
            'data' => [
                'items' => $items,
                'jumlah_item' => $items->sum('jumlah'),
                'total' => $items->sum('subtotal'),
            ],
        ]);
    }

    /**
     * Menghapus obat dari keranjang sesi.
     */
    public function removeFromCart(Request $request, int $obatId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $cart = $this->sessionCart($request);
        unset($cart[$obatId]);
        $this->saveSessionCart($request, $cart);

        $items = $this->buildCartItems($user, $cart);

        return response()->json([
            'success' => true,
            'message' => 'Obat dihapus dari keranjang.',
            'data' => [
                'items' => $items,
                'jumlah_item' => $items->sum('jumlah'),
                'total' => $items->sum('subtotal'),
            ],
        ]);
    }

    /**
     * Mengosongkan keranjang sesi.
     */
    public function clearCart(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $this->saveSessionCart($request, []);

        return response()->json([
            'success' => true,
            'message' => 'Keranjang dikosongkan.',
            'data' => [
                'items' => [],
                'jumlah_item' => 0,
                'total' => 0,
            ],
        ]);
    }

    /**
     * Memproses checkout transaksi penjualan.
     * Menerima item langsung dari payload JSON atau dari keranjang sesi jika payload items kosong.
     */
    public function checkout(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403, 'Akses tidak diizinkan untuk apotek ini.');

        $validated = $request->validate([
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.obat_id' => ['required_with:items', 'integer'],
            'items.*.jumlah' => ['required_with:items', 'integer', 'min:1', 'max:9999'],
            'nama_pelanggan' => ['nullable', 'string', 'max:100'],
            'metode_pembayaran' => ['nullable', 'string', 'max:50'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'bayar' => ['nullable', 'numeric', 'min:0'],
        ]);

        // Tentukan cart map [obat_id => jumlah]
        $cartMap = [];
        if (!empty($validated['items'])) {
            foreach ($validated['items'] as $item) {
                $obatId = (int) $item['obat_id'];
                $cartMap[$obatId] = ($cartMap[$obatId] ?? 0) + (int) $item['jumlah'];
            }
        } else {
            $cartMap = $this->sessionCart($request);
        }

        if (empty($cartMap)) {
            return response()->json([
                'success' => false,
                'message' => 'Keranjang transaksi masih kosong.',
            ], 422);
        }

        try {
            $result = DB::transaction(function () use ($cartMap, $user, $validated, $request): array {
                $obatIds = array_keys($cartMap);

                // Kunci baris obat untuk update stok atomik
                $obatList = Obat::query()
                    ->forUser($user)
                    ->whereIn('id', $obatIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $totalCents = 0;
                $detailItems = [];

                foreach ($cartMap as $id => $jumlah) {
                    /** @var Obat|null $obat */
                    $obat = $obatList->get($id);

                    if (!$obat) {
                        throw ValidationException::withMessages([
                            'items' => ["Obat dengan ID {$id} tidak ditemukan pada apotek ini."],
                        ]);
                    }

                    if ($obat->stok < $jumlah) {
                        throw ValidationException::withMessages([
                            'items' => ["Stok {$obat->nama_obat} tidak mencukupi (diminta: {$jumlah}, tersedia: {$obat->stok})."],
                        ]);
                    }

                    $unitCents = $this->toCents((string) $obat->harga_jual);
                    $subtotalCents = $unitCents * $jumlah;
                    $totalCents += $subtotalCents;

                    $detailItems[] = [
                        'obat' => $obat,
                        'jumlah' => $jumlah,
                        'harga_jual' => $obat->harga_jual,
                        'subtotal' => $this->fromCents($subtotalCents),
                    ];
                }

                $totalAmount = $this->fromCents($totalCents);
                $bayar = isset($validated['bayar']) ? (float) $validated['bayar'] : null;

                if ($bayar !== null && $bayar < (float) $totalAmount) {
                    throw ValidationException::withMessages([
                        'bayar' => ['Nominal pembayaran kurang dari total tagihan.'],
                    ]);
                }

                $noFaktur = 'TRX-' . now()->format('Ymd-His') . '-' . Str::upper(Str::random(5));

                $penjualan = Penjualan::create([
                    'no_faktur' => $noFaktur,
                    'user_id' => $user->id,
                    'nama_pelanggan' => $validated['nama_pelanggan'] ?? null,
                    'tanggal_penjualan' => now(),
                    'total' => $totalAmount,
                    'metode_pembayaran' => $validated['metode_pembayaran'] ?? 'Tunai',
                    'keterangan' => $validated['keterangan'] ?? null,
                ]);

                foreach ($detailItems as $item) {
                    /** @var Obat $obat */
                    $obat = $item['obat'];

                    DetailPenjualan::create([
                        'penjualan_id' => $penjualan->id,
                        'obat_id' => $obat->id,
                        'jumlah' => $item['jumlah'],
                        'harga_jual' => $item['harga_jual'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    $obat->decrement('stok', $item['jumlah']);
                }

                return [
                    'penjualan' => $penjualan->fresh(['user', 'detail.obat']),
                    'bayar' => $bayar,
                    'kembalian' => $bayar !== null ? max(0, $bayar - (float) $totalAmount) : null,
                ];
            });

            // Kosongkan keranjang sesi setelah checkout berhasil
            $this->saveSessionCart($request, []);

            /** @var Penjualan $penjualan */
            $penjualan = $result['penjualan'];

            return response()->json([
                'success' => true,
                'message' => "Transaksi {$penjualan->no_faktur} berhasil diproses.",
                'data' => [
                    'id' => $penjualan->id,
                    'no_faktur' => $penjualan->no_faktur,
                    'tanggal_penjualan' => $penjualan->tanggal_penjualan?->format('d/m/Y H:i:s'),
                    'nama_pelanggan' => $penjualan->nama_pelanggan,
                    'metode_pembayaran' => $penjualan->metode_pembayaran,
                    'keterangan' => $penjualan->keterangan,
                    'kasir' => $penjualan->user?->name ?? 'Kasir',
                    'apotek' => $user->apotek,
                    'total' => (float) $penjualan->total,
                    'bayar' => $result['bayar'],
                    'kembalian' => $result['kembalian'],
                    'items' => $penjualan->detail->map(fn(DetailPenjualan $d) => [
                        'obat_id' => $d->obat_id,
                        'nama_obat' => $d->obat?->nama_obat ?? '-',
                        'kode_obat' => $d->obat?->kode_obat ?? '-',
                        'satuan' => $d->obat?->satuan ?? '',
                        'jumlah' => (int) $d->jumlah,
                        'harga_jual' => (float) $d->harga_jual,
                        'subtotal' => (float) $d->subtotal,
                    ])->values(),
                ],
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->validator->errors()->first() ?: 'Validasi checkout gagal.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses transaksi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mengambil riwayat penjualan untuk apotek user saat ini.
     */
    public function riwayat(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403, 'Akses tidak diizinkan untuk apotek ini.');

        $search = $request->string('search')->trim()->toString();
        $tanggalMulai = $request->input('tanggal_mulai');
        $tanggalSelesai = $request->input('tanggal_selesai');
        $perPage = max(1, min(100, $request->integer('per_page', 10)));

        $hariIni = CarbonImmutable::today();

        $baseQuery = Penjualan::query()
            ->when($user->apotek, fn($q) => $q->whereHas('user', fn($uq) => $uq->where('apotek', $user->apotek)));

        $totalHariIni = (clone $baseQuery)
            ->whereDate('tanggal_penjualan', $hariIni->toDateString())
            ->sum('total');

        $jumlahHariIni = (clone $baseQuery)
            ->whereDate('tanggal_penjualan', $hariIni->toDateString())
            ->count();

        $riwayatQuery = (clone $baseQuery)
            ->with(['user', 'detail.obat'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('no_faktur', 'like', "%{$search}%")
                        ->orWhere('nama_pelanggan', 'like', "%{$search}%")
                        ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(!empty($tanggalMulai), function ($query) use ($tanggalMulai) {
                $query->whereDate('tanggal_penjualan', '>=', $tanggalMulai);
            })
            ->when(!empty($tanggalSelesai), function ($query) use ($tanggalSelesai) {
                $query->whereDate('tanggal_penjualan', '<=', $tanggalSelesai);
            })
            ->orderByDesc('tanggal_penjualan');

        $paginated = $riwayatQuery->paginate($perPage);

        $data = $paginated->getCollection()->map(function (Penjualan $item) {
            return [
                'id' => $item->id,
                'no_faktur' => $item->no_faktur,
                'nama_pelanggan' => $item->nama_pelanggan,
                'tanggal_penjualan' => $item->tanggal_penjualan?->format('d/m/Y H:i'),
                'raw_tanggal' => $item->tanggal_penjualan?->toISOString(),
                'kasir' => $item->user?->name ?? 'Kasir',
                'apotek' => $item->user?->apotek ?? '-',
                'metode_pembayaran' => $item->metode_pembayaran ?? 'Tunai',
                'keterangan' => $item->keterangan,
                'total' => (float) $item->total,
                'total_item' => (int) $item->detail->sum('jumlah'),
                'rincian' => $item->detail->map(fn(DetailPenjualan $d) => [
                    'id' => $d->id,
                    'obat_id' => $d->obat_id,
                    'nama_obat' => $d->obat?->nama_obat ?? '-',
                    'satuan' => $d->obat?->satuan ?? '',
                    'jumlah' => (int) $d->jumlah,
                    'harga_jual' => (float) $d->harga_jual,
                    'subtotal' => (float) $d->subtotal,
                ])->values(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Riwayat transaksi berhasil diambil.',
            'data' => $data,
            'stats' => [
                'total_hari_ini' => (float) $totalHariIni,
                'jumlah_hari_ini' => (int) $jumlahHariIni,
                'apotek' => $user->apotek,
            ],
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ],
        ]);
    }

    /**
     * Mengambil detail satu transaksi penjualan.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $penjualan = Penjualan::query()
            ->when($user->apotek, fn($q) => $q->whereHas('user', fn($uq) => $uq->where('apotek', $user->apotek)))
            ->with(['user', 'detail.obat'])
            ->whereKey($id)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $penjualan->id,
                'no_faktur' => $penjualan->no_faktur,
                'nama_pelanggan' => $penjualan->nama_pelanggan,
                'tanggal_penjualan' => $penjualan->tanggal_penjualan?->format('d/m/Y H:i'),
                'kasir' => $penjualan->user?->name ?? 'Kasir',
                'apotek' => $penjualan->user?->apotek ?? '-',
                'metode_pembayaran' => $penjualan->metode_pembayaran,
                'keterangan' => $penjualan->keterangan,
                'total' => (float) $penjualan->total,
                'items' => $penjualan->detail->map(fn(DetailPenjualan $d) => [
                    'nama_obat' => $d->obat?->nama_obat ?? '-',
                    'satuan' => $d->obat?->satuan ?? '',
                    'jumlah' => (int) $d->jumlah,
                    'harga_jual' => (float) $d->harga_jual,
                    'subtotal' => (float) $d->subtotal,
                ]),
            ],
        ]);
    }

    /**
     * Mengunduh PDF struk/nota satu transaksi.
     */
    public function exportPdf(Request $request, int $id): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $penjualan = Penjualan::query()
            ->when($user->apotek, fn($q) => $q->whereHas('user', fn($uq) => $uq->where('apotek', $user->apotek)))
            ->with(['user', 'detail.obat'])
            ->whereKey($id)
            ->firstOrFail();

        $dompdf = new Dompdf;
        $dompdf->loadHtml(view('kasir.riwayat.pdf', [
            'transaksi' => $penjualan,
        ])->render(), 'UTF-8');
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="laporan-' . $penjualan->id . '-' . $penjualan->tanggal_penjualan?->format('Y-m-d') . '.pdf"',
        ]);
    }

    /**
     * Mengunduh PDF rekapitulasi laporan transaksi dalam rentang tanggal.
     */
    public function exportRentangPdf(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->hasValidApotekRole(), 403);

        $validated = $request->validate([
            'tanggal_mulai' => ['required', 'date_format:Y-m-d'],
            'tanggal_selesai' => ['required', 'date_format:Y-m-d', 'after_or_equal:tanggal_mulai'],
        ]);

        $tanggalMulai = CarbonImmutable::createFromFormat('Y-m-d', $validated['tanggal_mulai']);
        $tanggalSelesai = CarbonImmutable::createFromFormat('Y-m-d', $validated['tanggal_selesai']);

        $penjualan = Penjualan::query()
            ->when($user->apotek, fn($q) => $q->whereHas('user', fn($uq) => $uq->where('apotek', $user->apotek)))
            ->with(['user', 'detail.obat'])
            ->whereBetween('tanggal_penjualan', [$tanggalMulai->startOfDay(), $tanggalSelesai->endOfDay()])
            ->orderBy('tanggal_penjualan')
            ->get();

        $dompdf = new Dompdf;
        $dompdf->loadHtml(view('kasir.riwayat.pdf-rentang', [
            'penjualan' => $penjualan,
            'tanggalMulai' => $tanggalMulai,
            'tanggalSelesai' => $tanggalSelesai,
            'totalKeseluruhan' => $penjualan->sum('total'),
        ])->render(), 'UTF-8');
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="laporan-penjualan-' . $tanggalMulai->format('Y-m-d') . '-sampai-' . $tanggalSelesai->format('Y-m-d') . '.pdf"',
        ]);
    }

    /**
     * @return array<int, int>
     */
    private function sessionCart(Request $request): array
    {
        if (! $request->hasSession()) {
            return [];
        }

        $key = 'cart_' . ($request->user()?->id ?? 'guest');
        return collect($request->session()->get($key, []))
            ->mapWithKeys(fn($qty, $id) => [(int) $id => (int) $qty])
            ->all();
    }

    /**
     * @param array<int, int> $cart
     */
    private function saveSessionCart(Request $request, array $cart): void
    {
        if (! $request->hasSession()) {
            return;
        }

        $key = 'cart_' . ($request->user()?->id ?? 'guest');
        $request->session()->put($key, $cart);
    }

    /**
     * @param array<int, int> $cart
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private function buildCartItems(User $user, array $cart)
    {
        if (empty($cart)) {
            return collect();
        }

        $obatList = Obat::query()
            ->forUser($user)
            ->whereIn('id', array_keys($cart))
            ->get()
            ->keyBy('id');

        return collect($cart)->map(function (int $qty, int $id) use ($obatList) {
            $obat = $obatList->get($id);
            if (!$obat) {
                return null;
            }

            $unitCents = $this->toCents((string) $obat->harga_jual);

            return [
                'obat_id' => $obat->id,
                'kode_obat' => $obat->kode_obat,
                'nama_obat' => $obat->nama_obat,
                'satuan' => $obat->satuan,
                'stok' => (int) $obat->stok,
                'harga_jual' => (float) $obat->harga_jual,
                'jumlah' => $qty,
                'subtotal' => (float) $this->fromCents($unitCents * $qty),
            ];
        })->filter()->values();
    }

    private function toCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');
        return ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');
    }

    private function fromCents(int $amount): string
    {
        return number_format($amount / 100, 2, '.', '');
    }
}
