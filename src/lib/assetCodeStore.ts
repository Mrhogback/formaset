const STORAGE_KEY = "asset_submission_data";

export type SubmittedAsset = {
  asset_code: string;
  asset_name: string;
  device_label: string;
  condition_label: string;
  status_label: string;
  operating_system?: string;
  merk?: string;
  processor?: string;
  ram?: string;
  jenis_storage?: string;
  besar_storage?: string;
  grafis_card?: string;
  softwares?: string[];
};

export type SubmittedReview = {
  employee: {
    nama_pegawai: string;
    employee_type: string;
    employee_number?: string;
    instansi?: string;
    nomor_ktp?: string;
    position: string;
    building: string;
    lokasi: string;
  };
  assets: SubmittedAsset[];
  assetCodes: string[];
};

export function saveAssetSubmission(data: SubmittedReview) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore localStorage errors in private mode
  }
}

export function loadAssetSubmission(): SubmittedReview | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as SubmittedReview;
  } catch {
    return null;
  }
}

export function clearAssetSubmission() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
