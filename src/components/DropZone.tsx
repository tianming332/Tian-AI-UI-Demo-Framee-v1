import { useRef, useState } from 'react';

type Props = {
  onFiles: (files: FileList | File[]) => void;
  onLoadDemo: () => void;
  onOpenProject?: () => void;
  busy?: boolean;
};

export default function DropZone({ onFiles, onLoadDemo, onOpenProject, busy }: Props) {
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`empty-stage${hover ? ' is-dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setHover(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setHover(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setHover(false);
        if (event.dataTransfer.files.length) onFiles(event.dataTransfer.files);
      }}
    >
      <header className="landing-nav">
        <div className="landing-brand">
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
          <span className="landing-brand-rule" />
          <span>
            <strong>FRAMEE</strong>
            <em>DESIGN PLAYER</em>
          </span>
        </div>
        <div className="landing-nav-meta" aria-label="产品特点">
          <span>图片来源无关</span>
          <span>本地运行</span>
          <b>V1.0</b>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-copy">
          <p className="landing-index"><span>01</span> UI DEMO PLAYER</p>
          <h1>
            上传界面。<br />
            连接页面。<br />
            <i>像真机一样播放。</i>
          </h1>
          <p className="landing-lead">
            让你的 UI 设计稿，30 秒变成可以操作的 App Demo。
            系统自动识别尺寸、设备外观与长页面，无需设置画框和缩放。
          </p>

          <div className="landing-actions">
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <span>{busy ? '正在读取图片…' : '上传界面图片'}</span>
              <b aria-hidden="true">↗</b>
            </button>
            <button className="demo-button" type="button" disabled={busy} onClick={onLoadDemo}>
              <span>打开 10 页示例</span>
              <b aria-hidden="true">▶</b>
            </button>
          </div>

          <div className="landing-file-note">
            <span>PNG / JPG / WEBP</span>
            <span>一次多选</span>
            <span>拖入即识别</span>
          </div>

          {onOpenProject && (
            <button className="ghost-link" type="button" onClick={onOpenProject}>
              打开已有演示工程 <span>（.uiplay.json）</span>
            </button>
          )}
        </section>

        <section className="landing-preview" aria-label="内置拾光 UI 演示预览">
          <div className="preview-heading">
            <span>BUILT-IN DEMO</span>
            <strong>390 × 844</strong>
          </div>
          <div className="preview-stage">
            <div className="preview-orbit preview-orbit-one" />
            <div className="preview-orbit preview-orbit-two" />
            <div className="preview-card preview-card-left">
              <img src={`${import.meta.env.BASE_URL}demo/page-04.png`} alt="发现页面预览" />
            </div>
            <div className="preview-phone">
              <img src={`${import.meta.env.BASE_URL}demo/page-03.png`} alt="拾光首页预览" />
            </div>
            <div className="preview-card preview-card-right">
              <img src={`${import.meta.env.BASE_URL}demo/page-09.png`} alt="个人中心预览" />
            </div>
            <span className="preview-note preview-note-top">AUTO DEVICE</span>
            <span className="preview-note preview-note-bottom">10 SCREENS · 22 LINKS</span>
          </div>
          <button className="preview-caption" type="button" disabled={busy} onClick={onLoadDemo}>
            <span>拾光 / 城市灵感生活方式 App</span>
            <b>点击直接体验 →</b>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div><b>01</b><span>自动识别设备<br /><em>AUTO DEVICE</em></span></div>
        <div><b>02</b><span>可视化建立跳转<br /><em>LINK SCREENS</em></span></div>
        <div><b>03</b><span>桌面真机 / 手机全屏<br /><em>PLAY ANYWHERE</em></span></div>
        <p>DESIGNED FOR UI STUDENTS</p>
      </footer>

      {hover && (
        <div className="drop-overlay" aria-hidden="true">
          <strong>松开即可导入</strong>
          <span>系统将自动识别图片尺寸</span>
        </div>
      )}

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
