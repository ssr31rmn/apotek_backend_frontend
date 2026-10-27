<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Data tidak valid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $csrfToken = $request->session()->token();

        $throttleKey = Str::transliterate(Str::lower($validated['email']) . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json([
                'success' => false,
                'message' => 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
                'errors' => [],
            ], 429);
        }

        if (! Auth::guard('web')->attempt([
            'email' => $validated['email'],
            'password' => $validated['password'],
        ], (bool) ($validated['remember'] ?? false))) {
            RateLimiter::hit($throttleKey);

            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah.',
                'errors' => [],
            ], 401);
        }

        $user = $request->user('web');

        if (! $user instanceof User || ! $user->hasValidApotekRole()) {
            Auth::guard('web')->logout();
            RateLimiter::clear($throttleKey);

            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum memiliki hak akses yang valid.',
                'errors' => [],
            ], 403);
        }

        RateLimiter::clear($throttleKey);
        $request->session()->regenerate();
        $request->session()->put('_token', $csrfToken);

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => ['user' => $this->userData($user)],
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'Data user berhasil diambil.',
            'data' => ['user' => $this->userData($user)],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        Auth::forgetGuards();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
            'data' => null,
        ]);
    }

    /** @return array<string, mixed> */
    private function userData(User $user): array
    {
        $roles = $user->getRoleNames()->values()->all();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $roles[0] ?? null,
            'roles' => $roles,
            'apotek' => $user->apotek,
            // Belum ada kolom apotek_id atau tabel apotek pada database saat ini.
            'apotek_id' => null,
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
        ];
    }
}
