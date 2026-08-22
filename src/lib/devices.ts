import type { Cutout, DeviceKind, DeviceProfile } from '../types';

export type Size = { width: number; height: number };

type Spec = {
  key: string;
  label: string;
  w: number;
  h: number;
  kind: DeviceKind;
  radius: number;
  bezel: number;
  topCutout: Cutout;
  homeIndicator: boolean;
};

/** 逻辑像素（@1x）机型库，竖屏尺寸 */
const LIBRARY: Spec[] = [
  { key: 'iphone-se1', label: 'iPhone SE（一代）', w: 320, h: 568, kind: 'phone', radius: 6, bezel: 14, topCutout: 'none', homeIndicator: false },
  { key: 'iphone-se', label: 'iPhone SE / 8', w: 375, h: 667, kind: 'phone', radius: 6, bezel: 14, topCutout: 'none', homeIndicator: false },
  { key: 'iphone-x', label: 'iPhone X / 11 Pro', w: 375, h: 812, kind: 'phone', radius: 40, bezel: 10, topCutout: 'notch', homeIndicator: true },
  { key: 'iphone-13', label: 'iPhone 13 / 14', w: 390, h: 844, kind: 'phone', radius: 44, bezel: 10, topCutout: 'notch', homeIndicator: true },
  { key: 'iphone-15', label: 'iPhone 15 / 16', w: 393, h: 852, kind: 'phone', radius: 46, bezel: 10, topCutout: 'island', homeIndicator: true },
  { key: 'iphone-16', label: 'iPhone 16', w: 402, h: 874, kind: 'phone', radius: 46, bezel: 10, topCutout: 'island', homeIndicator: true },
  { key: 'iphone-11', label: 'iPhone 11 / XR', w: 414, h: 896, kind: 'phone', radius: 44, bezel: 10, topCutout: 'notch', homeIndicator: true },
  { key: 'iphone-14-max', label: 'iPhone 14 Plus / Pro Max', w: 428, h: 926, kind: 'phone', radius: 48, bezel: 10, topCutout: 'island', homeIndicator: true },
  { key: 'iphone-15-max', label: 'iPhone 15 / 16 Pro Max', w: 430, h: 932, kind: 'phone', radius: 48, bezel: 10, topCutout: 'island', homeIndicator: true },
  { key: 'android-compact', label: 'Android 紧凑机型', w: 360, h: 640, kind: 'phone', radius: 26, bezel: 10, topCutout: 'none', homeIndicator: false },
  { key: 'android', label: 'Android 常见机型', w: 360, h: 800, kind: 'phone', radius: 32, bezel: 10, topCutout: 'none', homeIndicator: false },
  { key: 'android-large', label: 'Android 大屏机型', w: 412, h: 915, kind: 'phone', radius: 34, bezel: 10, topCutout: 'none', homeIndicator: false },
  { key: 'ipad-mini', label: 'iPad mini', w: 744, h: 1133, kind: 'tablet', radius: 24, bezel: 14, topCutout: 'none', homeIndicator: true },
  { key: 'ipad-9', label: 'iPad（9 代）', w: 768, h: 1024, kind: 'tablet', radius: 12, bezel: 26, topCutout: 'none', homeIndicator: false },
  { key: 'ipad-air', label: 'iPad Air', w: 820, h: 1180, kind: 'tablet', radius: 22, bezel: 14, topCutout: 'none', homeIndicator: true },
  { key: 'ipad-pro-11', label: 'iPad Pro 11"', w: 834, h: 1194, kind: 'tablet', radius: 22, bezel: 14, topCutout: 'none', homeIndicator: true },
  { key: 'ipad-pro-13', label: 'iPad Pro 12.9"', w: 1024, h: 1366, kind: 'tablet', radius: 22, bezel: 14, topCutout: 'none', homeIndicator: true },
  { key: 'android-tablet', label: 'Android 平板', w: 800, h: 1280, kind: 'tablet', radius: 20, bezel: 14, topCutout: 'none', homeIndicator: false },
];

const TOLERANCE = 0.025;
const RATIO_TOLERANCE = 0.02;

function matchSpec(w: number, h: number): Spec | null {
  let best: Spec | null = null;
  let bestScore = Infinity;
  for (const spec of LIBRARY) {
    const dw = Math.abs(w - spec.w) / spec.w;
    const dh = Math.abs(h - spec.h) / spec.h;
    const dr = Math.abs(h / w - spec.h / spec.w) / (spec.h / spec.w);
    if (dw > TOLERANCE || dh > TOLERANCE || dr > RATIO_TOLERANCE) continue;
    const score = dw + dh + dr;
    if (score < bestScore) {
      bestScore = score;
      best = spec;
    }
  }
  return best;
}

/** 出现次数最多的尺寸作为基准 */
export function modeSize(sizes: Size[]): Size {
  const counter = new Map<string, { size: Size; count: number }>();
  for (const size of sizes) {
    const key = `${size.width}x${size.height}`;
    const hit = counter.get(key);
    if (hit) hit.count += 1;
    else counter.set(key, { size, count: 1 });
  }
  let best = { size: sizes[0], count: 0 };
  for (const item of counter.values()) {
    const larger = item.count === best.count
      && item.size.width * item.size.height > best.size.width * best.size.height;
    if (item.count > best.count || larger) best = item;
  }
  return best.size;
}

