import { useEffect, useRef, useState } from 'react';
import { loadPersisted, savePersisted } from './storage';
import type { Project } from '../types';

const DEBOUNCE = 400;

type Options = {
  project: Project | null;
  blobs: { current: Map<string, Blob> };
  onRestore: (project: Project, assets: Array<{ screenId: string; blob: Blob }>) => void;
};

/**
 * 自动保存与恢复：启动时读回上次的工程，之后每次改动 400ms 防抖写入 IndexedDB。
 * 读写任一环节失败即切换为内存模式，由界面提示学生及时导出。
 */
export function usePersistence({ project, blobs, onRestore }: Options) {
  const [restored, setRestored] = useState(false);
  const [memoryOnly, setMemoryOnly] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadPersisted()
      .then((data) => {
        if (!alive || !data) return;
        onRestore(data.project, data.assets);
      })
      .catch(() => {
        if (alive) setMemoryOnly(true);
      })
      .finally(() => {
        if (alive) setRestored(true);
      });
    return () => {
      alive = false;
    };
  }, [onRestore]);

  useEffect(() => {
    if (!restored || memoryOnly || !project) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      savePersisted(project, blobs.current).catch(() => setMemoryOnly(true));
    }, DEBOUNCE);
    return () => window.clearTimeout(timer.current);
  }, [blobs, memoryOnly, project, restored]);

  return { restored, memoryOnly };
}
