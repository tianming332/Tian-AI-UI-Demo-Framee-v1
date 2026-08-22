import type { CSSProperties, ReactNode } from 'react';
import type { DeviceProfile } from '../types';

type Props = {
  device: DeviceProfile;
  children: ReactNode;
  /** 机身外多余的阴影是否绘制，播放态可关掉更贴近真机 */
  shadow?: boolean;
  /** 手机浏览器播放时去掉机身，让设计稿直接成为整个屏幕 */
  bare?: boolean;
};

export function outerSize(device: DeviceProfile) {
  return {
    width: device.logicalW + device.bezel * 2,
    height: device.logicalH + device.bezel * 2,
  };
}

export default function DeviceFrame({ device, children, shadow = true, bare = false }: Props) {
  const outer = outerSize(device);
  const bodyStyle: CSSProperties = {
    width: bare ? device.logicalW : outer.width,
    height: bare ? device.logicalH : outer.height,
    padding: bare ? 0 : device.bezel,
    borderRadius: bare ? 0 : device.radius + device.bezel,
    boxShadow: shadow && !bare ? '0 24px 60px rgba(18, 22, 32, 0.28)' : 'none',
  };
  const screenStyle: CSSProperties = {
    width: device.logicalW,
    height: device.logicalH,
    borderRadius: bare ? 0 : device.radius,
  };

  return (
    <div className="device-body" style={bodyStyle}>
      <div className="device-screen" style={screenStyle}>
        {children}
        {!bare && device.topCutout !== 'none' && (
          <div className={`device-cutout device-cutout-${device.topCutout}`} aria-hidden="true" />
        )}
        {!bare && device.homeIndicator && <div className="device-home" aria-hidden="true" />}
      </div>
    </div>
  );
}
