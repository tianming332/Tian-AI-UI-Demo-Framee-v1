import { useRef, useState } from 'react';
import type { DeviceProfile, Project } from '../types';

type Props = {
  project: Project;
  device: DeviceProfile;
  onRename: (name: string) => void;
  onPlay: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onRestart: () => void;
};

export default function Toolbar({ project, device, onRename, onPlay, onExport, onImport, onRestart }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    onRename(draft);
    setEditing(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-brand" aria-label="TJM Framee Design Player">
        <a
          className="tjm-logo-link"
          href="https://tianming332.github.io/JiangmingTian_Portfolio_Final/"
          target="_blank"
          rel="noreferrer"
          aria-label="返回 TJM 个人作品集"
          title="返回 TJM 个人作品集"
        >
          <img src={`${import.meta.env.BASE_URL}brand/tjm-logo.png`} alt="TJM" />
        </a>
        <span className="topbar-brand-rule" />
        <span>
          <strong>FRAMEE</strong>
          <em>DESIGN PLAYER</em>
        </span>
      </div>
      <div className="topbar-title">
        {editing ? (
          <input
            className="topbar-input"
            aria-label="演示名称"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') {
                setDraft(project.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="topbar-name"
            title="点击改名"
            onClick={() => {
              setDraft(project.name);
              setEditing(true);
            }}
          >
            {project.name}
          </button>
        )}
        <span className="device-badge">检测为 {device.label}</span>
      </div>

      <div className="topbar-actions">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>导入</button>
        <button type="button" className="btn" onClick={onExport}>导出</button>
        <button type="button" className="btn" onClick={onRestart}>新建</button>
        <button type="button" className="btn btn-primary btn-play" onClick={onPlay}>
          开始演示 <span aria-hidden="true">▶</span>
        </button>
        <input
          ref={fileRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onImport(file);
          }}
        />
      </div>
    </header>
  );
}
