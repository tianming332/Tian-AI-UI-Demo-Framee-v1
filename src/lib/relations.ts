import { normalizeKey } from './naming';
import type { Screen } from '../types';

export type RelationRow = {
  raw: string;
  fromText: string;
  toText: string;
  fromId?: string;
  toId?: string;
  /** 未匹配原因，供界面提示 */
  problem?: string;
};

export type RelationResult = {
  rows: RelationRow[];
  pairs: Array<[string, string]>;
};

const SPLIT = /→|->|=>|>|,|，|、|\t/;

function findScreen(text: string, screens: Screen[]): Screen | undefined {
  const key = normalizeKey(text);
  if (!key) return undefined;
  const exact = screens.find((s) => normalizeKey(s.name) === key || normalizeKey(s.fileName) === key);
  if (exact) return exact;
  const partial = screens.filter((s) => {
    const name = normalizeKey(s.name);
    return name.includes(key) || key.includes(name);
  });
  return partial.length === 1 ? partial[0] : undefined;
}

/** 解析「首页 → 详情」这类多行文本，逐行给出匹配结果 */
export function parseRelations(text: string, screens: Screen[]): RelationResult {
  const rows: RelationRow[] = [];
  const pairs: Array<[string, string]> = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(SPLIT).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      rows.push({ raw: line, fromText: line, toText: '', problem: '缺少目标页，写成「首页 → 详情」' });
      continue;
    }
    // 支持 A → B → C 连续写法
    for (let i = 0; i < parts.length - 1; i += 1) {
      const fromText = parts[i];
      const toText = parts[i + 1];
      const from = findScreen(fromText, screens);
      const to = findScreen(toText, screens);
      if (!from || !to) {
        rows.push({
          raw: line,
          fromText,
          toText,
          fromId: from?.id,
          toId: to?.id,
          problem: !from && !to ? '两个页名都没匹配上' : `没找到页面「${!from ? fromText : toText}」`,
        });
        continue;
      }
      if (from.id === to.id) {
        rows.push({ raw: line, fromText, toText, problem: '起点和目标是同一页' });
        continue;
      }
      rows.push({ raw: line, fromText, toText, fromId: from.id, toId: to.id });
      if (!pairs.some(([a, b]) => a === from.id && b === to.id)) pairs.push([from.id, to.id]);
    }
  }

  return { rows, pairs };
}
