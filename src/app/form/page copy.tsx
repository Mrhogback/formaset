"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabaseClient";
import { formatErrorDetails } from "@/lib/errorUtils";
import { saveAssetSubmission } from "@/lib/assetCodeStore";
import { COMPUTER_FIELDS, computerFieldMeta, isComputerDevice } from "@/app/form/formConstants";

// --- Constants & Helpers ---
const ASSET_STEP_COUNT = 4;
const THEME_KEY = "theme";
const DEFAULT_SOFTWARE = [{ name: "" }];
const ASSET_NAME_PLACEHOLDER = "contoh: DESKTOP-ABC123 atau nama custom";
const MERK_PLACEHOLDER_PC = "contoh: Intel NUC 11, Dell OptiPlex 7070";
const MERK_PLACEHOLDER_LAPTOP = "contoh: Dell Latitude 7490, Lenovo IdeaPad 3";

// --- Validation Schema ---
const formSchema = z.object({
  nama_pegawai: z.string().min(1, "Nama pegawai wajib diisi"),
  employee_type_id: z.string().min(1, "Tipe karyawan wajib dipilih"),
  employee_number: z.string().optional(),
  instansi: z.string().optional(),
  nomor_ktp: z.string().optional(),
  building_id: z.string().min(1, "Gedung wajib dipilih"),
  position: z.string().min(1, "Position wajib dipilih"),
  lokasi: z.string().min(1, "Ruangan wajib dipilih"),
});

type FormValues = z.infer<typeof formSchema>;

type Asset = {
  device_id: string;
  asset_code?: string;
  asset_name: string;
  condition_id: string;
  status_id: string;
  photo: File;
  operating_system?: string;
  merk?: string;
  processor?: string;
  ram?: string;
  jenis_storage?: string;
  besar_storage?: string;
  grafis_card?: string;
  softwares?: { name: string }[];
  // ➕ MULTI-SHIFT: field untuk menyimpan data shift users
  shiftUsers?: { shift_id: string; shift_name: string; employee_name: string }[];
};

type ChecklistCategory = "LOW" | "MEDIUM" | "HIGH";

type ChecklistItem = {
  id: number;
  category: ChecklistCategory;
  prefix: "LAPTOP" | "PC" | null;
  item_text: string;
};

type AssetChecklistState = Record<number, boolean>;

type SelectOption = { id: string; label: string };

type Notification = {
  type: "success" | "error";
  message: string;
};

