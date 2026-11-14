# Sistem Inventaris & Kasir Apotek

Aplikasi web untuk mengelola data obat, stok, dan transaksi apotek.
Dibangun dengan Laravel 12, Tailwind CSS 4, dan MySQL.

Dokumen perencanaan ada di `Implementation Plan Capstone Project-Kelompok 1.md`,
dan daftar tugas beserta progresnya ada di `TASK-BOARD.md`.

## Menjalankan di Laptop (Development)

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate

# buat database "apotek_capstone" lebih dulu di phpMyAdmin
php artisan migrate --seed

php artisan serve     # buka http://127.0.0.1:8000
npm run dev           # jalankan di terminal kedua saat mengubah tampilan
```

Akun bawaan dari seeder:

| Role | Email | Password |
|---|---|---|
| Admin | admin@apotek.test | password |
| Kasir | kasir@apotek.test | password |

## Tampilan (CSS & JS)

Hasil build Tailwind **ikut disimpan di repo** pada folder `public/build`, supaya
aplikasi bisa di-hosting tanpa menjalankan npm di server.

Karena itu, setiap kali mengubah tampilan (file Blade atau `resources/css/app.css`):

```bash
npm run build
git add public/build
git commit -m "..."
```

Kalau langkah ini terlewat, tampilan di hosting akan memakai CSS lama dan
sebagian halaman terlihat polos tanpa kotak, warna, atau tombol yang benar.
npm hanya dibutuhkan di laptop, tidak pernah di server.

## Cetak struk Epson TM-U220 (Windows USB)

Cetak struk dijalankan oleh PHP melalui `mike42/escpos-php`, bukan oleh browser.
Hubungkan printer USB ke komputer Windows yang menjalankan Laravel, pasang printer
dengan driver **Generic / Text Only**, lalu aktifkan sharing pada printer dan catat
nama share-nya. Isi `.env` pada komputer tersebut:

```dotenv
RECEIPT_PRINTER_NAME=NamaSharePrinter
RECEIPT_PRINTER_COLUMNS=40
```

Gunakan `RECEIPT_PRINTER_COLUMNS=30` bila lebar kertas/konfigurasi printer hanya
mendukung 30 kolom. Setelah mengubah `.env`, jalankan `php artisan config:clear`
(atau restart proses PHP jika konfigurasi belum di-cache). Pastikan akun Windows
yang menjalankan PHP dapat mengakses antrean printer. Kasir dapat mencetak setelah
checkout atau mencetak ulang struk dari menu Riwayat Penjualan. Jika printer mati,
transaksi tetap tersimpan dan struk dapat dicoba lagi dari riwayat.
Pada halaman struk, tombol **Lihat JSON** membuka data transaksi terstruktur untuk
memeriksa payload tanpa mengirim perintah ke printer.

## Hosting (Tanpa Terminal)

1. Upload seluruh isi proyek ke hosting, termasuk `vendor` dan `public/build`.
   Catatan: `public/build` ikut di git, sedangkan `vendor` tidak — folder `vendor`
   dibuat oleh `composer install` di laptop, lalu diupload manual (mis. lewat zip).
2. Arahkan domain ke folder `public`.
3. Salin `.env.example` menjadi `.env`, lalu isi:
   - `APP_ENV=production` dan `APP_DEBUG=false`
   - `APP_KEY` (salin dari hasil `php artisan key:generate` di laptop)
   - `APP_URL` sesuai alamat domain
   - data `DB_*` sesuai database di hosting
4. Impor file SQL hasil ekspor database dari laptop lewat phpMyAdmin.
5. Pastikan folder `storage` dan `bootstrap/cache` dapat ditulis (permission 755).

Tidak ada langkah `npm` maupun `composer install` di server, karena `vendor`
dan `public/build` sudah ikut diupload.
