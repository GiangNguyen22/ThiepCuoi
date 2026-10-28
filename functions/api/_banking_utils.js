// Shared utilities for Vietnamese Banking & VietQR Standard

export const VIETNAM_BANKS = [
  { bin: "970436", shortName: "VCB", name: "Vietcombank (Ngoại thương Việt Nam)" },
  { bin: "970422", shortName: "MB", name: "MB Bank (Quân đội)" },
  { bin: "970407", shortName: "TCB", name: "Techcombank (Kỹ thương Việt Nam)" },
  { bin: "970415", shortName: "CTG", name: "VietinBank (Công thương Việt Nam)" },
  { bin: "970418", shortName: "BIDV", name: "BIDV (Đầu tư và Phát triển)" },
  { bin: "970416", shortName: "ACB", name: "ACB (Á Châu)" },
  { bin: "970432", shortName: "VPB", name: "VPBank (Việt Nam Thịnh Vượng)" },
  { bin: "970423", shortName: "TPB", name: "TPBank (Tiên Phong)" },
  { bin: "970403", shortName: "STB", name: "Sacombank (Sài Gòn Thương Tín)" },
  { bin: "970405", shortName: "VBA", name: "Agribank (Nông nghiệp & PTNT)" },
  { bin: "970441", shortName: "VIB", name: "VIB (Quốc tế)" },
  { bin: "970426", shortName: "MSB", name: "MSB (Hàng hải)" },
  { bin: "970440", shortName: "SEAB", name: "SeABank (Đông Nam Á)" },
  { bin: "970448", shortName: "OCB", name: "OCB (Phương Đông)" },
  { bin: "970443", shortName: "SHB", name: "SHB (Sài Gòn - Hà Nội)" },
  { bin: "970437", shortName: "HDB", name: "HDBank (Phát triển TP.HCM)" },
  { bin: "970428", shortName: "NAB", name: "Nam A Bank (Nam Á)" },
  { bin: "970454", shortName: "VCCB", name: "BVBank (Bản Việt)" },
  { bin: "546034", shortName: "CAKE", name: "CAKE by VPBank" }
];

/**
 * Remove Vietnamese accents for bank account holder name (standard for VietQR / banking apps)
 */
export function removeVietnameseTones(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Validates bank account number
 */
export function isValidAccountNumber(accNum) {
  if (!accNum || typeof accNum !== "string") return false;
  const clean = accNum.trim();
  // Standard bank accounts in VN are 6 to 25 alphanumeric chars
  return /^[a-zA-Z0-9]{6,25}$/.test(clean);
}

/**
 * Generate standard VietQR image URL
 * Documentation & standard: https://vietqr.net
 */
export function generateVietQrUrl({ bankBin, accountNumber, accountHolder, transferNote, template = "compact2" }) {
  if (!bankBin || !isValidAccountNumber(accountNumber)) return null;

  const cleanAcc = accountNumber.trim();
  const cleanHolder = removeVietnameseTones(accountHolder);
  const cleanNote = removeVietnameseTones(transferNote || "Mung cuoi").slice(0, 50);

  const baseUrl = `https://img.vietqr.io/image/${bankBin}-${cleanAcc}-${template}.png`;
  const params = new URLSearchParams();
  if (cleanHolder) params.set("accountName", cleanHolder);
  if (cleanNote) params.set("addInfo", cleanNote);

  return `${baseUrl}?${params.toString()}`;
}
