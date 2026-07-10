export const MAX_REALISTIC_AGE = 120;

function toDateOnlyString(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getBirthDateBounds(referenceDate = new Date()) {
  const max = new Date(referenceDate);
  max.setHours(0, 0, 0, 0);

  const min = new Date(max);
  min.setFullYear(min.getFullYear() - MAX_REALISTIC_AGE);

  return {
    minDate: min,
    maxDate: max,
    min: toDateOnlyString(min),
    max: toDateOnlyString(max),
  };
}

export function parseBirthDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;

  let date: Date;
  if (value instanceof Date) {
    date = new Date(value);
  } else {
    const trimmed = value.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    } else {
      date = new Date(trimmed);
    }
  }

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export function calculateRealisticAge(
  value: string | Date | null | undefined,
  referenceDate = new Date(),
): number | null {
  const birthDate = parseBirthDate(value);
  if (!birthDate) return null;

  const { min, max } = getBirthDateBounds(referenceDate);
  const birthDateOnly = toDateOnlyString(birthDate);
  if (birthDateOnly < min || birthDateOnly > max) return null;

  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

export function isRealisticBirthDate(value: string | Date | null | undefined): boolean {
  return calculateRealisticAge(value) !== null;
}
