export interface ActivitySaveRecord {
  id?: string;
  imageUrl: string;
  imageType?: string;
  imageReason?: string;
  title: string;
  location: string;
  region?: string;
  recruitmentStartDate?: string;
  recruitmentEndDate?: string;
  date?: string;
  activityDate?: string;
  activityStartDate?: string;
  activityEndDate?: string;
  time: string;
  status?: 'recruiting' | 'completed' | string;
  isRecruiting: boolean;
  distance?: string;
  description: string;
  materials: string;
  capacity: string;
  currentParticipants: string;
  recommendation: string;
  duration?: string;
  difficulty?: string;
  indoorOutdoor?: string;
  category?: string;
  volunteerPeriod?: string;
  recruitmentPeriod?: string;
  volunteerTime?: string;
  volunteerField?: string;
  volunteerTarget?: string;
  volunteerType?: string;
  recruitingOrganization?: string;
  registrationOrganization?: string;
  volunteerPlace?: string;
  latitude?: number;
  longitude?: number;
  applyUrl?: string;
  sourceUrl?: string;
  progrmRegistNo?: string;
}

export type ActivitySaveLookup = Pick<ActivitySaveRecord, 'title'> & {
  id?: string;
  date?: string;
  location?: string;
  time?: string;
};

export const getActivitySaveKey = (activity: ActivitySaveLookup) => {
  if (activity.id) return activity.id;

  return activity.title.trim().toLowerCase();
};
