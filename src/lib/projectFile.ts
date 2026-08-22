import type { Project, Screen } from '../types';

export const FILE_FORMAT = 'uiplay';
export const FILE_VERSION = 1;
export const FILE_EXT = '.uiplay.json';

type Asset = { screenId: string; dataUrl: string };

export type ProjectFile = {
  format: typeof FILE_FORMAT;
  version: number;
  project: Project;
  assets: Asset[];
};

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

async function fromDataUrl(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function safeFileName(name: string): string {
  const clean = name.trim().replace(/[\\/:*?"<>|]/g, '_') || '未命名演示';
  return clean + FILE_EXT;
}

/** 导出为单个 *.uiplay.json：图片以 base64 内嵌，换电脑也能打开 */
export async function exportProject(project: Project, blobs: Map<string, Blob>): Promise<void> {
  const assets: Asset[] = [];
  for (const screen of project.screens) {
    const blob = blobs.get(screen.id);
    if (blob) assets.push({ screenId: screen.id, dataUrl: await toDataUrl(blob) });
  }
  const payload: ProjectFile = { format: FILE_FORMAT, version: FILE_VERSION, project, assets };
  const file = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFileName(project.name);
  link.click();
  URL.revokeObjectURL(url);
}

function isScreen(value: unknown): value is Screen {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<Screen>;
  return typeof s.id === 'string'
    && typeof s.name === 'string'
    && typeof s.width === 'number'
    && typeof s.height === 'number'
    && typeof s.scale === 'number'
    && Array.isArray(s.hotspots)
    && Array.isArray(s.pending);
}

function validate(raw: unknown): ProjectFile {
  if (!raw || typeof raw !== 'object') throw new Error('文件内容不是工程数据');
  const file = raw as Partial<ProjectFile>;
  if (file.format !== FILE_FORMAT) throw new Error('这不是设计稿播放器的工程文件');
  if (file.version !== FILE_VERSION) throw new Error(`工程文件版本不支持（${String(file.version)}）`);
  const project = file.project;
  if (!project || typeof project !== 'object') throw new Error('工程文件缺少工程信息');
  if (typeof project.name !== 'string' || !project.device || typeof project.startScreenId !== 'string') {
    throw new Error('工程文件缺少必要字段');
  }
  if (!Array.isArray(project.screens) || !project.screens.length) throw new Error('工程文件里没有页面');
  if (!project.screens.every(isScreen)) throw new Error('工程文件的页面数据不完整');
  if (!Array.isArray(file.assets) || !file.assets.length) throw new Error('工程文件里没有图片');
  return { format: FILE_FORMAT, version: FILE_VERSION, project, assets: file.assets };
}

/** 导入工程文件：任一步失败都抛错，由调用方保留当前工程不被覆盖 */
export async function importProject(file: File): Promise<{
  project: Project;
  assets: Array<{ screenId: string; blob: Blob }>;
}> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new Error('文件不是有效的 JSON，可能已损坏');
  }
  const parsed = validate(raw);
  const ids = new Set(parsed.project.screens.map((s) => s.id));
  const assets: Array<{ screenId: string; blob: Blob }> = [];
  for (const asset of parsed.assets) {
    if (!ids.has(asset.screenId) || typeof asset.dataUrl !== 'string') continue;
    assets.push({ screenId: asset.screenId, blob: await fromDataUrl(asset.dataUrl) });
  }
  if (!assets.length) throw new Error('工程文件里的图片无法读取');
  return { project: parsed.project, assets };
}
