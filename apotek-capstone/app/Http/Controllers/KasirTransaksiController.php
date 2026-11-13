<?php

namespace App\Http\Controllers;

use App\Models\DetailPenjualan;
use App\Models\Obat;
use App\Models\Penjualan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Collection;
use Illuminate\View\View;
use Illuminate\Validation\ValidationException;

class KasirTransaksiController extends Controller
{
    public function index(Request $request): View
    {
        $user = $this->validatedUser($request);
        $search = trim((string) $request->query('q', ''));
        $cart = $this->cartForUser($request, $user);
        $items = $this->cartItems($cart, $user);

        return view('kasir.transaksi.index', [
            'obat' => Obat::query()
                ->forUser($user)
                ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                    ->where('nama_obat', 'like', "%{$search}%")
                    ->orWhere('kode_obat', 'like', "%{$search}%")))
                ->orderBy('nama_obat')
                ->get(),
            'search' => $search,
            'jumlahKeranjang' => array_sum($cart),
            'jumlahPerObat' => $cart,
            'items' => $items,
            'subtotal' => $items->sum(fn (array $item) => $item['subtotal_cents']),
        ]);
    }

    public function cart(Request $request): View
    {
        $user = $this->validatedUser($request);
        $items = $this->cartItems($this->cartForUser($request, $user), $user);

        return view('kasir.keranjang.index', [
            'items' => $items,
            'subtotal' => $items->sum(fn (array $item) => $item['subtotal_cents']),
            'jumlahItem' => $items->sum('jumlah'),
        ]);
    }

    public function add(Request $request): RedirectResponse
    {
        $user = $this->validatedUser($request);
        $data = $request->validate([
            'obat_id' => ['required', 'integer', 'exists:obat,id'],
            'jumlah' => ['nullable', 'integer', 'min:1', 'max:9999'],
        ]);

        $obat = Obat::query()->forUser($user)->findOrFail($data['obat_id']);
        $cart = $this->cartForUser($request, $user);
        $quantity = ($cart[$obat->id] ?? 0) + ($data['jumlah'] ?? 1);

        if ($quantity > 9999) {
            return back()->with('error', 'Jumlah obat dalam keranjang tidak boleh melebihi 9999.');
        }

        if ($obat->stok < $quantity) {
            return back()->with('error', "Stok {$obat->nama_obat} tidak mencukupi. Stok tersedia: {$obat->stok}.");
        }

        $cart[$obat->id] = $quantity;
        $request->session()->put('kasir.cart', $cart);

        return back()->with('success', "{$obat->nama_obat} ditambahkan ke keranjang.");
    }

    public function remove(Request $request, Obat $obat): RedirectResponse
    {
        $user = $this->validatedUser($request);
        Obat::query()->forUser($user)->whereKey($obat->getKey())->firstOrFail();

        $cart = $this->cartForUser($request, $user);
        unset($cart[$obat->id]);
        $request->session()->put('kasir.cart', $cart);

        return back()->with('success', 'Obat dihapus dari keranjang.');
    }

    public function checkout(Request $request): RedirectResponse
    {
        $user = $this->validatedUser($request);
        $lock = Cache::lock('kasir.checkout.'.$user->id, 10);

        if (! $lock->get()) {
            return redirect()->route('kasir.keranjang')
                ->with('error', 'Checkout sedang diproses. Silakan coba lagi.');
        }

        try {
            $cart = $this->cartForUser($request, $user);

            if ($cart === []) {
                return redirect()->route('kasir.keranjang')->with('error', 'Keranjang masih kosong.');
            }

            $penjualan = DB::transaction(function () use ($cart, $user): Penjualan {
                $obatList = Obat::query()
                    ->forUser($user)
                    ->whereIn('id', array_keys($cart))
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $totalCents = 0;
                foreach ($cart as $obatId => $jumlah) {
                    $obat = $obatList->get($obatId);
                    if (! $obat || $obat->stok < $jumlah) {
                        throw ValidationException::withMessages([
                            'keranjang' => 'Stok salah satu obat berubah atau tidak mencukupi. Periksa kembali keranjang.',
                        ]);
                    }

                    $totalCents += $this->toCents((string) $obat->harga_jual) * $jumlah;
                }

                $penjualan = Penjualan::create([
                    'no_faktur' => 'TRX-'.now()->format('Ymd-His').'-'.Str::upper(Str::random(5)),
                    'user_id' => $user->id,
                    'tanggal_penjualan' => now(),
                    'total' => $this->fromCents($totalCents),
                ]);

                foreach ($cart as $obatId => $jumlah) {
                    $obat = $obatList->get($obatId);
                    $unitCents = $this->toCents((string) $obat->harga_jual);

                    DetailPenjualan::create([
                        'penjualan_id' => $penjualan->id,
                        'obat_id' => $obat->id,
                        'jumlah' => $jumlah,
                        'harga_jual' => $obat->harga_jual,
                        'subtotal' => $this->fromCents($unitCents * $jumlah),
                    ]);

                    $obat->decrement('stok', $jumlah);
                }

                return $penjualan;
            });

            $request->session()->forget('kasir.cart');

            return redirect()->route('kasir.keranjang')
                ->with('success', "Transaksi {$penjualan->no_faktur} berhasil. Total Rp ".number_format((float) $penjualan->total, 0, ',', '.'));
        } finally {
            $lock->release();
        }
    }

    /** @return User */
    private function validatedUser(Request $request): User
    {
        $user = $request->user();

        abort_unless(
            $user instanceof User
                && $user->isKasir()
                && $user->hasValidApotekRole(),
            403
        );

        return $user;
    }

    /** @return array<int, int> */
    private function currentCart(Request $request): array
    {
        return collect($request->session()->get('kasir.cart', []))
            ->filter(fn ($quantity, $id) => filter_var($id, FILTER_VALIDATE_INT) !== false && (int) $id > 0)
            ->mapWithKeys(fn ($quantity, $id) => [(int) $id => min(9999, max(0, (int) $quantity))])
            ->filter(fn (int $quantity) => $quantity > 0)
            ->all();
    }

    /** @return array<int, int> */
    private function cartForUser(Request $request, User $user): array
    {
        $cart = $this->currentCart($request);

        if ($cart === []) {
            return [];
        }

        $validIds = Obat::query()
            ->forUser($user)
            ->whereIn('id', array_keys($cart))
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
        $validIdMap = array_fill_keys($validIds, true);
        $scopedCart = array_filter(
            $cart,
            static fn (int $quantity, int $id): bool => isset($validIdMap[$id]),
            ARRAY_FILTER_USE_BOTH
        );

        if ($scopedCart !== $cart) {
            $request->session()->put('kasir.cart', $scopedCart);
        }

        return $scopedCart;
    }

    /** @return Collection<int, array<string, mixed>> */
    private function cartItems(array $cart, User $user): Collection
    {
        $obatList = Obat::query()
            ->forUser($user)
            ->whereIn('id', array_keys($cart))
            ->get()
            ->keyBy('id');

        return collect($cart)->map(function (int $quantity, int $id) use ($obatList): ?array {
            $obat = $obatList->get($id);
            if (! $obat) {
                return null;
            }

            $unitCents = $this->toCents((string) $obat->harga_jual);

            return [
                'obat' => $obat,
                'jumlah' => $quantity,
                'harga_cents' => $unitCents,
                'subtotal_cents' => $unitCents * $quantity,
            ];
        })->filter(static fn (?array $item): bool => $item !== null)->values();
    }

    private function toCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');

        return ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');
    }

    private function fromCents(int $amount): string
    {
        return number_format($amount / 100, 2, '.', '');
    }
}