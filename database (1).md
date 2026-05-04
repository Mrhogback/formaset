# Database Schema

## Supabase Project
- Client ada di `src/lib/supabaseClient.ts`
- Storage bucket: `asset_photo` (Public)

---

## Relasi Antar Tabel

```
building_locations
  └── room_locations (building_id FK)
        └── employees (lokasi FK)
              └── asset (employee_id FK)
                    └── spec_computer (asset_id FK)
                          └── asset_software (spec_computer_id FK)

organizational_structure
  └── employees (position FK)

employee_types
  └── employees (employee_type_id FK)
        └── employee_details (employee_id FK)

device
  └── asset (asset_type FK)

asset_condition
  └── asset (kondisi_aset FK)

asset_status
  └── asset (asset_status FK)
```

---

## Tabel: `building_locations`
Menyimpan data gedung.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| building_name | varchar | Nama gedung (dipakai di asset_code) |
| created_at | timestamptz | Default now() |

---

## Tabel: `room_locations`
Menyimpan data ruangan per gedung.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| room_name | varchar | Nama ruangan |
| room_prefix | varchar | Prefix ruangan (dipakai di asset_code) |
| building_id | int8 | FK → building_locations.id |
| created_at | timestamptz | Default now() |

---

## Tabel: `organizational_structure`
Menyimpan data jabatan pegawai.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| jabatan | varchar | Nama jabatan |
| created_at | timestamptz | Default now() |

---

## Tabel: `employee_types`
Menyimpan tipe karyawan.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| type_name | varchar | Nama tipe (Karyawan / Non-Karyawan) |
| created_at | timestamptz | Default now() |

Data default:
- `Karyawan`
- `Non-Karyawan`

---

## Tabel: `employees`
Menyimpan data diri pegawai.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| nama_pegawai | text | Nama lengkap pegawai |
| employee_type_id | int8 | FK → employee_types.id |
| position | int8 | FK → organizational_structure.id |
| building_id | int8 | FK → building_locations.id |
| lokasi | int8 | FK → room_locations.id (menentukan lokasi asset) |
| created_at | timestamptz | Default now() |

---

## Tabel: `employee_details`
Menyimpan data tambahan pegawai berdasarkan tipe.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| employee_id | uuid | FK → employees.id ON DELETE CASCADE |
| employee_number | varchar | ID Karyawan (hanya diisi jika Karyawan) |
| instansi | varchar | Nama instansi (hanya diisi jika Non-Karyawan) |
| nomor_ktp | varchar | Nomor KTP (hanya diisi jika Non-Karyawan) |
| created_at | timestamptz | Default now() |

> Jika tipe Karyawan: isi `employee_number`, kolom lain null.
> Jika tipe Non-Karyawan: isi `instansi` atau `nomor_ktp` (minimal salah satu), kolom lain null jika tidak diisi.

---

## Tabel: `device`
Menyimpan jenis perangkat/aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| name | varchar | Nama device (contoh: Laptop, PC) |
| device_prefix | varchar | Prefix device (dipakai di asset_code) |
| created_at | timestamptz | Default now() |

---

## Tabel: `asset_condition`
Menyimpan data kondisi aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| name | varchar | Nama kondisi (contoh: Baik, Rusak) |
| created_at | timestamptz | Default now() |

---

## Tabel: `asset_status`
Menyimpan data status aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| name | varchar | Nama status (contoh: Aktif, Tidak Aktif) |
| created_at | timestamptz | Default now() |

---

## Tabel: `asset`
Menyimpan data utama aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| employee_id | uuid | FK → employees.id |
| asset_code | text | Auto-generate via RPC generate_asset_code() |
| asset_name | text | Nama aset |
| asset_type | uuid | FK → device.id |
| kondisi_aset | int8 | FK → asset_condition.id |
| asset_status | int8 | FK → asset_status.id |
| photo_url | text | Path foto di Storage bucket asset_photo |
| created_at | timestamptz | Default now() |

---

## Tabel: `spec_computer`
Menyimpan spesifikasi teknis untuk aset jenis Laptop & PC.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| asset_id | uuid | FK → asset.id |
| computer_name | text | Nama komputer |
| operating_system | text | Sistem operasi |
| merk | text | Merek perangkat |
| processor | text | Tipe processor |
| ram | text | Kapasitas RAM |
| jenis_storage | text | Jenis storage (SSD/HDD) |
| besar_storage | text | Kapasitas storage |
| grafis_card | text | Kartu grafis |
| created_at | timestamptz | Default now() |

> Hanya muncul di form jika device yang dipilih adalah Laptop atau PC.

---

## Tabel: `asset_software`
Menyimpan daftar software yang terinstall di perangkat.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| spec_computer_id | int8 | FK → spec_computer.id |
| name | text | Nama software |
| created_at | timestamptz | Default now() |

---

## Asset Code Generation

Asset code di-generate otomatis via Supabase RPC function `generate_asset_code`.

Format: `[building_name]-[room_prefix]-[device_prefix]-[urutan per room]`
Contoh: `MFG-ENG-LP-001`

```ts
const { data: assetCode } = await supabase.rpc('generate_asset_code', {
  p_room_id: selectedRoomId,   // int8, dari employees.lokasi
  p_device_id: selectedDeviceId // uuid, dari device.id
})
```

- Urutan reset per room (setiap room mulai dari 001)
- Dipanggil setelah user pilih lokasi dan device di form
- Hasilnya disimpan ke kolom `asset.asset_code` saat submit

---

## Alur Insert Saat Submit Form

```
1. INSERT ke employees (nama_pegawai, employee_type_id, position, building_id, lokasi) → dapat employee_id
2. INSERT ke employee_details (employee_id):
   - Jika Karyawan: isi employee_number
   - Jika Non-Karyawan: isi instansi & nomor_ktp
3. Loop setiap asset:
   a. Upload foto ke storage asset_photo → dapat photo_url
   b. Panggil RPC insert_asset_with_code(employee_id, device_id, room_id, ...) → dapat asset_id
   c. Jika Laptop/Personal Computer: INSERT ke spec_computer (asset_id) → dapat spec_computer_id
   d. INSERT ke asset_software (spec_computer_id) untuk setiap software
```

---

## Nama Kolom Penting (Hindari Typo)

| Tabel | Kolom | Catatan |
|---|---|---|
| building_locations | building_name | Bukan `name` |
| room_locations | room_prefix | Bukan `prefix` |
| device | device_prefix | Bukan `prefix` |
| asset | asset_type | UUID FK ke device |
| asset | kondisi_aset | int8 FK ke asset_condition |
| employees | employee_type_id | FK ke employee_types, bukan jenis_pegawai |
| employee_details | employee_number | Hanya untuk tipe Karyawan |
| employee_details | instansi, nomor_ktp | Hanya untuk tipe Non-Karyawan |
