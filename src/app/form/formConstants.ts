export const COMPUTER_FIELDS = [
  "operating_system",
  "merk",
  "processor",
  "ram",
  "jenis_storage",
  "besar_storage",
  "grafis_card",
] as const;

export type ComputerFieldName = (typeof COMPUTER_FIELDS)[number];

export const computerFieldMeta: Record<ComputerFieldName, { label: string; placeholder?: string; hint?: string }> = {
  operating_system: {
    label: "Operating System",
    placeholder: "contoh: Windows 11, Ubuntu 22.04, macOS Ventura",
  },
  merk: {
    label: "Merk + System Model",
    placeholder: "contoh: Dell Latitude 7490, Lenovo IdeaPad 3, Intel NUC 11",
  },
  processor: {
    label: "Processor",
    placeholder: "contoh: Intel Core i7-1165G7, AMD Ryzen 5 5600",
    hint: "Tulis nama lengkap processor termasuk serinya",
  },
  ram: {
    label: "RAM",
    placeholder: "contoh: 8GB, 16GB, 32GB",
  },
  jenis_storage: {
    label: "Jenis Storage",
    placeholder: "contoh: SSD, HDD, SSD + HDD",
  },
  besar_storage: {
    label: "Besar Storage",
    placeholder: "contoh: 256GB, 512GB, 1TB",
  },
  grafis_card: {
    label: "Grafis Card",
    placeholder: "contoh: NVIDIA GTX 1650, AMD Radeon RX 580, Intel Iris Xe",
    hint: "Tulis nama lengkap kartu grafis",
  },
};

export const isComputerDevice = (deviceName: string | undefined): boolean => {
  if (!deviceName) return false;
  const normalized = deviceName.toLowerCase();
  return ["laptop", "personal computer", "komputer"].some((keyword) => normalized.includes(keyword));
};
