"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";

const formSchema = z.object({
  nama_pegawai: z.string().min(1, "Nama pegawai wajib diisi"),
  employee_type_id: z.string().min(1, "Tipe karyawan wajib dipilih"),
  employee_number: z.string().optional(),
  instansi: z.string().optional(),
  nomor_ktp: z.string().optional(),
  building_id: z.string().min(1, "Gedung wajib dipilih"),
  position: z.string().min(1, "Position wajib dipilih"),
  lokasi: z.string().min(1, "Lokasi wajib dipilih"),
});

type FormValues = z.infer<typeof formSchema>;

type Asset = {
  device_id: string;
  asset_code?: string; // untuk preview di review
  asset_name: string;
  condition_id: string;
  status_id: string;
  photo: File;
  computer_name?: string;
  operating_system?: string;
  merk?: string;
  processor?: string;
  ram?: string;
  jenis_storage?: string;
  besar_storage?: string;
  grafis_card?: string;
  softwares?: { name: string }[];
};

type SelectOption = { id: string; label: string };

type Notification = {
  type: "success" | "error";
  message: string;
};

const isComputerDevice = (deviceName: string | undefined) => {
  if (!deviceName) return false;
  const normalized = deviceName.toLowerCase();
  return ['laptop', 'personal computer'].some(keyword => normalized.includes(keyword));
};

