<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'dashboard.lihat',
            'user.kelola',
            'obat.lihat',
            'obat.kelola',
            'kategori.lihat',
            'kategori.kelola',
            'supplier.kelola',
            'pembelian.lihat',
            'pembelian.kelola',
            'transaksi.lihat',
            'transaksi.kelola',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        Role::whereIn('name', ['admin', 'kasir'])->get()->each->delete();

        foreach (['admin_apotek_a', 'admin_apotek_b'] as $role) {
            Role::firstOrCreate(['name' => $role])->syncPermissions($permissions);
        }

        $kasirPermissions = [
            'dashboard.lihat',
            'obat.lihat',
            'kategori.lihat',
            'transaksi.lihat',
            'transaksi.kelola',
        ];

        foreach (['kasir_apotek_a', 'kasir_apotek_b'] as $role) {
            Role::firstOrCreate(['name' => $role])->syncPermissions($kasirPermissions);
        }
    }
}
