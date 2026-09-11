import type { CSSProperties } from 'react';
import type { GameSnapshot } from '../../game';
import { toGameUiView } from '../types';

function percent(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
}

function progressStyle(value: number): CSSProperties {
  return { '--gfl-progress': `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export interface GameplayHUDProps {
  snapshot: GameSnapshot;
  uiScale?: number;
  onPause: () => void;
  onSwitchCamera: () => void;
}

export function ObjectiveScanner({ snapshot }: { snapshot: GameSnapshot }) {
  const view = toGameUiView(snapshot);
  const dx = view.objective.pedestalPosition[0] - view.player.position[0];
  const dz = view.objective.pedestalPosition[2] - view.player.position[2];
  const direction = Math.atan2(dx, dz) - view.player.aimYaw;
  const fallbackObjectiveLabel =
    view.objective.state === 'searching' || view.objective.state === 'findPedestal'
      ? 'Locate the activation pedestal'
      : view.objective.state === 'active' || view.objective.state === 'survive'
        ? 'Hold the field around the pedestal'
        : view.objective.state === 'boss' || view.objective.state === 'defeatBoss'
          ? 'Neutralize the Grassland Warden'
          : view.objective.state === 'extraction' || view.objective.state === 'extract'
            ? 'Enter the powered extraction field'
            : view.objective.state === 'claimReward'
              ? 'Secure the Warden attachment reward'
              : 'Grassland objective complete';
  const objectiveLabel = view.objective.label || fallbackObjectiveLabel;

  return (
    <section className="gfl-objective" aria-label="Current objective">
      <header>
        <span className="gfl-eyebrow">Grassland / primary signal</span>
        <strong>{objectiveLabel}</strong>
      </header>
      <div className="gfl-objective__scanner">
        <span className="gfl-objective__ticks" aria-hidden="true" />
        <span
          className="gfl-objective__needle"
          style={{ transform: `translateX(-50%) rotate(${direction}rad)` }}
          aria-hidden="true"
        />
        <output>{Math.max(0, Math.round(view.objective.distance))} m</output>
      </div>
    </section>
  );
}

export function BossStatus({ snapshot }: { snapshot: GameSnapshot }) {
  const boss = toGameUiView(snapshot).boss;
  if (!boss) return null;
  return (
    <section className="gfl-boss-status" aria-label="Grassland Warden status">
      <header>
        <span>Grassland Warden</span>
        <strong>Phase {boss.phase}</strong>
      </header>
      <div
        className="gfl-meter gfl-meter--boss"
        style={progressStyle(percent(boss.health, boss.maxHealth))}
      >
        <span />
      </div>
      <footer>
        <span>Armor core</span>
        <div
          className="gfl-meter gfl-meter--core"
          style={progressStyle(percent(boss.weakPointHealth, boss.weakPointMaxHealth))}
        >
          <span />
        </div>
        <b>
          {boss.vulnerable
            ? 'Core exposed'
            : boss.breakProgress >= 1
              ? 'Broken / staggered'
              : 'Armored'}
        </b>
      </footer>
      {boss.telegraph && (
        <div className="gfl-danger-callout" role="alert">
          Incoming: {boss.telegraph}
        </div>
      )}
    </section>
  );
}

export function GameplayHUD({ snapshot, uiScale = 1, onPause, onSwitchCamera }: GameplayHUDProps) {
  const view = toGameUiView(snapshot);
  const healthPercent = percent(view.player.health, view.player.maxHealth);
  const expPercent = percent(view.player.exp, view.player.nextExp);

  return (
    <div className="gfl-hud" style={{ '--gfl-ui-scale': uiScale } as CSSProperties}>
      <a className="gfl-skip-link" href="#gfl-hud-actions">
        Skip to gameplay actions
      </a>
      <ObjectiveScanner snapshot={snapshot} />
      <BossStatus snapshot={snapshot} />

      <section className="gfl-run-status" aria-label="Run status">
        <time dateTime={`PT${Math.floor(view.elapsed)}S`}>{formatTime(view.elapsed)}</time>
        <span className="gfl-resource">
          <i aria-hidden="true" /> Sardis <b>{Math.floor(view.player.sardis)}</b>
        </span>
        <button className="gfl-icon-button" type="button" aria-label="Pause game" onClick={onPause}>
          <span aria-hidden="true">II</span>
        </button>
      </section>

      <section className="gfl-player-status" aria-label="Player status">
        <header>
          <span className="gfl-level-badge">L{view.player.level}</span>
          <div>
            <strong>Tololo</strong>
            <small>Local PMX / procedural motion / temporary AK-Alfa</small>
          </div>
        </header>
        <div className="gfl-vital-row">
          <span>HP</span>
          <div className="gfl-meter gfl-meter--health" style={progressStyle(healthPercent)}>
            <span />
          </div>
          <output>
            {Math.ceil(view.player.health)} / {Math.ceil(view.player.maxHealth)}
          </output>
        </div>
        <div className="gfl-exp-row">
          <span>EXP</span>
          <div className="gfl-meter gfl-meter--exp" style={progressStyle(expPercent)}>
            <span />
          </div>
        </div>
        <span className={`gfl-dodge-state${view.player.dodgeCooldown <= 0 ? ' is-ready' : ''}`}>
          Dodge{' '}
          {view.player.dodgeCooldown <= 0 ? 'ready' : `${view.player.dodgeCooldown.toFixed(1)}s`}
        </span>
      </section>

      <section className="gfl-combat-status" aria-label="Weapon and skills">
        <div className="gfl-ammo">
          <span>AK-Alfa</span>
          <output>
            {view.player.ammo.toString().padStart(2, '0')}
            <small>/{view.player.magazine}</small>
          </output>
          {view.player.reloading && (
            <div
              className="gfl-reload"
              role="status"
              style={progressStyle(view.player.reloadProgress * 100)}
            >
              <span /> Reloading
            </div>
          )}
        </div>
        <div className="gfl-skills" aria-label="Equipped skills">
          {view.skills.length === 0 ? (
            <div className="gfl-skill gfl-skill--locked">
              <kbd>Q</kbd>
              <span>Skills acquire during run</span>
              <b>Locked</b>
            </div>
          ) : (
            view.skills.map((skill) => (
              <div key={skill.id} className={`gfl-skill${skill.ready ? ' is-ready' : ''}`}>
                <kbd>{skill.slot}</kbd>
                <span>{skill.name}</span>
                <b>{skill.ready ? 'Ready' : `${skill.cooldown.toFixed(1)}s`}</b>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="gfl-hud-actions" className="gfl-camera-state" aria-label="Camera mode">
        <button type="button" onClick={onSwitchCamera}>
          <kbd>V</kbd>
          <span>{view.cameraMode === 'topDown' ? 'Top-down' : 'Third-person'}</span>
          <small>Switch view</small>
        </button>
      </section>

      <div
        className={`gfl-crosshair${view.cameraMode === 'topDown' ? ' is-top-down' : ''}`}
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
      </div>
      {view.player.health <= view.player.maxHealth * 0.25 && (
        <div className="gfl-low-health" aria-hidden="true" />
      )}
    </div>
  );
}
