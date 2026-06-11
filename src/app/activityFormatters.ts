export const formatActivityDate = (value?: string): string => {
  if (!value) return '';

  const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return value;

  return `${Number(match[2])}월 ${Number(match[3])}일`;
};

export const formatCompactActivityDate = (value?: string): string => {
  if (!value) return '';

  const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return value;

  return `${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')}`;
};

export const formatActivityDateWithWeekday = (value?: string): string => {
  if (!value) return '';

  const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return value;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return `${match[1]}.${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')} (${weekdays[date.getDay()]})`;
};

export type ActivityStatus = 'past' | 'closed' | 'todayDeadline' | 'periodActive' | 'recruiting';

export interface ActivityStatusInput {
  date?: string;
  activityDate?: string;
  activityStartDate?: string;
  activityEndDate?: string;
  time?: string;
  recruitmentEndDate?: string;
  volunteerPeriod?: string;
  volunteerTime?: string;
}

const parseDateParts = (value?: string) => {
  if (!value) return null;

  const compactMatch = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return {
      year: Number(compactMatch[1]),
      month: Number(compactMatch[2]),
      day: Number(compactMatch[3]),
    };
  }

  const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const extractLastDate = (value?: string) => {
  if (!value) return '';

  const matches = [...value.matchAll(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/g)];
  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return '';

  return `${lastMatch[1]}.${lastMatch[2].padStart(2, '0')}.${lastMatch[3].padStart(2, '0')}`;
};

const extractFirstDate = (value?: string) => {
  if (!value) return '';

  const match = value.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  if (!match) return '';

  return `${match[1]}.${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')}`;
};

const normalizeDateValue = (value?: string) => {
  const parts = parseDateParts(value);
  if (!parts) return '';

  return `${parts.year}.${String(parts.month).padStart(2, '0')}.${String(parts.day).padStart(2, '0')}`;
};

const getSeoulDateTime = (dateValue?: string, minutes = 0) => {
  const parts = parseDateParts(dateValue);
  if (!parts) return null;

  const hours = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hours - 9, minute));
};

const getSeoulDateEnd = (dateValue?: string) => getSeoulDateTime(dateValue, (23 * 60) + 59);

const getSeoulTodayParts = (now = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
};

const isSameSeoulDate = (dateValue?: string, now = new Date()) => {
  const dateParts = parseDateParts(dateValue);
  if (!dateParts) return false;

  const today = getSeoulTodayParts(now);
  return dateParts.year === today.year && dateParts.month === today.month && dateParts.day === today.day;
};

const getSeoulTodayStart = (now = new Date()) => {
  const today = getSeoulTodayParts(now);
  return new Date(Date.UTC(today.year, today.month - 1, today.day, -9));
};

const parseEndTimeMinutes = (value?: string) => {
  if (!value) return null;

  const matches = [...value.matchAll(/(\d{1,2})(?::(\d{2}))?/g)]
    .map((match) => {
      const hours = Number(match[1]);
      const minutes = match[2] ? Number(match[2]) : 0;
      if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours > 23 || minutes > 59) return null;
      return (hours * 60) + minutes;
    })
    .filter((minutes): minutes is number => minutes !== null);

  return matches[matches.length - 1] ?? null;
};

const getActivityEndDateTime = (activity: ActivityStatusInput) => {
  const activityDate =
    activity.activityEndDate ||
    activity.activityDate ||
    activity.date ||
    extractLastDate(activity.volunteerPeriod);
  const endMinutes = parseEndTimeMinutes(activity.volunteerTime || activity.time) ?? ((23 * 60) + 59);

  return getSeoulDateTime(activityDate, endMinutes);
};

export const getActivityPeriod = (activity: ActivityStatusInput) => {
  const startDate =
    normalizeDateValue(activity.activityStartDate) ||
    normalizeDateValue(activity.activityDate) ||
    normalizeDateValue(activity.date) ||
    extractFirstDate(activity.volunteerPeriod);
  const endDate =
    normalizeDateValue(activity.activityEndDate) ||
    normalizeDateValue(activity.activityDate) ||
    normalizeDateValue(activity.date) ||
    extractLastDate(activity.volunteerPeriod) ||
    startDate;

  return {
    startDate,
    endDate,
    isPeriodActivity: Boolean(startDate && endDate && startDate !== endDate),
  };
};

export const getActivityDisplayDate = (
  activity: ActivityStatusInput,
  options: { compact?: boolean } = {},
): string => {
  const { startDate, endDate, isPeriodActivity } = getActivityPeriod(activity);

  if (isPeriodActivity) {
    return options.compact
      ? `${formatCompactActivityDate(startDate)} - ${formatCompactActivityDate(endDate)}`
      : `${startDate} - ${endDate}`;
  }

  const singleDate = startDate || endDate;
  if (!singleDate) return '';

  return options.compact ? formatActivityDate(singleDate) : formatActivityDateWithWeekday(singleDate);
};

export const getActivityStatus = (activity: ActivityStatusInput, now = new Date()): ActivityStatus => {
  const activityEnd = getActivityEndDateTime(activity);
  if (activityEnd && activityEnd.getTime() < now.getTime()) return 'past';

  const recruitmentEnd = getSeoulDateEnd(activity.recruitmentEndDate);
  if (recruitmentEnd && recruitmentEnd.getTime() < now.getTime()) return 'closed';
  if (isSameSeoulDate(activity.recruitmentEndDate, now)) return 'todayDeadline';

  const period = getActivityPeriod(activity);
  if (period.isPeriodActivity) {
    const activityStart = getSeoulDateTime(period.startDate, 0);
    const todayStart = getSeoulTodayStart(now);
    if (activityStart && todayStart.getTime() >= activityStart.getTime()) return 'periodActive';
  }

  return 'recruiting';
};

export const getActivityStatusLabel = (activity: ActivityStatusInput, now = new Date()) => {
  const status = getActivityStatus(activity, now);

  if (status === 'past') return '지난 활동';
  if (status === 'closed') return '모집마감';
  if (status === 'todayDeadline') return '오늘 마감';
  if (status === 'periodActive') return '진행 기간';
  return '모집중';
};

export const isPastActivity = (activity: ActivityStatusInput, now = new Date()) =>
  getActivityStatus(activity, now) === 'past';

export const getRecruitmentDday = (activity: ActivityStatusInput, now = new Date()): string => {
  const status = getActivityStatus(activity, now);
  if (status === 'past') return '지난 활동';
  if (status === 'closed') return '모집마감';
  if (status === 'todayDeadline') return '오늘 마감';

  const recruitmentEnd = getSeoulDateTime(activity.recruitmentEndDate, 0);
  const todayStart = getSeoulTodayStart(now);
  if (!recruitmentEnd) return '마감일 확인 필요';

  const daysUntilDeadline = Math.ceil((recruitmentEnd.getTime() - todayStart.getTime()) / 86400000);
  if (daysUntilDeadline <= 0) return '오늘 마감';

  return `마감 D-${daysUntilDeadline}`;
};

export const getRecruitmentDeadlineLabel = (value?: string): string =>
  getRecruitmentDday({ recruitmentEndDate: value });