// ➕ MULTI-SHIFT: Type untuk shift selection
type ShiftSelection = {
  shift_id: string;
  shift_name: string;
  employee_name: string;
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
  // Mode: 'input_baru' = pegawai baru, 'pilih_lama' = sudah pernah input / pilih pegawai existing
  const [mode, setMode] = useState<"input_baru" | "pilih_lama">("input_baru");
  const [selectedExistingEmployeeId, setSelectedExistingEmployeeId] = useState<number | null>(null);
  const [selectedExistingEmployee, setSelectedExistingEmployee] = useState<Record<string, any> | null>(null);
  const [existingEmployeeAssets, setExistingEmployeeAssets] = useState<any[]>([]);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [filterBuildingId, setFilterBuildingId] = useState<string>("");
  const [filterRoomId, setFilterRoomId] = useState<string>("");
  const [filterPositionId, setFilterPositionId] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>({});
  const [currentSoftwares, setCurrentSoftwares] = useState(DEFAULT_SOFTWARE);
  const [currentAssetCode, setCurrentAssetCode] = useState("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [assetChecklistStates, setAssetChecklistStates] = useState<AssetChecklistState[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Preview mode: allows jumping to any step to view structure without validation
  const [previewMode, setPreviewMode] = useState(false);

  // ➕ MULTI-SHIFT: state untuk shifts & employees
  const [shifts, setShifts] = useState<SelectOption[]>([]);

  // State untuk daftar employee existing
  const [existingEmployees, setExistingEmployees] = useState<SelectOption[]>([]);
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  // ➕ MULTI-SHIFT: state untuk multi-shift toggle & selections
  const [isMultiShift, setIsMultiShift] = useState(false);
  const [currentShiftSelections, setCurrentShiftSelections] = useState<Record<string, string[]>>({});
  const [skipSpesifikasi, setSkipSpesifikasi] = useState(false);
  
  const router = useRouter();
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const initialTheme = savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setSkipSpesifikasi(false);
  }, [currentAsset.condition_id, currentAsset.status_id]);

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

  const selectedBuildingId = watch("building_id");
  const selectedRoomId = watch("lokasi");
  const selectedEmployeeTypeId = watch("employee_type_id");

  const selectedEmployeeTypeLabel = useMemo(() => {
    if (mode === "pilih_lama" && selectedExistingEmployee?.employee_type_id != null) {
      return employeeTypes.find((type) => type.id === String(selectedExistingEmployee.employee_type_id))?.label ?? "";
    }
    return employeeTypes.find((type) => type.id === selectedEmployeeTypeId)?.label ?? "";
  }, [mode, selectedExistingEmployee, selectedEmployeeTypeId, employeeTypes]);
  const isKaryawan = selectedEmployeeTypeLabel === "Karyawan";
  const isNonKaryawan = selectedEmployeeTypeLabel === "Non-Karyawan";
  
  const currentDeviceLabel = useMemo(
    () => devices.find((d) => d.id === currentAsset.device_id)?.label,
    [devices, currentAsset.device_id]
  );
  const isComputerCurrent = useMemo(
    () => isComputerDevice(currentDeviceLabel),
    [currentDeviceLabel]
  );
  const isLaptopCurrent = useMemo(
    () => currentDeviceLabel?.toLowerCase().includes("laptop") ?? false,
    [currentDeviceLabel]
  );
  const isPCCurrent = useMemo(
    () => {
      if (!currentDeviceLabel) return false;
      const normalized = currentDeviceLabel.toLowerCase();
      return /\b(pc|personal computer|komputer)\b/.test(normalized) && !normalized.includes("laptop");
    },
    [currentDeviceLabel]
  );

  const assetNameLabel = useMemo(() => {
    if (isLaptopCurrent) return "Nama Perangkat";
    if (isPCCurrent) return "Nama Komputer";
    return "Nama Laptop";
  }, [isLaptopCurrent, isPCCurrent]);

  const dynamicFieldMeta = useMemo(() => ({
    ...computerFieldMeta,
    merk: {
      ...computerFieldMeta.merk,
      placeholder: isPCCurrent ? MERK_PLACEHOLDER_PC : MERK_PLACEHOLDER_LAPTOP,
      hint: "Masukkan Merk + System Model perangkat",
    },
  }), [isPCCurrent]);

  const getChecklistItemsForAsset = (asset: Asset) => {
    const deviceLabel = devices.find((device) => device.id === asset.device_id)?.label?.toLowerCase() ?? "";
    return checklistItems.filter((item) => {
      if (item.prefix === "LAPTOP") {
        return deviceLabel.includes("laptop");
      }
      if (item.prefix === "PC") {
        return /\b(pc|personal computer|komputer)\b/.test(deviceLabel) && !deviceLabel.includes("laptop");
      }
      return true;
    });
  };

  const getChecklistGroupsForAsset = (asset: Asset) => {
    const items = getChecklistItemsForAsset(asset);
    return (["LOW", "MEDIUM", "HIGH"] as ChecklistCategory[]).map((category) => ({
      category,
      label:
        category === "LOW"
          ? "🟢  KATEGORI LOW "
          : category === "MEDIUM"
          ? "🟡  KATEGORI MEDIUM"
          : "🔴  KATEGORI HIGH",
      items: items.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  };

  const parseChecklistItem = (item: { id: number; category: string; item_text: string }) => {
    const rawText = item.item_text.trim();
    let prefix: "LAPTOP" | "PC" | null = null;
    let text = rawText;

    if (rawText.toUpperCase().startsWith("[LAPTOP]")) {
      prefix = "LAPTOP";
      text = rawText.replace(/^\[LAPTOP\]\s*/i, "");
    } else if (rawText.toUpperCase().startsWith("[PC]")) {
      prefix = "PC";
      text = rawText.replace(/^\[PC\]\s*/i, "");
    }

    return {
      id: item.id,
      category: item.category.toUpperCase() as ChecklistCategory,
      prefix,
      item_text: text.trim(),
    };
  };

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

  const updateAssetChecklist = (assetIndex: number, itemId: number, checked: boolean) => {
    setAssetChecklistStates((prev) =>
      prev.map((state, index) =>
        index === assetIndex ? { ...state, [itemId]: checked } : state
      )
    );
  };

    // ➕ Tambah slot employee baru (string kosong) ke shift tertentu
  const addShiftEmployee = (shiftId: string) => {
    setCurrentShiftSelections((prev) => ({
      ...prev,
      [shiftId]: [...(prev[shiftId] ?? []), ""],
    }));
  };

    // ➕ Hapus employee berdasarkan index di shift tertentu
  const removeShiftEmployee = (shiftId: string, index: number) => {
    setCurrentShiftSelections((prev) => {
      const updated = (prev[shiftId] ?? []).filter((_, i) => i !== index);
      if (updated.length === 0) {
        const { [shiftId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [shiftId]: updated };
    });
  };


  // ➕ MULTI-SHIFT: Helper functions
  const updateShiftEmployeeName = (shiftId: string, index: number, name: string) => {
    setCurrentShiftSelections((prev) => {
      const updated = [...(prev[shiftId] ?? [])];
      updated[index] = name;
      return { ...prev, [shiftId]: updated };
    });
  };


  // Hapus key sepenuhnya agar tombol "+ Tambah" muncul kembali
  const clearShiftSelection = (shiftId: string) => {
    setCurrentShiftSelections((prev) => {
      const next = { ...prev };
      delete next[shiftId]; // Hapus key, bukan set ke ""
      return next;
    });
  };

  // ➕ Get valid shift selections untuk submit (hanya yang tidak kosong)
  const getValidShiftSelections = (): ShiftSelection[] => {
    return shifts.flatMap((shift) =>
      (currentShiftSelections[shift.id] ?? [])
        .filter((name) => name.trim())
        .map((name) => ({
          shift_id: shift.id,
          shift_name: shift.label,
          employee_name: name,
        }))
    );
  };

  // Cek kondisi Kurang + Tidak Digunakan
  const isRusakTidakDigunakan =
    currentAsset.condition_id === "3" && // id 3 = Kurang
    currentAsset.status_id === "2";     // id 2 = Tidak Digunakan

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

    // Validasi spesifikasi hanya jika tidak dilewati oleh pengguna
    if (isComputerCurrent && !skipSpesifikasi) {
      if (
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

    // ✅ 3. VALIDASI MULTI-SHIFT: Jika aktif, wajib isi minimal 1 shift
    const validShifts = isMultiShift ? getValidShiftSelections() : [];
    if (isMultiShift && validShifts.length === 0) {
      setNotification({ type: "error", message: "Aktifkan multi-shift? Isi minimal 1 nama pegawai per shift." });
      return;
    }

    // Jika Rusak + Tidak Digunakan, set semua spesifikasi ke "NA"
    const newAsset: Asset = {
      device_id: currentAsset.device_id,
      asset_code: currentAssetCode,
      asset_name: currentAsset.asset_name,
      condition_id: currentAsset.condition_id,
      status_id: currentAsset.status_id,
      photo: currentAsset.photo as File,
      operating_system: skipSpesifikasi ? "NA" : currentAsset.operating_system,
      merk: skipSpesifikasi ? "NA" : currentAsset.merk,
      processor: skipSpesifikasi ? "NA" : currentAsset.processor,
      ram: skipSpesifikasi ? "NA" : currentAsset.ram,
      jenis_storage: skipSpesifikasi ? "NA" : currentAsset.jenis_storage,
      besar_storage: skipSpesifikasi ? "NA" : currentAsset.besar_storage,
      grafis_card: skipSpesifikasi ? "NA" : currentAsset.grafis_card,
      softwares: skipSpesifikasi ? [] : currentSoftwares.filter((s) => s.name.trim()),
      // ➕ MULTI-SHIFT: tambahkan shiftUsers
      shiftUsers: validShifts.length > 0 ? validShifts : undefined,
    };

    setAssets((prev) => [...prev, newAsset]);
    
    // Reset form asset + shift
    setCurrentAsset({});
    setCurrentSoftwares([{ name: "" }]);
    setCurrentAssetCode("");
    setIsMultiShift(false);
    setCurrentShiftSelections({});
    setSkipSpesifikasi(false);
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

  // Rooms for employee search (based on filterBuildingId)
  useEffect(() => {
    if (!filterBuildingId) {
      return setLocations((prev) => prev); // keep existing rooms for form
    }

    const loadRoomsForFilter = async () => {
      try {
        const { data, error } = await supabase
          .from("room_locations")
          .select("id, room_name")
          .eq("building_id", parseInt(filterBuildingId, 10));

        if (error) {
          console.warn("Error loading rooms for filter:", error);
          return;
        }

        // store in temporary state for search; reuse locations variable
        setLocations((data ?? []).map((row) => ({ id: String(row.id), label: row.room_name })));
      } catch (err) {
        console.warn("Failed to load rooms for filter", err);
      }
    };

    loadRoomsForFilter();
  }, [filterBuildingId]);

  const searchEmployees = async () => {
    setSearchingEmployees(true);
    setEmployeeSearchResults([]);
    try {
      let query = supabase.from("employees").select("id, nama_pegawai, position, building_id, lokasi");

      if (filterBuildingId) query = query.eq("building_id", parseInt(filterBuildingId, 10));
      if (filterRoomId) query = query.eq("lokasi", parseInt(filterRoomId, 10));
      if (filterPositionId) query = query.eq("position", parseInt(filterPositionId, 10));
      if (filterName) query = query.ilike("nama_pegawai", `%${filterName}%`);

      const { data, error } = await query;
      if (error) throw error;

      setEmployeeSearchResults(data ?? []);
    } catch (err) {
      console.error("Employee search failed", err);
      setEmployeeSearchResults([]);
    } finally {
      setSearchingEmployees(false);
    }
  };

  const fetchEmployeeDetailsAndAssets = async (employeeId: number) => {
    try {
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("id, nama_pegawai, position, building_id, lokasi, employee_type_id")
        .eq("id", employeeId)
        .single();

      if (empErr) throw empErr;

      setSelectedExistingEmployee(emp ?? null);
      if (emp?.employee_type_id != null) {
        setValue("employee_type_id", String(emp.employee_type_id));
      }

      // Fetch assets owned by this employee
      const { data: assetRows, error: assetErr } = await supabase
        .from("asset")
        .select("asset_code, asset_name, device(name), asset_condition(name), asset_status(name)")
        .eq("employee_id", employeeId);

      if (assetErr) {
        console.warn("Failed fetching employee assets:", assetErr);
        setExistingEmployeeAssets([]);
      } else {
        setExistingEmployeeAssets((assetRows ?? []).map((r: any) => ({
          asset_code: r.asset_code,
          asset_name: r.asset_name,
          device_name: r.device?.name ?? "",
          condition: r.asset_condition?.name ?? "",
          status: r.asset_status?.name ?? "",
        })));
      }
    } catch (err) {
      console.error("Failed to fetch employee details/assets", err);
      setSelectedExistingEmployee(null);
      setExistingEmployeeAssets([]);
    }
  };

  const handleSelectExistingEmployee = async (id: number) => {
    setSelectedExistingEmployeeId(id);
    await fetchEmployeeDetailsAndAssets(id);
  };

  const handleContinueToStep2WithExisting = () => {
    if (!selectedExistingEmployee) return;
    // Prefill form values to keep consistent behavior
    setValue("nama_pegawai", selectedExistingEmployee.nama_pegawai ?? "");
    setValue("employee_type_id", String(selectedExistingEmployee.employee_type_id ?? ""));
    setValue("building_id", String(selectedExistingEmployee.building_id ?? ""));
    setValue("position", String(selectedExistingEmployee.position ?? ""));
    setValue("lokasi", String(selectedExistingEmployee.lokasi ?? ""));
    setStep(2);
  };

  useEffect(() => {
    if (hasFetchedRef.current) {
      console.log("🚫 Skipping duplicate fetch");
      return;
    }

    const loadOptions = async () => {
      console.log("🔄 Starting to load dropdown options...");
      hasFetchedRef.current = true;
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
          hasFetchedRef.current = false;
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
        setFetchError(formatErrorDetails(err));
        hasFetchedRef.current = false;
      }
    };

    loadOptions();
  }, []);

  // ➕ MULTI-SHIFT: Fetch shifts dan employees (digabung agar efisien)
  useEffect(() => {
      const loadShifts = async () => {
        console.log("🔄 [Multi-Shift] Fetching shifts...");
        try {
          const { data, error } = await supabase
            .from("shifts")
            .select("id, shift_name");

          if (error) {
            console.error("❌ [Multi-Shift] Shifts Error:", error);
            setShifts([]);
            return;
          }

          setShifts(
            (data ?? []).map((row) => ({
              id: String(row.id),
              label: row.shift_name,
            }))
          );

          const mapped = (data ?? []).map((row) => ({
            id: String(row.id),
            label: row.shift_name,
          }));
          
          console.log("✅ [Multi-Shift] Mapped Shifts:", mapped);
          setShifts(mapped);
        } catch (err) {
          console.error("💥 [Multi-Shift] Unexpected Error:", err);
        }
      };
    loadShifts();
  }, []);

  // Fetch di useEffect (gabungan dengan shifts)
  useEffect(() => {
    const loadData = async () => {
      const [shiftsRes, empRes] = await Promise.all([
        supabase.from("shifts").select("id, shift_name"),
        supabase.from("employees").select("id, nama_pegawai"),
      ]);
      
      if (!shiftsRes.error) {
        setShifts(shiftsRes.data?.map(r => ({ id: String(r.id), label: r.shift_name })) ?? []);
      }
      if (!empRes.error) {
        setExistingEmployees(empRes.data?.map(r => ({ id: r.id, label: r.nama_pegawai })) ?? []);
      }
    };
    loadData();
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
        setFetchError(formatErrorDetails(err));
      }
    }

    loadEmployeeTypes();
  }, []);

  useEffect(() => {
    const loadChecklistItems = async () => {
      try {
        const { data, error } = await supabase
          .from("security_checklist_items")
          .select("id, category, item_text");

        if (error) {
          console.error("❌ Error fetching security checklist items:", error);
          setChecklistItems([]);
          return;
        }

        setChecklistItems(
          (data ?? [])
            .map((item) => parseChecklistItem(item))
            .filter((item) => ["LOW", "MEDIUM", "HIGH"].includes(item.category))
        );
      } catch (err) {
        console.error("💥 Unexpected error fetching security checklist items:", err);
        setChecklistItems([]);
      }
    };

    loadChecklistItems();
  }, []);

  useEffect(() => {
    setAssetChecklistStates((prev) =>
      assets.map((asset, index) => {
        const items = getChecklistItemsForAsset(asset);
        const previous = prev[index] || {};
        return items.reduce((checklist, item) => {
          checklist[item.id] = previous[item.id] ?? false;
          return checklist;
        }, {} as AssetChecklistState);
      })
    );
  }, [assets, checklistItems, devices]);

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

  const assetStepCount = 4;

  // Set nama employee dari picker (bisa per shift+index)
  const selectEmployeeFromList = (shiftId: string, index: number, employeeName: string) => {
    updateShiftEmployeeName(shiftId, index, employeeName);
    // Optional: tutup dropdown picker setelah pilih
  };

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

      let employee_id: number;
      if (mode === "pilih_lama") {
        if (!selectedExistingEmployeeId) {
          throw new Error("Tidak ada pegawai yang dipilih");
        }
        employee_id = selectedExistingEmployeeId;
      } else {
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

        employee_id = employeeInsert.data.id;

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
      }

      for (const [assetIndex, asset] of assets.entries()) {
        const fileName = `${Date.now()}_${asset.photo.name.replace(/\s+/g, "_")}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage.from("asset_photo").upload(filePath, asset.photo);
        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const publicUrlResponse = supabase.storage.from("asset_photo").getPublicUrl(filePath);
        const photo_url = publicUrlResponse.data.publicUrl;

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

        const checklistRows = getChecklistItemsForAsset(asset).map((item) => ({
          asset_id,
          checklist_item_id: item.id,
          is_checked: Boolean(assetChecklistStates[assetIndex]?.[item.id]),
        }));

        if (checklistRows.length > 0) {
          try {
            const checklistInsert = await supabase.from("asset_security_checklist").insert(checklistRows);
            if (checklistInsert.error) {
              console.warn("⚠️ Could not save checklist data:", checklistInsert.error);
            }
          } catch (err) {
            console.warn("⚠️ Checklist save failed:", err);
          }
        }

        // ➕ MULTI-SHIFT: Insert ke asset_shift_users jika ada shift users
        if (asset.shiftUsers?.length) {
        const shiftRows = asset.shiftUsers
          .filter((su) => su.employee_name.trim())
          .map((su) => ({
            asset_id,
            shift_id: parseInt(su.shift_id, 10),
            nama_manual: su.employee_name.trim(),
            employee_id: null,
          }));

        if (shiftRows.length > 0) {
          const { error: shiftErr } = await supabase
            .from("asset_shift_users")
            .insert(shiftRows);

          if (shiftErr) {
            console.warn("⚠️ Gagal menyimpan shift users:", shiftErr);
          }
        }
      }
      }

      const review = {
        employee: {
          nama_pegawai: values.nama_pegawai,
          employee_type: selectedType,
          employee_number: selectedType === "Karyawan" ? values.employee_number?.trim() : undefined,
          instansi: selectedType === "Non-Karyawan" ? values.instansi : undefined,
          nomor_ktp: selectedType === "Non-Karyawan" ? values.nomor_ktp : undefined,
          position: positions.find((item) => item.id === values.position)?.label ?? "",
          building: buildings.find((item) => item.id === values.building_id)?.label ?? "",
          lokasi: locations.find((item) => item.id === values.lokasi)?.label ?? "",
        },
        assets: assets.map((asset, index) => ({
          asset_code: asset.asset_code ?? "N/A",
          asset_name: asset.asset_name,
          device_label: devices.find((item) => item.id === asset.device_id)?.label ?? "",
          condition_label: conditions.find((item) => item.id === asset.condition_id)?.label ?? "",
          status_label: statuses.find((item) => item.id === asset.status_id)?.label ?? "",
          operating_system: asset.operating_system,
          merk: asset.merk,
          processor: asset.processor,
          ram: asset.ram,
          jenis_storage: asset.jenis_storage,
          besar_storage: asset.besar_storage,
          grafis_card: asset.grafis_card,
          softwares: asset.softwares?.map((soft) => soft.name).filter(Boolean),
          // ➕ MULTI-SHIFT: tambahkan shift info di review
          shiftUsers: asset.shiftUsers?.map((su) => ({ // 'su' is now of type ShiftSelection
            shift_name: su.shift_name,
            employee_name: su.employee_name,
          })),
          checklist_items: getChecklistItemsForAsset(asset).map((item) => ({
            checklist_item_id: item.id,
            item_text: item.item_text,
            category: item.category,
            is_checked: Boolean(assetChecklistStates[index]?.[item.id]),
          })),
        })),
        assetCodes: assets.map((asset) => asset.asset_code ?? "N/A"),
      };

      saveAssetSubmission(review);
      setLoading(false);
      router.push("/asset-codes");
      return;
    } catch (error) {
      setNotification({
        type: "error",
        message: formatErrorDetails(error),
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
            <h1 className="text-3xl font-semibold">Kelola Asetmu</h1>
            <div>
              <p className={`mt-2 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Masukkan informasi secara bertahap, jika ada kendala hubungi Tim IT{" "}
                <a href="https://api.whatsapp.com/send/?phone=62895422388034&text&type=phone_number&app_absent=0" className="text-blue-300 hover:underline">
                  Disini
                </a>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors ${
              isDark
                ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                : "bg-slate-100 text-slate-900 hover:bg-slate-200"
            }`}
          >
            <span className="text-xl">{isDark ? "☀️" : "🌙"}</span>
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
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className={`ml-3 rounded-full px-3 py-1 text-xs ${previewMode ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              {previewMode ? "Preview: On" : "Preview: Off"}
            </button>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((tab) => (
              <div
                key={tab}
                onClick={() => { if (previewMode) setStep(tab); }}
                role={previewMode ? "button" : undefined}
                tabIndex={previewMode ? 0 : undefined}
                className={`flex-1 rounded-full border px-3 py-2 text-center text-xs font-semibold ${
                  step === tab ? "bg-slate-900 text-white border-slate-900" : "bg-slate-100 text-slate-500 border-slate-200"
                } ${previewMode ? "cursor-pointer" : ""}`}
              >
                {tab === 1 && "Identitas Pegawai"}
                {tab === 2 && "Tambah Asset"}
                {tab === 3 && "Keamanan Perangkat"}
                {tab === 4 && "Review & Submit"}
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
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode("input_baru")}
                  className={`cursor-pointer  rounded-full px-4 py-2 text-sm font-semibold ${mode === "input_baru" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Belum Pernah Input  
                </button>
                <button
                  type="button"
                  onClick={() => setMode("pilih_lama")}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ${mode === "pilih_lama" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  Sudah Pernah Input 
                </button>
              </div>

              {mode === "input_baru" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Nama Pegawai
                      <span className="mt-1 block text-md text-slate-500 italic">
                        Untuk Karyawan masukkan nama lengkap sesuai Aplikasi Talenta, untuk non-karyawan masukan nama lengkap tidak pakai singkatan
                      </span>
                    </label>
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
                        <option value="">Pilih Gedung</option>
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
                      <label className="mb-2 block text-sm font-medium text-slate-700">Ruangan</label>
                      <select
                        {...register("lokasi")}
                        disabled={!selectedBuildingId}
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle} ${!selectedBuildingId ? "bg-slate-100 text-slate-500" : ""}`}
                      >
                        <option value="">{selectedBuildingId ? "Pilih ruangan" : "Pilih Gedung dahulu"}</option>
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
                </>
              ) : (
                // Pilih pegawai yang ada UI
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Gedung</label>
                      <select
                        value={filterBuildingId}
                        onChange={(e) => setFilterBuildingId(e.target.value)}
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                      >
                        <option value="">Semua Gedung</option>
                        {buildings.map((b) => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Ruangan</label>
                      <select
                        value={filterRoomId}
                        onChange={(e) => setFilterRoomId(e.target.value)}
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                      >
                        <option value="">Semua Ruangan</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Posisi</label>
                      <select
                        value={filterPositionId}
                        onChange={(e) => setFilterPositionId(e.target.value)}
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${selectStyle}`}
                      >
                        <option value="">Semua Posisi</option>
                        {positions.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Nama</label>
                      <input
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        placeholder="Cari nama pegawai"
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                        type="text"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button type="button" onClick={searchEmployees} className="cursor-pointer rounded-2xl bg-slate-900 px-4 py-2 text-white">Cari</button>
                    {searchingEmployees ? <div className="text-sm text-slate-500">Mencari...</div> : null}
                  </div>

                  <div className="space-y-2">
                    {employeeSearchResults.length === 0 ? (
                      <div className="text-sm text-slate-500">Tidak ada hasil pencarian</div>
                    ) : (
                      employeeSearchResults.map((row: any) => (
                        <div key={row.id} className={`flex items-center justify-between rounded-xl border p-3 ${panelStyle}`}>
                          <div>
                            <div className="font-semibold">{row.nama_pegawai}</div>
                            <div className="text-sm text-slate-500">{positions.find(p => p.id === String(row.position))?.label ?? ""} — {buildings.find(b => b.id === String(row.building_id))?.label ?? ""} / {locations.find(l => l.id === String(row.lokasi))?.label ?? ""}</div>
                          </div>
                          <div>
                            <button type="button" onClick={() => handleSelectExistingEmployee(row.id)} className="cursor-pointer rounded-full bg-slate-900 px-3 py-1 text-white">Pilih</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedExistingEmployee ? (
                    <div className="space-y-3">
                      <div className={`rounded-xl border p-3 ${panelStyle}`}>
                        <div className="font-semibold">{selectedExistingEmployee.nama_pegawai}</div>
                        <div className="text-sm text-slate-500">{positions.find(p => p.id === String(selectedExistingEmployee.position))?.label ?? ""} — {buildings.find(b => b.id === String(selectedExistingEmployee.building_id))?.label ?? ""} / {locations.find(l => l.id === String(selectedExistingEmployee.lokasi))?.label ?? ""}</div>
                      </div>

                      <div>
                        <div className="mb-2 font-semibold">Aset yang dimiliki</div>
                        {existingEmployeeAssets.length === 0 ? (
                          <div className="text-sm text-slate-500">Tidak ada aset terdaftar</div>
                        ) : (
                          <div className="space-y-2">
                            {existingEmployeeAssets.map((a, i) => (
                              <div key={i} className={`rounded-xl border p-3 ${panelStyle}`}>
                                <div className="font-semibold">{a.asset_code} — {a.asset_name}</div>
                                <div className="text-sm text-slate-500">{a.device_name} • {a.condition} • {a.status}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <button type="button" onClick={handleContinueToStep2WithExisting} className="cursor-pointer rounded-2xl bg-emerald-600 px-4 py-2 text-white">Lanjut Tambah Aset</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">Tambah Asset</h2>

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
                <label className="block text-sm font-medium text-slate-700">{assetNameLabel}</label>
                <input
                  value={currentAsset.asset_name || ""}
                  onChange={(e) => updateCurrentAsset("asset_name", e.target.value)}
                  placeholder={ASSET_NAME_PLACEHOLDER}
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

              {isRusakTidakDigunakan && !skipSpesifikasi && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm text-amber-700">
                    ⚠️ <strong>Catatan:</strong> Jika perangkat tidak bisa menyala sama sekali 
                    dan spesifikasi tidak dapat dicek, klik tombol di bawah untuk 
                    melewati pengisian spesifikasi.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSkipSpesifikasi(true)}
                    className="cursor-pointer rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition"
                  >
                    Lewati Spesifikasi
                  </button>
                </div>
              )}

              {isRusakTidakDigunakan && skipSpesifikasi && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <p className="text-sm text-emerald-700">
                    ✅ Spesifikasi dilewati — semua field akan diisi NA
                  </p>
                  <button
                    type="button"
                    onClick={() => setSkipSpesifikasi(false)}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
                  >
                    Batalkan
                  </button>
                </div>
              )}

              {isComputerCurrent && (
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  skipSpesifikasi
                    ? "grid-rows-[0fr]"
                    : "grid-rows-[1fr]"
                }`}>
                  <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      {COMPUTER_FIELDS.map((name) => {
                        const meta = dynamicFieldMeta[name];
                        return (
                          <div key={name}>
                            <label className="mb-2 block text-sm font-medium text-slate-700">{meta.label}</label>
                            <input
                              value={(currentAsset[name] as string) || ""}
                              onChange={(e) => updateCurrentAsset(name, e.target.value)}
                              placeholder={meta.placeholder}
                              className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 ${fieldStyle}`}
                              type="text"
                            />
                            {meta.hint ? (
                              <p className="mt-2 text-sm text-slate-500">{meta.hint}</p>
                            ) : null}
                          </div>
                        );
                      })}
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
                            <label className="mb-2 block text-sm font-medium text-slate-700">Nama Software {index + 1} + Version</label>
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
                  </div>
                </div>
              )}

              {/* ➕ MULTI-SHIFT: Section Multi-Shift User */}
              <div className={`rounded-3xl border p-5 ${panelStyle}`}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isMultiShift}
                    onChange={(e) => {
                      setIsMultiShift(e.target.checked);
                      if (!e.target.checked) {
                        setCurrentShiftSelections({});
                      }
                    }}
                    className={`mt-1 h-4 w-4 rounded border-slate-300 focus:ring-slate-500 ${
                      isDark ? "text-slate-300" : "text-slate-900"
                    }`}
                  />
                  <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    Perangkat ini digunakan lebih dari 1 orang (multi-shift)
                  </span>
                </label>

                {isMultiShift && (
                  <div className="mt-4 space-y-4">
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Pilih shift dan tentukan pegawai yang menggunakan perangkat pada shift tersebut.
                    </p>

                    {shifts.length === 0 ? (
                      <p className={`text-sm ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                        ⚠️ Data shift tidak tersedia. Hubungi admin untuk menambahkan data shift.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {shifts.map((shift) => {
                          const isShiftActive = shift.id in currentShiftSelections;
                          const selectedEmployeeNames = currentShiftSelections[shift.id] ?? [];

                          return (
                            <div
                              key={shift.id}
                              className={`rounded-2xl border p-4 ${
                                isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              {/* Header Shift */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">🔄</span>
                                  <span className={`font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                                    {shift.label}
                                  </span>
                                </div>
                                {selectedEmployeeNames.length > 0 && (
                                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                                    {selectedEmployeeNames.length} pegawai
                                  </span>
                                )}
                              </div>

                              {/* List Pegawai */}
                              {selectedEmployeeNames.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {selectedEmployeeNames.map((empName, idx) => {
                                    const pickerKey = `${shift.id}-${idx}`;
                                    const isThisPickerOpen = openPickerId === pickerKey;
                                    return (
                                      <div
                                        key={`${shift.id}-${idx}`}
                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                                          isDark ? "bg-slate-700" : "bg-white border border-slate-200"
                                        }`}
                                      >
                                        <input
                                          type="text"
                                          value={empName}
                                          onChange={(e) => updateShiftEmployeeName(shift.id, idx, e.target.value)}
                                          placeholder="Ketik nama atau pilih dari daftar..."
                                          className={`flex-1 rounded-lg border px-2 py-1 text-sm outline-none focus:border-slate-900 ${fieldStyle}`}
                                        />

                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => setOpenPickerId(isThisPickerOpen ? null : pickerKey)}
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                            title="Pilih dari daftar pegawai"
                                          >
                                            🔍
                                          </button>
                                          {isThisPickerOpen && (
                                            <div className={`absolute z-10 mt-1 w-48 rounded-xl border shadow-lg ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                                              <div className="p-2 max-h-48 overflow-y-auto">
                                                {existingEmployees.length === 0 ? (
                                                  <p className="text-xs text-slate-500 px-2 py-1">Belum ada data pegawai</p>
                                                ) : (
                                                  existingEmployees.map((emp) => (
                                                    <button
                                                      key={emp.id}
                                                      type="button"
                                                      onClick={() => {
                                                        updateShiftEmployeeName(shift.id, idx, emp.label);
                                                        setOpenPickerId(null);
                                                      }}
                                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition ${
                                                        isDark ? "hover:bg-slate-700" : "hover:bg-slate-100"
                                                      }`}
                                                    >
                                                      {emp.label}
                                                    </button>
                                                  ))
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => removeShiftEmployee(shift.id, idx)}
                                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                                          title="Hapus baris ini"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {!isShiftActive ? (
                                <button
                                  type="button"
                                  onClick={() => setCurrentShiftSelections(prev => ({ ...prev, [shift.id]: [""] }))}
                                  className={`cursor-pointer w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm transition ${
                                    isDark
                                      ? "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                                      : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600"
                                  }`}
                                >
                                  + Tambah pegawai untuk shift {shift.label}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addShiftEmployee(shift.id)}
                                  className={`cursor-pointer w-full rounded-xl border-2 border-dashed px-4 py-3 text-sm transition ${
                                    isDark
                                      ? "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                                      : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600"
                                  }`}
                                >
                                  + Tambah pegawai lain untuk shift {shift.label}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={addAssetToList}
                  className="w-full sm:w-auto rounded-2xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
                >
                  Tambah ke Daftar
                </button>
              </div>

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
                            {/* ➕ MULTI-SHIFT: Tampilkan info shift di list preview */}
                            {asset.shiftUsers && asset.shiftUsers.length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                🔄 Multi-shift: {asset.shiftUsers.length} shift
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAsset(index)}
                            className="custom-pointer rounded-2xl bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
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
              <div className="flex space-0 items-center text-center gap-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Keamanan Perangkat</h2>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  ( Apa saja upaya yang sudah dilakukan untuk mengamankan perangkat aset )
                </p>
              </div>

              {assets.length === 0 ? (
                <p className={isDark ? "text-slate-400" : "text-slate-500"}>
                  Tambahkan asset terlebih dahulu untuk melihat checklist keamanan.
                </p>
              ) : checklistItems.length === 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-600">⚠️</span>
                    <div>
                      <h3 className="font-semibold text-amber-800">Tabel Checklist Keamanan Belum Dibuat</h3>
                      <p className="mt-2 text-amber-700">
                        Tabel <code className="bg-amber-100 px-1 rounded">security_checklist_items</code> belum ada di database.
                        Checklist keamanan akan dilewati. Untuk membuat tabel, jalankan SQL script di file{" "}
                        <code className="bg-amber-100 px-1 rounded">create_security_tables.sql</code> di Supabase dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {assets.map((asset, assetIndex) => {
                    const groups = getChecklistGroupsForAsset(asset);
                    const allItems = groups.flatMap((group) => group.items);
                    const checkedCount = Object.values(assetChecklistStates[assetIndex] || {}).filter(Boolean).length;
                    const totalCount = groups.reduce((total, group) => total + group.items.length, 0);

                    return (
                      <div key={assetIndex} className={`rounded-3xl border p-6 ${panelStyle}`}>
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                              Keamanan Perangkat — {asset.asset_name} / {asset.asset_code}
                            </h3>
                            <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                              {checkedCount} dari {totalCount} item sudah dicentang
                            </p>
                          </div>
                        </div>

                        {allItems.length === 0 ? (
                          <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Tidak ada checklist keamanan untuk perangkat ini.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {allItems.map((item) => (
                              <label
                                key={item.id}
                                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                                  isDark
                                    ? "border-slate-600 bg-slate-700 hover:border-slate-500"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(assetChecklistStates[assetIndex]?.[item.id])}
                                    onChange={(e) => updateAssetChecklist(assetIndex, item.id, e.target.checked)}
                                    className={`mt-1 h-4 w-4 rounded border-slate-300 focus:ring-slate-500 ${
                                      isDark ? "text-slate-300" : "text-slate-900"
                                    }`}
                                  />
                                  <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                    {item.item_text}
                                  </span>
                              </label>
                         ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {step === 4 && (
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
                        {/* ➕ MULTI-SHIFT: Tampilkan shift users di review */}
                        {asset.shiftUsers?.length ? (
                          <div className="mt-2 pl-4 border-l-2 border-blue-300">
                            <p className="text-sm font-medium text-blue-700">🔄 Multi-Shift Users:</p>
                            <ul className="mt-1 space-y-1">
                              {asset.shiftUsers.map((su, idx) => (
                                <li key={idx} className="text-xs text-slate-600">
                                  • {su.shift_name}: {su.employee_name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ): null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3 ">
              <button
                type="button"
                disabled={step === 1}
                onClick={() => setStep((current) => Math.max(current - 1, 1))}
                className="cursor-pointer rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kembali
              </button>
              {step === 1 && (
                <button
                  type="button"
                  onClick={nextStep}
                  className="cursor-pointer rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Selanjutnya
                </button>
              )}
              {step === 2 && assets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="cursor-pointer rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Lanjut ke Keamanan
                </button>
              )}
              {step === 3 && assets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="cursor-pointer rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
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