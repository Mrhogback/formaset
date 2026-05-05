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
  const sectionStyle = isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200";
  const innerCardStyle = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const labelStyle = isDark ? "text-slate-400" : "text-slate-500";
  const valueStyle = isDark ? "text-slate-100" : "text-slate-900";

  return (
    <main className={`min-h-screen px-6 py-10 ${pageStyle}`}>
      <div className={`mx-auto max-w-5xl rounded-3xl border ${cardStyle} p-8 shadow-sm`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Daftar Kode Aset</h1>
            <p className={`mt-2 ${labelStyle}`}>
              Lihat asset code final dan ringkasan data submit Anda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                isDark ? "border-slate-600 bg-slate-800 text-yellow-300 hover:bg-slate-600" : "border-slate-300 bg-white text-slate-900 hover:bg-slate-200"
              }`}
              
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
                  <path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              )}
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
          <div className={`rounded-3xl border p-6 ${sectionStyle}`}>
            Tidak ada data submit yang tersimpan. Silakan kembali ke form dan submit ulang.
          </div>
        ) : (
          <>
            <section className={`mb-8 grid gap-4 rounded-3xl border p-6 ${sectionStyle}`}>
              <div className={`rounded-2xl border p-4 shadow-sm ${innerCardStyle}`}>
                <p className={`text-sm ${labelStyle}`}>Kode Aset Final</p>
                {submission.assetCodes.map((code, index) => (
                  <p key={index} className={`mt-3 text-lg font-semibold ${valueStyle}`}>
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
              <div className={`rounded-3xl border p-6 ${sectionStyle}`}>
                <h2 className="text-xl font-semibold">Ringkasan Data Pegawai</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className={`text-sm ${labelStyle}`}>Nama</p>
                    <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.nama_pegawai}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${labelStyle}`}>Tipe</p>
                    <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.employee_type}</p>
                  </div>
                  {submission.employee.employee_number && (
                    <div>
                      <p className={`text-sm ${labelStyle}`}>ID Karyawan</p>
                      <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.employee_number}</p>
                    </div>
                  )}
                  {submission.employee.instansi && (
                    <div>
                      <p className={`text-sm ${labelStyle}`}>Instansi</p>
                      <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.instansi}</p>
                    </div>
                  )}
                  {submission.employee.nomor_ktp && (
                    <div>
                      <p className={`text-sm ${labelStyle}`}>Nomor KTP</p>
                      <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.nomor_ktp}</p>
                    </div>
                  )}
                  <div>
                    <p className={`text-sm ${labelStyle}`}>Position</p>
                    <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.position}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${labelStyle}`}>Gedung</p>
                    <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.building}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${labelStyle}`}>Lokasi</p>
                    <p className={`mt-1 font-medium ${valueStyle}`}>{submission.employee.lokasi}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {submission.assets.map((asset, index) => (
                  <div key={index} className={`rounded-3xl border p-6 ${sectionStyle}`}>
                    <h3 className="text-lg font-semibold">Asset #{index + 1} - {asset.asset_code}</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Nama Asset</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.asset_name}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Device</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.device_label}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Kondisi</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.condition_label}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Status</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.status_label}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>OS</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.operating_system}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Merk / CPU</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.merk}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Processor</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.processor}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>RAM</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.ram}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Storage</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.jenis_storage} - {asset.besar_storage}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${labelStyle}`}>Grafis</p>
                        <p className={`mt-1 font-medium ${valueStyle}`}>{asset.grafis_card}</p>
                      </div>
                      {asset.softwares && asset.softwares.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className={`text-sm ${labelStyle}`}>Software</p>
                          <p className={`mt-1 font-medium ${valueStyle}`}>{asset.softwares.join(", ")}</p>
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