/**
 * 倍图归一化：优先选能命中机型库的倍数（@3x 导出的 1170×2532 → 390×844）。
 * 命中不了时，只有当短边明显超出 @1x 设计常用范围（>1200）才做除法，
 * 避免把 1080×2340 这类本就是 @1x 的设计稿误缩小。
 */
export function normalizeScale(base: Size): { scale: number; logical: Size; spec: Spec | null } {
  const candidates: Array<{ scale: number; logical: Size; spec: Spec | null }> = [];
  for (const scale of [1, 2, 3]) {
    if (base.width % scale !== 0 || base.height % scale !== 0) continue;
    const logical = { width: base.width / scale, height: base.height / scale };
    const portrait = logical.width <= logical.height;
    const spec = portrait
      ? matchSpec(logical.width, logical.height)
      : matchSpec(logical.height, logical.width);
    candidates.push({ scale, logical, spec });
  }
  const matched = candidates.filter((item) => item.spec);
  if (matched.length) return matched[matched.length - 1];

  const rawShortSide = Math.min(base.width, base.height);
  if (rawShortSide > 1200) {
    const fitted = candidates.filter((item) => {
      const shortSide = Math.min(item.logical.width, item.logical.height);
      return shortSide >= 320 && shortSide <= 1200;
    });
    if (fitted.length) return fitted[fitted.length - 1];
  }
  return candidates[0] ?? { scale: 1, logical: base, spec: null };
}

function guessKind(logical: Size): DeviceKind {
  const shortSide = Math.min(logical.width, logical.height);
  const ratio = Math.max(logical.width, logical.height) / shortSide;
  const landscape = logical.width > logical.height;
  // 长宽比先判：2:1 上下的稿子一定是手机，哪怕设计尺寸写成 1080×2340
  if (ratio >= 1.7) return 'phone';
  if (landscape && shortSide >= 700) return 'desktop';
  if (shortSide <= 1200) return 'tablet';
  return 'desktop';
}

/** 通用机身外观按逻辑宽度等比推导，保证 1080 宽的设计稿圆角不会偏小 */
function genericLook(kind: DeviceKind, logical: Size): Omit<Spec, 'key' | 'label' | 'w' | 'h' | 'kind'> {
  const shortSide = Math.min(logical.width, logical.height);
  if (kind === 'phone') {
    return {
      radius: Math.round(shortSide * 0.113),
      bezel: Math.max(6, Math.round(shortSide * 0.026)),
      topCutout: 'island',
      homeIndicator: true,
    };
  }
  if (kind === 'tablet') {
    return {
      radius: Math.round(shortSide * 0.027),
      bezel: Math.max(10, Math.round(shortSide * 0.017)),
      topCutout: 'none',
      homeIndicator: true,
    };
  }
  return { radius: 10, bezel: 8, topCutout: 'none', homeIndicator: false };
}

const KIND_LABEL: Record<DeviceKind, string> = { phone: '手机', tablet: '平板', desktop: '桌面' };

export type Detection = {
  device: DeviceProfile;
  base: Size;
  scale: number;
  /** 与基准尺寸不一致的图片索引 */
  oddSizes: number[];
};

export function detectDevice(sizes: Size[]): Detection {
  const base = modeSize(sizes);
  const { scale, logical, spec } = normalizeScale(base);
  const orientation = logical.width <= logical.height ? 'portrait' : 'landscape';
  const kind = spec ? spec.kind : guessKind(logical);
  const look = spec ?? genericLook(kind, logical);
  const sizeText = `${logical.width}×${logical.height}`;
  const orientationText = orientation === 'portrait' ? '竖屏' : '横屏';

  const device: DeviceProfile = {
    key: spec ? `${spec.key}-${orientation}` : `generic-${kind}-${orientation}`,
    label: spec
      ? `${spec.label} · ${sizeText}${orientation === 'landscape' ? ' 横屏' : ''}`
      : `${sizeText} ${KIND_LABEL[kind]}${orientationText}`,
    logicalW: logical.width,
    logicalH: logical.height,
    orientation,
    kind,
    radius: look.radius,
    bezel: look.bezel,
    topCutout: orientation === 'portrait' ? look.topCutout : 'none',
    homeIndicator: look.homeIndicator,
  };

  const oddSizes = sizes
    .map((size, index) => (size.width === base.width && size.height === base.height ? -1 : index))
    .filter((index) => index >= 0);

  return { device, base, scale, oddSizes };
}

/** 机身外观可选档位，仅在用户主动打开外观抽屉时暴露 */
export const LOOK_PRESETS: Array<{ key: string; label: string; patch: Partial<DeviceProfile> }> = [
  { key: 'auto', label: '自动识别', patch: {} },
  { key: 'island', label: '灵动岛', patch: { topCutout: 'island', homeIndicator: true, radius: 46, bezel: 10 } },
  { key: 'notch', label: '刘海屏', patch: { topCutout: 'notch', homeIndicator: true, radius: 44, bezel: 10 } },
  { key: 'plain', label: '无刘海圆角', patch: { topCutout: 'none', homeIndicator: false, radius: 28, bezel: 10 } },
  { key: 'flat', label: '极简边框', patch: { topCutout: 'none', homeIndicator: false, radius: 8, bezel: 4 } },
];
