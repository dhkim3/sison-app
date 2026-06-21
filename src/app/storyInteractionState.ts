import type { StoryItem } from './components/story/storyTypes';

export interface StoryComment {
  id: number;
  author: string;
  authorName?: string;
  body: string;
  content?: string;
  time: string;
  createdAt?: string;
  edited?: boolean;
  isMine?: boolean;
}

const createComment = (id: number, authorName: string, content: string, createdAt: string): StoryComment => ({
  id,
  author: authorName,
  authorName,
  body: content,
  content,
  time: createdAt,
  createdAt,
});

const storyCommentSeeds: Record<number, Array<Omit<StoryComment, 'id'>>> = {
  1: [
    { author: '소희', body: '애월의 오후가 조용하게 그려져요.', time: '오늘' },
    { author: '하루', body: '작게 줍고 오래 바라본 시간이 좋네요.', time: '어제' },
    { author: '민서', body: '다음 애월 여행 때 이 길을 걸어보고 싶어요.', time: '이번 주' },
  ],
  2: [
    { author: '윤서', body: '숲의 리듬을 빌렸다는 문장이 오래 남아요.', time: '오늘' },
    { author: '도현', body: '비자림의 조용함이 사진에서도 느껴져요.', time: '어제' },
  ],
  3: [
    { author: '서우', body: '성산 바람이 바로 떠오르는 기록이에요.', time: '오늘' },
    { author: '유진', body: '마음이 단정해졌다는 말이 참 좋네요.', time: '어제' },
    { author: '민서', body: '작은 봉투 하나의 무게가 느껴져요.', time: '어제' },
    { author: '가은', body: '조용히 다시 읽게 되는 글이에요.', time: '이번 주' },
  ],
  4: [
    { author: '이안', body: '함덕 물빛과 오전의 공기가 잘 어울려요.', time: '오늘' },
  ],
  5: [
    { author: '서하', body: '따라비오름 입구의 낮은 구름이 사진 분위기와 잘 맞아요.', time: '오늘' },
    { author: '유림', body: '오름 산책로를 천천히 정리하는 활동이면 여행 중에도 부담이 덜하겠어요.', time: '어제' },
  ],
  6: [
    { author: '지민', body: '귤밭 사이 길이라는 장소가 참 다정해요.', time: '어제' },
    { author: '연우', body: '낯선 곳이 덜 낯설어지는 순간이 좋네요.', time: '이번 주' },
  ],
  7: [
    { author: '여행자', body: '아침 바다의 분위기가 그대로 느껴져요.', time: '오늘' },
    { author: '민서', body: '다음 부산 여행 때 저도 참여해보고 싶어요.', time: '어제' },
    { author: '하루', body: '조용한 실천이 오래 남는다는 말이 좋아요.', time: '어제' },
  ],
  8: [
    { author: '하린', body: '영도 골목의 바다 냄새가 떠올라요.', time: '오늘' },
  ],
  9: [
    { author: '서윤', body: '수영강 오후빛이라는 말이 예뻐요.', time: '어제' },
    { author: '도현', body: '작은 길이 편안해졌다는 시선이 좋네요.', time: '이번 주' },
  ],
  10: [
    { author: '윤재', body: '다대포 노을 전의 고요함이 느껴져요.', time: '오늘' },
    { author: '유라', body: '말보다 풍경이 먼저 남는다는 표현이 좋습니다.', time: '어제' },
    { author: '소민', body: '해변을 오래 걷고 싶어지는 글이에요.', time: '어제' },
    { author: '지우', body: '작은 조각들을 주웠다는 장면이 선명해요.', time: '이번 주' },
  ],
  11: [
    { author: '도윤', body: '부산항의 바다 냄새와 행사 안내 활동이 자연스럽게 이어져 보여요.', time: '이번 주' },
  ],
  12: [
    { author: '태오', body: '익숙한 도시가 다르게 보였다는 말에 공감해요.', time: '오늘' },
    { author: '은채', body: '성수 골목의 낮은 화분들이 떠올라요.', time: '어제' },
  ],
  13: [
    { author: '나린', body: '한강 바람이 봉투를 흔드는 장면이 좋아요.', time: '오늘' },
    { author: '현우', body: '강변의 저녁이 차분하게 전해져요.', time: '어제' },
    { author: '라윤', body: '가벼워진 손이라는 표현이 오래 남네요.', time: '이번 주' },
  ],
  14: [
    { author: '서하', body: '북촌을 동네처럼 본 시선이 따뜻해요.', time: '이번 주' },
  ],
  15: [
    { author: '소율', body: '서울숲 벤치 주변을 정리하는 활동이라 산책처럼 참여할 수 있겠어요.', time: '오늘' },
    { author: '태린', body: '나뭇잎 소리와 안내지를 나누던 장면이 조용하게 남네요.', time: '어제' },
  ],
  16: [
    { author: '지안', body: '아침 플로깅 기록이 참 단정해요.', time: '오늘' },
    { author: '하람', body: '커피 향보다 바다 냄새가 먼저 왔다는 말이 좋아요.', time: '어제' },
  ],
  17: [
    { author: '가은', body: '호수 위 산 그림자가 그려져요.', time: '이번 주' },
  ],
  18: [
    { author: '이준', body: '대관령 들길의 넓은 바람과 마을 걷기 안내가 잘 어울려요.', time: '이번 주' },
  ],
  19: [
    { author: '채원', body: '의암호의 저녁빛이 조용히 떠오릅니다.', time: '오늘' },
    { author: '민준', body: '활동이 자연스럽게 끝났다는 문장이 좋네요.', time: '어제' },
    { author: '수아', body: '느린 저녁 산책 같은 기록이에요.', time: '이번 주' },
  ],
  20: [
    { author: '나나', body: '여수의 해질녘이 차분하게 남아요.', time: '오늘' },
    { author: '준서', body: '무언가를 남기고 온 기분이라는 말이 좋습니다.', time: '어제' },
    { author: '로아', body: '돌산 해안길을 걸어보고 싶어졌어요.', time: '어제' },
    { author: '이솔', body: '풍경이 과하지 않아서 더 오래 보게 돼요.', time: '이번 주' },
  ],
  21: [
    { author: '소율', body: '갈대 사이 바람이 느껴지는 글이에요.', time: '오늘' },
    { author: '태린', body: '자연 곁에 서 있는 시간이라는 말이 좋네요.', time: '어제' },
  ],
  22: [
    { author: '도윤', body: '대숲 그늘의 느린 느낌이 그대로 전해져요.', time: '이번 주' },
  ],
  23: [
    { author: '하린', body: '목포항 아침빛과 마을 행사 준비 장면이 차분하게 이어져요.', time: '오늘' },
    { author: '서우', body: '배 소리 들리는 항구에서 의자를 나르는 시간이 선명하게 느껴집니다.', time: '어제' },
  ],
  24: [
    { author: '서진', body: '경주의 오후빛은 늘 오래 남는 것 같아요.', time: '오늘' },
    { author: '예린', body: '생활에 가까운 여행지라는 표현이 좋아요.', time: '어제' },
  ],
  25: [
    { author: '지호', body: '안동 강변의 낮은 물소리가 떠올라요.', time: '이번 주' },
  ],
  26: [
    { author: '승아', body: '활동 뒤의 바다가 더 넓어 보였다는 말이 좋네요.', time: '오늘' },
    { author: '유림', body: '포항 바람이 선명하게 느껴져요.', time: '어제' },
    { author: '이준', body: '모래가 신발에 들어왔다는 디테일이 좋아요.', time: '이번 주' },
  ],
  27: [
    { author: '윤서', body: '항구의 느린 오후가 잘 전해져요.', time: '오늘' },
    { author: '지민', body: '여행지가 생활처럼 가까워졌다는 말이 따뜻합니다.', time: '어제' },
  ],
  28: [
    { author: '라윤', body: '목적지가 흐려지는 여행이라는 표현이 좋네요.', time: '이번 주' },
  ],
  29: [
    { author: '지우', body: '진해 여좌천의 지나가는 계절과 마을길 안내가 잘 어울려요.', time: '어제' },
  ],
  30: [
    { author: '해린', body: '전주 골목의 온기가 그대로 느껴져요.', time: '오늘' },
    { author: '태오', body: '짧은 인사가 모인 기억이라는 말이 좋습니다.', time: '어제' },
    { author: '은채', body: '기와 지붕이 차분해 보였다는 장면이 좋아요.', time: '이번 주' },
  ],
  31: [
    { author: '하린', body: '군산 골목의 바닷바람이 선명해요.', time: '어제' },
  ],
  32: [
    { author: '윤서', body: '광한루원 저녁 풍경과 문화 행사 정리가 담백하게 어울려요.', time: '오늘' },
    { author: '현우', body: '연못 위 빛이 얇게 깔렸다는 장면이 오래 남습니다.', time: '이번 주' },
  ],
  33: [
    { author: '소희', body: '남기는 것과 지우는 것을 함께 생각했다는 말이 좋아요.', time: '오늘' },
    { author: '다온', body: '태안 바다를 조용히 걷고 싶어졌어요.', time: '어제' },
  ],
  34: [
    { author: '민재', body: '오래된 곳의 속도를 따라 걷는다는 표현이 좋네요.', time: '이번 주' },
  ],
  35: [
    { author: '채원', body: '서산 들판과 해미읍성 근처 마을길 분위기가 편안하게 느껴져요.', time: '어제' },
  ],
  36: [
    { author: '서우', body: '가까운 도시도 여행처럼 보이는 순간이 있죠.', time: '오늘' },
    { author: '유진', body: '성곽 아래 바람이 그려져요.', time: '어제' },
  ],
  37: [
    { author: '연우', body: '물안개가 남은 강변 아침이 좋네요.', time: '이번 주' },
  ],
  38: [
    { author: '민서', body: '파주출판도시의 비 오는 보도블록과 책 행사 분위기가 잘 맞아요.', time: '오늘' },
    { author: '라윤', body: '우산을 접어두는 곳을 안내했다는 작은 장면이 좋네요.', time: '어제' },
  ],
  39: [
    { author: '이안', body: '시간의 층을 걷는다는 말이 개항장과 잘 어울려요.', time: '오늘' },
    { author: '유라', body: '벽돌과 간판이 함께 놓인 풍경이 떠오릅니다.', time: '어제' },
  ],
  40: [
    { author: '준서', body: '도시는 반듯하지만 바람은 자유롭다는 문장이 좋아요.', time: '이번 주' },
  ],
  41: [
    { author: '지우', body: '대구 골목의 그늘이 차분하게 느껴져요.', time: '오늘' },
    { author: '민서', body: '더운 날의 조용한 골목이 떠오릅니다.', time: '어제' },
  ],
  42: [
    { author: '준서', body: '수성못 저녁 산책로라면 활동 뒤에도 오래 걷고 싶을 것 같아요.', time: '이번 주' },
  ],
  43: [
    { author: '하루', body: '양림동 언덕길의 분위기가 잘 전해져요.', time: '이번 주' },
  ],
  44: [
    { author: '가은', body: '무등산 입구의 초록과 산책로 정리가 아주 자연스럽게 이어져요.', time: '오늘' },
    { author: '지호', body: '산을 오르기 전 마음을 고르는 시간이라는 말이 좋습니다.', time: '어제' },
  ],
  45: [
    { author: '도현', body: '대전천의 낮은 물소리가 좋네요.', time: '어제' },
  ],
  46: [
    { author: '승아', body: '유성 온천길의 밤공기와 행사 안내 장면이 조용하게 떠올라요.', time: '이번 주' },
  ],
  47: [
    { author: '가은', body: '태화강의 초록 물결이라는 말이 잘 어울려요.', time: '오늘' },
    { author: '현우', body: '걷는 사람들의 속도까지 느려지는 곳이라니 좋습니다.', time: '어제' },
  ],
  48: [
    { author: '서하', body: '등대가 하루의 기준처럼 서 있다는 표현이 좋아요.', time: '이번 주' },
  ],
  49: [
    { author: '채원', body: '수암골의 조용한 계단이 떠올라요.', time: '어제' },
  ],
  50: [
    { author: '수아', body: '청풍호 물빛이 맑게 느껴지는 기록이에요.', time: '오늘' },
    { author: '라윤', body: '긴 여행보다 넉넉하게 남았다는 말이 좋네요.', time: '어제' },
  ],
  101: [
    { author: '나나', body: '광안리 아침 공기가 느껴지는 기록이에요.', time: '오늘' },
    { author: '하린', body: '여행의 속도를 늦춘다는 표현이 좋네요.', time: '어제' },
    { author: '민재', body: '작은 활동 뒤의 고요함이 오래 남을 것 같아요.', time: '어제' },
    { author: '서우', body: '다음엔 저도 바다 정화 활동을 찾아볼래요.', time: '이번 주' },
  ],
  102: [
    { author: '지우', body: '제주 석양은 늘 마음을 느리게 해요.', time: '오늘' },
    { author: '윤', body: '사진과 글의 결이 잘 어울려요.', time: '어제' },
  ],
  103: [
    { author: '소희', body: '오후 햇빛이 그려지는 이야기예요.', time: '이번 주' },
  ],
  104: [
    { author: '민서', body: '비자림의 조용함이 전해져요.', time: '오늘' },
    { author: '재윤', body: '숲길을 돌보는 여행이라니 좋네요.', time: '어제' },
    { author: '하루', body: '기록이 차분해서 오래 읽게 돼요.', time: '이번 주' },
  ],
  105: [
    { author: '지안', body: '안목해변의 커피 향과 바다 냄새가 같이 느껴져요.', time: '오늘' },
    { author: '도현', body: '짧은 활동이 하루의 표정을 바꾼다는 말이 좋네요.', time: '어제' },
  ],
  106: [
    { author: '서윤', body: '통영 항구의 느린 오후가 차분하게 전해져요.', time: '오늘' },
    { author: '하린', body: '낯선 도시가 가까워지는 순간이 좋습니다.', time: '이번 주' },
  ],
  107: [
    { author: '민재', body: '경주 골목의 오후빛이 눈에 그려져요.', time: '이번 주' },
  ],
};

