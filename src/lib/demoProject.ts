import { detectDevice } from './devices';
import { BACK_TARGET } from '../types';
import type { Hotspot, Project, Screen, Transition } from '../types';

type DemoPage = {
  id: string;
  name: string;
  file: string;
};

const DEMO_PAGES: DemoPage[] = [
  { id: 'demo-01', name: '启动页', file: 'page-01.png' },
  { id: 'demo-02', name: '引导页', file: 'page-02.png' },
  { id: 'demo-03', name: '首页', file: 'page-03.png' },
  { id: 'demo-04', name: '发现', file: 'page-04.png' },
  { id: 'demo-05', name: '内容详情', file: 'page-05.png' },
  { id: 'demo-06', name: '我的收藏', file: 'page-06.png' },
  { id: 'demo-07', name: '消息', file: 'page-07.png' },
  { id: 'demo-08', name: '通知', file: 'page-08.png' },
  { id: 'demo-09', name: '个人中心', file: 'page-09.png' },
  { id: 'demo-10', name: '设置', file: 'page-10.png' },
];

function hotspot(
  id: string,
  target: string,
  x: number,
  y: number,
  w: number,
  h: number,
  transition: Transition = 'push',
): Hotspot {
  return { id, target, x, y, w, h, transition };
}

const HOTSPOTS: Record<string, Hotspot[]> = {
  'demo-01': [hotspot('demo-hs-01-next', 'demo-02', 0, 0, 1, 1, 'fade')],
  'demo-02': [hotspot('demo-hs-02-start', 'demo-03', 0.08, 0.79, 0.84, 0.075)],
  'demo-03': [
    hotspot('demo-hs-03-detail', 'demo-05', 0.04, 0.19, 0.92, 0.26),
    hotspot('demo-hs-03-discover', 'demo-04', 0.25, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-03-favorite', 'demo-06', 0.5, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-03-profile', 'demo-09', 0.75, 0.91, 0.25, 0.09, 'fade'),
  ],
  'demo-04': [
    hotspot('demo-hs-04-detail', 'demo-05', 0.04, 0.2, 0.92, 0.25),
    hotspot('demo-hs-04-home', 'demo-03', 0, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-04-favorite', 'demo-06', 0.5, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-04-profile', 'demo-09', 0.75, 0.91, 0.25, 0.09, 'fade'),
  ],
  'demo-05': [
    hotspot('demo-hs-05-back', BACK_TARGET, 0, 0, 0.16, 0.12),
    hotspot('demo-hs-05-favorite', 'demo-06', 0.08, 0.81, 0.4, 0.07),
  ],
  'demo-06': [
    hotspot('demo-hs-06-home', 'demo-03', 0, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-06-discover', 'demo-04', 0.25, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-06-profile', 'demo-09', 0.75, 0.91, 0.25, 0.09, 'fade'),
  ],
  'demo-07': [hotspot('demo-hs-07-notice', 'demo-08', 0.04, 0.7, 0.92, 0.1)],
  'demo-08': [hotspot('demo-hs-08-back', 'demo-07', 0, 0, 0.16, 0.12)],
  'demo-09': [
    hotspot('demo-hs-09-settings', 'demo-10', 0.84, 0, 0.16, 0.12),
    hotspot('demo-hs-09-home', 'demo-03', 0, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-09-discover', 'demo-04', 0.25, 0.91, 0.25, 0.09, 'fade'),
    hotspot('demo-hs-09-favorite', 'demo-06', 0.5, 0.91, 0.25, 0.09, 'fade'),
  ],
  'demo-10': [hotspot('demo-hs-10-back', 'demo-09', 0, 0, 0.16, 0.12)],
};

/** Build the bundled 10-screen demo as a normal editable project. */
export async function loadBundledDemo(): Promise<{
  project: Project;
  assets: Array<{ screenId: string; blob: Blob }>;
}> {
  const assets = await Promise.all(DEMO_PAGES.map(async (page) => {
    const url = `${import.meta.env.BASE_URL}demo/${page.file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`示例页面加载失败：${page.name}`);
    return { screenId: page.id, blob: await response.blob() };
  }));

  const detection = detectDevice(DEMO_PAGES.map(() => ({ width: 390, height: 844 })));
  const screens: Screen[] = DEMO_PAGES.map((page) => ({
    id: page.id,
    name: page.name,
    fileName: page.file,
    width: 390,
    height: 844,
    scale: detection.scale,
    hotspots: HOTSPOTS[page.id] ?? [],
    pending: [],
  }));

  return {
    project: {
      version: 1,
      name: '拾光 · 10 页演示',
      device: detection.device,
      screens,
      startScreenId: 'demo-01',
    },
    assets,
  };
}
