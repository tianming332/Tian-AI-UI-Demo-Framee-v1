import { useCallback, useEffect, useRef, useState } from 'react';
import TargetPicker from './TargetPicker';
import { BACK_TARGET } from '../types';
import type { Hotspot, Screen, Transition } from '../types';

type Draft = { x: number; y: number; w: number; h: number };
type DragMode = 'draw' | 'move' | 'nw' | 'ne' | 'sw' | 'se';

type Props = {
  screen: Screen;
  screens: Screen[];
  urls: Record<string, string>;
  selectedId: string;
  onSelect: (hotspotId: string) => void;
  onAdd: (rect: Draft, target: string, transition: Transition) => void;
  onUpdate: (hotspotId: string, patch: Partial<Hotspot>) => void;
  onRemove: (hotspotId: string) => void;
  onApplyToAll: (hotspotId: string) => void;
};

/** 最小热区：短于 12px（渲染像素）视为误操作 */
const MIN_PX = 12;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

function normalize(rect: Draft): Draft {
  const x = Math.min(rect.x, rect.x + rect.w);
  const y = Math.min(rect.y, rect.y + rect.h);
  return { x: clamp01(x), y: clamp01(y), w: Math.min(Math.abs(rect.w), 1 - x), h: Math.min(Math.abs(rect.h), 1 - y) };
}

export default function HotspotLayer(props: Props) {
  const { screen, screens, urls, selectedId, onSelect, onAdd, onUpdate, onRemove, onApplyToAll } = props;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ mode: DragMode; id: string; origin: Draft; startX: number; startY: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingRect, setPendingRect] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState('');

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return { x: 0, y: 0 };
    return { x: (clientX - box.left) / box.width, y: (clientY - box.top) / box.height };
  }, []);

  const beginDrag = (event: React.PointerEvent, mode: DragMode, hotspot?: Hotspot) => {
    event.stopPropagation();
    const point = toNorm(event.clientX, event.clientY);
    const origin = hotspot
      ? { x: hotspot.x, y: hotspot.y, w: hotspot.w, h: hotspot.h }
      : { x: point.x, y: point.y, w: 0, h: 0 };
    drag.current = { mode, id: hotspot?.id ?? '', origin, startX: point.x, startY: point.y };
    if (hotspot) onSelect(hotspot.id);
    else onSelect('');
    setDraft(mode === 'draw' ? origin : null);
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handleMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const point = toNorm(event.clientX, event.clientY);
    const dx = point.x - state.startX;
    const dy = point.y - state.startY;

    if (state.mode === 'draw') {
      setDraft({ x: state.origin.x, y: state.origin.y, w: dx, h: dy });
      return;
    }
    const o = state.origin;
    let next: Draft;
    if (state.mode === 'move') {
      next = {
        x: clamp01(Math.min(Math.max(o.x + dx, 0), 1 - o.w)),
        y: clamp01(Math.min(Math.max(o.y + dy, 0), 1 - o.h)),
        w: o.w,
        h: o.h,
      };
    } else {
      const left = state.mode === 'nw' || state.mode === 'sw';
      const top = state.mode === 'nw' || state.mode === 'ne';
      next = normalize({
        x: left ? o.x + dx : o.x,
        y: top ? o.y + dy : o.y,
        w: left ? o.w - dx : o.w + dx,
        h: top ? o.h - dy : o.h + dy,
      });
    }
    onUpdate(state.id, next);
  };

  const handleUp = () => {
    const state = drag.current;
    drag.current = null;
    if (!state || state.mode !== 'draw') return;
    const rect = draft ? normalize(draft) : null;
    setDraft(null);
    const box = layerRef.current?.getBoundingClientRect();
    if (!rect || !box) return;
    if (rect.w * box.width < MIN_PX || rect.h * box.height < MIN_PX) return;
    setPendingRect(rect);
  };

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onRemove(selectedId);
        onSelect('');
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const source = screen.hotspots.find((h) => h.id === selectedId);
        if (source) {
          onAdd(
            { x: clamp01(source.x + 0.02), y: clamp01(Math.min(source.y + 0.02, 1 - source.h)), w: source.w, h: source.h },
            source.target,
            source.transition,
          );
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAdd, onRemove, onSelect, screen.hotspots, selectedId]);

  const labelOf = (target: string) => (target === BACK_TARGET
    ? '返回上一页'
    : screens.find((s) => s.id === target)?.name ?? '目标已删除');

  const preview = draft ? normalize(draft) : null;

  return (
    <div
      className="hotspot-layer"
      ref={layerRef}
      onPointerDown={(event) => { if (event.button === 0) beginDrag(event, 'draw'); }}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {screen.hotspots.map((hotspot) => {
        const active = hotspot.id === selectedId;
        return (
          <div
            key={hotspot.id}
            className={`hotspot${active ? ' is-active' : ''}`}
            style={{
              left: `${hotspot.x * 100}%`,
              top: `${hotspot.y * 100}%`,
              width: `${hotspot.w * 100}%`,
              height: `${hotspot.h * 100}%`,
            }}
            onPointerDown={(event) => beginDrag(event, 'move', hotspot)}
            onDoubleClick={(event) => { event.stopPropagation(); setEditingId(hotspot.id); }}
          >
            <span className="hotspot-label">{labelOf(hotspot.target)}</span>
            {active && (
              <>
                {(['nw', 'ne', 'sw', 'se'] as const).map((dir) => (
                  <span
                    key={dir}
                    className={`hotspot-handle handle-${dir}`}
                    onPointerDown={(event) => beginDrag(event, dir, hotspot)}
                  />
                ))}
                <div className="hotspot-tools" onPointerDown={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => setEditingId(hotspot.id)}>改目标</button>
                  <button type="button" onClick={() => onApplyToAll(hotspot.id)}>应用到所有页面</button>
                  <button type="button" onClick={() => { onRemove(hotspot.id); onSelect(''); }}>删除</button>
                </div>
              </>
            )}
          </div>
        );
      })}

      {preview && (
        <div
          className="hotspot is-draft"
          style={{
            left: `${preview.x * 100}%`,
            top: `${preview.y * 100}%`,
            width: `${preview.w * 100}%`,
            height: `${preview.h * 100}%`,
          }}
        />
      )}

      {pendingRect && (
        <TargetPicker
          screens={screens}
          urls={urls}
          currentScreenId={screen.id}
          onCancel={() => setPendingRect(null)}
          onConfirm={(target, transition) => {
            onAdd(pendingRect, target, transition);
            setPendingRect(null);
          }}
        />
      )}

      {editingId && (() => {
        const hotspot = screen.hotspots.find((h) => h.id === editingId);
        if (!hotspot) return null;
        return (
          <TargetPicker
            screens={screens}
            urls={urls}
            currentScreenId={screen.id}
            initialTarget={hotspot.target}
            initialTransition={hotspot.transition}
            title="改成跳到哪一页？"
            onCancel={() => setEditingId('')}
            onConfirm={(target, transition) => {
              onUpdate(hotspot.id, { target, transition });
              setEditingId('');
            }}
          />
        );
      })()}
    </div>
  );
}
