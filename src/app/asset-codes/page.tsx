"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAssetSubmission } from "@/lib/assetCodeStore";

export default function AssetCodesPage() {
  const [submission, setSubmission] = useState<ReturnType<typeof loadAssetSubmission>>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = loadAssetSubmission();
    setSubmission(saved);

    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const downloadAssetCodes = () => {
    if (typeof window === "undefined" || !submission) return;
    const content = submission.assetCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "asset_codes.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const isDark = theme === "dark";
  const pageStyle = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const cardStyle = isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white";

  return (
    <main className={`min-h-screen px-6 py-10 ${pageStyle}`}>
      <div className={`mx-auto max-w-5xl rounded-3xl border ${cardStyle} p-8 shadow-sm`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Daftar Kode Aset</h1>
            <p className="mt-2 text-slate-500">
              Lihat asset code final dan ringkasan data submit Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                isDark ? "border-slate-600 bg-slate-800 text-yellow-300" : "border-slate-300 bg-white text-slate-900"
              }`}
            >
              {isDark ? "☀" : "🌙"}
            </button>
            <Link
              href="/form"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Kembali ke Form
            </Link>
          </div>
        </div>

        {!submission ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-600">
            Tidak ada data submit yang tersimpan. Silakan kembali ke form dan submit ulang.
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-500">Kode Aset Final</p>
                {submission.assetCodes.map((code, index) => (
                  <p key={index} className="mt-3 text-lg font-semibold text-slate-900">
                    {index + 1}. {code}
                  </p>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={downloadAssetCodes}
              className="mb-8 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Download Kode Aset
            </button>

            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-semibold">Ringkasan Data Pegawai</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-slate-500">Nama</p>
                    <p className="mt-1 font-medium text-slate-900">{submission.employee.nama_pegawai}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Tipe</p>
                    <p className="mt-1 font-medium text-slate-900">{submission.employee.employee_type}</p>
                  </div>
                  {submission.employee.employee_number && (
                    <div>
                      <p className="text-sm text-slate-500">ID Karyawan</p>
                      <p className="mt-1 font-medium text-slate-900">{submission.employee.employee_number}</p>
                    </div>
                  )}
                  {submission.employee.instansi && (
                    <div>
                      <p className="text-sm text-slate-500">Instansi</p>
                      <p className="mt-1 font-medium text-slate-900">{submission.employee.instansi}</p>
                    </div>
                  )}
                  {submission.employee.nomor_ktp && (
                    <div>
                      <p className="text-sm text-slate-500">Nomor KTP</p>
                      <p className="mt-1 font-medium text-slate-900">{submission.employee.nomor_ktp}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500">Position</p>
                    <p className="mt-1 font-medium text-slate-900">{submission.employee.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Gedung</p>
                    <p className="mt-1 font-medium text-slate-900">{submission.employee.building}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Lokasi</p>
                    <p className="mt-1 font-medium text-slate-900">{submission.employee.lokasi}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {submission.assets.map((asset, index) => (
                  <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-lg font-semibold">Asset #{index + 1} - {asset.asset_code}</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-500">Nama Asset</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.asset_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Device</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.device_label}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Kondisi</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.condition_label}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Status</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.status_label}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">OS</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.operating_system}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Merk / CPU</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.merk}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Processor</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.processor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">RAM</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.ram}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Storage</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.jenis_storage} - {asset.besar_storage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Grafis</p>
                        <p className="mt-1 font-medium text-slate-900">{asset.grafis_card}</p>
                      </div>
                      {asset.softwares && asset.softwares.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-sm text-slate-500">Software</p>
                          <p className="mt-1 font-medium text-slate-900">{asset.softwares.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
