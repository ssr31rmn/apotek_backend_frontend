<?php

namespace Tests\Feature;

use App\Models\Obat;
use App\Models\Penjualan;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiTransaksiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function createAdminA(): User
    {
        $user = User::factory()->create(['name' => 'Admin Apotek A', 'apotek' => 'Apotek A']);
        $user->assignRole('admin_apotek_a');
        return $user;
    }

    private function createKasirA(): User
    {
        $user = User::factory()->create(['name' => 'Kasir Apotek A', 'apotek' => 'Apotek A']);
        $user->assignRole('kasir_apotek_a');
        return $user;
    }

    private function createAdminB(): User
    {
        $user = User::factory()->create(['name' => 'Admin Apotek B', 'apotek' => 'Apotek B']);
        $user->assignRole('admin_apotek_b');
        return $user;
    }

    private function createKasirB(): User
    {
        $user = User::factory()->create(['name' => 'Kasir Apotek B', 'apotek' => 'Apotek B']);
        $user->assignRole('kasir_apotek_b');
        return $user;
    }

    private function loginAs(User $user): self
    {
        auth('web')->logout();
        auth()->forgetGuards();
        return $this->actingAs($user, 'web');
    }

    private function seedMedicines(): array
    {
        $obatA1 = Obat::create([
            'kode_obat' => 'OBT-A1',
            'nama_obat' => 'Paracetamol A',
            'apotek' => 'Apotek A',
            'satuan' => 'Strip',
            'harga_beli' => 3000,
            'harga_jual' => 5000,
            'stok' => 20,
            'stok_minimum' => 5,
        ]);

        $obatA2 = Obat::create([
            'kode_obat' => 'OBT-A2',
            'nama_obat' => 'Amoxicillin A',
            'apotek' => 'Apotek A',
            'satuan' => 'Strip',
            'harga_beli' => 6000,
            'harga_jual' => 10000,
            'stok' => 15,
            'stok_minimum' => 5,
        ]);

        $obatB1 = Obat::create([
            'kode_obat' => 'OBT-B1',
            'nama_obat' => 'Ibuprofen B',
            'apotek' => 'Apotek B',
            'satuan' => 'Strip',
            'harga_beli' => 4000,
            'harga_jual' => 7000,
            'stok' => 30,
            'stok_minimum' => 10,
        ]);

        return [$obatA1, $obatA2, $obatB1];
    }

    public function test_admin_a_dan_kasir_a_hanya_melihat_obat_apotek_a(): void
    {
        [$obatA1, $obatA2, $obatB1] = $this->seedMedicines();

        $adminA = $this->createAdminA();
        $kasirA = $this->createKasirA();

        // Admin A
        $responseAdmin = $this->loginAs($adminA)->getJson('/api/transaksi/obat');
        $responseAdmin->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.kode_obat', 'OBT-A2') // ordered by nama_obat
            ->assertJsonMissing(['kode_obat' => 'OBT-B1']);

        // Kasir A
        $responseKasir = $this->loginAs($kasirA)->getJson('/api/transaksi/obat');
        $responseKasir->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['kode_obat' => 'OBT-B1']);
    }

    public function test_admin_b_dan_kasir_b_hanya_melihat_obat_apotek_b(): void
    {
        [$obatA1, $obatA2, $obatB1] = $this->seedMedicines();

        $adminB = $this->createAdminB();
        $kasirB = $this->createKasirB();

        // Admin B
        $responseAdmin = $this->loginAs($adminB)->getJson('/api/transaksi/obat');
        $responseAdmin->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode_obat', 'OBT-B1')
            ->assertJsonMissing(['kode_obat' => 'OBT-A1']);

        // Kasir B
        $responseKasir = $this->loginAs($kasirB)->getJson('/api/transaksi/obat');
        $responseKasir->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode_obat', 'OBT-B1')
            ->assertJsonMissing(['kode_obat' => 'OBT-A1']);
    }

    public function test_checkout_berhasil_untuk_semua_role_dan_mengurangi_stok(): void
    {
        [$obatA1, $obatA2, $obatB1] = $this->seedMedicines();

        $users = [
            $this->createKasirA(),
            $this->createAdminA(),
            $this->createKasirB(),
            $this->createAdminB(),
        ];

        foreach ($users as $index => $user) {
            $isApotekA = $user->apotek === 'Apotek A';
            $targetObat = $isApotekA ? $obatA1 : $obatB1;
            $initialStok = $targetObat->fresh()->stok;

            $payload = [
                'items' => [
                    ['obat_id' => $targetObat->id, 'jumlah' => 2],
                ],
                'nama_pelanggan' => "Pelanggan {$user->name}",
                'metode_pembayaran' => 'Tunai',
                'bayar' => 20000,
            ];

            $response = $this->loginAs($user)->postJson('/api/transaksi/checkout', $payload);

            $response->assertCreated()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.nama_pelanggan', "Pelanggan {$user->name}")
                ->assertJsonPath('data.apotek', $user->apotek)
                ->assertJsonPath('data.kasir', $user->name);

            $this->assertSame($initialStok - 2, $targetObat->fresh()->stok);
        }

        $this->assertSame(4, Penjualan::count());
    }

    public function test_checkout_gagal_jika_stok_tidak_cukup(): void
    {
        [$obatA1] = $this->seedMedicines();
        $kasirA = $this->createKasirA();

        $payload = [
            'items' => [
                ['obat_id' => $obatA1->id, 'jumlah' => 999], // stok hanya 20
            ],
        ];

        $response = $this->loginAs($kasirA)->postJson('/api/transaksi/checkout', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(20, $obatA1->fresh()->stok);
        $this->assertSame(0, Penjualan::count());
    }

    public function test_user_tidak_dapat_checkout_obat_dari_apotek_lain(): void
    {
        [$obatA1, $obatA2, $obatB1] = $this->seedMedicines();
        $kasirA = $this->createKasirA();

        // Kasir A mencoba membeli Obat B1 (milik Apotek B)
        $payload = [
            'items' => [
                ['obat_id' => $obatB1->id, 'jumlah' => 1],
            ],
        ];

        $response = $this->loginAs($kasirA)->postJson('/api/transaksi/checkout', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertSame(30, $obatB1->fresh()->stok);
    }

    public function test_riwayat_terisolasi_antara_apotek_a_dan_b(): void
    {
        [$obatA1, $obatA2, $obatB1] = $this->seedMedicines();

        $kasirA = $this->createKasirA();
        $kasirB = $this->createKasirB();

        // Transaksi di Apotek A
        $this->loginAs($kasirA)->postJson('/api/transaksi/checkout', [
            'items' => [['obat_id' => $obatA1->id, 'jumlah' => 1]],
            'nama_pelanggan' => 'Pasien A',
        ])->assertCreated();

        // Transaksi di Apotek B
        $this->loginAs($kasirB)->postJson('/api/transaksi/checkout', [
            'items' => [['obat_id' => $obatB1->id, 'jumlah' => 2]],
            'nama_pelanggan' => 'Pasien B',
        ])->assertCreated();

        // Kasir A atau Admin A hanya melihat riwayat Apotek A
        $adminA = $this->createAdminA();
        $resA = $this->loginAs($adminA)->getJson('/api/transaksi/riwayat');
        $resA->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nama_pelanggan', 'Pasien A')
            ->assertJsonMissing(['nama_pelanggan' => 'Pasien B']);

        // Kasir B atau Admin B hanya melihat riwayat Apotek B
        $adminB = $this->createAdminB();
        $resB = $this->loginAs($adminB)->getJson('/api/transaksi/riwayat');
        $resB->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nama_pelanggan', 'Pasien B')
            ->assertJsonMissing(['nama_pelanggan' => 'Pasien A']);
    }

    public function test_unduh_pdf_struk_dan_laporan_rentang_berhasil(): void
    {
        [$obatA1] = $this->seedMedicines();
        $kasirA = $this->createKasirA();

        $checkoutRes = $this->loginAs($kasirA)->postJson('/api/transaksi/checkout', [
            'items' => [['obat_id' => $obatA1->id, 'jumlah' => 1]],
        ]);
        $penjualanId = $checkoutRes->json('data.id');

        // Unduh PDF struk satuan
        $pdfRes = $this->loginAs($kasirA)->get("/api/transaksi/riwayat/{$penjualanId}/pdf");
        $pdfRes->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $pdfRes->getContent());

        // Unduh PDF rentang tanggal
        $today = now()->format('Y-m-d');
        $rangePdfRes = $this->loginAs($kasirA)->get("/api/transaksi/laporan/pdf?tanggal_mulai={$today}&tanggal_selesai={$today}");
        $rangePdfRes->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF', $rangePdfRes->getContent());
    }
}
