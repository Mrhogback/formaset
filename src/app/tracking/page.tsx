"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type AssetData = {
  id: string;
  asset_code: string;
  asset_name: string;
  device: { name: string };
  kondisi: { name: string };
  status: { name: string };
  employee: {
    nama_pegawai: string;
    lokasi: { room_name: string };
    gedung: { building_name: string };
  };
  spec_computer?: {
    operating_system: string;
    merk: string;
    processor: string;
    ram: string;
    jenis_storage: string;
    besar_storage: string;
    grafis_card: string;
    asset_software: { name: string }[];
  }[];
  asset_security_checklist?: {
    is_checked: boolean;
    security_checklist_items: {
      category: string;
      item_text: string;
    };
  }[];
};

export default function TrackingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<AssetData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setAsset(null);

    try {
      const { data, error } = await supabase
        .from('asset')
        .select(`
          *,
          device:asset_type(name),
          kondisi:kondisi_aset(name),
          status:asset_status(name),
          employee:employee_id(
            nama_pegawai,
            lokasi:room_locations(room_name),
            gedung:building_id(building_name)
          ),
          spec_computer(
            operating_system, merk, processor, ram,
            jenis_storage, besar_storage, grafis_card,
            asset_software(name)
          ),
          asset_security_checklist(
            is_checked,
            security_checklist_items(category, item_text)
          )
        `)
        .eq('asset_code', searchQuery.toUpperCase().trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError("Kode aset tidak ditemukan");
        } else {
          setError("Terjadi kesalahan saat mencari data");
        }
        return;
      }

      setAsset(data);
    } catch (err) {
      setError("Terjadi kesalahan saat menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const InfoItem = ({ label, value }: { label: string; value: string | undefined | null }) => (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-gray-900 wrap-break-word">
        {value || "-"}
      </p>
    </div>
  );

  const getChecklistGroups = () => {
    if (!asset?.asset_security_checklist) return [];

    const groups = asset.asset_security_checklist.reduce((acc, item) => {
      const category = item.security_checklist_items.category;
      if (!acc[category]) {
        acc[category] = {
          category,
          label: category === 'LOW' ? '🟢 LOW — Kebiasaan Dasar' :
                 category === 'MEDIUM' ? '🟡 MEDIUM — Perlindungan Tambahan' :
                 '🔴 HIGH — Perlindungan Serius',
          items: []
        };
      }
      acc[category].items.push(item);
      return acc;
    }, {} as Record<string, { category: string; label: string; items: typeof asset.asset_security_checklist }>);

    return Object.values(groups);
  };

  return (
    <main className="min-h-screen bg-slate-950">
      <div className=" mx-auto">
        {/* Header */}
        <header className="border-b border-slate-800">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 shadow-md">
                    <span className="text-sm font-bold">📊</span>
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight">
                        <Link href="/" className="hover:text-yellow-300 text-white transition">
                            Asset Management
                        </Link>
                    </h1>
                </div>
            </div>
        </header>
        
        <div className="text-center mb-8 mt-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tracking Aset</h1>
          <p className="text-white">Cari informasi aset berdasarkan kode</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto px-6">
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
                <div className="flex gap-3">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Masukkan kode aset (contoh: MFG-ENG-LP-001)"
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={loading}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading || !searchQuery.trim()}
                    className="cursor-pointer px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    {loading ? "Mencari..." : "Cari"}
                </button>
                </div>
            </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Sedang mencari data aset...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-lg mb-2">❌ {error}</div>
            <p className="text-red-500 text-sm">Pastikan kode aset sudah benar dan coba lagi</p>
          </div>
        )}

        {/* Asset Data */}
        {asset && !loading && !error && (
          <div className="space-y-6 my-5">
            {/* Asset Info */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Informasi Aset
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Detail identitas dan lokasi perangkat
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">
                <InfoItem
                  label="Kode Aset"
                  value={asset.asset_code}
                />

                <InfoItem
                  label="Nama Aset"
                  value={asset.asset_name}
                />

                <InfoItem
                  label="Jenis Perangkat"
                  value={asset.device?.name}
                />

                <InfoItem
                  label="Kondisi"
                  value={asset.kondisi?.name}
                />

                <InfoItem
                  label="Status"
                  value={asset.status?.name}
                />

                <InfoItem
                  label="Pegawai"
                  value={asset.employee?.nama_pegawai}
                />

                <InfoItem
                  label="Lokasi"
                  value={`${asset.employee?.gedung?.building_name || "-"} - ${
                    asset.employee?.lokasi?.room_name || "-"
                  }`}
                />
              </div>
            </div>

            {/* Specifications */}
            {asset.spec_computer && asset.spec_computer.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Spesifikasi Teknis
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Detail hardware dan software perangkat
                  </p>
                </div>

                <div className="space-y-6 p-6">
                  {asset.spec_computer.map((spec, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                    >
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <InfoItem
                          label="Sistem Operasi"
                          value={spec.operating_system}
                        />

                        <InfoItem
                          label="Merk / CPU"
                          value={spec.merk}
                        />

                        <InfoItem
                          label="Processor"
                          value={spec.processor}
                        />

                        <InfoItem
                          label="RAM"
                          value={spec.ram}
                        />

                        <InfoItem
                          label="Storage"
                          value={`${spec.jenis_storage} - ${spec.besar_storage}`}
                        />

                        <InfoItem
                          label="Grafis"
                          value={spec.grafis_card}
                        />
                      </div>

                      {spec.asset_software &&
                        spec.asset_software.length > 0 && (
                          <div className="mt-5">
                            <p className="mb-3 text-sm font-medium text-gray-500">
                              Software Terinstall
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {spec.asset_software.map((software, i) => (
                                <span
                                  key={i}
                                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                                >
                                  {software.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Checklist */}
            {asset.asset_security_checklist &&
              asset.asset_security_checklist.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Checklist Keamanan
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Status keamanan perangkat berdasarkan kategori
                    </p>
                  </div>

                  <div className="space-y-5 p-6">
                    {getChecklistGroups().map((group) => {
                      const checkedCount = group.items.filter(
                        (item) => item.is_checked
                      ).length;

                      const progress =
                        (checkedCount / group.items.length) * 100;

                      return (
                        <div
                          key={group.category}
                          className="rounded-2xl border border-gray-200 p-5"
                        >
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-800">
                                {group.label}
                              </h3>

                              <p className="mt-1 text-sm text-gray-500">
                                {checkedCount} dari {group.items.length} item
                                dicentang
                              </p>
                            </div>

                            <div className="w-full sm:w-48">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-green-500 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {group.items.map((item, index) => (
                              <div
                                key={index}
                                className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                                  item.is_checked
                                    ? "border-green-200 bg-green-50"
                                    : "border-red-200 bg-red-50"
                                }`}
                              >
                                <div
                                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                                    item.is_checked
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.is_checked ? "✓" : "✕"}
                                </div>

                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-medium ${
                                      item.is_checked
                                        ? "text-gray-800"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {item.security_checklist_items.item_text}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </main>
  );
}