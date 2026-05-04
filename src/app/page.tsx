import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 shadow-md">
              <span className="text-sm font-bold">📊</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">
              Asset Management
            </h1>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="space-y-6 text-center md:text-left">
            <h2 className="text-4xl md:text-5xl font-semibold leading-tight">
              Sistem Pendataan Aset IT
            </h2>
            <p className="text-slate-400 max-w-2xl">
              Tujuan sistem ini dibuat adalah untuk mengelola seluruh aset IT di PT YPTI. Sehingga memudahkan proses pencatatan, pemantauan, dan akses data kapan saja.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-10">
            <Link
              href="/form"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-700 shadow-md hover:shadow-blue-500/20"
            >
              Mulai Pendataan
              <span>→</span>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
            {[
              {
                icon: "💾",
                title: "Pencatatan ",
                desc: "Dokumentasi aset secara lengkap dan terstruktur",
              },
              {
                icon: "📸",
                title: "Dokumentasi",
                desc: "Lampiran foto aset untuk identifikasi yang lebih mudah",
              },
              {
                icon: "📋",
                title: "Data Tracking",
                desc: "Akses data kapan saja dalam satu sistem",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition"
              >
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Asset Types */}
          
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
        © 2026 Asset System | YPTI
      </footer>
    </main>
  );
}