export const initialStoryComments: Record<number, StoryComment[]> = Object.fromEntries(
  Object.entries(storyCommentSeeds).map(([storyId, comments]) => [
    Number(storyId),
    comments.map((comment, index) => createComment(-(index + 1), comment.author, comment.body, comment.time)),
  ]),
);

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

// ---- device identity (no auth) ----
const DEVICE_KEY_STORAGE = 'sison_device_key';

export const getDeviceKey = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    let key = window.localStorage.getItem(DEVICE_KEY_STORAGE);
    if (!key) {
      key = window.crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(DEVICE_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return '';
  }
};

// ---- story API client ----
export interface StoryCardItem {
  id: number;
  storyId: number | null;
  title: string;
  subtitle: string;
  imageUrl: string;
  createdAt: string;
}

export interface StoryListResponse {
  stories: StoryItem[];
  comments: Record<number, StoryComment[]>;
  likeCounts: Record<number, number>;
  likedStoryIds: number[];
  cards: StoryCardItem[];
}

const postStoryAction = async (action: string, payload: Record<string, unknown>) => {
  const response = await fetch(`/api/story?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `story ${action} failed (${response.status})`);
  }
  return data;
};

export const storyApi = {
  async list(key: string): Promise<StoryListResponse> {
    const response = await fetch(`/api/story?action=list&key=${encodeURIComponent(key)}`);
    if (!response.ok) throw new Error('story list failed');
    const data = await response.json();
    return {
      stories: Array.isArray(data.stories) ? data.stories : [],
      comments: data.comments ?? {},
      likeCounts: data.likeCounts ?? {},
      likedStoryIds: Array.isArray(data.likedStoryIds) ? data.likedStoryIds : [],
      cards: Array.isArray(data.cards) ? data.cards : [],
    };
  },
  createStory: (key: string, story: Partial<StoryItem>) => postStoryAction('create', { key, story }),
  deleteStory: (key: string, id: number | string) => postStoryAction('delete', { key, id: String(id) }),
  addComment: (key: string, storyId: number | string, authorName: string, body: string) =>
    postStoryAction('comment', { key, storyId: String(storyId), authorName, body }),
  deleteComment: (key: string, commentId: number | string) =>
    postStoryAction('comment-delete', { key, commentId: String(commentId) }),
  like: (key: string, storyId: number | string) => postStoryAction('like', { key, storyId: String(storyId) }),
  unlike: (key: string, storyId: number | string) => postStoryAction('unlike', { key, storyId: String(storyId) }),
  uploadPhoto: async (dataUrl: string): Promise<string> => {
    const data = await postStoryAction('upload', { dataUrl });
    return data.url as string;
  },
  generateCard: (key: string, params: Record<string, unknown>): Promise<{ url: string; elapsedMs: number }> =>
    postStoryAction('card-generate', { key, ...params }) as Promise<{ url: string; elapsedMs: number }>,
};
