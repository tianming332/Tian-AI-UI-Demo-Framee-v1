import { useState } from 'react';
import { BACK_TARGET } from '../types';
import type { Screen, Transition } from '../types';

type Props = {
  screens: Screen[];
  urls: Record<string, string>;
  currentScreenId: string;
  initialTarget?: string;
  initialTransition?: Transition;
  title?: string;
  onConfirm: (target: string, transition: Transition) => void;
  onCancel: () => void;
};

const TRANSITIONS: Array<{ value: Transition; label: string }> = [
  { value: 'push', label: '右侧滑入' },
  { value: 'fade', label: '淡入' },
  { value: 'none', label: '直接切换' },
];

export default function TargetPicker(props: Props) {
  const { screens, urls, currentScreenId, initialTarget, initialTransition, title, onConfirm, onCancel } = props;
  const [target, setTarget] = useState(initialTarget ?? '');
  const [transition, setTransition] = useState<Transition>(initialTransition ?? 'push');
  const options = screens.filter((s) => s.id !== currentScreenId);

  return (
    <div className="modal-mask" role="dialog" aria-modal="true" aria-label="选择跳转目标">
      <div className="modal">
        <h3 className="modal-title">{title ?? '点这里之后，跳到哪一页？'}</h3>

        <div className="picker-grid">
          {options.map((screen) => (
            <button
              key={screen.id}
              type="button"
              className={`picker-item${target === screen.id ? ' is-active' : ''}`}
              onClick={() => setTarget(screen.id)}
            >
              {urls[screen.id] ? <img src={urls[screen.id]} alt="" /> : <span className="picker-empty" />}
              <span className="picker-name">{screen.name}</span>
            </button>
          ))}
          <button
            type="button"
            className={`picker-item picker-back${target === BACK_TARGET ? ' is-active' : ''}`}
            onClick={() => setTarget(BACK_TARGET)}
          >
            <span className="picker-back-icon" aria-hidden="true">←</span>
            <span className="picker-name">返回上一页</span>
          </button>
        </div>

        {!options.length && <p className="modal-hint">再导入一张图片即可建立跳转。</p>}

        <div className="modal-row">
          <span className="modal-label">转场</span>
          <div className="modal-chips">
            {TRANSITIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`chip${transition === item.value ? ' is-active' : ''}`}
                onClick={() => setTransition(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel}>取消</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!target}
            onClick={() => target && onConfirm(target, transition)}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
