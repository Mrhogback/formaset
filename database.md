# Database Schema

## Supabase Project
- Client ada di `src/lib/supabaseClient.ts`
- Storage bucket: `asset_photo` (Public)

---

## Relasi Antar Tabel

```
building_locations
  └── room_locations (building_id FK)
        └── employees (lokasi FK, building_id FK)
              └── asset (employee_id FK)
                    ├── spec_computer (asset_id FK)
                    │     └── asset_software (spec_computer_id FK)
                    ├── asset_security_checklist (asset_id FK)
                    │     └── security_checklist_items (checklist_item_id FK)
                    └── asset_shift_users (asset_id FK)
                          ├── employees (employee_id FK)
                          └── shifts (shift_id FK)

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
| employee_id | uuid | FK → employees.id |
| employee_number | varchar | ID Karyawan (hanya diisi jika Karyawan) |
| instansi | varchar | Nama instansi (hanya diisi jika Non-Karyawan) |
| nomor_ktp | varchar | Nomor KTP (hanya diisi jika Non-Karyawan) |
| created_at | timestamptz | Default now() |

> Jika tipe Karyawan: isi `employee_number`, kolom lain null.
> Jika tipe Non-Karyawan: isi `instansi` & `nomor_ktp`, kolom lain null.

---

## Tabel: `device`
Menyimpan jenis perangkat/aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| name | varchar | Nama device (contoh: Laptop, Personal Computer) |
| device_prefix | varchar | Prefix device (dipakai di asset_code) |
| created_at | timestamptz | Default now() |

---

## Tabel: `asset_condition`
Menyimpan data kondisi aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| name | varchar | Nama kondisi (A — Baik, B — Ada Catatan, C — Rusak, D — Tidak Digunakan) |
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
| asset_code | text | UNIQUE, auto-generate via RPC insert_asset_with_code() |
| asset_name | text | Nama/model spesifik perangkat |
| asset_type | uuid | FK → device.id |
| kondisi_aset | int8 | FK → asset_condition.id |
| asset_status | int8 | FK → asset_status.id |
| photo_url | text | Path foto di Storage bucket asset_photo |
| created_at | timestamptz | Default now() |

---

## Tabel: `spec_computer`
Menyimpan spesifikasi teknis untuk aset jenis Laptop & Personal Computer.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| asset_id | uuid | FK → asset.id |
| operating_system | text | Sistem operasi |
| merk | text | Merk laptop / Merk CPU untuk PC |
| processor | text | Tipe processor |
| ram | text | Kapasitas RAM |
| jenis_storage | text | Jenis storage (SSD/HDD) |
| besar_storage | text | Kapasitas storage |
| grafis_card | text | Kartu grafis |
| created_at | timestamptz | Default now() |

> Hanya diisi jika device adalah Laptop atau Personal Computer.

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

## Tabel: `security_checklist_items`
Menyimpan master daftar item checklist keamanan perangkat.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| category | varchar | Kategori: LOW / MEDIUM / HIGH |
| item_text | text | Teks item checklist yang ditampilkan ke user |
| created_at | timestamptz | Default now() |

> Item dengan prefix `[LAPTOP]` hanya ditampilkan jika device adalah Laptop.
> Item dengan prefix `[PC]` hanya ditampilkan jika device adalah Personal Computer.
> Prefix difilter di frontend — tidak ditampilkan ke user.
> Item tanpa prefix ditampilkan untuk semua jenis perangkat.

---

## Tabel: `asset_security_checklist`
Menyimpan hasil checklist keamanan per aset.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| asset_id | uuid | FK → asset.id |
| checklist_item_id | int8 | FK → security_checklist_items.id |
| is_checked | boolean | true jika dicentang user, false jika tidak |
| created_at | timestamptz | Default now() |

---

## Tabel: `shifts`
Menyimpan data shift kerja.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| shift_name | varchar | Nama shift (Pagi / Siang / Malam) |
| created_at | timestamptz | Default now() |

Data default: `Pagi`, `Siang`, `Malam`

---

## Tabel: `asset_shift_users`
Menyimpan data pegawai yang memakai aset secara bergantian per shift.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | int8 | PK, auto increment |
| asset_id | uuid | FK → asset.id |
| employee_id | uuid | FK → employees.id |
| shift_id | int8 | FK → shifts.id |
| created_at | timestamptz | Default now() |

> Diisi jika 1 perangkat digunakan lebih dari 1 orang secara bergantian per shift.
> 1 shift hanya bisa diisi 1 pegawai per aset.

---

## Asset Code Generation

Format: `[building_name]-[room_prefix]-[device_prefix]-[urutan per room per device]`
Contoh: `MFG-ENG-LP-001`

```ts
const { data: assetId } = await supabase.rpc('insert_asset_with_code', {
  p_employee_id: employeeId,
  p_device_id: selectedDeviceId,
  p_room_id: selectedRoomId,
  p_asset_name: assetName,
  p_kondisi_aset: kondisiId,
  p_asset_status: statusId,
  p_photo_url: photoUrl
})
```

- Urutan reset per room per device (MFG-ENG-LP-001 dan MFG-ENG-PC-001 terpisah)
- asset_code bersifat UNIQUE
- Menggunakan pg_advisory_xact_lock untuk mencegah duplikat saat submit bersamaan

---

## Alur Insert Saat Submit Form

```
1. INSERT ke employees → dapat employee_id
2. INSERT ke employee_details (employee_id):
   - Jika Karyawan: isi employee_number
   - Jika Non-Karyawan: isi instansi & nomor_ktp
3. Loop setiap asset:
   a. Upload foto ke storage asset_photo → dapat photo_url
   b. Panggil RPC insert_asset_with_code(...) → dapat asset_id
   c. Jika Laptop/Personal Computer:
      - INSERT ke spec_computer (asset_id) → dapat spec_computer_id
      - INSERT ke asset_software (spec_computer_id) untuk setiap software
   d. INSERT ke asset_security_checklist untuk setiap item checklist:
      { asset_id, checklist_item_id, is_checked }
   e. Jika multi-shift diaktifkan:
      - INSERT ke asset_shift_users untuk setiap shift yang diisi:
        { asset_id, employee_id, shift_id }
```

---

## Nama Kolom Penting (Hindari Typo)

| Tabel | Kolom | Catatan |
|---|---|---|
| building_locations | building_name | Bukan `name` |
| room_locations | room_prefix | Bukan `prefix` |
| device | device_prefix | Bukan `prefix` |
| device | name | Nilai: "Laptop" atau "Personal Computer" |
| asset | asset_type | UUID FK ke device |
| asset | kondisi_aset | int8 FK ke asset_condition |
| asset | asset_code | UNIQUE constraint |
| employees | employee_type_id | FK ke employee_types, bukan jenis_pegawai |
| employee_details | employee_number | Hanya untuk tipe Karyawan |
| employee_details | instansi, nomor_ktp | Hanya untuk tipe Non-Karyawan |
| security_checklist_items | category | Nilai: LOW / MEDIUM / HIGH |
| security_checklist_items | item_text | Prefix [LAPTOP] dan [PC] difilter di frontend |
| asset_security_checklist | is_checked | Boolean, default false |
| asset_shift_users | shift_id | FK ke shifts.id |
