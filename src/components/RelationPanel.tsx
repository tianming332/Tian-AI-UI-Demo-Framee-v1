import { useMemo, useState } from 'react';
import { parseRelations } from '../lib/relations';
import type { Screen } from '../types';

type Props = {
  screens: Screen[];
  onApply: (pairs: Array<[string, string]>) => void;
};

const PLACEHOLDER = '首页 → 详情\n首页 → 发现\n发现 → 详情\n首页 → 个人中心';

export default function RelationPanel({ screens, onApply }: Props) {
  const [text, setText] = useState('');
  const result = useMemo(() => (text.trim() ? parseRelations(text, screens) : null), [screens, text]);
  const failed = result?.rows.filter((row) => row.problem) ?? [];

  return (
    <section className="panel">
      <h4 className="panel-title">用文字补跳转关系</h4>
      <p className="panel-hint">一行一条，支持 → 、-&gt; 、&gt; 、逗号分隔。也支持「首页 → 详情 → 评价」连写。</p>
      <textarea
        className="relation-input"
        rows={5}
        value={text}
        placeholder={PLACEHOLDER}
        onChange={(event) => setText(event.target.value)}
        aria-label="跳转关系文本"
      />

      {result && (
        <div className="relation-result">
          <p className="panel-hint">
            识别到 {result.pairs.length} 条关系
            {failed.length > 0 && <span className="relation-bad">，{failed.length} 行没对上</span>}
          </p>
          {failed.length > 0 && (
            <ul className="relation-fails">
              {failed.map((row, index) => (
                <li key={`${row.raw}-${index}`}>
                  <code>{row.raw}</code>
                  <span>{row.problem}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary panel-action"
        disabled={!result?.pairs.length}
        onClick={() => {
          if (!result?.pairs.length) return;
          onApply(result.pairs);
          setText('');
        }}
      >
        导入关系
      </button>
    </section>
  );
}
