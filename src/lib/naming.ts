/** 文件名 → 页面名与排序序号 */

const SEQ_PREFIX = /^\s*(\d{1,3})\s*[._\-–)、]+\s*/;
const AT_SCALE = /@([123])x$/i;

export type ParsedName = {
  name: string;
  order: number | null;
};

export function parseFileName(fileName: string): ParsedName {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '');
  const seq = base.match(SEQ_PREFIX);
  let name = seq ? base.slice(seq[0].length) : base;
  name = name.replace(AT_SCALE, '').replace(/[_-]+/g, ' ').trim();
  return {
    name: name || base,
    order: seq ? Number(seq[1]) : null,
  };
}

/** 重名时追加 (2)(3)… */
export function dedupeName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) {
    taken.add(name);
    return name;
  }
  let i = 2;
  while (taken.has(`${name} (${i})`)) i += 1;
  const next = `${name} (${i})`;
  taken.add(next);
  return next;
}

/** 关系文本匹配用的归一化键 */
export function normalizeKey(text: string): string {
  return text
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(SEQ_PREFIX, '')
    .replace(AT_SCALE, '')
    .replace(/[\s_\-·]+/g, '')
    .toLowerCase();
}

/** 有序号的按序号排，其余按文件名自然序排在后面 */
export function compareParsed(
  a: { order: number | null; fileName: string },
  b: { order: number | null; fileName: string },
): number {
  if (a.order !== null && b.order !== null) return a.order - b.order;
  if (a.order !== null) return -1;
  if (b.order !== null) return 1;
  return a.fileName.localeCompare(b.fileName, 'zh-Hans-CN', { numeric: true });
}
