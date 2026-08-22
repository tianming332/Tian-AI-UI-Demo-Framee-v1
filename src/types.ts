export type Transition = 'push' | 'fade' | 'none';

export const BACK_TARGET = '__back__';

export type Hotspot = {
  id: string;
  /** 归一化坐标，0~1，相对页面图 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 目标 screenId，或 BACK_TARGET 表示返回上一页 */
  target: string;
  transition: Transition;
};

export type Screen = {
  id: string;
  name: string;
  fileName: string;
  /** 图片原始像素 */
  width: number;
  height: number;
  /** 检测到的倍图 */
  scale: number;
  hotspots: Hotspot[];
  /** 文本导入但尚未放置成热区的目标 screenId */
  pending: string[];
};

export type DeviceKind = 'phone' | 'tablet' | 'desktop';
export type Cutout = 'none' | 'notch' | 'island';

export type DeviceProfile = {
  key: string;
  label: string;
  logicalW: number;
  logicalH: number;
  orientation: 'portrait' | 'landscape';
  kind: DeviceKind;
  radius: number;
  bezel: number;
  topCutout: Cutout;
  homeIndicator: boolean;
};

export type Project = {
  version: 1;
  name: string;
  device: DeviceProfile;
  deviceOverride?: Partial<DeviceProfile>;
  screens: Screen[];
  startScreenId: string;
};

/** 运行时图片资源，不进入工程 JSON */
export type ImageAsset = {
  screenId: string;
  blob: Blob;
  url: string;
};

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${(performance.now() * 1000).toFixed(0).slice(-4)}`;
}

export function resolvedDevice(project: Project): DeviceProfile {
  return project.deviceOverride
    ? { ...project.device, ...project.deviceOverride }
    : project.device;
}
