<?php

namespace Tests\Feature;

use App\Models\Kategori;
use App\Models\Obat;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiKategoriTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_dapat_menjalankan_crud_kategori_melalui_api(): void
    {
        $admin = User::factory()->create()->assignRole('admin_apotek_a');

        $response = $this->actingAs($admin, 'web')->postJson('/api/kategori', [
            'nama_kategori' => 'Herbal',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nama_kategori', 'Herbal')
            ->assertJsonPath('data.obat_count', 0);

        $kategori = Kategori::where('nama_kategori', 'Herbal')->firstOrFail();

        $this->actingAs($admin, 'web')->getJson('/api/kategori')
            ->assertOk()
            ->assertJsonPath('data.0.nama_kategori', 'Herbal');

        $this->actingAs($admin, 'web')->putJson('/api/kategori/' . $kategori->id_kategori, [
            'nama_kategori' => 'Herbal Modern',
        ])->assertOk()->assertJsonPath('data.nama_kategori', 'Herbal Modern');

        $this->actingAs($admin, 'web')->deleteJson('/api/kategori/' . $kategori->id_kategori)
            ->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseMissing('kategori', ['id_kategori' => $kategori->id_kategori]);
    }

    public function test_api_menolak_penghapusan_kategori_yang_digunakan_obat(): void
    {
        $admin = User::factory()->create()->assignRole('admin_apotek_a');
        $kategori = Kategori::create(['nama_kategori' => 'Obat Bebas']);
        Obat::create([
            'kode_obat' => 'OBT001',
            'nama_obat' => 'Paracetamol',
            'kategori_id' => $kategori->id_kategori,
            'apotek' => 'Apotek A',
            'satuan' => 'Strip',
        ]);

        $this->actingAs($admin, 'web')
            ->deleteJson('/api/kategori/' . $kategori->id_kategori)
            ->assertStatus(409)
            ->assertJsonPath('success', false);
    }

    public function test_api_kasir_dapat_melihat_kategori_tetapi_tidak_dapat_mengelola(): void
    {
        $kategori = Kategori::create(['nama_kategori' => 'Obat Bebas']);

        foreach (['kasir_apotek_a', 'kasir_apotek_b'] as $role) {
            $kasir = User::factory()->create()->assignRole($role);

            $this->actingAs($kasir, 'web')->getJson('/api/kategori')
                ->assertOk()
                ->assertJsonPath('data.0.nama_kategori', 'Obat Bebas');

            $this->actingAs($kasir, 'web')->postJson('/api/kategori', ['nama_kategori' => 'Terlarang'])->assertForbidden();
            $this->actingAs($kasir, 'web')->putJson('/api/kategori/' . $kategori->id_kategori, ['nama_kategori' => 'Ubah'])->assertForbidden();
            $this->actingAs($kasir, 'web')->deleteJson('/api/kategori/' . $kategori->id_kategori)->assertForbidden();
        }
    }

    public function test_api_kategori_menolak_nama_duplikat(): void
    {
        $admin = User::factory()->create()->assignRole('admin_apotek_a');
        Kategori::create(['nama_kategori' => 'Obat Bebas']);

        $this->actingAs($admin, 'web')
            ->postJson('/api/kategori', ['nama_kategori' => 'Obat Bebas'])
            ->assertUnprocessable()
            ->assertJsonPath('success', false);
    }
}
