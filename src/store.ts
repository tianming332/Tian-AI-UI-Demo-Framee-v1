import { useCallback, useMemo, useRef, useState } from 'react';
import { detectDevice } from './lib/devices';
import { importImages } from './lib/importImages';
import { dedupeName } from './lib/naming';
import { BACK_TARGET, createId } from './types';
import type { DeviceProfile, Hotspot, Project, Screen } from './types';

export type Store = ReturnType<typeof useProjectStore>;

function withScreens(project: Project, screens: Screen[]): Project {
  const startExists = screens.some((s) => s.id === project.startScreenId);
  return {
    ...project,
    screens,
    startScreenId: startExists ? project.startScreenId : (screens[0]?.id ?? ''),
  };
}

export function useProjectStore() {
  const [project, setProject] = useState<Project | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const blobs = useRef(new Map<string, Blob>());
  const noticeTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3600);
  }, []);

  const registerAsset = useCallback((screenId: string, blob: Blob) => {
    blobs.current.set(screenId, blob);
    const url = URL.createObjectURL(blob);
    setUrls((current) => {
      if (current[screenId]) URL.revokeObjectURL(current[screenId]);
      return { ...current, [screenId]: url };
    });
  }, []);

  const dropAssets = useCallback((screenIds: string[]) => {
    setUrls((current) => {
      const next = { ...current };
      for (const id of screenIds) {
        if (next[id]) URL.revokeObjectURL(next[id]);
        delete next[id];
        blobs.current.delete(id);
      }
      return next;
    });
  }, []);

  const addFiles = useCallback(async (files: File[] | FileList) => {
    const { images, ignored } = await importImages(files);
    if (!images.length) {
      flash(ignored.length ? `没有可用图片，已忽略 ${ignored.length} 个文件` : '没有读到图片');
      return;
    }

    const taken = new Set((project?.screens ?? []).map((s) => s.name));
    const created: Screen[] = images.map((image) => ({
      id: createId('scr'),
      name: dedupeName(image.name, taken),
      fileName: image.fileName,
      width: image.width,
      height: image.height,
      scale: 1,
      hotspots: [],
      pending: [],
    }));
    images.forEach((image, index) => registerAsset(created[index].id, image.file));

    setProject((current) => {
      if (current) {
        const screens = [...current.screens, ...created];
        return withScreens(current, screens);
      }
      const detection = detectDevice(images.map((i) => ({ width: i.width, height: i.height })));
      const screens = created.map((screen) => ({ ...screen, scale: detection.scale }));
      return {
        version: 1 as const,
        name: '未命名演示',
        device: detection.device,
        screens,
        startScreenId: screens[0].id,
      };
    });

    if (ignored.length) flash(`已忽略 ${ignored.length} 个非图片或超大文件：${ignored.slice(0, 3).join('、')}`);
  }, [flash, project, registerAsset]);

  const patchScreen = useCallback((screenId: string, patch: Partial<Screen>) => {
    setProject((current) => current
      ? withScreens(current, current.screens.map((s) => (s.id === screenId ? { ...s, ...patch } : s)))
      : current);
  }, []);

  const renameScreen = useCallback((screenId: string, name: string) => {
    setProject((current) => {
      if (!current) return current;
      const taken = new Set(current.screens.filter((s) => s.id !== screenId).map((s) => s.name));
      const clean = name.trim() || '未命名页面';
      const unique = taken.has(clean) ? dedupeName(clean, taken) : clean;
      return withScreens(current, current.screens.map((s) => (s.id === screenId ? { ...s, name: unique } : s)));
    });
  }, []);

  const setStartScreen = useCallback((screenId: string) => {
    setProject((current) => (current ? { ...current, startScreenId: screenId } : current));
  }, []);

  const removeScreen = useCallback((screenId: string) => {
    setProject((current) => {
      if (!current) return current;
      const screens = current.screens
        .filter((s) => s.id !== screenId)
        .map((s) => ({
          ...s,
          hotspots: s.hotspots.filter((h) => h.target !== screenId),
          pending: s.pending.filter((t) => t !== screenId),
        }));
      return withScreens(current, screens);
    });
    dropAssets([screenId]);
  }, [dropAssets]);

  const moveScreen = useCallback((screenId: string, offset: number) => {
    setProject((current) => {
      if (!current) return current;
      const index = current.screens.findIndex((s) => s.id === screenId);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.screens.length) return current;
      const screens = [...current.screens];
      const [moved] = screens.splice(index, 1);
      screens.splice(target, 0, moved);
      return { ...current, screens };
    });
  }, []);

  const addHotspot = useCallback((screenId: string, hotspot: Omit<Hotspot, 'id'>) => {
    setProject((current) => {
      if (!current) return current;
      const created: Hotspot = { ...hotspot, id: createId('hs') };
      return withScreens(current, current.screens.map((s) => (s.id === screenId
        ? {
            ...s,
            hotspots: [...s.hotspots, created],
            pending: s.pending.filter((t) => t !== hotspot.target),
          }
        : s)));
    });
  }, []);

  const updateHotspot = useCallback((screenId: string, hotspotId: string, patch: Partial<Hotspot>) => {
    setProject((current) => {
      if (!current) return current;
      return withScreens(current, current.screens.map((s) => (s.id === screenId
        ? { ...s, hotspots: s.hotspots.map((h) => (h.id === hotspotId ? { ...h, ...patch } : h)) }
        : s)));
    });
  }, []);

  const removeHotspot = useCallback((screenId: string, hotspotId: string) => {
    setProject((current) => {
      if (!current) return current;
      return withScreens(current, current.screens.map((s) => (s.id === screenId
        ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) }
        : s)));
    });
  }, []);

  /** 底部 TabBar 场景：把一个热区复制到所有其他页面（目标为本页时改成返回上一页） */
  const applyHotspotToAll = useCallback((screenId: string, hotspotId: string) => {
    setProject((current) => {
      if (!current) return current;
      const source = current.screens.find((s) => s.id === screenId)?.hotspots.find((h) => h.id === hotspotId);
      if (!source) return current;
      let count = 0;
      const screens = current.screens.map((s) => {
        if (s.id === screenId) return s;
        const target = source.target === s.id ? BACK_TARGET : source.target;
        const duplicated = s.hotspots.some((h) => Math.abs(h.x - source.x) < 0.01
          && Math.abs(h.y - source.y) < 0.01 && h.target === target);
        if (duplicated) return s;
        count += 1;
        return { ...s, hotspots: [...s.hotspots, { ...source, id: createId('hs'), target }] };
      });
      if (count) flash(`已复制热区到 ${count} 个页面`);
      return { ...current, screens };
    });
  }, [flash]);

  /** 文本导入的关系：写入源页 pending，播放时可兜底跳转 */
  const applyRelations = useCallback((pairs: Array<[string, string]>) => {
    setProject((current) => {
      if (!current) return current;
      const screens = current.screens.map((screen) => {
        const targets = pairs.filter(([from]) => from === screen.id).map(([, to]) => to);
        if (!targets.length) return screen;
        const placed = new Set(screen.hotspots.map((h) => h.target));
        const merged = [...screen.pending];
        for (const target of targets) {
          if (target !== screen.id && !placed.has(target) && !merged.includes(target)) merged.push(target);
        }
        return { ...screen, pending: merged };
      });
      return { ...current, screens };
    });
  }, []);

  const setDeviceOverride = useCallback((patch: Partial<DeviceProfile> | undefined) => {
    setProject((current) => (current ? { ...current, deviceOverride: patch } : current));
  }, []);

  const renameProject = useCallback((name: string) => {
    setProject((current) => (current ? { ...current, name: name.trim() || '未命名演示' } : current));
  }, []);

  const loadProject = useCallback((next: Project, assets: Array<{ screenId: string; blob: Blob }>) => {
    setUrls((current) => {
      for (const url of Object.values(current)) URL.revokeObjectURL(url);
      return {};
    });
    blobs.current.clear();
    for (const asset of assets) registerAsset(asset.screenId, asset.blob);
    setProject(next);
  }, [registerAsset]);

  const resetProject = useCallback(() => {
    setUrls((current) => {
      for (const url of Object.values(current)) URL.revokeObjectURL(url);
      return {};
    });
    blobs.current.clear();
    setProject(null);
  }, []);

  // APPEND-STORE-ACTIONS-2

  return useMemo(
    () => ({
      project,
      urls,
      notice,
      blobs,
      flash,
      addFiles,
      setProject,
      registerAsset,
      dropAssets,
      patchScreen,
      renameScreen,
      setStartScreen,
      removeScreen,
      moveScreen,
      addHotspot,
      updateHotspot,
      removeHotspot,
      applyHotspotToAll,
      applyRelations,
      setDeviceOverride,
      renameProject,
      loadProject,
      resetProject,
    }),
    [
      project, urls, notice, flash, addFiles, registerAsset, dropAssets, patchScreen,
      renameScreen, setStartScreen, removeScreen, moveScreen, addHotspot, updateHotspot,
      removeHotspot, applyHotspotToAll, applyRelations, setDeviceOverride, renameProject,
      loadProject, resetProject,
    ],
  );
}