export default function FormPage() {
  const [step, setStep] = useState(1);
  const [buildings, setBuildings] = useState<SelectOption[]>([]);
  const [positions, setPositions] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [devices, setDevices] = useState<SelectOption[]>([]);
  const [conditions, setConditions] = useState<SelectOption[]>([]);
  const [statuses, setStatuses] = useState<SelectOption[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<SelectOption[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});
  const [currentSoftwares, setCurrentSoftwares] = useState([{ name: "" }]);
  const [currentAssetCode, setCurrentAssetCode] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Prevent duplicate fetches
  const hasFetchedRef = useRef(false);

  useEffect(() => {
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

  const isDark = theme === "dark";
  const pageStyle = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const cardStyle = isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white";
  const fieldStyle = isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-slate-50 text-slate-900";
  const selectStyle = isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-slate-50 text-slate-900";
  const panelStyle = isDark ? "border-slate-800 bg-slate-900 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-700";

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: {
      nama_pegawai: "",
      employee_type_id: "",
      employee_number: "",
      instansi: "",
      nomor_ktp: "",
      building_id: "",
      position: "",
      lokasi: "",
    },
  });

  /* eslint-disable react-hooks/incompatible-library */
  const selectedBuildingId = watch("building_id");
  const selectedRoomId = watch("lokasi");
  const selectedEmployeeTypeId = watch("employee_type_id");
  /* eslint-enable react-hooks/incompatible-library */
  const selectedEmployeeTypeLabel = employeeTypes.find((type) => type.id === selectedEmployeeTypeId)?.label ?? "";
  const isKaryawan = selectedEmployeeTypeLabel === "Karyawan";
  const isNonKaryawan = selectedEmployeeTypeLabel === "Non-Karyawan";
  const isComputerCurrent = useMemo(
    () => isComputerDevice(devices.find((d) => d.id === currentAsset.device_id)?.label),
    [devices, currentAsset.device_id]
  );

  const updateCurrentAsset = <K extends keyof Asset>(field: K, value: Asset[K] | undefined) => {
    setCurrentAsset((prev) => ({ ...prev, [field]: value }));
  };

  const appendSoftware = () => {
    setCurrentSoftwares((prev) => [...prev, { name: "" }]);
  };

  const removeSoftware = (index: number) => {
    setCurrentSoftwares((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSoftware = (index: number, name: string) => {
    setCurrentSoftwares((prev) => prev.map((s, i) => (i === index ? { name } : s)));
  };

  const addAssetToList = () => {
    if (
      !currentAsset.device_id ||
      !currentAsset.asset_name ||
      !currentAsset.condition_id ||
      !currentAsset.status_id ||
      !currentAsset.photo
    ) {
      setNotification({ type: "error", message: "Semua field asset wajib diisi." });
      return;
    }

    if (isComputerCurrent) {
      if (
        !currentAsset.computer_name ||
        !currentAsset.operating_system ||
        !currentAsset.merk ||
        !currentAsset.processor ||
        !currentAsset.ram ||
        !currentAsset.jenis_storage ||
        !currentAsset.besar_storage ||
        !currentAsset.grafis_card
      ) {
        setNotification({ type: "error", message: "Spesifikasi komputer wajib diisi." });
        return;
      }
    }

    const newAsset: Asset = {
      device_id: currentAsset.device_id,
      asset_code: currentAssetCode, // untuk preview di review
      asset_name: currentAsset.asset_name,
      condition_id: currentAsset.condition_id,
      status_id: currentAsset.status_id,
      photo: currentAsset.photo as File,
      computer_name: currentAsset.computer_name,
      operating_system: currentAsset.operating_system,
      merk: currentAsset.merk,
      processor: currentAsset.processor,
      ram: currentAsset.ram,
      jenis_storage: currentAsset.jenis_storage,
      besar_storage: currentAsset.besar_storage,
      grafis_card: currentAsset.grafis_card,
      softwares: currentSoftwares.filter((s) => s.name.trim()),
    };

    setAssets((prev) => [...prev, newAsset]);
    setCurrentAsset({});
    setCurrentSoftwares([{ name: "" }]);
    setCurrentAssetCode("");
    setNotification(null);
  };

  const removeAsset = (index: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!selectedBuildingId) {
      setLocations([]);
      setValue("lokasi", "");
      return;
    }

    const loadRooms = async () => {
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from("room_locations")
          .select("id, room_name")
          .eq("building_id", parseInt(selectedBuildingId, 10));

        if (error) {
          setFetchError(error.message);
          setLocations([]);
          return;
        }

        setLocations((data ?? []).map((row) => ({ id: String(row.id), label: row.room_name })));
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Gagal memuat ruangan");
        setLocations([]);
      }
    };

    loadRooms();
  }, [selectedBuildingId, setValue]);

  useEffect(() => {
    // Prevent duplicate fetches
    if (hasFetchedRef.current) {
      console.log("🚫 Skipping duplicate fetch");
      return;
    }

    const loadOptions = async () => {
      console.log("🔄 Starting to load dropdown options...");
      hasFetchedRef.current = true; // Mark as fetched
      setFetchError(null);

      try {
        const [buildingRes, posRes, devRes, condRes, statusRes, employeeTypesRes] = await Promise.all([
          supabase.from("building_locations").select("id, building_name"),
          supabase.from("organizational_structure").select("id, jabatan"),
          supabase.from("device").select("id, name"),
          supabase.from("asset_condition").select("id, name"),
          supabase.from("asset_status").select("id, name"),
          supabase.from("employee_types").select("id, type_name"),
        ]);

        console.log("📊 Query results:");
        console.log("Positions:", posRes);
        console.log("Buildings:", buildingRes);
        console.log("Devices:", devRes);
        console.log("Conditions:", condRes);
        console.log("Statuses:", statusRes);
        console.log("Employee types:", employeeTypesRes);

        const problem = [buildingRes, posRes, devRes, condRes, statusRes, employeeTypesRes].find((result) => result.error);
        if (problem?.error) {
          console.error("❌ Error fetching data:", problem.error);
          setFetchError(problem.error.message);
          hasFetchedRef.current = false; // Allow retry on error
          return;
        }

        const buildingData = (buildingRes.data ?? []).map((row) => ({ id: String(row.id), label: row.building_name }));
        const positionsData = (posRes.data ?? []).map((row) => ({ id: String(row.id), label: row.jabatan }));
        const devicesData = (devRes.data ?? []).map((row) => ({ id: String(row.id), label: row.name }));
        const conditionsData = (condRes.data ?? []).map((row) => ({ id: String(row.id), label: row.name }));
        const statusesData = (statusRes.data ?? []).map((row) => ({ id: String(row.id), label: row.name }));
        const employeeTypesData = (employeeTypesRes.data ?? []).map((row) => ({ id: String(row.id), label: row.type_name }));

        console.log("✅ Mapped data:");
        console.log("Employee types mapped:", employeeTypesData);
        console.log("Buildings mapped:", buildingData);
        console.log("Positions mapped:", positionsData);
        console.log("Devices mapped:", devicesData);
        console.log("Conditions mapped:", conditionsData);
        console.log("Statuses mapped:", statusesData);

        setBuildings(buildingData);
        setPositions(positionsData);
        setDevices(devicesData);
        setConditions(conditionsData);
        setStatuses(statusesData);
        setEmployeeTypes(employeeTypesData);

        console.log("🎉 All dropdown options loaded successfully!");
      } catch (err) {
        console.error("💥 Unexpected error during data loading:", err);
        setFetchError(err instanceof Error ? err.message : "Unexpected error occurred");
        hasFetchedRef.current = false; // Allow retry on error
      }
    };

    loadOptions();
  }, []);

  useEffect(() => {
    const loadEmployeeTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("employee_types")
          .select("id, type_name");

        if (error) {
          console.error("❌ Error fetching employee_types:", error);
          setFetchError(error.message);
          return;
        }

        setEmployeeTypes((data ?? []).map((row) => ({ id: String(row.id), label: row.type_name })));
      } catch (err) {
        console.error("💥 Unexpected error fetching employee_types:", err);
        setFetchError(err instanceof Error ? err.message : "Unexpected error occurred");
      }
    };

    loadEmployeeTypes();
  }, []);

  useEffect(() => {
    if (!currentAsset.device_id || !selectedRoomId) {
      setCurrentAssetCode("");
      return;
    }

    const generateCode = async () => {
      setIsGeneratingCode(true);
      try {
        const { data, error } = await supabase.rpc("generate_asset_code", {
          p_room_id: parseInt(selectedRoomId, 10),
          p_device_id: currentAsset.device_id,
        });

        if (error) {
          setNotification({ type: "error", message: error.message });
          setCurrentAssetCode("");
          return;
        }

        setCurrentAssetCode(typeof data === "string" ? data : String(data ?? ""));
      } catch (err) {
        setNotification({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal membuat asset code.",
        });
        setCurrentAssetCode("");
      } finally {
        setIsGeneratingCode(false);
      }
    };

    generateCode();
  }, [currentAsset.device_id, selectedRoomId]);

  const nextStep = async () => {
    const currentFields: Array<keyof FormValues> = ["nama_pegawai", "employee_type_id", "position", "building_id", "lokasi"];
    if (isKaryawan) currentFields.push("employee_number");
    if (isNonKaryawan) currentFields.push("instansi", "nomor_ktp");

    const valid = await trigger(currentFields);
    if (!valid) return;

    if (isKaryawan && !getValues("employee_number")?.trim()) {
      setError("employee_number", { type: "manual", message: "ID Karyawan wajib diisi" });
      return;
    }

    if (isNonKaryawan) {
      const instansi = getValues("instansi")?.trim();
      const nomorKtp = getValues("nomor_ktp")?.trim();
      if (!instansi && !nomorKtp) {
        setError("instansi", { type: "manual", message: "Isi instansi atau nomor KTP" });
        setError("nomor_ktp", { type: "manual", message: "Isi instansi atau nomor KTP" });
        return;
      }
    }

    setStep((current) => current + 1);
  };

  const assetStepCount = 3;

  const onSubmit = async (values: FormValues) => {
    if (assets.length === 0) {
      setNotification({ type: "error", message: "Minimal satu asset harus ditambahkan." });
      return;
    }

    setNotification(null);
    setLoading(true);

    try {
      const selectedType = employeeTypes.find((type) => type.id === values.employee_type_id)?.label;
      if (!selectedType) {
        setError("employee_type_id", { type: "manual", message: "Tipe karyawan tidak valid" });
        setLoading(false);
        return;
      }

      if (selectedType === "Karyawan" && !values.employee_number?.trim()) {
        setError("employee_number", { type: "manual", message: "ID Karyawan wajib diisi" });
        setLoading(false);
        return;
      }

      if (selectedType === "Non-Karyawan") {
        const instansi = values.instansi?.trim();
        const nomorKtp = values.nomor_ktp?.trim();
        if (!instansi && !nomorKtp) {
          setError("instansi", { type: "manual", message: "Isi instansi atau nomor KTP" });
          setError("nomor_ktp", { type: "manual", message: "Isi instansi atau nomor KTP" });
          setLoading(false);
          return;
        }
      }

      const employeeInsert = await supabase
        .from("employees")
        .insert([
          {
            nama_pegawai: values.nama_pegawai,
            employee_type_id: parseInt(values.employee_type_id, 10),
            position: parseInt(values.position, 10),
            building_id: parseInt(values.building_id, 10),
            lokasi: parseInt(values.lokasi, 10),
          },
        ])
        .select("id")
        .single();

      if (employeeInsert.error || !employeeInsert.data?.id) {
        throw new Error(employeeInsert.error?.message ?? "Gagal menyimpan data pegawai");
      }

      const employee_id = employeeInsert.data.id;

      const employeeDetailRow: Record<string, unknown> = {
        employee_id,
      };

      if (selectedType === "Karyawan") {
        employeeDetailRow.employee_number = values.employee_number;
      } else {
        employeeDetailRow.instansi = values.instansi;
        employeeDetailRow.nomor_ktp = values.nomor_ktp;
      }

      const detailsInsert = await supabase.from("employee_details").insert([employeeDetailRow]);
      if (detailsInsert.error) {
        throw new Error(detailsInsert.error.message);
      }

      for (const asset of assets) {
        const fileName = `${Date.now()}_${asset.photo.name.replace(/\s+/g, "_")}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage.from("asset_photo").upload(filePath, asset.photo);
        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const publicUrlResponse = supabase.storage.from("asset_photo").getPublicUrl(filePath);
        const photo_url = publicUrlResponse.data.publicUrl;

        // Panggil RPC insert_asset_with_code
        const { data: asset_id, error: rpcError } = await supabase.rpc("insert_asset_with_code", {
          p_employee_id: employee_id,
          p_device_id: asset.device_id,
          p_room_id: parseInt(values.lokasi, 10),
          p_asset_name: asset.asset_name,
          p_kondisi_aset: parseInt(asset.condition_id, 10),
          p_asset_status: parseInt(asset.status_id, 10),
          p_photo_url: photo_url,
        });

        if (rpcError || !asset_id) {
          throw new Error(rpcError?.message ?? "Gagal menyimpan data asset");
        }

        let specComputerId: number | null = null;

        if (isComputerDevice(devices.find(d => d.id === asset.device_id)?.label)) {
          const specInsert = await supabase
            .from("spec_computer")
            .insert([
              {
                asset_id,
                computer_name: asset.computer_name,
                operating_system: asset.operating_system,
                merk: asset.merk,
                processor: asset.processor,
                ram: asset.ram,
                jenis_storage: asset.jenis_storage,
                besar_storage: asset.besar_storage,
                grafis_card: asset.grafis_card,
              },
            ])
            .select("id")
            .single();

          if (specInsert.error || !specInsert.data?.id) {
            throw new Error(specInsert.error?.message ?? "Gagal menyimpan spesifikasi komputer");
          }

          specComputerId = specInsert.data.id;
        }

        if (specComputerId !== null && asset.softwares?.length) {
          const softwareRows = asset.softwares
            .filter((item) => item.name.trim())
            .map((item) => ({
              spec_computer_id: specComputerId,
              name: item.name,
            }));

          if (softwareRows.length) {
            const softwareInsert = await supabase.from("asset_software").insert(softwareRows);
            if (softwareInsert.error) {
              throw new Error(softwareInsert.error.message);
            }
          }
        }
      }

      setNotification({ type: "success", message: "Semua asset berhasil ditambahkan." });
      setStep(1);
      setAssets([]);
      setCurrentAsset({});
      setCurrentSoftwares([{ name: "" }]);
      setCurrentAssetCode("");
      reset();
    } catch (error) {
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Terjadi kesalahan saat submit.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen p-6 ${pageStyle}`}>
      <div className={`mx-auto w-full max-w-4xl rounded-3xl border ${cardStyle} p-8 shadow-sm`}>
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Tambah Asset Baru</h1>
            <p className={`mt-2 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Isi data asset langkah demi langkah.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                : "bg-slate-100 text-slate-900 hover:bg-slate-200"
            }`}
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </header>

        {fetchError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            Gagal memuat data dropdown: {fetchError}
          </div>
        ) : null}

        {notification ? (
          <div
            className={`mb-6 rounded-2xl p-4 text-sm font-medium ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {notification.message}
          </div>
        ) : null}

        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
            <span className="font-semibold">Progress</span>
            <span>{step} / {assetStepCount}</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((tab) => (
              <div
                key={tab}
                className={`flex-1 rounded-full border px-3 py-2 text-center text-xs font-semibold ${
                  step === tab ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {tab === 1 && "Pegawai"}
                {tab === 2 && "Tambah Asset"}
                {tab === 3 && "Review & Submit"}
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${(step / assetStepCount) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {step === 1 && (
            <section className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Nama Pegawai</label>
                <input
                  {...register("nama_pegawai")}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                  type="text"
                />
                {errors.nama_pegawai ? (
                  <p className="mt-2 text-sm text-rose-600">{errors.nama_pegawai.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Tipe Karyawan</label>
                <select
                  {...register("employee_type_id")}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                >
                  <option value="">Pilih tipe karyawan</option>
                  {employeeTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.employee_type_id ? (
                  <p className="mt-2 text-sm text-rose-600">{errors.employee_type_id.message}</p>
                ) : null}
              </div>

              {isKaryawan && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">ID Karyawan</label>
                  <input
                    {...register("employee_number")}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                    type="text"
                  />
                  {errors.employee_number ? (
                    <p className="mt-2 text-sm text-rose-600">{errors.employee_number.message}</p>
                  ) : null}
                </div>
              )}

              {isNonKaryawan && (
                <>
                  <div className="mb-2 text-sm text-slate-500">Isi salah satu dari kolom berikut untuk Non-Karyawan.</div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Instansi</label>
                    <input
                      {...register("instansi")}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                      type="text"
                    />
                    {errors.instansi ? (
                      <p className="mt-2 text-sm text-rose-600">{errors.instansi.message}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Nomor KTP</label>
                    <input
                      {...register("nomor_ktp")}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                      type="text"
                    />
                    {errors.nomor_ktp ? (
                      <p className="mt-2 text-sm text-rose-600">{errors.nomor_ktp.message}</p>
                    ) : null}
                  </div>
                </>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Position</label>
                  <select
                    {...register("position")}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                  >
                    <option value="">Pilih posisi</option>
                    {positions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.label}
                      </option>
                    ))}
                  </select>
                  {errors.position ? (
                    <p className="mt-2 text-sm text-rose-600">{errors.position.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Gedung</label>
                  <select
                    {...register("building_id")}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                  >
                    <option value="">Pilih gedung</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.label}
                      </option>
                    ))}
                  </select>
                  {errors.building_id ? (
                    <p className="mt-2 text-sm text-rose-600">{errors.building_id.message}</p>
                  ) : null}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Lokasi</label>
                  <select
                    {...register("lokasi")}
                    disabled={!selectedBuildingId}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle} ${!selectedBuildingId ? "bg-slate-100 text-slate-500" : ""}`}
                  >
                    <option value="">{selectedBuildingId ? "Pilih lokasi" : "Pilih gedung dahulu"}</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.label}
                      </option>
                    ))}
                  </select>
                  {errors.lokasi ? (
                    <p className="mt-2 text-sm text-rose-600">{errors.lokasi.message}</p>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Tambah Asset</h2>
                <button
                  type="button"
                  onClick={addAssetToList}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                >
                  Tambah ke Daftar
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Pilih Device</label>
                <select
                  value={currentAsset.device_id || ""}
                  onChange={(e) => updateCurrentAsset("device_id", e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                >
                  <option value="">Pilih device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`rounded-3xl border p-4 ${panelStyle}`}>
                <p className="text-sm font-medium">Preview Asset Code</p>
                <p className={`mt-2 text-lg font-semibold ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                  {isGeneratingCode
                    ? "Membuat asset code..."
                    : currentAssetCode
                    ? currentAssetCode
                    : "Pilih device terlebih dahulu"}
                </p>
                {currentAssetCode && (
                  <p className="mt-1 text-xs text-slate-500">Kode final ditentukan saat submit</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Perangkat & Model</label>
                <span className="block pb-2 text-sm text-slate-400"> Contoh: Lenovo ThinkPad </span>
                <input
                  value={currentAsset.asset_name || ""}
                  onChange={(e) => updateCurrentAsset("asset_name", e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                  type="text"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Kondisi Aset</label>
                  <select
                    value={currentAsset.condition_id || ""}
                    onChange={(e) => updateCurrentAsset("condition_id", e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                  >
                    <option value="">Pilih kondisi</option>
                    {conditions.map((condition) => (
                      <option key={condition.id} value={condition.id}>
                        {condition.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status Aset</label>
                  <select
                    value={currentAsset.status_id || ""}
                    onChange={(e) => updateCurrentAsset("status_id", e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                  >
                    <option value="">Pilih status</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Upload Foto Asset</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => updateCurrentAsset("photo", e.target.files?.[0] ?? undefined)}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                />
              </div>

              {isComputerCurrent && (
                <>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {([
                      { name: "computer_name", label: "Computer Name" },
                      { name: "operating_system", label: "Operating System" },
                      { name: "merk", label: "Merk" },
                      { name: "processor", label: "Processor" },
                      { name: "ram", label: "RAM" },
                      { name: "jenis_storage", label: "Jenis Storage" },
                      { name: "besar_storage", label: "Besar Storage" },
                      { name: "grafis_card", label: "Grafis Card" },
                    ] as Array<{ name: keyof Asset; label: string }> ).map((field) => (
                      <div key={field.name}>
                        <label className="mb-2 block text-sm font-medium text-slate-700">{field.label}</label>
                        <input
                          value={(currentAsset[field.name] as string) || ""}
                          onChange={(e) => updateCurrentAsset(field.name, e.target.value)}
                          className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                          type="text"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-semibold text-slate-800">Daftar Software</h3>
                      <button
                        type="button"
                        onClick={appendSoftware}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        + Tambah Software
                      </button>
                    </div>

                    {currentSoftwares.map((software, index) => (
                      <div key={index} className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Nama Software {index + 1}</label>
                          <input
                            value={software.name}
                            onChange={(e) => updateSoftware(index, e.target.value)}
                            className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                            type="text"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSoftware(index)}
                          className="h-fit rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="border-t pt-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-800">Daftar Asset yang Ditambahkan</h3>
                {assets.length === 0 ? (
                  <p className="text-slate-500">Belum ada asset yang ditambahkan.</p>
                ) : (
                  <div className="space-y-4">
                    {assets.map((asset, index) => (
                      <div key={index} className={`rounded-2xl border p-4 ${panelStyle}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{asset.asset_code}</p>
                            <p className="text-sm text-slate-600">{asset.asset_name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAsset(index)}
                            className="rounded-2xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentAsset({})}
                  className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  + Tambah Asset Lagi
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800">Review & Submit</h2>

              <div className={`rounded-3xl border p-6 ${panelStyle}`}>
                <h3 className="mb-4 font-semibold">Data Pegawai</h3>
                <div className="space-y-2">
                  <p><strong>Nama:</strong> {getValues("nama_pegawai")}</p>
                  <p><strong>Tipe:</strong> {selectedEmployeeTypeLabel || "-"}</p>
                  {isKaryawan && <p><strong>ID Karyawan:</strong> {getValues("employee_number")}</p>}
                  {isNonKaryawan && (
                    <>
                      <p><strong>Instansi:</strong> {getValues("instansi")}</p>
                      <p><strong>Nomor KTP:</strong> {getValues("nomor_ktp")}</p>
                    </>
                  )}
                  <p><strong>Position:</strong> {positions.find(p => p.id === getValues("position"))?.label}</p>
                  <p><strong>Gedung:</strong> {buildings.find(b => b.id === getValues("building_id"))?.label}</p>
                  <p><strong>Lokasi:</strong> {locations.find(l => l.id === getValues("lokasi"))?.label}</p>
                </div>
              </div>

              <div className={`rounded-3xl border p-6 ${panelStyle}`}>
                <h3 className="mb-4 font-semibold">Daftar Asset ({assets.length})</h3>
                <div className="space-y-4">
                  {assets.map((asset, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <div className="space-y-2">
                        <p><strong>Asset Code:</strong> {asset.asset_code} (estimasi)</p>
                        <p><strong>Asset Name:</strong> {asset.asset_name}</p>
                        <p><strong>Device:</strong> {devices.find(d => d.id === asset.device_id)?.label}</p>
                        <p><strong>Kondisi:</strong> {conditions.find(c => c.id === asset.condition_id)?.label}</p>
                        <p><strong>Status:</strong> {statuses.find(s => s.id === asset.status_id)?.label}</p>
                        {isComputerDevice(devices.find(d => d.id === asset.device_id)?.label) && (
                          <div className="mt-2 pl-4 border-l-2 border-slate-300">
                            <p>
                              <strong>Computer Name:
                              </strong> 
                              
                              {asset.computer_name}
                            </p>
                            
                            <p><strong>OS:</strong> {asset.operating_system}</p>
                            <p><strong>Merk:</strong> {asset.merk}</p>
                            <p><strong>Processor:</strong> {asset.processor}</p>
                            <p><strong>RAM:</strong> {asset.ram}</p>
                            <p><strong>Storage:</strong> {asset.jenis_storage} - {asset.besar_storage}</p>
                            <p><strong>Grafis:</strong> {asset.grafis_card}</p>
                            {asset.softwares && asset.softwares.length > 0 && (
                              <p><strong>Softwares:</strong> {asset.softwares.map(s => s.name).join(", ")}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((current) => Math.max(current - 1, 1))}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kembali
              </button>
              {step === 1 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Selanjutnya
                </button>
              )}
              {step === 2 && assets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Lanjut ke Review
                </button>
              )}
            </div>

            {step === assetStepCount && (
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Menyimpan..." : "Submit"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
