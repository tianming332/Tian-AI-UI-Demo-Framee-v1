import type { CSSProperties, ReactNode } from 'react';
import type { DeviceProfile, Screen } from '../types';

type Props = {
  screen: Screen;
  url?: string;
  device: DeviceProfile;
  /** 叠加层（热区编辑 / 播放命中层） */
  overlay?: ReactNode;
};

/** 图片在机身内的排布方式：等宽铺满可上下滚动，或尺寸异常时 contain 居中 */
export function screenLayout(screen: Screen, device: DeviceProfile) {
  const logicalW = screen.width / screen.scale;
  const logicalH = screen.height / screen.scale;
  const widthFits = Math.abs(logicalW - device.logicalW) / device.logicalW <= 0.02;
  if (widthFits) {
    const renderedH = Math.round(device.logicalW * (logicalH / logicalW));
    return {
      mode: 'fill' as const,
      width: device.logicalW,
      height: renderedH,
      scrollable: renderedH > device.logicalH + 1,
    };
  }
  const k = Math.min(device.logicalW / logicalW, device.logicalH / logicalH);
  return {
    mode: 'contain' as const,
    width: Math.round(logicalW * k),
    height: Math.round(logicalH * k),
    scrollable: false,
  };
}

export default function ScreenView({ screen, url, device, overlay }: Props) {
  const layout = screenLayout(screen, device);
  const boxStyle: CSSProperties = {
    width: layout.width,
    height: layout.height,
  };

  return (
    <div className={`screen-view screen-view-${layout.mode}${layout.scrollable ? ' is-scrollable' : ''}`}>
      <div className="screen-media" style={boxStyle}>
        {url
          ? <img src={url} alt={screen.name} draggable={false} />
          : <div className="screen-missing">图片未载入</div>}
        {overlay}
      </div>
    </div>
  );
}
