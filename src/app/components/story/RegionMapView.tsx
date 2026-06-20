import { useLayoutEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { BottomTabBar } from '../BottomTabBar';
import { PageShell } from '../PageShell';
import { StoryCard } from './StoryCard';
import { StoryDetailSheet } from './StoryDetailSheet';
import { StoryCommentSheet } from './StoryCommentSheet';
import type { StoryItem } from './storyTypes';
import type { StoryInteractionProps } from '../../storyInteractionState';
import { scrollToTop } from '../../utils/scrollToTop';

interface RegionMapViewProps {
  onNavigate: (screen: string) => void;
  onCreateStory: () => void;
  selectedRegion: string | null;
  onSelectRegion: (region: string | null) => void;
  storyInteractions: StoryInteractionProps;
  userStories?: StoryItem[];
}

interface RegionMarker {
  name: string;
  count: number;
  x: number;
  y: number;
  label?: string;
}

const regions: RegionMarker[] = [
  { name: '서울', count: 4, x: 295, y: 168 },
  { name: '경기', count: 3, x: 318, y: 238 },
  { name: '강원', count: 4, x: 426, y: 184 },
  { name: '충남', count: 3, x: 252, y: 316 },
  { name: '충북', count: 2, x: 390, y: 316 },
  { name: '대전', count: 2, x: 330, y: 372 },
  { name: '전북', count: 3, x: 324, y: 438 },
  { name: '전남', count: 4, x: 200, y: 558 },
  { name: '광주', count: 2, x: 238, y: 476 },
  { name: '경북', count: 3, x: 478, y: 358 },
  { name: '대구', count: 2, x: 432, y: 405 },
  { name: '경남', count: 3, x: 420, y: 500 },
  { name: '울산', count: 2, x: 548, y: 444 },
  { name: '부산', count: 5, x: 512, y: 514 },
];

const jejuRegion: RegionMarker = { name: '제주', count: 6, x: 210, y: 690 };

const mainlandImagePlacement = {
  width: '134%',
  left: '56%',
  top: '60%',
  opacity: 0.9,
};

const jejuInsetImagePlacement = {
  width: 675,
  left: -117,
  top: -572,
  opacity: 0.92,
};

const mapViewBox = {
  width: 767,
  height: 777,
};

const storyListPageSize = 10;

const storyImage = (fileName: string) => `/activity-images/${fileName}`;

const createMockStory = (
  id: number,
  title: string,
  region: string,
  city: string,
  location: string,
  authorName: string,
  likeCount: number,
  comments: number,
  imageId: string,
  content: string,
  activityTitle: string,
  activityDate: string,
  createdAt: string,
  tags: string[],
): StoryItem => ({
  id,
  title,
  region,
  city,
  location,
  author: authorName,
  authorName,
  likes: likeCount,
  likeCount,
  comments,
  imageUrl: storyImage(imageId),
  body: content,
  content,
  relatedActivity: activityTitle,
  activityTitle,
  activityDate,
  createdAt,
  tags,
});

const mockStories: StoryItem[] = [
  createMockStory(1, '애월 바다 옆 느린 오후', '제주', '제주시', '애월해안도로', '지우', 18, 3, 'beach-cleanup-2.png', '애월 바다를 따라 걷다 잠깐 멈춰 작은 쓰레기를 주웠어요. 파도 소리가 커서 말수가 줄었고, 여행의 속도도 조금 느려졌습니다. 돌아오는 길에는 햇빛이 물 위에 오래 남아 있었어요.', '애월 해안 쓰담 걷기', '2026.06.12', '2026.06.13', ['바다', '애월', '느린여행']),
  createMockStory(2, '비자림 안쪽의 초록', '제주', '제주시', '비자림', '하린', 16, 2, 'forest-trail-1.png', '비자림 길은 안쪽으로 들어갈수록 조용해졌어요. 낮은 표지판을 닦고 길가의 떨어진 가지를 정리하며 천천히 걸었습니다. 숲을 돌본다기보다 숲의 리듬을 빌린 하루 같았어요.', '비자림 산책로 정비', '2026.06.08', '2026.06.09', ['숲길', '비자림', '고요함']),
  createMockStory(3, '성산 바람 아래', '제주', '서귀포시', '성산일출봉 해안길', '나린', 21, 4, 'festival-event-1.png', '성산의 바람은 먼저 도착해 기다리고 있는 느낌이었어요. 해안길을 따라 걸으며 작은 비닐과 병뚜껑을 모았습니다. 봉투가 가벼웠는데도 마음은 단정해졌습니다.', '성산 해안 쓰담 걷기', '2026.05.22', '2026.05.23', ['성산', '해안길', '바람']),
  createMockStory(4, '함덕 물빛이 남긴 것', '제주', '제주시', '함덕해수욕장', '윤서', 13, 1, 'beach-cleanup-3.png', '함덕의 물빛은 가까이서 보면 더 맑고 느렸어요. 오전 정리 활동을 마치고 모래 위에 앉아 한참 바다만 보았습니다. 여행지에 잠깐의 질서를 남기고 온 기분이었어요.', '함덕해변 해양 환경 정화', '2026.06.15', '2026.06.16', ['함덕', '해변', '아침']),
  createMockStory(5, '오름 입구에서 만난 구름', '제주', '서귀포시', '따라비오름', '다온', 11, 2, 'rural-village-2.png', '오름 입구의 구름이 낮게 내려와 있던 날이었어요. 안내 끈을 정리하고 길 가장자리의 흙을 고르며 천천히 움직였습니다. 내려올 때 보인 마을 풍경이 오래 남았습니다.', '오름 산책로 정리', '2026.05.18', '2026.05.19', ['오름', '구름', '산책']),
  createMockStory(6, '서귀포 귤밭 사이로', '제주', '서귀포시', '효돈동 귤밭길', '서우', 9, 2, 'rural-village-2.png', '귤밭 사이 작은 길에서 마을 안내를 도왔어요. 낯선 사람들과 짧게 인사하고 나니 여행지가 조금 덜 낯설어졌습니다. 오후 햇살은 낮고 부드러웠어요.', '서귀포 마을길 안내 도우미', '2026.04.27', '2026.04.28', ['마을길', '귤밭', '햇살']),
  createMockStory(7, '광안리 아침의 선', '부산', '부산 수영구', '광안리해수욕장', '나나', 19, 3, 'beach-cleanup-1.png', '광안리의 아침은 생각보다 차분했어요. 모래 위에 남은 작은 흔적들을 정리하며 바다의 선을 따라 걸었습니다. 짧은 시간이지만 하루가 조금 맑아졌습니다.', '광안리 해변 환경정화', '2026.07.20', '2026.07.20', ['광안리', '바다', '아침']),
  createMockStory(8, '영도 흰여울의 낮은 담', '부산', '부산 영도구', '흰여울문화마을', '민재', 14, 1, 'festival-event-2.png', '흰여울 골목의 낮은 담벼락 옆에서 길 안내를 도왔어요. 바다를 배경으로 사람들이 천천히 지나갔고, 그 사이의 작은 쉼표 같은 시간이 좋았습니다.', '흰여울 골목 안내', '2026.06.29', '2026.06.30', ['영도', '골목', '바다']),
  createMockStory(9, '수영강 옆 오후빛', '부산', '부산 수영구', '수영강 산책로', '소민', 10, 2, 'forest-trail-2.png', '수영강 산책로를 따라 표지 주변을 정리했어요. 큰 변화는 아니어도 사람들이 지나가는 길이 조금 편안해진 것 같았습니다. 강물 위로 오후빛이 길게 놓였어요.', '수영강 산책로 정비', '2026.06.02', '2026.06.03', ['강변', '산책로', '오후']),
  createMockStory(10, '다대포 노을 전의 시간', '부산', '부산 사하구', '다대포해수욕장', '유진', 17, 4, 'festival-event-1.png', '노을이 오기 전 다대포는 넓고 조용했어요. 해변 가장자리를 함께 걸으며 모래에 섞인 작은 조각들을 주웠습니다. 해가 낮아질수록 말보다 풍경이 먼저 남았습니다.', '다대포 해변 쓰담 걷기', '2026.05.31', '2026.06.01', ['다대포', '노을', '해변']),
  createMockStory(11, '부산항 근처의 짧은 인사', '부산', '부산 중구', '부산항 북항', '하루', 8, 1, 'default-travel-1.png', '부산항 근처 작은 행사장에서 방문객 안내를 맡았어요. 바다 냄새와 캐리어 바퀴 소리가 섞인 곳에서 짧은 인사를 여러 번 건넸습니다. 낯선 도시가 잠시 가까워졌어요.', '부산항 마을 행사 도우미', '2026.05.12', '2026.05.13', ['부산항', '행사', '도시']),
  createMockStory(12, '성수 골목의 낮은 화분', '서울', '서울 성동구', '성수동 골목길', '서윤', 12, 2, 'city-travel-2.png', '성수 골목의 작은 화분들을 정리하며 천천히 걸었어요. 카페 앞을 지나는 사람들 사이로 흙냄새가 잠깐 올라왔습니다. 익숙한 도시도 조금 다르게 보였습니다.', '성수 골목 화단 정리', '2026.06.21', '2026.06.22', ['성수', '골목', '도시산책']),
  createMockStory(13, '한강 바람을 따라', '서울', '서울 마포구', '망원한강공원', '도현', 15, 3, 'default-travel-1.png', '망원 한강공원에서 짧은 플로깅을 했어요. 바람이 강해서 봉투가 자꾸 흔들렸지만, 강변의 저녁은 느긋했습니다. 돌아오는 길에 손이 조금 가벼워졌어요.', '망원 한강공원 플로깅', '2026.06.18', '2026.06.19', ['한강', '망원', '바람']),
  createMockStory(14, '북촌 담장 옆 그늘', '서울', '서울 종로구', '북촌 한옥길', '이안', 9, 1, 'city-travel-1.png', '북촌의 그늘은 생각보다 깊고 조용했어요. 골목 안내 팻말 주변을 정리하고 길을 묻는 사람들에게 방향을 알려주었습니다. 관광지보다 동네에 가까운 표정이 남았습니다.', '북촌 골목 안내 도우미', '2026.05.26', '2026.05.27', ['북촌', '한옥길', '그늘']),
  createMockStory(15, '서울숲 벤치의 오후', '서울', '서울 성동구', '서울숲', '지안', 13, 2, 'forest-trail-3.png', '서울숲 벤치 주변을 정리하고 작은 안내지를 나눴어요. 아이들 웃음소리와 나뭇잎 소리가 번갈아 들렸습니다. 도시 안에서도 충분히 느린 오후였습니다.', '서울숲 공원 정리', '2026.05.11', '2026.05.12', ['서울숲', '공원', '오후']),
  createMockStory(16, '안목해변 커피 향 사이', '강원', '강릉시', '안목해변', '소희', 14, 2, 'beach-cleanup-2.png', '안목해변의 아침은 커피 향보다 먼저 바다 냄새가 왔어요. 짧은 플로깅을 마치고 테라스에 앉아 파도를 보았습니다. 단정하게 시작한 하루였습니다.', '안목해변 아침 플로깅', '2026.08.05', '2026.08.05', ['강릉', '안목해변', '아침']),
  createMockStory(17, '속초 호수 옆 산책', '강원', '속초시', '영랑호', '연우', 11, 1, 'default-travel-2.png', '영랑호 둘레를 걷다 산책로 표지를 정리했어요. 호수 위로 산 그림자가 천천히 내려오고 있었습니다. 오래 걸은 뒤의 조용한 피로가 좋았습니다.', '영랑호 산책로 정비', '2026.03.28', '2026.03.29', ['속초', '호수', '산책']),
  createMockStory(18, '평창 들판의 바람', '강원', '평창군', '대관령 들길', '가은', 8, 1, 'default-travel-3.png', '대관령 들길의 바람은 서늘하고 맑았어요. 마을 걷기 행사에서 길목을 안내하며 멀리 보이는 능선을 자주 바라봤습니다. 여행보다 조금 더 머문 하루였습니다.', '대관령 마을 걷기 안내', '2026.04.19', '2026.04.20', ['평창', '들길', '능선']),
  createMockStory(19, '춘천 물가의 느린 저녁', '강원', '춘천시', '의암호 산책로', '민서', 10, 3, 'default-travel-1.png', '의암호 물가에서 산책로 주변을 살폈어요. 자전거가 지나간 뒤 남은 고요가 좋았습니다. 저녁빛이 호수에 번질 때쯤 활동도 자연스럽게 끝났습니다.', '의암호 산책로 정리', '2026.04.02', '2026.04.03', ['춘천', '의암호', '저녁']),
  createMockStory(20, '여수 돌산의 해질녘', '전남', '여수시', '돌산 해안길', '다온', 18, 4, 'beach-cleanup-2.png', '돌산 해안길을 따라 천천히 걸으며 작은 조각들을 주웠어요. 해가 낮아지자 바다는 더 조용해졌습니다. 여행의 끝에 무언가를 조금 남기고 온 기분이었습니다.', '여수 돌산 해안 쓰담 걷기', '2026.05.05', '2026.05.06', ['여수', '돌산', '해질녘']),
  createMockStory(21, '순천만 갈대 사이로', '전남', '순천시', '순천만 습지', '윤재', 15, 2, 'festival-event-1.png', '순천만 갈대는 바람이 지나갈 때마다 결이 달라졌어요. 습지 입구 주변을 정리하며 걸음을 늦췄습니다. 자연을 보는 시간이 아니라 곁에 서 있는 시간이었습니다.', '순천만 입구 정리', '2026.04.14', '2026.04.15', ['순천만', '갈대', '습지']),
  createMockStory(22, '담양 대숲의 그늘', '전남', '담양군', '죽녹원 근처', '지민', 12, 1, 'forest-trail-3.png', '대숲 그늘은 바깥보다 한 박자 느렸어요. 산책로 안내판을 닦고 주변을 정리하는 동안 바람 소리가 계속 따라왔습니다. 짧은 활동 뒤에도 대나무 향이 남았습니다.', '담양 대숲 산책로 정리', '2026.04.08', '2026.04.09', ['담양', '대숲', '그늘']),
  createMockStory(23, '목포 항구의 아침빛', '전남', '목포시', '목포항', '유라', 9, 2, 'festival-event-2.png', '목포항의 아침은 배 소리와 함께 시작됐어요. 작은 마을 행사 준비를 돕고 의자를 나르며 바다 쪽을 자주 돌아봤습니다. 손에 남은 먼지마저 여행의 일부 같았습니다.', '목포 항구 마을 행사 도우미', '2026.03.30', '2026.03.31', ['목포', '항구', '아침']),
  createMockStory(24, '경주 담장에 머문 빛', '경북', '경주시', '황리단길', '윤재', 13, 2, 'city-travel-3.png', '황리단길 작은 전시 안내를 도왔어요. 오래된 담장 위로 빛이 천천히 내려앉아 자주 걸음을 멈췄습니다. 여행지가 풍경보다 생활에 가깝게 느껴졌습니다.', '경주 황리단길 문화 안내', '2026.05.04', '2026.05.05', ['경주', '골목', '오후빛']),
  createMockStory(25, '안동 강변의 낮은 물소리', '경북', '안동시', '낙동강변 산책로', '현우', 10, 1, 'default-travel-1.png', '안동 강변 산책로에서 표지 주변을 정리했어요. 물소리가 낮게 들려오는 길을 따라 걷다 보니 시간이 천천히 흘렀습니다. 담백한 하루였습니다.', '안동 강변 산책로 정비', '2026.04.17', '2026.04.18', ['안동', '강변', '산책로']),
  createMockStory(26, '포항 바다 앞 짧은 쉼', '경북', '포항시', '영일대해수욕장', '서하', 16, 3, 'beach-cleanup-2.png', '영일대 바다 앞에서 해변 주변을 정리했어요. 바람이 세서 모래가 신발 안으로 조금 들어왔지만, 그마저 선명하게 기억납니다. 활동 뒤의 바다는 더 넓어 보였습니다.', '영일대 해변 정리', '2026.04.06', '2026.04.07', ['포항', '영일대', '바다']),
  createMockStory(27, '통영 항구의 느린 오후', '경남', '통영시', '강구안', '민서', 12, 2, 'festival-event-2.png', '작은 항구 행사에서 길을 안내하고 의자를 정리했어요. 바다 냄새와 사람들의 느린 발걸음이 오래 남는 오후였습니다. 여행지가 잠깐 생활처럼 가까워졌습니다.', '통영 항구 마을 행사 도우미', '2026.04.26', '2026.04.27', ['통영', '항구', '오후']),
  createMockStory(28, '남해 바래길의 초록', '경남', '남해군', '바래길', '로아', 9, 1, 'rural-village-2.png', '남해 바래길은 바다와 들이 번갈아 나타났어요. 길목 정리를 돕고 천천히 걷다 보니 여행의 목적지가 조금 흐려졌습니다. 그 흐림이 편안했습니다.', '남해 바래길 정리', '2026.04.13', '2026.04.14', ['남해', '바래길', '초록']),
  createMockStory(29, '진해 오래된 벚나무 아래', '경남', '창원시', '진해 여좌천', '채원', 11, 1, 'city-travel-2.png', '진해 여좌천 주변에서 행사 안내를 도왔어요. 벚꽃은 지고 있었지만 나무 아래 그늘은 여전히 부드러웠습니다. 계절이 지나가는 자리를 조용히 본 날이었습니다.', '진해 마을길 안내', '2026.04.03', '2026.04.04', ['진해', '여좌천', '계절']),
  createMockStory(30, '전주 골목 장터의 온기', '전북', '전주시', '전주 한옥마을', '서윤', 14, 3, 'city-travel-1.png', '한옥마을 골목 장터에서 체험 부스를 정리했어요. 짧은 인사와 웃음이 모여 여행보다 조금 더 오래 남는 기억이 됐습니다. 저녁 무렵 기와 지붕이 차분해 보였어요.', '전주 한옥마을 골목 행사 도우미', '2026.05.16', '2026.05.17', ['전주', '한옥마을', '장터']),
  createMockStory(31, '군산 바닷바람 골목', '전북', '군산시', '근대역사거리', '태오', 8, 1, 'default-travel-1.png', '군산의 오래된 골목에서 길 안내를 도왔어요. 바닷바람이 건물 사이로 지나가며 낡은 간판을 흔들었습니다. 천천히 읽어야 보이는 도시였습니다.', '군산 근대거리 안내', '2026.04.23', '2026.04.24', ['군산', '골목', '바닷바람']),
  createMockStory(32, '남원 광한루의 저녁', '전북', '남원시', '광한루원', '해린', 10, 2, 'default-travel-3.png', '광한루원 주변 행사 정리를 도왔어요. 해가 지기 전 연못 위에 빛이 얇게 깔렸습니다. 조용한 풍경 속에서 하루가 천천히 닫혔습니다.', '남원 문화 행사 정리', '2026.04.10', '2026.04.11', ['남원', '광한루', '저녁']),
  createMockStory(33, '태안 모래 위의 발자국', '충남', '태안군', '만리포해수욕장', '유나', 13, 2, 'beach-cleanup-2.png', '만리포 해변에서 모래 속 작은 조각들을 주웠어요. 파도가 지운 발자국 위로 다시 발자국이 생겼습니다. 남기는 것과 지우는 것을 함께 생각한 날이었습니다.', '만리포 해변 정화', '2026.05.09', '2026.05.10', ['태안', '만리포', '모래']),
  createMockStory(34, '공주 성곽 옆 산책', '충남', '공주시', '공산성', '이준', 9, 1, 'default-travel-3.png', '공산성 둘레길에서 안내판 주변을 정리했어요. 성곽 옆길은 높낮이가 부드럽게 이어졌고, 멀리 강이 보였습니다. 오래된 곳의 속도를 따라 걸었습니다.', '공산성 둘레길 정리', '2026.04.21', '2026.04.22', ['공주', '공산성', '둘레길']),
  createMockStory(35, '서산 들판의 긴 오후', '충남', '서산시', '해미읍성 근처', '라윤', 7, 1, 'rural-village-2.png', '해미읍성 근처 마을길에서 작은 안내를 맡았어요. 들판 너머로 낮은 구름이 길게 걸려 있었습니다. 특별한 장면보다 평온한 시간이 남았습니다.', '서산 마을길 안내', '2026.04.01', '2026.04.02', ['서산', '마을길', '들판']),
  createMockStory(36, '수원 성곽 아래 바람', '경기', '수원시', '화성행궁 주변', '민준', 12, 2, 'city-travel-1.png', '수원 화성 성곽 아래에서 골목 안내를 도왔어요. 관광객들의 걸음 사이로 바람이 지나갔고, 오래된 돌의 색이 차분했습니다. 가까운 도시도 여행처럼 느껴졌습니다.', '수원 행궁동 골목 안내', '2026.05.28', '2026.05.29', ['수원', '행궁동', '성곽']),
  createMockStory(37, '양평 강변의 하얀 아침', '경기', '양평군', '남한강 자전거길', '수아', 10, 1, 'default-travel-1.png', '남한강 자전거길 옆을 걸으며 주변을 정리했어요. 물안개가 조금 남아 있어 강변이 하얗게 보였습니다. 조용한 아침이 하루를 느리게 열어줬습니다.', '양평 강변 플로깅', '2026.05.07', '2026.05.08', ['양평', '강변', '아침']),
  createMockStory(38, '파주 책방 거리의 비', '경기', '파주시', '파주출판도시', '지호', 8, 2, 'city-travel-2.png', '파주출판도시에 비가 가볍게 내렸어요. 작은 책 행사에서 자리를 정리하고 우산을 접어두는 곳을 안내했습니다. 젖은 보도블록이 차분하게 빛났습니다.', '파주 책 행사 도우미', '2026.04.25', '2026.04.26', ['파주', '책방', '비']),
  createMockStory(39, '인천 개항장 골목', '인천', '인천 중구', '개항장 거리', '은채', 11, 2, 'city-travel-1.png', '개항장 거리의 오래된 건물 사이에서 길 안내를 도왔어요. 낡은 벽돌과 새 간판이 함께 놓인 풍경이 인상적이었습니다. 시간의 층을 천천히 걸은 기분이었어요.', '개항장 골목 안내', '2026.05.20', '2026.05.21', ['인천', '개항장', '골목']),
  createMockStory(40, '송도 바람 부는 산책로', '인천', '인천 연수구', '송도 센트럴파크', '준서', 9, 1, 'default-travel-1.png', '송도 센트럴파크 산책로에서 주변 정리를 했어요. 높은 건물 사이로 물길이 조용히 이어졌습니다. 도시는 반듯했지만 바람은 자유로웠습니다.', '송도 공원 산책로 정리', '2026.04.30', '2026.05.01', ['송도', '공원', '물길']),
  createMockStory(41, '대구 골목의 오래된 그늘', '대구', '대구 중구', '근대골목', '하린', 10, 2, 'city-travel-3.png', '대구 근대골목을 따라 작은 안내 활동을 했어요. 오래된 벽과 나무 그늘이 번갈아 나타났습니다. 더운 날이었지만 골목 안쪽은 의외로 차분했습니다.', '대구 근대골목 안내', '2026.05.14', '2026.05.15', ['대구', '근대골목', '그늘']),
  createMockStory(42, '수성못 저녁 산책', '대구', '대구 수성구', '수성못', '유림', 8, 1, 'default-travel-1.png', '수성못 주변에서 산책로 정리를 도왔어요. 저녁이 되자 물가의 조명이 하나씩 켜졌습니다. 활동보다 산책에 가까운 편안한 시간이었습니다.', '수성못 산책로 정리', '2026.04.16', '2026.04.17', ['수성못', '저녁', '산책']),
  createMockStory(43, '광주 양림동의 낮은 언덕', '광주', '광주 남구', '양림동 역사문화마을', '소율', 12, 1, 'city-travel-2.png', '양림동의 낮은 언덕길에서 마을 안내를 도왔어요. 오래된 집과 작은 카페가 나란히 있는 풍경이 담백했습니다. 천천히 올라가야 보이는 동네였습니다.', '양림동 마을길 안내', '2026.05.02', '2026.05.03', ['광주', '양림동', '언덕']),
  createMockStory(44, '무등산 입구의 초록', '광주', '광주 동구', '무등산 증심사 입구', '태린', 9, 2, 'forest-trail-3.png', '무등산 입구에서 산책로 주변을 정리했어요. 이른 시간의 초록은 선명하고 공기는 가벼웠습니다. 산을 오르기 전 마음을 고르는 시간 같았습니다.', '무등산 입구 산책로 정리', '2026.04.18', '2026.04.19', ['무등산', '초록', '산책로']),
  createMockStory(45, '대전천 옆 작은 길', '대전', '대전 중구', '대전천 산책로', '승아', 8, 1, 'default-travel-1.png', '대전천 산책로를 따라 걸으며 주변을 정리했어요. 낮은 물소리와 자전거 지나가는 소리가 번갈아 들렸습니다. 조용히 움직이기 좋은 길이었습니다.', '대전천 산책로 정비', '2026.05.06', '2026.05.07', ['대전천', '산책로', '물소리']),
  createMockStory(46, '유성 온천길의 밤공기', '대전', '대전 유성구', '유성온천거리', '도윤', 7, 1, 'city-travel-2.png', '유성 온천길 작은 행사에서 안내를 도왔어요. 밤공기가 따뜻했고 거리의 불빛이 물 위에 비쳤습니다. 여행의 마지막 산책처럼 느껴졌습니다.', '유성 온천거리 행사 도우미', '2026.04.12', '2026.04.13', ['유성', '밤공기', '온천길']),
  createMockStory(47, '울산 태화강의 초록 물결', '울산', '울산 중구', '태화강 국가정원', '예린', 13, 2, 'rural-village-2.png', '태화강 국가정원에서 산책로 주변을 정리했어요. 강 옆의 초록은 넓고 부드러웠습니다. 걷는 사람들의 속도까지 조금 느려지는 곳이었습니다.', '태화강 국가정원 정리', '2026.05.25', '2026.05.26', ['울산', '태화강', '정원']),
  createMockStory(48, '간절곶 바다 앞에서', '울산', '울산 울주군', '간절곶', '서진', 10, 1, 'beach-cleanup-2.png', '간절곶 바다 앞에서 해안 주변을 정리했어요. 바람이 세서 말이 자주 끊겼지만 풍경은 선명했습니다. 멀리 등대가 하루의 기준처럼 서 있었습니다.', '간절곶 해안 쓰담 걷기', '2026.04.29', '2026.04.30', ['간절곶', '등대', '바다']),
  createMockStory(49, '청주 오래된 골목의 오후', '충북', '청주시', '수암골', '이솔', 9, 1, 'city-travel-1.png', '수암골 골목에서 마을 안내를 도왔어요. 벽화보다 조용한 계단과 낮은 지붕이 더 오래 눈에 들어왔습니다. 오후가 천천히 내려앉는 동네였습니다.', '청주 수암골 안내', '2026.05.13', '2026.05.14', ['청주', '수암골', '오후']),
  createMockStory(50, '제천 호숫가의 맑은 숨', '충북', '제천시', '청풍호', '하람', 11, 2, 'default-travel-2.png', '청풍호 가까이에서 산책로 주변을 정리했어요. 물빛이 맑아 걷는 내내 숨이 조금 깊어졌습니다. 조용한 풍경이 긴 여행보다 넉넉하게 남았습니다.', '청풍호 산책로 정리', '2026.04.05', '2026.04.06', ['제천', '청풍호', '호숫가']),
];

export function RegionMapView({
  onNavigate,
  onCreateStory,
  selectedRegion,
  onSelectRegion,
  storyInteractions,
  userStories = [],
}: RegionMapViewProps) {
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [commentStory, setCommentStory] = useState<StoryItem | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<'recent' | 'current-location' | null>(null);
  const [recentFullStoryCount, setRecentFullStoryCount] = useState(storyListPageSize);
  const stories = [...userStories, ...mockStories];
  const currentRegion = '부산';
  const visibleStories = selectedRegion
    ? stories.filter((s) => s.region === selectedRegion)
    : stories;
  const recentStories = visibleStories.slice(0, 5);
  const selectedRegionLabel =
    [...regions, jejuRegion].find((region) => region.name === selectedRegion)?.label ?? selectedRegion;
  const currentRegionStories = stories.filter((story) => story.region === currentRegion).slice(0, 5);
  const fullStoryList =
    activeStoryList === 'current-location'
      ? stories.filter((story) => story.region === currentRegion)
      : stories;
  const isRecentFullStoryList = activeStoryList === 'recent';
  const visibleFullStoryList = isRecentFullStoryList
    ? fullStoryList.slice(0, recentFullStoryCount)
    : fullStoryList;
  const hasMoreRecentFullStories = isRecentFullStoryList && recentFullStoryCount < fullStoryList.length;
  const fullStoryListTitle = activeStoryList === 'current-location' ? '현재 위치 스토리' : '최근 올라온 스토리';

  useLayoutEffect(() => {
    scrollToTop();
  }, [activeStoryList]);

  const renderStoryCard = (story: StoryItem) => (
    <StoryCard
      key={story.id}
      story={story}
      onClick={setSelectedStory}
      isLiked={storyInteractions.isStoryLiked(story.id)}
      likeCount={storyInteractions.getStoryLikeCount(story)}
      commentCount={storyInteractions.getStoryCommentCount(story)}
      onToggleLike={(nextStory) => storyInteractions.onToggleStoryLike(nextStory.id)}
      onOpenComments={setCommentStory}
    />
  );

  return (
    <>
      <PageShell backgroundColor="#fafaf8">
        {/* Header */}
        {activeStoryList ? (
          <header
            className="sison-top-bar sticky top-0 z-20 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(250,250,248,0.92)' }}
          >
            <div className="px-5 py-3.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveStoryList(null)}
                className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#2a2a2a]" strokeWidth={2} />
              </button>
              <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">{fullStoryListTitle}</h2>
            </div>
          </header>
        ) : (
          <header
            className="sison-top-bar sticky top-0 z-20 backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(250,250,248,0.92)' }}
          >
            <div className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#2a2a2a] leading-tight">스토리</h2>
                <p className="text-[12px] text-[#aaa] mt-0.5">
                  여행지에서 남겨진 작은 시선을 둘러보세요.
                </p>
              </div>
              <button
                type="button"
                onClick={onCreateStory}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: '#6fb58a',
                  boxShadow: '0 3px 10px rgba(111,181,138,0.38)',
                }}
              >
                <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </header>
        )}

        {activeStoryList ? (
          <section className="px-5 pt-3 pb-24">
            {fullStoryList.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[13px] text-[#bbb] mb-1">아직 남겨진 시선이 없어요</p>
                <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}
              >
                {visibleFullStoryList.map((story) => renderStoryCard(story))}
              </div>
            )}

            {hasMoreRecentFullStories && (
              <div className="pt-5 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setRecentFullStoryCount((currentCount) => currentCount + storyListPageSize)}
                  className="px-6 py-2.5 rounded-full border border-black/10 bg-white text-[13px] text-[#555] font-medium disabled:opacity-50 transition-opacity active:bg-black/5"
                >
                  더보기
                </button>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Map Section */}
            <section className="px-5 pt-3 pb-4">
              <div
                className="relative w-full overflow-hidden rounded-3xl"
                style={{
                  height: 'clamp(345px, 90vw, 365px)',
                  background:
                    'linear-gradient(145deg, #fbf7ee 0%, #eef7f0 52%, #f8f4e9 100%)',
                  boxShadow:
                    '0 12px 28px rgba(83,102,85,0.08), inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -22px 44px rgba(170,190,171,0.08)',
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(251,247,238,0.32) 0%, rgba(251,247,238,0) 18%, rgba(251,247,238,0) 78%, rgba(248,244,233,0.24) 100%)',
                  }}
                />

                <div
                  className="absolute inset-0 overflow-hidden rounded-3xl"
                  style={{
                    margin: '8px',
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 overflow-hidden"
                    style={{
                      bottom: '0px',
                    }}
                  >
                    <div
                      className="absolute max-w-none"
                      style={{
                        left: mainlandImagePlacement.left,
                        top: mainlandImagePlacement.top,
                        width: mainlandImagePlacement.width,
                        aspectRatio: `${mapViewBox.width} / ${mapViewBox.height}`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <img
                        src="/sison-korea-admin-map.svg"
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full select-none object-contain"
                        draggable={false}
                        style={{
                          opacity: mainlandImagePlacement.opacity,
                        }}
                      />

                      {/* Mainland region buttons */}
                      {regions.map((region) => {
                        const isSelected = selectedRegion === region.name;
                        const isOtherSelected = selectedRegion !== null && !isSelected;

                        return (
                          <button
                            type="button"
                            key={region.name}
                            aria-label={`${region.label ?? region.name} 지역 스토리 보기`}
                            onClick={() => onSelectRegion(isSelected ? null : region.name)}
                            className="absolute z-10 flex min-h-11 min-w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-all duration-200 active:scale-[0.98]"
                            style={{
                              top: `${(region.y / mapViewBox.height) * 100}%`,
                              left: `${(region.x / mapViewBox.width) * 100}%`,
                              opacity: isOtherSelected ? 0.56 : 1,
                              transform: isSelected
                                ? 'translate(-50%, -50%) scale(1.06)'
                                : 'translate(-50%, -50%) scale(1)',
                            }}
                          >
                            <span
                              className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] leading-none"
                              style={{
                                fontWeight: isSelected ? 700 : 600,
                                color: isSelected ? '#1e4d38' : '#526258',
                                backgroundColor: isSelected ? 'rgba(155,211,179,0.95)' : 'rgba(255,255,255,0.84)',
                                boxShadow: isSelected
                                  ? '0 0 0 1.5px rgba(80,155,115,0.28), 0 6px 16px rgba(70,130,100,0.22)'
                                  : '0 1px 6px rgba(60,80,65,0.13)',
                                backdropFilter: 'blur(3px)',
                              }}
                            >
                              {region.label ?? region.name}
                            </span>
                            <span className="sr-only">{region.count}개의 스토리</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top fade overlay — softens the sharp map edge at the top */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 right-0 top-0 z-[1]"
                    style={{
                      height: '40px',
                      background:
                        'linear-gradient(to bottom, rgba(251,247,238,0.96) 0%, rgba(238,247,240,0.60) 50%, rgba(251,247,238,0) 100%)',
                    }}
                  />

                  <div
                    className="pointer-events-none absolute bottom-[20px] right-[16px] h-[74px] w-[136px] overflow-hidden rounded-[28px]"
                    style={{
                      background:
                        'radial-gradient(circle at 52% 56%, rgba(255,255,255,0.36), rgba(255,255,255,0) 68%)',
                      boxShadow: '0 10px 22px rgba(90,105,92,0.06)',
                    }}
                  >
                    <img
                      src="/sison-korea-admin-map.svg"
                      alt=""
                      aria-hidden="true"
                      className="absolute max-w-none select-none"
                      draggable={false}
                      style={{
                        width: `${jejuInsetImagePlacement.width}px`,
                        left: `${jejuInsetImagePlacement.left}px`,
                        top: `${jejuInsetImagePlacement.top}px`,
                        opacity: jejuInsetImagePlacement.opacity,
                      }}
                    />
                    {(() => {
                      const isSelected = selectedRegion === jejuRegion.name;
                      const isOtherSelected = selectedRegion !== null && !isSelected;

                      return (
                        <button
                          type="button"
                          aria-label="제주 지역 스토리 보기"
                          onClick={() => onSelectRegion(isSelected ? null : jejuRegion.name)}
                          className="pointer-events-auto absolute bottom-1 right-2 z-10 flex min-h-11 min-w-14 items-center justify-center transition-all duration-200 active:scale-[0.98]"
                          style={{
                            opacity: isOtherSelected ? 0.56 : 1,
                            transform: isSelected
                              ? 'scale(1.06)'
                              : 'scale(1)',
                          }}
                        >
                          <span
                            className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] leading-none"
                            style={{
                              fontWeight: isSelected ? 700 : 600,
                              color: isSelected ? '#1e4d38' : '#526258',
                              backgroundColor: isSelected ? 'rgba(155,211,179,0.95)' : 'rgba(255,255,255,0.84)',
                              boxShadow: isSelected
                                ? '0 0 0 1.5px rgba(80,155,115,0.28), 0 6px 16px rgba(70,130,100,0.22)'
                                : '0 1px 6px rgba(60,80,65,0.13)',
                              backdropFilter: 'blur(3px)',
                            }}
                          >
                            제주
                          </span>
                          <span className="sr-only">{jejuRegion.count}개의 스토리</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </section>

            {selectedRegion ? (
              <section className="pb-6">
                <div className="px-5 mb-3 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-[#2a2a2a]">{selectedRegionLabel}의 스토리</h3>
                  <button
                    type="button"
                    onClick={() => onSelectRegion(null)}
                    className="text-[12px] text-[#999]"
                  >
                    전체보기 →
                  </button>
                </div>

                {visibleStories.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-[13px] text-[#bbb] mb-1">아직 이 지역에 남겨진 시선이 없어요</p>
                    <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
                    {recentStories.map((story) => (
                      <div key={story.id} className="w-[160px] flex-none">
                        {renderStoryCard(story)}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Recent Stories Section */}
                <section className="pb-6">
                  <div className="px-5 mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#2a2a2a]">최근 올라온 스토리</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentFullStoryCount(storyListPageSize);
                        setActiveStoryList('recent');
                      }}
                      className="text-[12px] text-[#999]"
                    >
                      전체보기 →
                    </button>
                  </div>

                  {visibleStories.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <p className="text-[13px] text-[#bbb] mb-1">아직 이 지역에 남겨진 시선이 없어요</p>
                      <p className="text-[11px] text-[#ccc]">첫 번째 기록을 남겨보세요</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
                      {recentStories.map((story) => (
                        <div key={story.id} className="w-[160px] flex-none">
                          {renderStoryCard(story)}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="pb-6">
                  <div className="px-5 mb-3 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-[#2a2a2a]">현재 위치 스토리</h3>
                    <button
                      type="button"
                      onClick={() => setActiveStoryList('current-location')}
                      className="text-[12px] text-[#999]"
                    >
                      전체보기 →
                    </button>
                  </div>

                  {currentRegionStories.length === 0 ? (
                    <div className="px-5">
                      <p className="text-[13px] leading-5 text-[#bbb]">아직 이 근처의 스토리가 많지 않아요.</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
                      {currentRegionStories.map((story) => (
                        <div key={story.id} className="w-[160px] flex-none">
                          {renderStoryCard(story)}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </PageShell>

      <StoryDetailSheet
        story={selectedStory}
        isOpen={selectedStory !== null}
        onClose={() => setSelectedStory(null)}
        isLiked={selectedStory ? storyInteractions.isStoryLiked(selectedStory.id) : false}
        likeCount={selectedStory ? storyInteractions.getStoryLikeCount(selectedStory) : undefined}
        commentCount={selectedStory ? storyInteractions.getStoryCommentCount(selectedStory) : undefined}
        comments={selectedStory ? storyInteractions.getStoryComments(selectedStory.id) : []}
        onToggleLike={(story) => storyInteractions.onToggleStoryLike(story.id)}
        onOpenComments={setCommentStory}
        onAddComment={(story, body) => storyInteractions.onAddStoryComment(story.id, body)}
      />

      <StoryCommentSheet
        story={commentStory}
        isOpen={commentStory !== null}
        comments={commentStory ? storyInteractions.getStoryComments(commentStory.id) : []}
        onClose={() => setCommentStory(null)}
        onAddComment={(body) => {
          if (!commentStory) return;
          storyInteractions.onAddStoryComment(commentStory.id, body);
        }}
        onUpdateComment={(commentId, body) => {
          if (!commentStory) return;
          storyInteractions.onUpdateStoryComment(commentStory.id, commentId, body);
        }}
        onDeleteComment={(commentId) => {
          if (!commentStory) return;
          storyInteractions.onDeleteStoryComment(commentStory.id, commentId);
        }}
      />

      <BottomTabBar activeTab="story" onNavigate={onNavigate} />
    </>
  );
}
