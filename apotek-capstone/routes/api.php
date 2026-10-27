<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\ObatController;
use App\Http\Controllers\Api\TransaksiController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->name('api.login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user'])->name('api.user');
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');

    Route::middleware('permission:dashboard.lihat')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('api.dashboard');
    });

    Route::middleware('permission:obat.lihat')->group(function () {
        Route::get('/obat', [ObatController::class, 'index'])->name('api.obat.index');
        Route::get('/obat/{obat}', [ObatController::class, 'show'])->name('api.obat.show');
    });

    Route::middleware('permission:obat.kelola')->group(function () {
        Route::post('/obat', [ObatController::class, 'store'])->name('api.obat.store');
        Route::put('/obat/{obat}', [ObatController::class, 'update'])->name('api.obat.update');
        Route::delete('/obat/{obat}', [ObatController::class, 'destroy'])->name('api.obat.destroy');
    });

    Route::middleware('permission:kategori.lihat|kategori.kelola')->group(function () {
        Route::get('/kategori', [KategoriController::class, 'index'])->name('api.kategori.index');
    });

    Route::middleware('permission:kategori.kelola')->group(function () {
        Route::post('/kategori', [KategoriController::class, 'store'])->name('api.kategori.store');
        Route::put('/kategori/{kategori}', [KategoriController::class, 'update'])->name('api.kategori.update');
        Route::delete('/kategori/{kategori}', [KategoriController::class, 'destroy'])->name('api.kategori.destroy');
    });

    // Transaksi Penjualan (Bisa diakses oleh admin_apotek_a, admin_apotek_b, kasir_apotek_a, kasir_apotek_b)
    Route::prefix('transaksi')->group(function () {
        Route::get('/obat', [TransaksiController::class, 'obatList'])->name('api.transaksi.obat');
        Route::get('/keranjang', [TransaksiController::class, 'getCart'])->name('api.transaksi.cart.get');
        Route::post('/keranjang', [TransaksiController::class, 'addToCart'])->name('api.transaksi.cart.add');
        Route::put('/keranjang/{obat}', [TransaksiController::class, 'updateCartItem'])->name('api.transaksi.cart.update');
        Route::delete('/keranjang/{obat}', [TransaksiController::class, 'removeFromCart'])->name('api.transaksi.cart.remove');
        Route::delete('/keranjang', [TransaksiController::class, 'clearCart'])->name('api.transaksi.cart.clear');
        Route::post('/checkout', [TransaksiController::class, 'checkout'])->name('api.transaksi.checkout');
        Route::get('/riwayat', [TransaksiController::class, 'riwayat'])->name('api.transaksi.riwayat');
        Route::get('/riwayat/{penjualan}', [TransaksiController::class, 'show'])->name('api.transaksi.show');
        Route::get('/riwayat/{penjualan}/pdf', [TransaksiController::class, 'exportPdf'])->name('api.transaksi.pdf');
        Route::get('/laporan/pdf', [TransaksiController::class, 'exportRentangPdf'])->name('api.transaksi.pdf-rentang');
    });
});

