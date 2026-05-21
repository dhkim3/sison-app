export interface StoryItem {
  id: number;
  title: string;
  region: string;
  author: string;
  likes: number;
  comments: number;
  imageUrl: string;
  body: string;
  relatedActivity?: string;
}
