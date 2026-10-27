<?php

namespace Tests\Feature;

use App\Models\Kategori;
use App\Models\Obat;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiObatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_api_mengembalikan_obat_sesuai_apotek_user(): void
    {
        $user = User::factory()->create()->assignRole('admin_apotek_a');
        $kategori = Kategori::create(['nama_kategori' => 'Obat Bebas']);
        Obat::create(['kode_obat' => 'A01', 'nama_obat' => 'Obat A', 'apotek' => 'Apotek A', 'kategori_id' => $kategori->id_kategori, 'satuan' => 'Strip']);
        Obat::create(['kode_obat' => 'B01', 'nama_obat' => 'Obat B', 'apotek' => 'Apotek B', 'satuan' => 'Strip']);

        $this->actingAs($user, 'web')
            ->getJson('/api/obat')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.kode_obat', 'A01')
            ->assertJsonPath('data.0.kategori.nama', 'Obat Bebas')
            ->assertJsonMissing(['kode_obat' => 'B01']);
    }

    public function test_api_mendukung_search_filter_sort_dan_pagination(): void
    {
        $user = User::factory()->create()->assignRole('admin_apotek_a');
        Obat::create(['kode_obat' => 'B01', 'nama_obat' => 'Vitamin B', 'apotek' => 'Apotek A', 'satuan' => 'Botol']);
        Obat::create(['kode_obat' => 'A01', 'nama_obat' => 'Vitamin A', 'apotek' => 'Apotek A', 'satuan' => 'Strip']);

        $this->actingAs($user, 'web')
            ->getJson('/api/obat?search=Vitamin&sort_by=nama&direction=asc')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.sort', 'nama')
            ->assertJsonPath('data.0.kode_obat', 'A01');
    }

    public function test_api_detail_obat_lintas_apotek_tidak_dapat_diakses(): void
    {
        $user = User::factory()->create()->assignRole('admin_apotek_a');
        $obat = Obat::create(['kode_obat' => 'B01', 'nama_obat' => 'Obat B', 'apotek' => 'Apotek B', 'satuan' => 'Strip']);

        $this->actingAs($user, 'web')
            ->getJson('/api/obat/' . $obat->id)
            ->assertNotFound();
    }

    public function test_api_admin_dapat_menjalankan_crud_obat(): void
    {
        $admin = User::factory()->create()->assignRole('admin_apotek_a');
        $kategori = Kategori::create(['nama_kategori' => 'Vitamin']);

        $payload = [
            'kode_obat' => 'OBT999',
            'nama_obat' => 'Obat API Test',
            'kategori_id' => $kategori->id_kategori,
            'satuan' => 'Botol',
            'harga_beli' => 10000,
            'harga_jual' => 15000,
            'stok' => 25,
            'stok_minimum' => 5,
            'tanggal_kadaluarsa' => '2028-12-31',
            'keterangan' => 'Pengujian API',
        ];

        // Create
        $response = $this->actingAs($admin, 'web')->postJson('/api/obat', $payload);
        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.kode_obat', 'OBT999')
            ->assertJsonPath('data.nama_obat', 'Obat API Test');

        $obatId = $response->json('data.id');
        $this->assertDatabaseHas('obat', ['id' => $obatId, 'kode_obat' => 'OBT999', 'apotek' => 'Apotek A']);

        // Update
        $this->actingAs($admin, 'web')->putJson('/api/obat/' . $obatId, [
            'nama_obat' => 'Obat API Diperbarui',
        ] + $payload)->assertOk()
            ->assertJsonPath('data.nama_obat', 'Obat API Diperbarui');

        $this->assertDatabaseHas('obat', ['id' => $obatId, 'nama_obat' => 'Obat API Diperbarui']);

        // Delete
        $this->actingAs($admin, 'web')->deleteJson('/api/obat/' . $obatId)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('obat', ['id' => $obatId]);
    }

    public function test_api_kasir_tidak_dapat_mengelola_obat(): void
    {
        $kasir = User::factory()->create()->assignRole('kasir_apotek_a');
        $obat = Obat::create(['kode_obat' => 'OBT001', 'nama_obat' => 'Obat A', 'apotek' => 'Apotek A', 'satuan' => 'Strip']);

        $this->actingAs($kasir, 'web')->postJson('/api/obat', ['kode_obat' => 'TEST'])->assertForbidden();
        $this->actingAs($kasir, 'web')->putJson('/api/obat/' . $obat->id, ['nama_obat' => 'TEST'])->assertForbidden();
        $this->actingAs($kasir, 'web')->deleteJson('/api/obat/' . $obat->id)->assertForbidden();
    }

    public function test_api_obat_menolak_user_tanpa_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'web')
            ->getJson('/api/obat')
            ->assertForbidden();
    }
}
