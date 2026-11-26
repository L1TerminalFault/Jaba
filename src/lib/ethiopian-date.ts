import { toEthiopian } from "ethiopian-calendar-new";

export const ETHIOPIAN_MONTHS = [
  { id: 1, en: "Meskerem", am: "መስከረም" },
  { id: 2, en: "Tikimt", am: "ጥቅምት" },
  { id: 3, en: "Hidar", am: "ኅዳር" },
  { id: 4, en: "Tahsas", am: "ታኅሣሥ" },
  { id: 5, en: "Tir", am: "ጥር" },
  { id: 6, en: "Yakatit", am: "የካቲት" },
  { id: 7, en: "Magabit", am: "መጋቢት" },
  { id: 8, en: "Miyazya", am: "ሚያዝያ" },
  { id: 9, en: "Ginbot", am: "ግንቦት" },
  { id: 10, en: "Sene", am: "ሰኔ" },
  { id: 11, en: "Hamle", am: "ሐምሌ" },
  { id: 12, en: "Nehase", am: "ነሐሴ" },
  { id: 13, en: "Pagume", am: "ጳጉሜ" },
];

export interface EthiopianDateResult {
  year: number;
  month: number;
  day: number;
  monthNameEn: string;
  monthNameAm: string;
  formattedEn: string;
  formattedAm: string;
  timeStr: string;
}

/**
 * Converts a Gregorian date or ISO string into an Ethiopian calendar date.
 */
export function getEthiopianDate(inputDate?: Date | string): EthiopianDateResult {
  const d = inputDate ? new Date(inputDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const gYear = validDate.getFullYear();
  const gMonth = validDate.getMonth() + 1;
  const gDay = validDate.getDate();

  const eth = toEthiopian(gYear, gMonth, gDay);
  const monthInfo = ETHIOPIAN_MONTHS[eth.month - 1] || { en: `Month ${eth.month}`, am: `ወር ${eth.month}` };

  const hours = validDate.getHours().toString().padStart(2, "0");
  const minutes = validDate.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  return {
    year: eth.year,
    month: eth.month,
    day: eth.day,
    monthNameEn: monthInfo.en,
    monthNameAm: monthInfo.am,
    formattedEn: `${monthInfo.en} ${eth.day}, ${eth.year}`,
    formattedAm: `${monthInfo.am} ${eth.day} ቀን ${eth.year} ዓ.ም`,
    timeStr,
  };
}

/**
 * Returns formatted string representation for cards, titles, and headers.
 */
export function formatEthiopianDateString(
  inputDate?: Date | string,
  includeTime = false,
  useAmharic = false
): string {
  const eth = getEthiopianDate(inputDate);
  const base = useAmharic ? eth.formattedAm : eth.formattedEn;
  return includeTime ? `${base} - ${eth.timeStr}` : base;
}
