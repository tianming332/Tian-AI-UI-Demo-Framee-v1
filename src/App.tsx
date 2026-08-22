import { useCallback, useEffect, useRef, useState } from 'react';
import DevicePanel from './components/DevicePanel';
import DeviceFrame, { outerSize } from './components/DeviceFrame';
import DropZone from './components/DropZone';
import HotspotLayer from './components/HotspotLayer';
import Player from './components/Player';
import RelationPanel from './components/RelationPanel';
import ScreenRail from './components/ScreenRail';
import ScreenView from './components/ScreenView';
import Stage from './components/Stage';
import Toolbar from './components/Toolbar';
import { loadBundledDemo } from './lib/demoProject';
import { exportProject, importProject } from './lib/projectFile';
import { clearPersisted } from './lib/storage';
import { usePersistence } from './lib/usePersistence';
import { useProjectStore } from './store';
import { resolvedDevice } from './types';

export default function App() {
  const store = useProjectStore();
  const { project, urls, notice, addFiles, setDeviceOverride, blobs, loadProject, resetProject, flash } = store;
  const [busy, setBusy] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [selectedHotspot, setSelectedHotspot] = useState('');
  const [playing, setPlaying] = useState(false);
  const { memoryOnly } = usePersistence({ project, blobs, onRestore: loadProject });
  const openRef = useRef<HTMLInputElement>(null);

  const handleRestart = useCallback(() => {
    if (!window.confirm('清空当前工程，重新开始？导入的图片和跳转关系都会删除，建议先导出保存。')) return;
    clearPersisted().catch(() => undefined);
    resetProject();
    setPlaying(false);
  }, [resetProject]);

  const handleExport = useCallback(async () => {
    if (!project) return;
    try {
      await exportProject(project, blobs.current);
      flash('已导出工程文件，换电脑也能打开');
    } catch {
      flash('导出失败，请重试');
    }
  }, [blobs, flash, project]);

  /** 导入失败时不动当前工程，只提示原因 */
  const handleImport = useCallback(async (file: File) => {
    setBusy(true);
    try {
      const loaded = await importProject(file);
      loadProject(loaded.project, loaded.assets);
      setPlaying(false);
      flash(`已打开「${loaded.project.name}」`);
    } catch (error) {
      flash(error instanceof Error ? error.message : '这个文件打不开');
    } finally {
      setBusy(false);
    }
  }, [flash, loadProject]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    // 学生常把导出的工程文件直接拖进来，这里帮他走导入
    const projectFile = list.find((file) => file.name.endsWith('.json'));
    if (projectFile && list.length === 1) {
      await handleImport(projectFile);
      return;
    }
    setBusy(true);
    try {
      await addFiles(list);
    } finally {
      setBusy(false);
    }
  }, [addFiles, handleImport]);

  const handleLoadDemo = useCallback(async () => {
    setBusy(true);
    try {
      const demo = await loadBundledDemo();
      loadProject(demo.project, demo.assets);
      setPlaying(false);
      flash('10 页示例已载入，点击「开始演示」即可体验');
    } catch (error) {
      flash(error instanceof Error ? error.message : '示例加载失败，请重试');
    } finally {
      setBusy(false);
    }
  }, [flash, loadProject]);

  const screens = project?.screens ?? [];
  const exists = screens.some((s) => s.id === currentId);
  useEffect(() => {
    if (!project) {
      if (currentId) setCurrentId('');
      return;
    }
    if (!exists) setCurrentId(project.startScreenId || screens[0]?.id || '');
  }, [currentId, exists, project, screens]);

  if (!project) {
    return (
      <div className="app-root">
        {memoryOnly && <div className="banner" role="status">本浏览器无法本地保存（可能是隐私模式），刷新后进度会丢失，请随时导出工程文件。</div>}
        <DropZone
          onFiles={handleFiles}
          onLoadDemo={() => void handleLoadDemo()}
          busy={busy}
          onOpenProject={() => openRef.current?.click()}
        />
        <input
          ref={openRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void handleImport(file);
          }}
        />
        {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
      </div>
    );
  }

  const device = resolvedDevice(project);
  const outer = outerSize(device);
  const current = screens.find((s) => s.id === currentId) ?? screens[0];

  if (playing) {
    return (
      <div className="app-root">
        <Player project={project} device={device} urls={urls} onExit={() => setPlaying(false)} />
      </div>
    );
  }

  return (
    <div className="app-root app-editing">
      {memoryOnly && <div className="banner" role="status">本浏览器无法本地保存（可能是隐私模式），刷新后进度会丢失，请随时导出工程文件。</div>}
      <Toolbar
        project={project}
        device={device}
        onRename={store.renameProject}
        onPlay={() => setPlaying(true)}
        onExport={() => void handleExport()}
        onImport={(file) => void handleImport(file)}
        onRestart={handleRestart}
      />

      <main className="workbench">
        <ScreenRail
          project={project}
          device={device}
          urls={urls}
          currentId={current?.id ?? ''}
          onSelect={setCurrentId}
          onRename={store.renameScreen}
          onSetStart={store.setStartScreen}
          onRemove={store.removeScreen}
          onMove={store.moveScreen}
          onAddFiles={handleFiles}
        />
        <section className="canvas">
          {current && (
            <div className="canvas-hint">
              {current.hotspots.length === 0 && current.pending.length === 0 && (
                screens.length > 1
                  ? <span>在画面上拖一个框，就能指定「点这里跳到哪一页」。</span>
                  : <span>再导入一张图片即可建立跳转。</span>
              )}
              {current.pending.length > 0 && (
                <span className="canvas-hint-warn">
                  有 {current.pending.length} 条关系尚未放置到具体位置，播放时整页可点。
                </span>
              )}
            </div>
          )}
          <Stage contentWidth={outer.width} contentHeight={outer.height}>
            <DeviceFrame device={device}>
              {current && (
                <ScreenView
                  screen={current}
                  url={urls[current.id]}
                  device={device}
                  overlay={(
                    <HotspotLayer
                      screen={current}
                      screens={screens}
                      urls={urls}
                      selectedId={selectedHotspot}
                      onSelect={setSelectedHotspot}
                      onAdd={(rect, target, transition) => store.addHotspot(current.id, { ...rect, target, transition })}
                      onUpdate={(hotspotId, patch) => store.updateHotspot(current.id, hotspotId, patch)}
                      onRemove={(hotspotId) => store.removeHotspot(current.id, hotspotId)}
                      onApplyToAll={(hotspotId) => store.applyHotspotToAll(current.id, hotspotId)}
                    />
                  )}
                />
              )}
            </DeviceFrame>
          </Stage>
        </section>
        <aside className="sidebar">
          <RelationPanel
            screens={screens}
            onApply={(pairs) => {
              store.applyRelations(pairs);
              store.flash(`已导入 ${pairs.length} 条跳转关系`);
            }}
          />
          <DevicePanel
            device={device}
            override={project.deviceOverride}
            onChange={setDeviceOverride}
          />
        </aside>
      </main>

      {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
    </div>
  );
}
