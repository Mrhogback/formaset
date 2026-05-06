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
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors font-medium"
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
          <div className="space-y-6">
            {/* Asset Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Aset</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Kode Aset</p>
                  <p className="font-semibold text-gray-900">{asset.asset_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nama Aset</p>
                  <p className="font-semibold text-gray-900">{asset.asset_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jenis Perangkat</p>
                  <p className="font-semibold text-gray-900">{asset.device?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kondisi</p>
                  <p className="font-semibold text-gray-900">{asset.kondisi?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-semibold text-gray-900">{asset.status?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pegawai</p>
                  <p className="font-semibold text-gray-900">{asset.employee?.nama_pegawai}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Lokasi</p>
                  <p className="font-semibold text-gray-900">
                    {asset.employee?.gedung?.building_name} - {asset.employee?.lokasi?.room_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Specifications (if Laptop/PC) */}
            {asset.spec_computer && asset.spec_computer.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Spesifikasi Teknis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asset.spec_computer.map((spec, index) => (
                    <div key={index} className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Sistem Operasi</p>
                        <p className="font-semibold text-gray-900">{spec.operating_system}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Merk / CPU</p>
                        <p className="font-semibold text-gray-900">{spec.merk}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Processor</p>
                        <p className="font-semibold text-gray-900">{spec.processor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">RAM</p>
                        <p className="font-semibold text-gray-900">{spec.ram}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Storage</p>
                        <p className="font-semibold text-gray-900">{spec.jenis_storage} - {spec.besar_storage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Grafis</p>
                        <p className="font-semibold text-gray-900">{spec.grafis_card}</p>
                      </div>
                      {spec.asset_software && spec.asset_software.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-500">Software</p>
                          <p className="font-semibold text-gray-900">{spec.asset_software.map(s => s.name).join(", ")}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Checklist */}
            {asset.asset_security_checklist && asset.asset_security_checklist.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Checklist Keamanan</h2>
                <div className="space-y-6">
                  {getChecklistGroups().map((group) => (
                    <div key={group.category} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-800 mb-3">{group.label}</h3>
                      <div className="space-y-2">
                        {group.items.map((item, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <span className={`text-sm ${item.is_checked ? 'text-green-600' : 'text-red-600'}`}>
                              {item.is_checked ? '✅' : '❌'}
                            </span>
                            <span className={`text-sm ${item.is_checked ? 'text-gray-900' : 'text-gray-500'}`}>
                              {item.security_checklist_items.item_text}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-sm text-gray-600">
                        {group.items.filter(item => item.is_checked).length} dari {group.items.length} item dicentang
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}