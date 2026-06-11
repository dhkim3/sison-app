export const normalizeCapacity = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '확인 필요';
  if (typeof value === 'number') return `${value.toLocaleString('ko-KR')}명`;

  const trimmedValue = value.trim();
  if (!trimmedValue) return '확인 필요';
  if (/[명人]$/.test(trimmedValue)) return trimmedValue;

  const normalizedNumber = Number(trimmedValue.replace(/,/g, ''));
  return Number.isFinite(normalizedNumber)
    ? `${normalizedNumber.toLocaleString('ko-KR')}명`
    : trimmedValue;
};

export const hasKnownCapacity = (value: string | number | null | undefined) =>
  normalizeCapacity(value) !== '확인 필요';
