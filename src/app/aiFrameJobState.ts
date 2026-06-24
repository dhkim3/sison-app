import { useSyncExternalStore } from 'react';
import { storyApi } from './storyInteractionState';

export type AIFrameJobStatus = 'generating' | 'ready' | 'error';

export interface AIFrameJob {
  jobId: string;
  targetKey: string;
  storyId?: number;
  photo: string;
  activity: any;
  storyTitle: string;
  status: AIFrameJobStatus;
  backgroundUrl: string | null;
  overlayUrl: string | null;
  errorMessage: string;
  startedAt: number;
  completedAt: number | null;
  superseded: boolean;
}

interface AIFrameJobSnapshot {
  version: number;
  jobsById: Record<string, AIFrameJob>;
  latestJobIdByTarget: Record<string, string>;
}

interface StartAIFrameJobParams {
  deviceKey: string;
  storyId?: number;
  photo: string;
  activity: any;
  storyTitle: string;
}

let snapshot: AIFrameJobSnapshot = {
  version: 0,
  jobsById: {},
  latestJobIdByTarget: {},
};

const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setSnapshot = (nextSnapshot: AIFrameJobSnapshot) => {
  snapshot = { ...nextSnapshot, version: snapshot.version + 1 };
  emit();
};

export const subscribeAIFrameJobs = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAIFrameJobsSnapshot = () => snapshot;

export const getAIFrameJobById = (jobId: string | null | undefined) =>
  jobId ? snapshot.jobsById[jobId] ?? null : null;

export const makeAIFrameJobTargetKey = ({
  storyId,
  activity,
  photo,
  storyTitle,
}: {
  storyId?: number;
  activity: any;
  photo: string;
  storyTitle: string;
}) => {
  if (storyId !== undefined) return `story:${storyId}`;
  const activityId = activity?.id ?? activity?.title ?? activity?.activityTitle ?? 'activity';
  const photoKey = photo.startsWith('data:') ? photo.slice(0, 96) : photo;
  return `draft:${activityId}:${storyTitle.trim()}:${photoKey}`;
};

export const getLatestAIFrameJobForTarget = (targetKey: string) => {
  const jobId = snapshot.latestJobIdByTarget[targetKey];
  return jobId ? snapshot.jobsById[jobId] ?? null : null;
};

export const useAIFrameJob = (targetKey: string) => {
  useSyncExternalStore(subscribeAIFrameJobs, getAIFrameJobsSnapshot, getAIFrameJobsSnapshot);
  return getLatestAIFrameJobForTarget(targetKey);
};

export const useAIFrameJobs = () => {
  const currentSnapshot = useSyncExternalStore(
    subscribeAIFrameJobs,
    getAIFrameJobsSnapshot,
    getAIFrameJobsSnapshot,
  );
  return Object.values(currentSnapshot.jobsById);
};

async function ensureDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
  const response = await fetch(src, { mode: 'cors', cache: 'reload' });
  if (!response.ok) throw new Error(`Source image fetch failed: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Source image encoding failed'));
    };
    reader.onerror = () => reject(new Error('Source image encoding failed'));
    reader.readAsDataURL(blob);
  });
}

// Vercel 4.5MB 바디 제한 대응: 이미지를 최대 1024px / JPEG 85%로 압축
function compressImageForApi(dataUrl: string, maxPx = 1024, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
      const w = Math.round((img.naturalWidth || img.width) * scale);
      const h = Math.round((img.naturalHeight || img.height) * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const updateJob = (jobId: string, updater: (job: AIFrameJob) => AIFrameJob) => {
  const currentJob = snapshot.jobsById[jobId];
  if (!currentJob) return;
  setSnapshot({
    ...snapshot,
    jobsById: {
      ...snapshot.jobsById,
      [jobId]: updater(currentJob),
    },
  });
};

export const startAIFrameJob = (params: StartAIFrameJobParams) => {
  const targetKey = makeAIFrameJobTargetKey(params);
  const previousJobId = snapshot.latestJobIdByTarget[targetKey];
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  const nextJobsById = { ...snapshot.jobsById };
  if (previousJobId && nextJobsById[previousJobId]) {
    nextJobsById[previousJobId] = {
      ...nextJobsById[previousJobId],
      superseded: true,
    };
  }

  nextJobsById[jobId] = {
    jobId,
    targetKey,
    storyId: params.storyId,
    photo: params.photo,
    activity: params.activity,
    storyTitle: params.storyTitle,
    status: 'generating',
    backgroundUrl: null,
    overlayUrl: null,
    errorMessage: '',
    startedAt,
    completedAt: null,
    superseded: false,
  };

  setSnapshot({
    ...snapshot,
    jobsById: nextJobsById,
    latestJobIdByTarget: {
      ...snapshot.latestJobIdByTarget,
      [targetKey]: jobId,
    },
  });

  void (async () => {
    try {
      const rawDataUrl = await ensureDataUrl(params.photo);
      const sourceDataUrl = await compressImageForApi(rawDataUrl);
      const result = await storyApi.generateCard(params.deviceKey, {
        storyId: params.storyId,
        dataUrl: sourceDataUrl,
        volunteerActivity: params.activity?.title ?? params.activity?.activityTitle ?? '',
        region: params.activity?.region ?? '',
        templateType: 'ai',
      });
      console.log(
        `[AI frame] model=${result.imageModel ?? 'unknown'} ` +
        `quality=${result.imageQuality ?? 'unknown'} ` +
        `size=${result.imageSize ?? 'unknown'} ` +
        `layers=${result.generatedLayers ?? 'unknown'} ` +
        `cost≈${typeof result.estimatedCostUsd === 'number' ? `$${result.estimatedCostUsd.toFixed(3)}` : 'unknown'} ` +
        `time=${(result.elapsedMs / 1000).toFixed(1)}s ` +
        `background=${typeof result.layerTimingsMs?.background === 'number' ? `${(result.layerTimingsMs.background / 1000).toFixed(1)}s` : 'unknown'} ` +
        `overlay=${typeof result.layerTimingsMs?.overlay === 'number' ? `${(result.layerTimingsMs.overlay / 1000).toFixed(1)}s` : 'skipped'}`
      );

      updateJob(jobId, (job) => ({
        ...job,
        status: 'ready',
        backgroundUrl: result.backgroundUrl || result.url,
        overlayUrl: result.overlayUrl || null,
        errorMessage: '',
        completedAt: Date.now(),
        superseded: snapshot.latestJobIdByTarget[targetKey] !== jobId || job.superseded,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      updateJob(jobId, (job) => ({
        ...job,
        status: 'error',
        backgroundUrl: null,
        overlayUrl: null,
        errorMessage: /준비 중/.test(message) ? message : 'AI 프레임 생성에 실패했어요',
        completedAt: Date.now(),
        superseded: snapshot.latestJobIdByTarget[targetKey] !== jobId || job.superseded,
      }));
    }
  })();

  return getAIFrameJobById(jobId);
};
