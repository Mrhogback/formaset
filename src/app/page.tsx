import Image from "next/image";
import Link from "next/link";
import { supabase } from '@/lib/supabaseClient'

export default async function Home() {
  const { data: devices, error } = await supabase
    .from('device')
    .select('*')

  if (error) {
    return <p>Error: {error.message}</p>
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Test Koneksi Supabase</h1>
        <p className="mt-2 text-slate-600">Pastikan Supabase terhubung dan coba tambah asset melalui form.</p>
        <div className="mt-6 flex flex-col gap-4">
          <Link
            href="/form"
            className="inline-flex w-fit items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Tambah Asset Baru
          </Link>
          <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
            {JSON.stringify(devices, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  )
}

