# Asset Form Logic

## Tujuan
Dokumen ini menjelaskan logika utama yang digunakan di sistem form pendataan asset IT, khususnya:
- `src/app/form/page.tsx`
- `src/lib/errorUtils.ts`
- `src/lib/assetCodeStore.ts`
- `src/app/asset-codes/page.tsx`

## `src/lib/errorUtils.ts`

Fungsi ini menangani error runtime di frontend:
- `getErrorDetails(error)`
  - Mengembalikan objek `{ message, location }`
  - `message` berasal dari instance `Error` atau dari string/unknown fallback
  - `location` diambil dari stack trace, kalau tersedia
- `formatErrorDetails(error)`
  - Menggabungkan pesan dan lokasi menjadi satu string yang mudah ditampilkan

## `src/lib/assetCodeStore.ts`

Fungsi utility untuk menyimpan dan membaca daftar kode aset di `localStorage`:
- `saveAssetCodes(codes)` menyimpan array kode sebagai JSON
- `loadAssetCodes()` membaca kembali daftar kode
- `clearAssetCodes()` menghapus data dari localStorage

## `src/app/form/page.tsx`

Logika utama form:
- Wizard 3 langkah: `Pegawai`, `Tambah Asset`, dan `Review & Submit`
- Validasi input menggunakan `react-hook-form` dan `zod`
- Pemilihan device mengaktifkan field spesifikasi komputer jika device termasuk laptop/PC
- Asset code otomatis di-generate setelah memilih device dan lokasi ruangan via RPC Supabase
- Pada submit:
  1. Data pegawai disimpan ke tabel `employees`
  2. Detail pegawai disimpan ke `employee_details`
  3. Foto asset diupload ke Supabase Storage
  4. Data asset disimpan via RPC `insert_asset_with_code`
  5. Spesifikasi komputer disimpan ke `spec_computer`
  6. Software tambahan disimpan ke `asset_software`
- Setelah submit berhasil, daftar kode asset disimpan di `localStorage` lalu user diarahkan ke halaman `/asset-codes`

## `src/app/asset-codes/page.tsx`

Halaman baru untuk menampilkan daftar kode aset setelah submit:
- Mengambil kode dari `localStorage`
- Menampilkan kode dalam daftar yang mudah dibaca
- Menyediakan tombol:
  - `Download untuk Print` → mengunduh file teks berisi asset code
  - `Cetak Halaman` → membuka dialog print browser
  - `Hapus Data Lokal` → membersihkan storage agar tidak tersimpan lagi

## Hal-hal penting

- Logika penanganan error runtime dipisahkan ke `src/lib/errorUtils.ts` agar mudah dipakai ulang.
- Penyimpanan sementara kode asset menggunakan `localStorage` karena halaman result terpisah berada di route berbeda.
- Tombol dark/light mode telah dibuat dengan icon saja, tetap memakai `aria-label` untuk aksesibilitas.
- Jika route `/asset-codes` dibuka tanpa data lokal, halaman menampilkan pesan bahwa tidak ada kode aset.
