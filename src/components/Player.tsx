import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DeviceFrame, { outerSize } from './DeviceFrame';
import ScreenView from './ScreenView';
import Stage from './Stage';
import { BACK_TARGET } from '../types';
import type { DeviceProfile, Project, Screen, Transition } from '../types';

type Props = {
  project: Project;
  device: DeviceProfile;
  urls: Record<string, string>;
  onExit: () => void;
};

type Anim = { fromId: string; transition: Transition; back: boolean } | null;

const DURATION = 240;

function useShelllessPlayer(): boolean {
  const [shellless, setShellless] = useState(() => window.matchMedia('(max-width: 700px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setShellless(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return shellless;
}

export default function Player({ project, device, urls, onExit }: Props) {
  const screens = project.screens;
  const [currentId, setCurrentId] = useState(project.startScreenId || screens[0]?.id || '');
  const [history, setHistory] = useState<string[]>([]);
  const [anim, setAnim] = useState<Anim>(null);
  const [flashing, setFlashing] = useState(false);
  const [alwaysShow, setAlwaysShow] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [tip, setTip] = useState('');
  const pendingCursor = useRef(new Map<string, number>());
  const timers = useRef<number[]>([]);
  const shellless = useShelllessPlayer();

  const current = useMemo(
    () => screens.find((s) => s.id === currentId) ?? screens[0],
    [currentId, screens],
  );
  const previous = useMemo(
    () => (anim ? screens.find((s) => s.id === anim.fromId) : undefined),
    [anim, screens],
  );

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); }, []);

  const goTo = useCallback((targetId: string, transition: Transition, back = false) => {
    if (!targetId || targetId === currentId) return;
    setAnim({ fromId: currentId, transition, back });
    setCurrentId(targetId);
    later(() => setAnim(null), DURATION);
  }, [currentId, later]);

  const goBack = useCallback(() => {
    setHistory((stack) => {
      const last = stack[stack.length - 1];
      if (!last) return stack;
      goTo(last, 'push', true);
      return stack.slice(0, -1);
    });
  }, [goTo]);

  const navigate = useCallback((target: string, transition: Transition) => {
    if (target === BACK_TARGET) {
      goBack();
      return;
    }
    if (!screens.some((s) => s.id === target)) {
      setTip('这个跳转的目标页已被删除');
      later(() => setTip(''), 2000);
      return;
    }
    setHistory((stack) => [...stack, currentId]);
    goTo(target, transition);
  }, [currentId, goBack, goTo, later, screens]);

  const goNext = useCallback(() => {
    const index = screens.findIndex((s) => s.id === currentId);
    const next = screens[index + 1];
    if (!next) return;
    setHistory((stack) => [...stack, currentId]);
    goTo(next.id, 'push');
  }, [currentId, goTo, screens]);

  const flashHotspots = useCallback(() => {
    setFlashing(true);
    later(() => setFlashing(false), 600);
  }, [later]);

  /** 无热区页的兜底：先按 pending 循环，再按页面顺序前进 */
  const fallback = useCallback((screen: Screen) => {
    if (screen.pending.length) {
      const cursor = pendingCursor.current.get(screen.id) ?? 0;
      const target = screen.pending[cursor % screen.pending.length];
      pendingCursor.current.set(screen.id, cursor + 1);
      navigate(target, 'push');
      return;
    }
    const index = screens.findIndex((s) => s.id === screen.id);
    if (screens[index + 1]) {
      setTip('这一页还没有跳转关系，先按页面顺序前进');
      later(() => setTip(''), 2000);
      goNext();
    } else {
      setTip('已经是最后一页，← 可以返回');
      later(() => setTip(''), 2000);
    }
  }, [goNext, later, navigate, screens]);

  const handleScreenClick = useCallback(() => {
    if (!current) return;
    if (current.hotspots.length) flashHotspots();
    else fallback(current);
  }, [current, fallback, flashHotspots]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); goBack(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); goNext(); }
      else if (event.key === 'Escape') {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else onExit();
      } else if (event.key.toLowerCase() === 'h') setAlwaysShow((v) => !v);
      else if (event.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack, goNext, onExit]);

  /** 答辩模式：鼠标静止 2s 后隐藏控制条 */
  useEffect(() => {
    let idle = window.setTimeout(() => setChromeVisible(false), 2400);
    const wake = () => {
      setChromeVisible(true);
      window.clearTimeout(idle);
      idle = window.setTimeout(() => setChromeVisible(false), 2400);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  if (!current) return null;
  const outer = outerSize(device);
  const playerSize = shellless
    ? { width: device.logicalW, height: device.logicalH }
    : outer;
  const showHotspots = alwaysShow || flashing;

  const overlay = (
    <div className="play-layer" onClick={handleScreenClick}>
      {current.hotspots.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          className={`play-hotspot${showHotspots ? ' is-visible' : ''}`}
          style={{
            left: `${hotspot.x * 100}%`,
            top: `${hotspot.y * 100}%`,
            width: `${hotspot.w * 100}%`,
            height: `${hotspot.h * 100}%`,
          }}
          aria-label={hotspot.target === BACK_TARGET
            ? '返回上一页'
            : `跳转到 ${screens.find((s) => s.id === hotspot.target)?.name ?? '目标页'}`}
          onClick={(event) => {
            event.stopPropagation();
            navigate(hotspot.target, hotspot.transition);
          }}
        />
      ))}
    </div>
  );

  const animClass = anim
    ? ` anim-${anim.transition}${anim.back ? ' anim-back' : ''}`
    : '';

  return (
    <div className="player">
      <Stage
        contentWidth={playerSize.width}
        contentHeight={playerSize.height}
        gutter={shellless ? 0 : 48}
        allowUpscale={shellless}
      >
        <DeviceFrame device={device} shadow={false} bare={shellless}>
          <div className={`play-stack${animClass}`}>
            {previous && (
              <div className="play-slot play-slot-out" key={`out-${previous.id}`}>
                <ScreenView screen={previous} url={urls[previous.id]} device={device} />
              </div>
            )}
            <div className="play-slot play-slot-in" key={`in-${current.id}`}>
              <ScreenView screen={current} url={urls[current.id]} device={device} overlay={overlay} />
            </div>
          </div>
        </DeviceFrame>
      </Stage>

      <div className={`play-chrome${chromeVisible ? '' : ' is-hidden'}`}>
        <button type="button" className="play-exit" onClick={onExit}>退出演示（Esc）</button>
        <span className="play-meta">{current.name} · {history.length ? '← 返回' : '点击热区开始'} · H 显示可点区域 · F 全屏</span>
      </div>

      {tip && <div className="toast">{tip}</div>}
    </div>
  );
}
