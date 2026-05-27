export const formatActivityDate = (value?: string): string => {
  if (!value) return '';

  const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return value;

  return `${Number(match[2])}월 ${Number(match[3])}일`;
};

export const getRecruitmentDeadlineLabel = (value?: string): string => {
  if (!value) return '';

  const match = value.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/);
  if (!match) return '마감';

  const deadline = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
  if (daysUntilDeadline < 0) return '마감';
  if (daysUntilDeadline === 0) return '마감 D-Day';

  return `마감 D-${daysUntilDeadline}`;
};
