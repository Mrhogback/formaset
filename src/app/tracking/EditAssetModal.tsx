"use client";

import { useEffect, useState } from "react";
import { COMPUTER_FIELDS, computerFieldMeta, isComputerDevice } from "@/app/form/formConstants";
import { supabase } from "@/lib/supabaseClient";

type Option = { id: string; name: string };
type Software = { name: string };
type ShiftUser = { shift_id: string; nama_manual: string };
type Specification = Record<(typeof COMPUTER_FIELDS)[number], string>;

type EditAssetModalProps = {
  assetId: string;
  assetCode: string;
  assetName: string;
  assetTypeName: string;
  conditionId: string;
  statusId: string;
  photoUrl: string | null;
  employeeName: string;
  buildingName: string;
  roomName: string;
  onClose: () => void;
  onSaved: () => void;
};

const EMPTY_SPECIFICATION: Specification = {
  operating_system: "",
  merk: "",
  processor: "",
  ram: "",
  jenis_storage: "",
  besar_storage: "",
  grafis_card: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default function EditAssetModal({
  assetId,
  assetCode,
  assetName,
  assetTypeName,
  conditionId,
  statusId,
  photoUrl,
  employeeName,
  buildingName,
  roomName,
  onClose,
  onSaved,
}: EditAssetModalProps) {
  const [name, setName] = useState(assetName);
  const [selectedCondition, setSelectedCondition] = useState(conditionId);
  const [selectedStatus, setSelectedStatus] = useState(statusId);
  const [photo, setPhoto] = useState<File | null>(null);
  const [conditions, setConditions] = useState<Option[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [shifts, setShifts] = useState<Option[]>([]);
  const [specification, setSpecification] = useState<Specification>(EMPTY_SPECIFICATION);
  const [specificationId, setSpecificationId] = useState<number | null>(null);
  const [softwares, setSoftwares] = useState<Software[]>([{ name: "" }]);
  const [shiftUsers, setShiftUsers] = useState<ShiftUser[]>([]);
  const [skipSpecification, setSkipSpecification] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isComputer = isComputerDevice(assetTypeName);
  const canSkipSpecification = selectedCondition === "3" && selectedStatus === "2";

  useEffect(() => {
    let active = true;

    const loadFormData = async () => {
      setLoading(true);
      setErrorMessage(null);

      const [conditionsResult, statusesResult, shiftsResult, specResult, shiftUsersResult] =
        await Promise.all([
          supabase.from("asset_condition").select("id, name").order("id"),
          supabase.from("asset_status").select("id, name").order("id"),
          supabase.from("shifts").select("id, shift_name").order("id"),
          supabase
            .from("spec_computer")
            .select("id, operating_system, merk, processor, ram, jenis_storage, besar_storage, grafis_card")
            .eq("asset_id", assetId)
            .maybeSingle(),
          supabase
            .from("asset_shift_users")
            .select("shift_id, nama_manual")
            .eq("asset_id", assetId),
        ]);

      const results = [
        conditionsResult,
        statusesResult,
        shiftsResult,
        specResult,
        shiftUsersResult,
      ];
      const failedResult = results.find((result) => result.error);

      if (failedResult?.error) {
        if (active) {
          setErrorMessage(`Gagal memuat data edit: ${failedResult.error.message}`);
          setLoading(false);
        }
        return;
      }

      if (!active) return;

      setConditions(
        (conditionsResult.data ?? []).map((item) => ({
          id: String(item.id),
          name: item.name,
        }))
      );
      setStatuses(
        (statusesResult.data ?? []).map((item) => ({
          id: String(item.id),
          name: item.name,
        }))
      );
      setShifts(
        (shiftsResult.data ?? []).map((item) => ({
          id: String(item.id),
          name: item.shift_name,
        }))
      );

      if (specResult.data) {
        setSpecificationId(specResult.data.id);
        const loadedSpecification: Specification = {
          operating_system: specResult.data.operating_system ?? "",
          merk: specResult.data.merk ?? "",
          processor: specResult.data.processor ?? "",
          ram: specResult.data.ram ?? "",
          jenis_storage: specResult.data.jenis_storage ?? "",
          besar_storage: specResult.data.besar_storage ?? "",
          grafis_card: specResult.data.grafis_card ?? "",
        };
        setSpecification(loadedSpecification);
        if (
          loadedSpecification.operating_system === "NA" &&
          loadedSpecification.merk === "NA" &&
          loadedSpecification.processor === "NA" &&
          loadedSpecification.ram === "NA" &&
          loadedSpecification.jenis_storage === "NA" &&
          loadedSpecification.besar_storage === "NA" &&
          loadedSpecification.grafis_card === "NA" &&
          conditionId === "3" &&
          statusId === "2"
        ) {
          setSkipSpecification(true);
        }
      }

      if (specResult.data?.id) {
        const { data: softwareRows, error: softwareError } = await supabase
          .from("asset_software")
          .select("name")
          .eq("spec_computer_id", specResult.data.id)
          .order("id");

        if (softwareError) {
          if (!active) return;
          setErrorMessage(`Gagal memuat daftar software: ${softwareError.message}`);
          setLoading(false);
          return;
        }
        if (!active) return;
        setSoftwares(softwareRows?.length ? softwareRows : [{ name: "" }]);
      }

      setShiftUsers(
        (shiftUsersResult.data ?? []).map((item) => ({
          shift_id: String(item.shift_id),
          nama_manual: item.nama_manual ?? "",
        }))
      );
      setReady(true);
      setLoading(false);
    };

    void loadFormData().catch((loadError: unknown) => {
      if (!active) return;
      const message =
        loadError instanceof Error ? loadError.message : "Terjadi kesalahan saat memuat data.";
      setErrorMessage(`Gagal memuat data edit: ${message}`);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [assetId, conditionId, statusId]);

  const updateSpecification = (field: keyof Specification, value: string) => {
    setSpecification((current) => ({ ...current, [field]: value }));
  };

  const updateSoftware = (index: number, value: string) => {
    setSoftwares((current) =>
      current.map((software, softwareIndex) =>
        softwareIndex === index ? { name: value } : software
      )
    );
  };

  const updateShiftUser = (index: number, field: keyof ShiftUser, value: string) => {
    setShiftUsers((current) =>
      current.map((user, userIndex) =>
        userIndex === index ? { ...user, [field]: value } : user
      )
    );
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !selectedCondition || !selectedStatus) {
      setErrorMessage("Nama aset, kondisi, dan status wajib diisi.");
      return;
    }

    if (
      isComputer &&
      !skipSpecification &&
      COMPUTER_FIELDS.some((field) => !specification[field].trim())
    ) {
      setErrorMessage("Semua spesifikasi komputer wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      let updatedPhotoUrl = photoUrl;
      if (photo) {
        const safeFileName = photo.name.replace(/[^\w.-]+/g, "_");
        const filePath = `${Date.now()}_${safeFileName}`;
        const { error: uploadError } = await supabase.storage
          .from("asset_photo")
          .upload(filePath, photo);
        if (uploadError) throw new Error(uploadError.message);

        updatedPhotoUrl = supabase.storage.from("asset_photo").getPublicUrl(filePath).data.publicUrl;
      }

      const assetUpdate: {
        asset_name: string;
        kondisi_aset: number;
        asset_status: number;
        photo_url?: string;
      } = {
        asset_name: name.trim(),
        kondisi_aset: Number(selectedCondition),
        asset_status: Number(selectedStatus),
      };
      if (photo && updatedPhotoUrl) assetUpdate.photo_url = updatedPhotoUrl;

      const { error: assetError } = await supabase
        .from("asset")
        .update(assetUpdate)
        .eq("id", assetId)
        .select("id")
        .single();
      if (assetError) throw new Error(assetError.message);

      if (isComputer) {
        const specificationToSave = skipSpecification
          ? {
              operating_system: "NA",
              merk: "NA",
              processor: "NA",
              ram: "NA",
              jenis_storage: "NA",
              besar_storage: "NA",
              grafis_card: "NA",
            }
          : specification;

        let currentSpecificationId = specificationId;
        const specificationValues = {
          asset_id: assetId,
          ...specificationToSave,
        };

        if (currentSpecificationId !== null) {
          const { error: updateError } = await supabase
            .from("spec_computer")
            .update(specificationValues)
            .eq("id", currentSpecificationId)
            .select("id")
            .single();
          if (updateError) throw new Error(updateError.message);
        } else {
          const { data: insertedSpecification, error: insertError } = await supabase
            .from("spec_computer")
            .insert(specificationValues)
            .select("id")
            .single();
          if (insertError || !insertedSpecification) {
            throw new Error(insertError?.message ?? "Gagal menyimpan spesifikasi komputer.");
          }
          currentSpecificationId = insertedSpecification.id;
          setSpecificationId(currentSpecificationId);
        }

        const { error: deleteSoftwareError } = await supabase
          .from("asset_software")
          .delete()
          .eq("spec_computer_id", currentSpecificationId);
        if (deleteSoftwareError) throw new Error(deleteSoftwareError.message);

        const softwareRows = skipSpecification
          ? []
          : softwares
              .filter((software) => software.name.trim())
              .map((software) => ({
                spec_computer_id: currentSpecificationId,
                name: software.name.trim(),
              }));
        if (softwareRows.length > 0) {
          const { error: insertSoftwareError } = await supabase
            .from("asset_software")
            .insert(softwareRows);
          if (insertSoftwareError) throw new Error(insertSoftwareError.message);
        }
      }

      const { error: deleteShiftUsersError } = await supabase
        .from("asset_shift_users")
        .delete()
        .eq("asset_id", assetId);
      if (deleteShiftUsersError) throw new Error(deleteShiftUsersError.message);

      const shiftRows = shiftUsers
        .filter((user) => user.shift_id && user.nama_manual.trim())
        .map((user) => ({
          asset_id: assetId,
          shift_id: Number(user.shift_id),
          nama_manual: user.nama_manual.trim(),
          employee_id: null,
        }));
      if (shiftRows.length > 0) {
        const { error: insertShiftUsersError } = await supabase
          .from("asset_shift_users")
          .insert(shiftRows);
        if (insertShiftUsersError) throw new Error(insertShiftUsersError.message);
      }

      onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan perubahan."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-asset-title"
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <h2 id="edit-asset-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Edit Aset
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{assetCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup form edit"
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300">Memuat data aset...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 p-6">
            {errorMessage && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                {errorMessage}
              </div>
            )}
            <section>
              <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Identitas read-only</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Kode aset", assetCode],
                  ["Jenis perangkat", assetTypeName],
                  ["Pemilik", employeeName],
                  ["Gedung", buildingName],
                  ["Ruangan", roomName],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="edit-asset-name" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nama aset <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-asset-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="edit-asset-condition" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Kondisi aset <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-asset-condition"
                  value={selectedCondition}
                  onChange={(event) => {
                    setSelectedCondition(event.target.value);
                    if (event.target.value !== "3" || selectedStatus !== "2") setSkipSpecification(false);
                  }}
                  required
                  className={inputClass}
                >
                  <option value="">Pilih kondisi</option>
                  {conditions.map((condition) => (
                    <option key={condition.id} value={condition.id}>{condition.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-asset-status" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Status aset <span className="text-red-500">*</span>
                </label>
                <select
                  id="edit-asset-status"
                  value={selectedStatus}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value);
                    if (selectedCondition !== "3" || event.target.value !== "2") setSkipSpecification(false);
                  }}
                  required
                  className={inputClass}
                >
                  <option value="">Pilih status</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">Foto aset</h3>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={`Foto ${assetName}`} className="mb-3 max-h-56 rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
              ) : (
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Belum ada foto.</p>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-blue-700 dark:file:bg-slate-700 dark:file:text-slate-100`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Kosongkan jika foto tidak ingin diubah.</p>
            </section>

            {isComputer && (
              <>
                <section className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Spesifikasi komputer</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Semua spesifikasi wajib diisi untuk Laptop/Personal Computer.</p>
                  </div>

                  {canSkipSpecification && (
                    <div className={`rounded-xl border p-4 ${skipSpecification ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"}`}>
                      <p className={`text-sm ${skipSpecification ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}>
                        {skipSpecification
                          ? "Spesifikasi dilewati — semua field akan diisi NA"
                          : "Jika perangkat tidak bisa menyala sama sekali dan spesifikasi tidak dapat dicek, klik tombol di bawah untuk melewati pengisian spesifikasi."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSkipSpecification((current) => !current)}
                        className={`mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${skipSpecification ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}`}
                      >
                        {skipSpecification ? "Batalkan" : "Lewati Spesifikasi"}
                      </button>
                    </div>
                  )}

                  {!skipSpecification && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {COMPUTER_FIELDS.map((field) => (
                        <div key={field}>
                          <label htmlFor={`edit-${field}`} className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                            {computerFieldMeta[field].label} <span className="text-red-500">*</span>
                          </label>
                          <input
                            id={`edit-${field}`}
                            value={specification[field]}
                            onChange={(event) => updateSpecification(field, event.target.value)}
                            placeholder={computerFieldMeta[field].placeholder}
                            required
                            className={inputClass}
                          />
                          {computerFieldMeta[field].hint && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{computerFieldMeta[field].hint}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {!skipSpecification && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Daftar software</h3>
                      <button
                        type="button"
                        onClick={() => setSoftwares((current) => [...current, { name: "" }])}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-slate-800"
                      >
                        + Tambah software
                      </button>
                    </div>
                    <div className="space-y-2">
                      {softwares.map((software, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            aria-label={`Software ${index + 1}`}
                            value={software.name}
                            onChange={(event) => updateSoftware(index, event.target.value)}
                            placeholder="Nama software"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={() => setSoftwares((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            aria-label={`Hapus software ${index + 1}`}
                            className="rounded-xl border border-red-200 px-3 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Hapus
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Pengguna shift</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Nama pengguna disimpan manual per shift.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShiftUsers((current) => [...current, { shift_id: "", nama_manual: "" }])}
                  className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-slate-800"
                >
                  + Tambah pengguna
                </button>
              </div>
              {shiftUsers.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Belum ada pengguna shift.</p>
              )}
              <div className="space-y-2">
                {shiftUsers.map((user, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <select
                      aria-label={`Shift pengguna ${index + 1}`}
                      value={user.shift_id}
                      onChange={(event) => updateShiftUser(index, "shift_id", event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Pilih shift</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>{shift.name}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`Nama pengguna shift ${index + 1}`}
                      value={user.nama_manual}
                      onChange={(event) => updateShiftUser(index, "nama_manual", event.target.value)}
                      placeholder="Nama pengguna"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShiftUsers((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || loading || !ready}
                className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
