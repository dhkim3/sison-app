import type { StoryItem } from './components/story/storyTypes';

export interface StoryComment {
  id: number;
  author: string;
  body: string;
  time: string;
  edited?: boolean;
}

export const initialStoryComments: Record<number, StoryComment[]> = {
  1: [
    { id: 1, author: '여행자', body: '아침 바다의 분위기가 그대로 느껴져요.', time: '오늘' },
    { id: 2, author: '민서', body: '다음 부산 여행 때 저도 참여해보고 싶어요.', time: '어제' },
    { id: 3, author: '하루', body: '조용한 실천이 오래 남는다는 말이 좋아요.', time: '어제' },
  ],
  2: [
    { id: 1, author: '서윤', body: '숲길을 천천히 걷는 장면이 떠올라요.', time: '오늘' },
    { id: 2, author: '도현', body: '봉사보다 산책처럼 느껴졌다는 말이 따뜻해요.', time: '어제' },
  ],
  3: [
    { id: 1, author: '지안', body: '아침 플로깅 기록이 참 단정해요.', time: '이번 주' },
  ],
  101: [
    { id: 1, author: '나나', body: '광안리 아침 공기가 느껴지는 기록이에요.', time: '오늘' },
    { id: 2, author: '하린', body: '여행의 속도를 늦춘다는 표현이 좋네요.', time: '어제' },
    { id: 3, author: '민재', body: '작은 활동 뒤의 고요함이 오래 남을 것 같아요.', time: '어제' },
    { id: 4, author: '서우', body: '다음엔 저도 바다 정화 활동을 찾아볼래요.', time: '이번 주' },
  ],
  102: [
    { id: 1, author: '지우', body: '제주 석양은 늘 마음을 느리게 해요.', time: '오늘' },
    { id: 2, author: '윤', body: '사진과 글의 결이 잘 어울려요.', time: '어제' },
  ],
  103: [
    { id: 1, author: '소희', body: '오후 햇빛이 그려지는 이야기예요.', time: '이번 주' },
  ],
  104: [
    { id: 1, author: '민서', body: '비자림의 조용함이 전해져요.', time: '오늘' },
    { id: 2, author: '재윤', body: '숲길을 돌보는 여행이라니 좋네요.', time: '어제' },
    { id: 3, author: '하루', body: '기록이 차분해서 오래 읽게 돼요.', time: '이번 주' },
  ],
};

export interface StoryInteractionProps {
  isStoryLiked: (storyId: number) => boolean;
  getStoryLikeCount: (story: Pick<StoryItem, 'id' | 'likes'>) => number;
  getStoryCommentCount: (story: Pick<StoryItem, 'id' | 'comments'>) => number;
  getStoryComments: (storyId: number) => StoryComment[];
  onToggleStoryLike: (storyId: number) => void;
  onAddStoryComment: (storyId: number, body: string) => void;
  onUpdateStoryComment: (storyId: number, commentId: number, body: string) => void;
  onDeleteStoryComment: (storyId: number, commentId: number) => void;
  onRemoveStory?: (storyId: number) => void;
}
