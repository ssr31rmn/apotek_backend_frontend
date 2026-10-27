<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Obat;
use App\Models\Penjualan;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user?->can('dashboard.lihat'), 403);

        $obatQuery = Obat::query()->forUser($user);
        $hariIni = CarbonImmutable::today();

        $penjualanQuery = Penjualan::query()
            ->when($user->apotek, fn($q) => $q->whereHas('user', fn($uq) => $uq->where('apotek', $user->apotek)));

        $penjualanHariIniQuery = (clone $penjualanQuery)
            ->whereDate('tanggal_penjualan', $hariIni->toDateString());

        $totalObat = (clone $obatQuery)->count();
        $stokMenipisCount = (clone $obatQuery)->stokMenipis()->count();
        $transaksiHariIni = (clone $penjualanHariIniQuery)->count();
        $penjualanHariIni = (float) (clone $penjualanHariIniQuery)->sum('total');

        // Obat stok menipis
        $obatMenipis = (clone $obatQuery)->stokMenipis()
            ->orderBy('stok')
            ->take(5)
            ->get()
            ->map(fn(Obat $item) => [
                'id' => $item->id,
                'kode_obat' => $item->kode_obat,
                'nama_obat' => $item->nama_obat,
                'stok' => $item->stok,
                'stok_minimum' => $item->stok_minimum,
                'satuan' => $item->satuan,
                'status' => $item->stok < 1 ? 'habis' : 'menipis',
            ])->values();

        // Obat hampir kedaluwarsa (<= 3 bulan)
        $obatKedaluwarsa = (clone $obatQuery)
            ->whereNotNull('tanggal_kadaluarsa')
            ->whereDate('tanggal_kadaluarsa', '<=', now()->addMonths(3))
            ->orderBy('tanggal_kadaluarsa')
            ->take(5)
            ->get()
            ->map(fn(Obat $item) => [
                'id' => $item->id,
                'kode_obat' => $item->kode_obat,
                'nama_obat' => $item->nama_obat,
                'tanggal_kadaluarsa' => $item->tanggal_kadaluarsa?->toDateString(),
                'satuan' => $item->satuan,
                'stok' => $item->stok,
                'is_expired' => $item->tanggal_kadaluarsa?->isPast() ?? false,
            ])->values();

        // Transaksi terbaru
        $transaksiTerbaru = (clone $penjualanQuery)
            ->with(['user', 'detail.obat'])
            ->latest('tanggal_penjualan')
            ->take(5)
            ->get()
            ->map(fn(Penjualan $item) => [
                'id' => $item->id,
                'no_faktur' => $item->no_faktur,
                'kasir' => $item->user?->name ?? 'Kasir',
                'tanggal' => $item->tanggal_penjualan ? $item->tanggal_penjualan->format('d/m/Y H:i') : '-',
                'jumlah_item' => (int) $item->detail->sum('jumlah'),
                'total' => (float) $item->total,
            ])->values();

        return response()->json([
            'success' => true,
            'message' => 'Data dashboard berhasil diambil.',
            'data' => [
                'stats' => [
                    'total_obat' => $totalObat,
                    'stok_menipis' => $stokMenipisCount,
                    'transaksi_hari_ini' => $transaksiHariIni,
                    'penjualan_hari_ini' => $penjualanHariIni,
                ],
                'perlu_perhatian' => [
                    'obat_menipis' => $obatMenipis,
                    'obat_kedaluwarsa' => $obatKedaluwarsa,
                ],
                'transaksi_terbaru' => $transaksiTerbaru,
            ],
        ]);
    }
}
