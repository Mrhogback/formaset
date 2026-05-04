# Project: Asset Management System

## Tech Stack
- Next.js (App Router)
- Supabase (Database + Storage)
- TypeScript
- Tailwind CSS

## Supabase
- Client ada di `src/lib/supabaseClient.ts`
- Struktur database lengkap ada di `database.md`
- Storage bucket: `asset_photo` (Public)

## Konvensi
- Semua query Supabase pakai client dari `src/lib/supabaseClient.ts`
- Komponen ada di `src/app`
- Gunakan TypeScript strict