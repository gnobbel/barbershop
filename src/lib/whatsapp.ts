/** Country calling codes for the timezones a local number is most likely written in. */
const COUNTRY_CODE_BY_TZ: Record<string, string> = {
  "Europe/Amsterdam": "31",
  "Europe/Brussels": "32",
  "Europe/Luxembourg": "352",
  "Europe/Berlin": "49",
  "Europe/Paris": "33",
  "Europe/London": "44",
  "Europe/Dublin": "353",
  "Europe/Madrid": "34",
  "Europe/Lisbon": "351",
  "Europe/Rome": "39",
  "Europe/Vienna": "43",
  "Europe/Zurich": "41",
  "Europe/Copenhagen": "45",
  "Europe/Stockholm": "46",
  "Europe/Oslo": "47",
};

/**
 * The international digits WhatsApp expects ("31612345678"), or null when the
 * number can't be read reliably. A national number ("06 12345678") gets the
 * country code of the barber's timezone.
 */
export function whatsappNumber(phone: string, timeZone: string): string | null {
  const compact = phone.trim().replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;

  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (compact.startsWith("0")) {
    const cc = COUNTRY_CODE_BY_TZ[timeZone];
    if (!cc) return null;
    digits = cc + compact.slice(1);
  } else return null;

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** A wa.me link that opens a chat, optionally with a message typed in. */
export function whatsappUrl(number: string, text?: string) {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
