<?php

namespace Tests\Feature;

use App\Models\Obat;
use App\Models\Penjualan;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_api_dashboard_mengembalikan_statistik_dan_data_monitoring(): void
    {
        $user = User::factory()->create()->assignRole('admin_apotek_a');
        $user->update(['apotek' => 'Apotek A']);

        Obat::create([
            'kode_obat' => 'A01',
            'nama_obat' => 'Paracetamol',
            'apotek' => 'Apotek A',
            'satuan' => 'Strip',
            'stok' => 2,
            'stok_minimum' => 5,
            'tanggal_kadaluarsa' => now()->addDays(20),
        ]);

        $penjualan = Penjualan::create([
            'no_faktur' => 'TRX-001',
            'user_id' => $user->id,
            'tanggal_penjualan' => now(),
            'total' => 50000,
        ]);

        $response = $this->actingAs($user, 'web')->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stats.total_obat', 1)
            ->assertJsonPath('data.stats.stok_menipis', 1)
            ->assertJsonPath('data.stats.transaksi_hari_ini', 1)
            ->assertJsonPath('data.stats.penjualan_hari_ini', 50000)
            ->assertJsonPath('data.perlu_perhatian.obat_menipis.0.kode_obat', 'A01')
            ->assertJsonPath('data.perlu_perhatian.obat_kedaluwarsa.0.kode_obat', 'A01')
            ->assertJsonPath('data.transaksi_terbaru.0.no_faktur', 'TRX-001');
    }

    public function test_api_dashboard_dapat_diakses_oleh_kasir(): void
    {
        $kasir = User::factory()->create()->assignRole('kasir_apotek_a');

        $this->actingAs($kasir, 'web')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
