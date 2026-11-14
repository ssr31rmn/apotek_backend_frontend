<?php

namespace App\Http\Controllers;

use App\Models\Penjualan;
use App\Models\User;
use App\Services\ReceiptPrinter;
use Carbon\CarbonImmutable;
use Dompdf\Dompdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;
use Throwable;

class PenjualanController extends Controller
{
    public function index(): View
    {
        $hariIni = CarbonImmutable::today();

        return view('kasir.riwayat.index', [
            'riwayat' => Penjualan::with(['user', 'detail.obat'])
                ->orderByDesc('tanggal_penjualan')
                ->paginate(5)
                ->withQueryString(),
            'totalHariIni' => Penjualan::whereDate('tanggal_penjualan', $hariIni->toDateString())->sum('total'),
            'jumlahHariIni' => Penjualan::whereDate('tanggal_penjualan', $hariIni->toDateString())->count(),
            'tanggalAwalLaporan' => $hariIni->toDateString(),
            'tanggalAkhirLaporan' => $hariIni->toDateString(),
        ]);
    }

    public function receipt(Request $request, Penjualan $penjualan): View
    {
        $user = $this->validatedKasir($request);
        $transaksi = $this->transaksiUntukApotek($penjualan, $user);

        return view('kasir.riwayat.struk', [
            'transaksi' => $transaksi,
            'printerReady' => filled(config('escpos.printer_name')),
        ]);
    }

    public function receiptJson(Request $request, Penjualan $penjualan): JsonResponse
    {
        $user = $this->validatedKasir($request);
        $transaksi = $this->transaksiUntukApotek($penjualan, $user);

        return response()->json([
            'no_faktur' => $transaksi->no_faktur,
            'tanggal_penjualan' => $transaksi->tanggal_penjualan->toIso8601String(),
            'apotek' => $transaksi->user->apotek,
            'kasir' => $transaksi->user->name,
            'mata_uang' => 'IDR',
            'items' => $transaksi->detail->map(fn ($detail): array => [
                'kode_obat' => $detail->obat->kode_obat,
                'nama_obat' => $detail->obat->nama_obat,
                'jumlah' => $detail->jumlah,
                'satuan' => $detail->obat->satuan,
                'harga_satuan' => $detail->harga_jual,
                'subtotal' => $detail->subtotal,
            ])->values(),
            'total' => $transaksi->total,
        ]);
    }

    public function printReceipt(Request $request, Penjualan $penjualan, ReceiptPrinter $printer): RedirectResponse
    {
        $user = $this->validatedKasir($request);
        $transaksi = $this->transaksiUntukApotek($penjualan, $user);

        try {
            $printer->print($transaksi);
        } catch (Throwable $exception) {
            Log::error('Gagal mencetak struk penjualan.', [
                'penjualan_id' => $transaksi->id,
                'exception' => $exception,
            ]);

            return redirect()->route('kasir.riwayat.struk', $transaksi)
                ->with('error', 'Struk gagal dikirim ke printer. Transaksi tetap tersimpan; periksa konfigurasi dan koneksi printer, lalu coba lagi.');
        }

        return redirect()->route('kasir.riwayat.struk', $transaksi)
            ->with('success', 'Struk berhasil dikirim ke antrean printer.');
    }

    public function exportRentangPdf(Request $request): Response
    {
        $validated = $request->validate([
            'tanggal_mulai' => ['required', 'date_format:Y-m-d'],
            'tanggal_selesai' => ['required', 'date_format:Y-m-d', 'after_or_equal:tanggal_mulai'],
        ]);
        $tanggalMulai = CarbonImmutable::createFromFormat('Y-m-d', $validated['tanggal_mulai']);
        $tanggalSelesai = CarbonImmutable::createFromFormat('Y-m-d', $validated['tanggal_selesai']);
        $penjualan = Penjualan::with(['user', 'detail.obat'])
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
            'Content-Disposition' => 'attachment; filename="laporan-penjualan-'.$tanggalMulai->format('Y-m-d').'-sampai-'.$tanggalSelesai->format('Y-m-d').'.pdf"',
        ]);
    }

    public function exportPdf(Penjualan $penjualan): Response
    {
        $penjualan->load(['user', 'detail.obat']);

        $dompdf = new Dompdf;
        $dompdf->loadHtml(view('kasir.riwayat.pdf', [
            'transaksi' => $penjualan,
        ])->render(), 'UTF-8');
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="laporan-'.$penjualan->id.'-'.$penjualan->tanggal_penjualan->format('Y-m-d').'.pdf"',
        ]);
    }

    private function validatedKasir(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->isKasir() && $user->hasValidApotekRole(), 403);

        return $user;
    }

    private function transaksiUntukApotek(Penjualan $penjualan, User $user): Penjualan
    {
        return Penjualan::query()
            ->with(['user', 'detail.obat'])
            ->whereHas('user', fn ($query) => $query->where('apotek', $user->apotek))
            ->findOrFail($penjualan->getKey());
    }
}
