<?php

namespace Tests\Feature;

use App\Models\Kategori;
use App\Models\Obat;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KategoriTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_dapat_menjalankan_crud_kategori_dengan_id_otomatis(): void
    {
        $admin = User::factory()->create()->assignRole('admin_apotek_a');

        $this->actingAs($admin)->get(route('kategori.index'))
            ->assertOk()
            ->assertSee('Data Kategori');
        $this->actingAs($admin)->get(route('kategori.create'))->assertOk();
        $this->actingAs($admin)->post(route('kategori.store'), ['nama_kategori' => 'Herbal'])
            ->assertRedirect(route('kategori.index'));

        $kategori = Kategori::where('nama_kategori', 'Herbal')->firstOrFail();
        $this->assertIsInt($kategori->id_kategori);
        $this->assertGreaterThan(0, $kategori->id_kategori);

        $this->actingAs($admin)->get(route('kategori.edit', $kategori))->assertOk();
        $this->actingAs($admin)->put(route('kategori.update', $kategori), ['nama_kategori' => 'Herbal Modern'])
            ->assertRedirect(route('kategori.index'));
        $this->assertDatabaseHas('kategori', [
            'id_kategori' => $kategori->id_kategori,
            'nama_kategori' => 'Herbal Modern',
        ]);

        $this->actingAs($admin)->delete(route('kategori.destroy', $kategori))
            ->assertRedirect(route('kategori.index'));
        $this->assertDatabaseMissing('kategori', ['id_kategori' => $kategori->id_kategori]);
    }

    public function test_kategori_yang_digunakan_obat_tidak_dapat_dihapus(): void
    {
        $admin = User::factory()->create()->assignRole('admin_apotek_a');
        $kategori = Kategori::create(['nama_kategori' => 'Obat Bebas']);
        Obat::create([
            'kode_obat' => 'OBT001',
            'nama_obat' => 'Paracetamol',
            'kategori_id' => $kategori->id_kategori,
            'satuan' => 'Strip',
        ]);

        $this->actingAs($admin)->delete(route('kategori.destroy', $kategori))
            ->assertRedirect(route('kategori.index'))
            ->assertSessionHas('error');
        $this->assertDatabaseHas('kategori', ['id_kategori' => $kategori->id_kategori]);
    }

    public function test_kasir_dapat_melihat_kategori_tetapi_tidak_dapat_mengelola(): void
    {
        $kategori = Kategori::create(['nama_kategori' => 'Obat Bebas']);

        foreach (['kasir_apotek_a', 'kasir_apotek_b'] as $role) {
            $kasir = User::factory()->create()->assignRole($role);

            // Bisa akses dan lihat kategori
            $this->actingAs($kasir)->get(route('kategori.index'))
                ->assertOk()
                ->assertSee('Data Kategori')
                ->assertSee('Obat Bebas')
                ->assertDontSee('Tambah Kategori')
                ->assertDontSee(route('kategori.create'))
                ->assertDontSee(route('kategori.edit', $kategori));

            // Tidak bisa tambah atau ubah kategori
            $this->actingAs($kasir)->get(route('kategori.create'))->assertForbidden();
            $this->actingAs($kasir)->post(route('kategori.store'), ['nama_kategori' => 'Terlarang'])->assertForbidden();
            $this->actingAs($kasir)->get(route('kategori.edit', $kategori))->assertForbidden();
            $this->actingAs($kasir)->put(route('kategori.update', $kategori), ['nama_kategori' => 'Ubah Terlarang'])->assertForbidden();
            $this->actingAs($kasir)->delete(route('kategori.destroy', $kategori))->assertForbidden();
        }
    }
}
