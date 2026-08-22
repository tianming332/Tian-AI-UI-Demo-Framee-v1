import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Props = {
  /** 需要被容纳的内容尺寸（机身外框） */
  contentWidth: number;
  contentHeight: number;
  /** 舞台四周留白 */
  gutter?: number;
  /** 是否允许放大超过 1 倍，默认不允许 */
  allowUpscale?: boolean;
  children: ReactNode;
};

/** 自动把机身缩放到当前可视区域内，用户永远不需要调 Scale */
export default function Stage({
  contentWidth,
  contentHeight,
  gutter = 48,
  allowUpscale = false,
  children,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const measure = useCallback(() => {
    const host = hostRef.current;
    if (!host || !contentWidth || !contentHeight) return;
    const availableW = Math.max(host.clientWidth - gutter, 120);
    const availableH = Math.max(host.clientHeight - gutter, 120);
    const next = Math.min(availableW / contentWidth, availableH / contentHeight, allowUpscale ? 4 : 1);
    setScale(Number(next.toFixed(4)));
  }, [allowUpscale, contentHeight, contentWidth, gutter]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="stage" ref={hostRef}>
      <div
        className="stage-inner"
        style={{
          width: contentWidth,
          height: contentHeight,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
