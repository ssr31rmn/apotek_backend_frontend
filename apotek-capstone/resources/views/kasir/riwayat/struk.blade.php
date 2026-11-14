@extends('layouts.app')

@section('title', 'Struk Penjualan')
@section('header', 'Struk Penjualan')
@section('subheader', 'Transaksi '.$transaksi->no_faktur)

@section('actions')
    <a href="{{ route('kasir.riwayat') }}" class="btn-ghost">Kembali ke riwayat</a>
@endsection

@section('content')
    <section class="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
                <h2 class="font-semibold text-slate-900">{{ $transaksi->user->apotek }}</h2>
                <p class="mt-1 text-sm text-slate-500">Kasir: {{ $transaksi->user->name }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <form method="POST" action="{{ route('kasir.riwayat.print', $transaksi) }}">
                    @csrf
                    <button type="submit" class="btn-primary" @disabled(! $printerReady)>
                        Cetak struk
                    </button>
                </form>
                <a href="{{ route('kasir.riwayat.json', $transaksi) }}" target="_blank" rel="noopener" class="btn-ghost">
                    Lihat JSON
                </a>
                <a href="{{ route('kasir.riwayat.pdf', $transaksi) }}" class="btn-ghost">Unduh PDF</a>
            </div>
        </div>

        @unless ($printerReady)
            <p class="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                Printer belum dikonfigurasi. Isi RECEIPT_PRINTER_NAME pada file .env untuk mengaktifkan cetak struk.
            </p>
        @endunless

        <div class="p-5">
            <dl class="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                    <dt class="text-slate-500">No. faktur</dt>
                    <dd class="mt-1 font-medium text-slate-900">{{ $transaksi->no_faktur }}</dd>
                </div>
                <div>
                    <dt class="text-slate-500">Tanggal</dt>
                    <dd class="mt-1 font-medium text-slate-900">{{ $transaksi->tanggal_penjualan->format('d/m/Y H:i') }}</dd>
                </div>
            </dl>

            <div class="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table class="min-w-full text-left text-sm">
                    <thead class="table-head">
                        <tr>
                            <th scope="col" class="table-th">Obat</th>
                            <th scope="col" class="table-th text-right">Jumlah</th>
                            <th scope="col" class="table-th text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        @foreach ($transaksi->detail as $detail)
                            <tr>
                                <td class="table-td">{{ $detail->obat->nama_obat }}</td>
                                <td class="table-td text-right">{{ $detail->jumlah }} {{ $detail->obat->satuan }}</td>
                                <td class="table-td text-right">Rp {{ number_format($detail->subtotal, 0, ',', '.') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr>
                            <th scope="row" colspan="2" class="table-td text-right">Total</th>
                            <td class="table-td text-right font-bold text-slate-900">Rp {{ number_format($transaksi->total, 0, ',', '.') }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </section>
@endsection
