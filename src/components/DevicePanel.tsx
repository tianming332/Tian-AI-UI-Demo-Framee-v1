import { LOOK_PRESETS } from '../lib/devices';
import type { DeviceProfile } from '../types';

type Props = {
  device: DeviceProfile;
  override: Partial<DeviceProfile> | undefined;
  onChange: (patch: Partial<DeviceProfile> | undefined) => void;
};

function activeKey(override: Partial<DeviceProfile> | undefined) {
  if (!override) return 'auto';
  const hit = LOOK_PRESETS.find((preset) => preset.key !== 'auto'
    && preset.patch.topCutout === override.topCutout
    && preset.patch.homeIndicator === override.homeIndicator
    && preset.patch.radius === override.radius);
  return hit?.key ?? 'auto';
}

/** 机身外观调整：默认收起，不出现在主流程里 */
export default function DevicePanel({ device, override, onChange }: Props) {
  const current = activeKey(override);
  return (
    <details className="device-panel">
      <summary>机身外观（一般不用改）</summary>
      <p className="device-panel-hint">
        已按图片尺寸识别为 {device.label}。只有识别结果和你的设计不符时才需要调整。
      </p>
      <div className="device-panel-options">
        {LOOK_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`chip${current === preset.key ? ' is-active' : ''}`}
            aria-pressed={current === preset.key}
            onClick={() => onChange(preset.key === 'auto' ? undefined : preset.patch)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </details>
  );
}
