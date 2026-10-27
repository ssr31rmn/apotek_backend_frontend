<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_api_login_mengembalikan_user_apotek_a_dan_membuat_session(): void
    {
        $user = User::factory()->create(['email' => 'admin.a@example.test'])->assignRole('admin_apotek_a');

        $response = $this->api()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.role', 'admin_apotek_a')
            ->assertJsonPath('data.user.apotek', 'Apotek A')
            ->assertJsonPath('data.user.apotek_id', null)
            ->assertJsonMissingPath('data.user.password');

        $this->assertAuthenticatedAs($user);
    }

    public function test_api_login_mengembalikan_apotek_b_dari_user_backend(): void
    {
        $user = User::factory()->create([
            'email' => 'kasir.b@example.test',
            'apotek' => 'Apotek B',
        ])->assignRole('kasir_apotek_b');

        $this->api()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('data.user.role', 'kasir_apotek_b')
            ->assertJsonPath('data.user.apotek', 'Apotek B');
    }

    public function test_api_login_mempertahankan_token_csrf_dari_session_awal(): void
    {
        $user = User::factory()->create(['email' => 'admin.a@example.test'])->assignRole('admin_apotek_a');
        $csrfToken = 'csrf-token-sebelum-login';

        $this->withSession(['_token' => $csrfToken]);

        $this->api()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->assertSame($csrfToken, session()->token());
    }

    public function test_api_login_menolak_kredensial_salah(): void
    {
        $user = User::factory()->create(['email' => 'admin.a@example.test'])->assignRole('admin_apotek_a');

        $this->api()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'salah',
        ])->assertUnauthorized()
            ->assertJson([
                'success' => false,
                'message' => 'Email atau password salah.',
            ]);
    }

    public function test_api_login_menolak_input_tidak_valid(): void
    {
        $this->api()->postJson('/api/login', [])->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Data tidak valid.');
    }

    public function test_api_menolak_user_tanpa_authentication(): void
    {
        $this->api()->getJson('/api/user')->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_api_user_mengembalikan_user_yang_sedang_login(): void
    {
        $user = User::factory()->create([
            'email' => 'kasir.b@example.test',
            'apotek' => 'Apotek B',
        ])->assignRole('kasir_apotek_b');

        $this->actingAs($user, 'web');

        $this->api()->getJson('/api/user')->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonPath('data.user.role', 'kasir_apotek_b')
            ->assertJsonPath('data.user.apotek', 'Apotek B')
            ->assertJsonPath('data.user.apotek_id', null);
    }

    public function test_api_logout_menghapus_authentication_dan_session(): void
    {
        $user = User::factory()->create()->assignRole('admin_apotek_a');

        $this->api()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->api()->postJson('/api/logout')->assertOk()
            ->assertJsonPath('success', true);

        $this->assertGuest('web');
        $this->api()->getJson('/api/user')->assertUnauthorized();
    }

    public function test_login_blade_tetap_berfungsi(): void
    {
        $user = User::factory()->create()->assignRole('admin_apotek_a');

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect(route('admin.dashboard'));

        $this->assertAuthenticatedAs($user, 'web');
    }

    private function api(): static
    {
        return $this->withHeaders([
            'Accept' => 'application/json',
            'Origin' => 'http://localhost:3000',
            'Referer' => 'http://localhost:3000/login',
        ]);
    }
}
