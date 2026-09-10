import type { PlayerSettings } from '../types';

export interface SettingsPanelProps {
  value: PlayerSettings;
  onChange: (settings: PlayerSettings) => void;
}

export function SettingsPanel({ value, onChange }: SettingsPanelProps) {
  const update = <Key extends keyof PlayerSettings>(key: Key, next: PlayerSettings[Key]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <form className="gfl-settings" onSubmit={(event) => event.preventDefault()}>
      <label className="gfl-setting-row" htmlFor="gfl-master-volume">
        <span>
          Master volume
          <small>{Math.round(value.masterVolume * 100)}%</small>
        </span>
        <input
          id="gfl-master-volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value.masterVolume}
          onChange={(event) => update('masterVolume', event.currentTarget.valueAsNumber)}
        />
      </label>
      <label className="gfl-setting-row" htmlFor="gfl-ui-scale">
        <span>
          Interface scale
          <small>{Math.round(value.uiScale * 100)}%</small>
        </span>
        <input
          id="gfl-ui-scale"
          type="range"
          min="0.8"
          max="1.3"
          step="0.05"
          value={value.uiScale}
          onChange={(event) => update('uiScale', event.currentTarget.valueAsNumber)}
        />
      </label>
      <label className="gfl-setting-toggle" htmlFor="gfl-reduced-motion">
        <span>
          Reduced motion
          <small>Stops menu orbit and nonessential world/UI movement.</small>
        </span>
        <input
          id="gfl-reduced-motion"
          type="checkbox"
          checked={value.reducedMotion}
          onChange={(event) => update('reducedMotion', event.currentTarget.checked)}
        />
      </label>
      <fieldset className="gfl-setting-options">
        <legend>Graphics quality</legend>
        {(['low', 'medium', 'high'] as const).map((quality) => (
          <label key={quality}>
            <input
              type="radio"
              name="graphics-quality"
              value={quality}
              checked={value.graphicsQuality === quality}
              onChange={() => update('graphicsQuality', quality)}
            />
            <span>
              {quality[0]?.toUpperCase()}
              {quality.slice(1)}
            </span>
          </label>
        ))}
      </fieldset>
    </form>
  );
}
