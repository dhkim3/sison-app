export interface StoryItem {
  id: number;
  title: string;
  region: string;
  city?: string;
  location?: string;
  author: string;
  authorName?: string;
  likes: number;
  likeCount?: number;
  comments: number;
  imageUrl: string;
  body: string;
  content?: string;
  relatedActivity?: string;
  activityTitle?: string;
  activityDate?: string;
  createdAt?: string;
  tags?: string[];
  isMine?: boolean;
}
