<?php

namespace Tests\Feature;

use App\Models\DetailPenjualan;
use App\Models\Obat;
use App\Models\Penjualan;
use App\Models\User;
use App\Services\ReceiptPrinter;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KasirTransaksiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function kasir(): User
    {
        return User::factory()->create()->assignRole('kasir_apotek_a');
    }

    private function obat(int $stok = 5): Obat
    {
        return Obat::create([
            'kode_obat' => 'OBT-TEST',
            'nama_obat' => 'Obat Uji',
            'apotek' => 'Apotek A',
            'satuan' => 'Strip',
            'harga_beli' => 4000,
            'harga_jual' => 6500,
            'stok' => $stok,
            'stok_minimum' => 1,
        ]);
    }

    public function test_checkout_mencatat_penjualan_dan_mengurangi_stok(): void
    {
        $kasir = $this->kasir();
        $obat = $this->obat();

        $this->actingAs($kasir)
            ->post(route('kasir.keranjang.add'), ['obat_id' => $obat->id, 'jumlah' => 2])
            ->assertSessionHasNoErrors();

        $this->post(route('kasir.checkout'))
            ->assertRedirect(route('kasir.riwayat.struk', Penjualan::first()));

        $this->assertSame(3, $obat->fresh()->stok);
        $this->assertDatabaseHas('penjualan', [
            'user_id' => $kasir->id,
            'total' => '13000.00',
        ]);
        $this->assertDatabaseHas('detail_penjualan', [
            'obat_id' => $obat->id,
            'jumlah' => 2,
            'subtotal' => '13000.00',
        ]);
        $this->assertSame(1, Penjualan::count());
        $this->assertFalse(session()->has('kasir.cart'));
    }

    public function test_kasir_dapat_membuka_struk_transaksi_apoteknya(): void
    {
        $kasir = $this->kasir();
        $penjualan = Penjualan::create([
            'no_faktur' => 'TRX-STRUK-TEST',
            'user_id' => $kasir->id,
            'tanggal_penjualan' => now(),
            'total' => 13000,
        ]);

        $this->actingAs($kasir)
            ->get(route('kasir.riwayat.struk', $penjualan))
            ->assertOk()
            ->assertSee('TRX-STRUK-TEST')
            ->assertSee('Cetak struk');
    }

    public function test_kasir_dapat_melihat_data_struk_dalam_format_json(): void
    {
        $kasir = $this->kasir();
        $obat = $this->obat();
        $penjualan = Penjualan::create([
            'no_faktur' => 'TRX-JSON-TEST',
            'user_id' => $kasir->id,
            'tanggal_penjualan' => now(),
            'total' => 13000,
        ]);
        DetailPenjualan::create([
            'penjualan_id' => $penjualan->id,
            'obat_id' => $obat->id,
            'jumlah' => 2,
            'harga_jual' => 6500,
            'subtotal' => 13000,
        ]);

        $this->actingAs($kasir)
            ->getJson(route('kasir.riwayat.json', $penjualan))
            ->assertOk()
            ->assertJsonPath('no_faktur', 'TRX-JSON-TEST')
            ->assertJsonPath('apotek', 'Apotek A')
            ->assertJsonPath('mata_uang', 'IDR')
            ->assertJsonPath('items.0.kode_obat', 'OBT-TEST')
            ->assertJsonPath('items.0.nama_obat', 'Obat Uji')
            ->assertJsonPath('items.0.jumlah', 2)
            ->assertJsonPath('items.0.harga_satuan', '6500.00')
            ->assertJsonPath('items.0.subtotal', '13000.00')
            ->assertJsonPath('total', '13000.00');
    }

    public function test_kasir_dapat_mencetak_ulang_struk_transaksi_apoteknya(): void
    {
        $kasir = $this->kasir();
        $penjualan = Penjualan::create([
            'no_faktur' => 'TRX-PRINT-TEST',
            'user_id' => $kasir->id,
            'tanggal_penjualan' => now(),
            'total' => 13000,
        ]);

        $this->mock(ReceiptPrinter::class)
            ->shouldReceive('print')
            ->once()
            ->withArgs(fn (Penjualan $printed) => $printed->is($penjualan));

        $this->actingAs($kasir)
            ->post(route('kasir.riwayat.print', $penjualan))
            ->assertRedirect(route('kasir.riwayat.struk', $penjualan))
            ->assertSessionHas('success', 'Struk berhasil dikirim ke antrean printer.');
    }

    public function test_kasir_tidak_dapat_membuka_struk_transaksi_apotek_lain(): void
    {
        $kasirApotekB = User::factory()->create(['apotek' => 'Apotek B'])->assignRole('kasir_apotek_b');
        $penjualan = Penjualan::create([
            'no_faktur' => 'TRX-OTHER-STORE',
            'user_id' => $kasirApotekB->id,
            'tanggal_penjualan' => now(),
            'total' => 13000,
        ]);

        $this->actingAs($this->kasir())
            ->get(route('kasir.riwayat.struk', $penjualan))
            ->assertNotFound();
    }

    public function test_checkout_ditolak_jika_stok_tidak_mencukupi_dan_tidak_mengubah_stok(): void
    {
        $kasir = $this->kasir();
        $obat = $this->obat(1);

        $this->actingAs($kasir)
            ->withSession(['kasir.cart' => [$obat->id => 2]])
            ->post(route('kasir.checkout'))
            ->assertSessionHasErrors('keranjang');

        $this->assertSame(1, $obat->fresh()->stok);
        $this->assertSame(0, Penjualan::count());
    }

    public function test_keranjang_bisa_dibuka_dan_item_ditambahkan(): void
    {
        $obat = $this->obat();

        $this->actingAs($this->kasir())
            ->get(route('kasir.keranjang'))
            ->assertOk()
            ->assertSee('Keranjang masih kosong');

        $this->post(route('kasir.keranjang.add'), ['obat_id' => $obat->id])
            ->assertRedirect();

        $this->get(route('kasir.keranjang'))
            ->assertOk()
            ->assertSee('Obat Uji')
            ->assertSee('Rp 6.500');
    }

    public function test_sisa_stok_di_daftar_obat_dikurangi_jumlah_yang_sudah_di_keranjang(): void
    {
        $obat = $this->obat(5);
        $kasir = $this->kasir();

        $this->actingAs($kasir)
            ->post(route('kasir.keranjang.add'), ['obat_id' => $obat->id, 'jumlah' => 2])
            ->assertRedirect();

        $this->get(route('kasir.transaksi'))
            ->assertOk()
            ->assertSeeText('Di keranjang 2')
            ->assertSeeText('Tersedia 3 Strip');

        $this->assertSame(5, $obat->fresh()->stok);
    }

    public function test_kasir_tidak_dapat_menambahkan_obat_dari_apotek_lain(): void
    {
        $obat = $this->obat();
        $obat->update([
            'kode_obat' => 'OBT-OTHER',
            'apotek' => 'Apotek B',
        ]);

        $this->actingAs($this->kasir())
            ->post(route('kasir.keranjang.add'), ['obat_id' => $obat->id])
            ->assertNotFound();

        $this->assertFalse(session()->has('kasir.cart'));
        $this->assertSame(5, $obat->fresh()->stok);
    }

    public function test_obat_yang_hilang_dari_cart_dibersihkan_dan_tidak_menyebabkan_error(): void
    {
        $kasir = $this->kasir();

        $this->actingAs($kasir)
            ->withSession(['kasir.cart' => [999999 => 2]])
            ->get(route('kasir.keranjang'))
            ->assertOk()
            ->assertSee('Keranjang masih kosong');

        $this->assertSame([], session('kasir.cart'));
    }
}
