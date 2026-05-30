export function normalizeWhatsAppPhone(value: string, defaultCountryCode = "91"): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith(`0${defaultCountryCode}`)) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  }

  if (digits.length < 11 || digits.length > 15) {
    throw new Error("Invalid WhatsApp phone number");
  }

  return digits;
}
