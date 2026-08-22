import { useState } from 'react';
import type { DeviceProfile, Project } from '../types';
import { screenLayout } from './ScreenView';

type Props = {
  project: Project;
  device: DeviceProfile;
  urls: Record<string, string>;
  currentId: string;
  onSelect: (screenId: string) => void;
  onRename: (screenId: string, name: string) => void;
  onSetStart: (screenId: string) => void;
  onRemove: (screenId: string) => void;
  onMove: (screenId: string, offset: number) => void;
  onAddFiles: (files: FileList | File[]) => void;
};

export default function ScreenRail(props: Props) {
  const { project, device, urls, currentId, onSelect, onRename, onSetStart, onRemove, onMove, onAddFiles } = props;
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState('');

  const commit = (screenId: string) => {
    onRename(screenId, draft);
    setEditing('');
  };

  return (
    <div className="rail">
      <div className="rail-head">
        <span>页面 {project.screens.length}</span>
        <label className="rail-add">
          添加
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files?.length) onAddFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      <ul className="rail-list">
        {project.screens.map((screen, index) => {
          const isStart = screen.id === project.startScreenId;
          const odd = screenLayout(screen, device).mode === 'contain';
          return (
            <li
              key={screen.id}
              className={`rail-item${screen.id === currentId ? ' is-current' : ''}${dragId === screen.id ? ' is-dragging' : ''}`}
              draggable
              onDragStart={() => setDragId(screen.id)}
              onDragEnd={() => setDragId('')}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!dragId || dragId === screen.id) return;
                const from = project.screens.findIndex((s) => s.id === dragId);
                if (from >= 0) onMove(dragId, index - from);
                setDragId('');
              }}
            >
              <button
                type="button"
                className="rail-thumb"
                aria-label={`查看 ${screen.name}`}
                aria-current={screen.id === currentId}
                onClick={() => onSelect(screen.id)}
              >
                {urls[screen.id] ? <img src={urls[screen.id]} alt={screen.name} /> : <span className="rail-thumb-empty" />}
                {isStart && <span className="rail-flag">首页</span>}
                {odd && <span className="rail-flag rail-flag-warn" title="尺寸与其他页面不一致，已居中显示">尺寸不同</span>}
              </button>

              <div className="rail-meta">
                {editing === screen.id ? (
                  <input
                    className="rail-input"
                    aria-label="页面名称"
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => commit(screen.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commit(screen.id);
                      if (event.key === 'Escape') setEditing('');
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="rail-name"
                    title="点击重命名"
                    onClick={() => { setEditing(screen.id); setDraft(screen.name); }}
                  >
                    {index + 1}. {screen.name}
                  </button>
                )}
                <div className="rail-actions">
                  {!isStart && (
                    <button type="button" onClick={() => onSetStart(screen.id)}>设为首页</button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`删除「${screen.name}」？指向它的跳转会一并清除。`)) onRemove(screen.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="rail-hint">拖动可调整顺序，顺序决定播放时的兜底跳转。</p>
    </div>
  );
}
