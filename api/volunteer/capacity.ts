export const firstPresentValue = (...values: Array<string | null | undefined>) => {
  const value = values.find((item) => item !== null && item !== undefined && item.trim() !== '');
  return value ?? '';
};

export const normalizeCapacity = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return `${value.toLocaleString('ko-KR')}명`;

  const trimmedValue = value.trim();
  if (!trimmedValue) return null;
  if (/[명人]$/.test(trimmedValue)) return trimmedValue;

  const normalizedNumber = Number(trimmedValue.replace(/,/g, ''));
  if (Number.isFinite(normalizedNumber)) return `${normalizedNumber.toLocaleString('ko-KR')}명`;

  return trimmedValue;
};

export const pickRecruitCapacity = (item: Record<string, string | null | undefined>) =>
  firstPresentValue(
    item.rcritNmpr,
    item.recrtNmpr,
    item.progrmRcritNmpr,
    item.rcritNmprCo,
    item.nanmmbyNmpr,
    item.reqstNmpr,
    item.wanted,
    item.capacity,
  );

export const pickCurrentParticipants = (item: Record<string, string | null | undefined>) =>
  firstPresentValue(
    item.applcntNmpr,
    item.partcptnNmpr,
    item.reqstNmpr,
    item.requestCount,
    item.appTotal,
    item.currentParticipants,
  );
