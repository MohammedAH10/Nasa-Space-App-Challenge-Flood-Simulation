"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  DIFFICULTIES,
  ORBITS,
  ROCKETS,
  categoryLabel,
  designLabel,
  getRealMission,
  resolveMission,
  partsForCategory,
} from "@/engine/data";
import { evaluateMission } from "@/engine/rules";
import { TEAM_ROLES, ROLE_INFO, ownerForField, canEdit as roleCanEdit } from "@/team/roles";
import { ROOM_NOTE } from "@/team/room";
import { useCanEdit, useMissionStore } from "@/store/mission";
import type {
  EditField,
} from "@/team/roles";
import type {
  MissionConfig,
  PartCategory,
  ResolvedMission,
  Role,
  RuleReport,
  SciencePriority,
  TeamRole,
} from "@/engine/types";
import { money, pct } from "@/lib/format";
import MissionViewport from "./MissionViewport";
import ResourceStrip from "./ResourceStrip";
import PartPicker from "./PartPicker";

type ConsoleTab = "plan" | "instrument" | "bus" | "team";
type BusCategory = Exclude<PartCategory, "camera">;

const TAB_OWNER: Record<ConsoleTab, EditField> = {
  plan: "orbit",
  instrument: "camera",
  bus: "panel",
  team: "budgets",
};

const SCIENCE_OPTIONS: { id: SciencePriority; name: string; description: string }[] = [
  { id: "balance", name: "Balanced", description: "Steady science return with no single metric pushed to its limit." },
  { id: "revisit", name: "Rapid revisit", description: "Favor fresh looks over dwell time. Helps flood and storm response." },
  { id: "resolution", name: "Sharp resolution", description: "Favor detail over area. Costs data volume and downlink margin." },
  { id: "volume", name: "Data volume", description: "Favor broad coverage. Needs a fast radio and a patient ground network." },
];

function LockBadge({ field, activeRole }: { field: EditField; activeRole: Role }) {
  const owner = ROLE_INFO[ownerForField(field)];
  const locked = !roleCanEdit(activeRole, field);
  if (!locked) return null;
  return (
    <span className="lock-badge" style={{ color: owner.color, borderColor: `${owner.color}55` }}>
      Locked · {owner.shortName}
    </span>
  );
}

function SectionCard({
  eyebrow,
  title,
  right,
  children,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-card-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function RoleBar({ onRoleTab }: { onRoleTab: (tab: ConsoleTab) => void }) {
  const config = useMissionStore((state) => state.config);
  const activeRole = useMissionStore((state) => state.activeRole);
  const setActiveRole = useMissionStore((state) => state.setActiveRole);
  const setTeamMode = useMissionStore((state) => state.setTeamMode);
  const info = ROLE_INFO[activeRole];

  const choose = (role: TeamRole) => {
    setActiveRole(role);
    onRoleTab(role === "scientist" ? "instrument" : role === "engineer" ? "bus" : role === "budget" ? "team" : "plan");
  };

  return (
    <div className="role-bar">
      <div className="role-bar-top">
        <span className="eyebrow">Editing as</span>
        {config.teamMode ? (
          <div className="role-chips">
            {TEAM_ROLES.map((role) => {
              const roleInfo = ROLE_INFO[role];
              return (
                <button
                  key={role}
                  type="button"
                  className={`role-chip ${activeRole === role ? "active" : ""}`}
                  style={{ "--role": roleInfo.color } as CSSProperties}
                  onClick={() => choose(role)}
                  aria-pressed={activeRole === role}
                >
                  <span className="role-dot" />
                  {roleInfo.shortName}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="role-chips">
            <span className="role-chip solo">
              <span className="role-dot" />
              Solo Commander
            </span>
            <button type="button" className="role-chip add" onClick={() => setTeamMode(true)}>
              + Team mode
            </button>
          </div>
        )}
      </div>
      <p className="role-desc" style={{ borderColor: `${info.color}33` }}>
        <strong style={{ color: info.color }}>{info.name}.</strong> {info.description}
      </p>
    </div>
  );
}

function PlanPanel({
  config,
  resolved,
  rules,
}: {
  config: MissionConfig;
  resolved: ResolvedMission;
  rules: RuleReport;
}) {
  const activeRole = useMissionStore((state) => state.activeRole);
  const setOrbit = useMissionStore((state) => state.setOrbit);
  const setRocket = useMissionStore((state) => state.setRocket);
  const setDifficulty = useMissionStore((state) => state.setDifficulty);
  const canEdit = useCanEdit();
  const reference = getRealMission(resolved.scenario.referenceMissionId);
  const orbitLocked = !canEdit("orbit");
  const rocketLocked = !canEdit("rocket");
  const difficultyLocked = !canEdit("difficulty");

  return (
    <div className="console-stack">
      <SectionCard
        eyebrow="Mission brief"
        title={resolved.scenario.name}
        right={<LockBadge field="scenario" activeRole={activeRole} />}
      >
        <p className="muted small">{resolved.scenario.brief}</p>
        <div className="brief-grid">
          <div><span>Region</span><strong>{resolved.scenario.region}</strong></div>
          <div><span>Budget</span><strong>{money(rules.metrics.budgetM)}</strong></div>
          <div><span>Lifetime</span><strong>{resolved.scenario.lifetimeMonths} months</strong></div>
          <div><span>Revisit target</span><strong>≤ {resolved.scenario.maxRevisitDays} d</strong></div>
          <div><span>Delivery target</span><strong>≥ {pct(resolved.scenario.minDeliveredFraction, 0)}</strong></div>
          <div><span>Resolution target</span><strong>≤ {resolved.scenario.minResolutionM} m</strong></div>
        </div>
        {reference ? (
          <p className="reference-note">
            Real reference: <a href={reference.url} target="_blank" rel="noreferrer">{reference.name}</a> ·{" "}
            {reference.massKg.toLocaleString()} kg · {reference.altitudeKm.toLocaleString()} km · {reference.agency}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        eyebrow="Difficulty"
        title="How forgiving is the review board?"
        right={<LockBadge field="difficulty" activeRole={activeRole} />}
      >
        <div className="difficulty-inline">
          {DIFFICULTIES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`difficulty-pill ${config.difficulty === item.id ? "active" : ""}`}
              onClick={() => setDifficulty(item.id)}
              disabled={difficultyLocked}
            >
              <strong>{item.name}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
        <p className="muted tiny">
          Changing difficulty resets the run and sanitizes the part catalogue. Commander keeps the
          same hardware but tightens budget, storms, and failures.
        </p>
      </SectionCard>

      <SectionCard
        eyebrow="Orbit"
        title="Revisit versus radiation"
        right={<LockBadge field="orbit" activeRole={activeRole} />}
      >
        <div className="orbit-options">
          {ORBITS.map((orbit) => {
            const allowed = resolved.scenario.allowedOrbitTypes.includes(orbit.type);
            const capacity = resolved.rocket.capacityKg[orbit.type];
            const incompatible = !allowed || capacity <= 0;
            return (
              <button
                key={orbit.id}
                type="button"
                className={`orbit-option ${config.orbitId === orbit.id ? "selected" : ""} ${incompatible ? "incompatible" : ""}`}
                onClick={() => setOrbit(orbit.id)}
                disabled={orbitLocked}
              >
                <span className="orbit-option-top">
                  <strong>{orbit.name}</strong>
                  <span className={`orbit-type ${orbit.type.toLowerCase()}`}>{orbit.type}</span>
                </span>
                <span className="orbit-option-stats">
                  {orbit.revisitDays} d revisit · {Math.round(orbit.eclipseFraction * 100)}% eclipse ·{" "}
                  {orbit.passesPerDay} passes
                </span>
                <span className="orbit-option-foot">
                  <span>{orbit.blurb}</span>
                  <span className={incompatible ? "bad" : "good"}>
                    {!allowed ? "Scenario blocked" : capacity <= 0 ? "Launcher can't reach" : `${capacity} kg capacity`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Launcher"
        title="Mass capacity and reliability"
        right={<LockBadge field="rocket" activeRole={activeRole} />}
      >
        <div className="rocket-options">
          {ROCKETS.map((rocket) => {
            const capacity = rocket.capacityKg[resolved.orbit.type];
            return (
              <button
                key={rocket.id}
                type="button"
                className={`rocket-option ${config.rocketId === rocket.id ? "selected" : ""} ${capacity <= 0 ? "incompatible" : ""}`}
                onClick={() => setRocket(rocket.id)}
                disabled={rocketLocked}
              >
                <span>
                  <strong>{rocket.name}</strong>
                  <small>{rocket.provider}</small>
                </span>
                <span className="rocket-meta">
                  {money(rocket.costM)} · {pct(rocket.reliability, 1)} rel.
                  <em className={capacity <= 0 ? "bad" : ""}>
                    {capacity <= 0 ? "cannot reach" : `${capacity} kg to ${resolved.orbit.type}`}
                  </em>
                </span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Launch conditions" title="Space weather today">
        <div className="weather-panel">
          <div>
            <span>Kp index</span>
            <strong className={resolved.weather.kpIndex >= 6 ? "bad" : resolved.weather.kpIndex >= 4 ? "warn" : "good"}>
              {resolved.weather.kpIndex}
            </strong>
          </div>
          <div><span>Storm probability</span><strong>{pct(resolved.weather.stormProbability, 0)}</strong></div>
          <div><span>Solar wind</span><strong>{resolved.weather.solarWindSpeedKms} km/s</strong></div>
          <div><span>Flares · 24 h</span><strong>{resolved.weather.flaresLast24h}</strong></div>
        </div>
        <p className="muted tiny">
          {resolved.weather.source}. {resolved.weather.note} Storms raise component hazards in the
          simulation; they do not change the deterministic resource math.
        </p>
      </SectionCard>
    </div>
  );
}

function InstrumentPanel({ config, resolved, rules }: { config: MissionConfig; resolved: ResolvedMission; rules: RuleReport }) {
  const setPart = useMissionStore((state) => state.setPart);
  const setSciencePriority = useMissionStore((state) => state.setSciencePriority);
  const canEdit = useCanEdit();
  const locked = !canEdit("camera");
  const activeRole = useMissionStore((state) => state.activeRole);

  return (
    <div className="console-stack">
      <SectionCard
        eyebrow="Science priority"
        title="What should the mission optimize?"
        right={<LockBadge field="sciencePriority" activeRole={activeRole} />}
      >
        <div className="priority-grid">
          {SCIENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`priority-option ${config.sciencePriority === option.id ? "selected" : ""}`}
              onClick={() => setSciencePriority(option.id)}
              disabled={!canEdit("sciencePriority")}
            >
              <strong>{option.name}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Instrument"
        title="Resolution costs downlink"
        right={<LockBadge field="camera" activeRole={activeRole} />}
      >
        <PartPicker
          category="camera"
          selectedId={config.parts.camera}
          allowedTiers={resolved.difficulty.allowedPartTiers}
          locked={locked}
          onSelect={(id) => setPart("camera", id)}
        />
        <div className="chain-note">
          <span>Data chain</span>
          <strong>
            {resolved.parts.camera.dataGbPerDay} GB/d produced → {resolved.parts.computer.throughputGbPerDay} GB/d
            processed → {rules.metrics.dataCapacityGb.toFixed(1)} GB/d downlinked
          </strong>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Translated into the sim" title="Camera trade">
        <ul className="plain-list">
          <li><strong>{resolved.parts.camera.resolutionM} m</strong> ground resolution vs the {resolved.scenario.minResolutionM} m target.</li>
          <li><strong>{pct(resolved.parts.camera.science, 0)}</strong> base science score, adjusted by priority and delivery.</li>
          <li><strong>{resolved.parts.camera.dataGbPerDay} GB/day</strong> raw imagery, capped by the computer then the radio.</li>
        </ul>
      </SectionCard>
    </div>
  );
}

function BusPanel({
  config,
  resolved,
  rules,
  category,
  onCategoryChange,
}: {
  config: MissionConfig;
  resolved: ResolvedMission;
  rules: RuleReport;
  category: BusCategory;
  onCategoryChange: (category: BusCategory) => void;
}) {
  const setPart = useMissionStore((state) => state.setPart);
  const canEdit = useCanEdit();
  const categories: BusCategory[] = ["panel", "battery", "radio", "computer"];
  const locked = !canEdit(category);

  return (
    <div className="console-stack">
      <SectionCard eyebrow="Bus" title="Subsystem bay">
        <div className="bus-tabs" role="tablist" aria-label="Bus subsystem">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={category === item}
              className={`bus-tab ${category === item ? "active" : ""}`}
              onClick={() => onCategoryChange(item)}
            >
              <span>{categoryLabel(item)}</span>
              <small>{resolved.parts[item].name}</small>
              {!canEdit(item) ? <span className="mini-lock">●</span> : null}
            </button>
          ))}
        </div>
        <PartPicker
          category={category}
          selectedId={config.parts[category]}
          allowedTiers={resolved.difficulty.allowedPartTiers}
          locked={locked}
          onSelect={(id) => setPart(category, id)}
        />
      </SectionCard>

      <SectionCard eyebrow="Energy balance" title="Sunlight, eclipse, and load">
        <div className="balance-rows">
          <div>
            <span>Average generation</span>
            <strong>{rules.metrics.generationW.toFixed(0)} W</strong>
            <div className="mini-track"><span style={{ width: `${Math.min(100, (rules.metrics.generationW / Math.max(1, rules.metrics.loadW)) * 50)}%` }} /></div>
          </div>
          <div>
            <span>Bus + payload load</span>
            <strong>{rules.metrics.loadW.toFixed(0)} W</strong>
            <div className="mini-track load"><span style={{ width: "50%" }} /></div>
          </div>
          <div>
            <span>Eclipse energy need</span>
            <strong>{rules.metrics.batteryNeedWh.toFixed(0)} Wh</strong>
            <div className="mini-track"><span style={{ width: `${Math.min(100, (rules.metrics.batteryUsableWh / Math.max(1, rules.metrics.batteryNeedWh)) * 50)}%` }} /></div>
          </div>
          <div>
            <span>Usable battery</span>
            <strong>{rules.metrics.batteryUsableWh.toFixed(0)} Wh</strong>
            <div className="mini-track battery"><span style={{ width: "50%" }} /></div>
          </div>
        </div>
        <p className="muted tiny">
          Panels are derated by eclipse time and end-of-life degradation. Battery usable energy is
          capacity × depth-of-discharge, then checked with a margin.
        </p>
      </SectionCard>

      <SectionCard eyebrow="Data pipeline" title="Produce, buffer, downlink">
        <div className="pipeline">
          <div><span>Camera</span><strong>{resolved.parts.camera.dataGbPerDay} GB/d</strong></div>
          <span className="pipe-arrow">→</span>
          <div><span>Computer</span><strong>{resolved.parts.computer.throughputGbPerDay} GB/d</strong></div>
          <span className="pipe-arrow">→</span>
          <div><span>Radio</span><strong>{resolved.parts.radio.downlinkMbps} Mbps</strong></div>
          <span className="pipe-arrow">→</span>
          <div><span>Ground</span><strong>{rules.metrics.dataCapacityGb.toFixed(1)} GB/d</strong></div>
        </div>
        <p className="muted tiny">
          Buffer: {resolved.parts.computer.bufferGb} GB. Downlink also depends on {resolved.orbit.passesPerDay} passes
          of {resolved.orbit.passMinutes} minutes from {resolved.orbit.groundStations.join(", ")}.
        </p>
      </SectionCard>

      <SectionCard eyebrow="Mounting" title="Mechanical integration">
        <div className="mini-facts">
          <div><span>Parts</span><strong>{rules.metrics.partMassKg.toFixed(1)} kg</strong></div>
          <div><span>Bus</span><strong>{(rules.metrics.totalMassKg - rules.metrics.partMassKg - rules.metrics.adapterMassKg).toFixed(1)} kg</strong></div>
          <div><span>Adapter</span><strong>{rules.metrics.adapterMassKg.toFixed(1)} kg</strong></div>
          <div><span>Total</span><strong>{rules.metrics.totalMassKg.toFixed(1)} kg</strong></div>
        </div>
        <p className="muted tiny">The launcher capacity at {resolved.orbit.type} is {rules.metrics.capacityKg} kg. Adapter mass scales with payload mass.</p>
      </SectionCard>
    </div>
  );
}

function TeamPanel({
  config,
  rules,
}: {
  config: MissionConfig;
  rules: RuleReport;
}) {
  const activeRole = useMissionStore((state) => state.activeRole);
  const confirmations = useMissionStore((state) => state.confirmations);
  const roomCode = useMissionStore((state) => state.roomCode);
  const setTeamMode = useMissionStore((state) => state.setTeamMode);
  const createRoom = useMissionStore((state) => state.createRoom);
  const joinRoom = useMissionStore((state) => state.joinRoom);
  const leaveRoom = useMissionStore((state) => state.leaveRoom);
  const toggleConfirmation = useMissionStore((state) => state.toggleConfirmation);
  const setBudget = useMissionStore((state) => state.setBudget);
  const canEdit = useCanEdit();
  const [roomInput, setRoomInput] = useState("");
  const capTotal = config.budgets.planner + config.budgets.engineer + config.budgets.scientist;
  const reserve = rules.metrics.budgetM - capTotal;
  const budgetLocked = !canEdit("budgets");

  if (!config.teamMode) {
    return (
      <div className="console-stack">
        <SectionCard eyebrow="Team rehearsal" title="Four roles, one spacecraft">
          <p className="muted small">
            Turn on team mode to split orbit, bus, instrument, and money across four panels. Every
            change still runs through the same deterministic engine. Confirmations are local in this
            build; the room object is ready for a networked sync later.
          </p>
          <button type="button" className="btn primary" onClick={() => setTeamMode(true)}>
            Enter team mode
          </button>
          <p className="muted tiny">{ROOM_NOTE}</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="console-stack">
      <SectionCard
        eyebrow="Team room"
        title={roomCode ? `Room ${roomCode}` : "No room code"}
        right={
          <button type="button" className="text-btn danger" onClick={leaveRoom}>
            Leave
          </button>
        }
      >
        <div className="room-row">
          <button type="button" className="btn ghost small" onClick={createRoom}>
            New room code
          </button>
          <form
            className="room-join"
            onSubmit={(event) => {
              event.preventDefault();
              joinRoom(roomInput);
              setRoomInput("");
            }}
          >
            <input
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value.toUpperCase().slice(0, 4))}
              placeholder="CODE"
              aria-label="Room code"
              maxLength={4}
            />
            <button type="submit" className="btn ghost small" disabled={roomInput.length !== 4}>
              Join
            </button>
          </form>
        </div>
        <p className="muted tiny">{ROOM_NOTE}</p>
      </SectionCard>

      <SectionCard
        eyebrow="Confirmations"
        title="All four roles must sign off"
      >
        <div className="confirm-grid">
          {TEAM_ROLES.map((role) => {
            const info = ROLE_INFO[role];
            const done = confirmations[role];
            return (
              <button
                key={role}
                type="button"
                className={`confirm-card ${done ? "confirmed" : ""}`}
                style={{ "--role": info.color } as CSSProperties}
                onClick={() => toggleConfirmation(role)}
                aria-pressed={done}
              >
                <span className="role-dot" />
                <span>
                  <strong>{info.shortName}</strong>
                  <small>{done ? "Confirmed" : "Awaiting sign-off"}</small>
                </span>
                <span className="confirm-check">{done ? "✓" : "○"}</span>
              </button>
            );
          })}
        </div>
        <p className="muted tiny">
          In a networked room each role confirms from its own browser. Here every chip is local so
          you can rehearse the full flow.
        </p>
      </SectionCard>

      <SectionCard
        eyebrow="Role budgets"
        title="Allocate the money"
        right={<LockBadge field="budgets" activeRole={activeRole} />}
      >
        <div className="reserve-row">
          <span>Total caps</span>
          <strong className={reserve < 0 ? "bad" : "good"}>{money(capTotal)} of {money(rules.metrics.budgetM)}</strong>
          <span className={reserve < 0 ? "bad" : "muted"}>{reserve < 0 ? `Over by ${money(Math.abs(reserve))}` : `${money(reserve)} unallocated`}</span>
        </div>
        <div className="budget-lines">
          {rules.budgetLines.map((line) => {
            const info = ROLE_INFO[line.role];
            const cap = config.budgets[line.role];
            const ratio = line.cap > 0 ? line.spent / line.cap : 0;
            return (
              <div key={line.role} className="budget-line" style={{ "--role": info.color } as CSSProperties}>
                <div className="budget-line-head">
                  <span className="role-dot" />
                  <strong>{info.shortName}</strong>
                  <span className={`budget-status ${line.status}`}>
                    {line.status === "ok" ? "Within cap" : line.status === "warn" ? "Tight" : "Overspent"}
                  </span>
                </div>
                <div className="budget-line-meta">
                  <span>{money(line.spent)} spent · {money(cap)} cap</span>
                  <strong className={line.status === "fail" ? "bad" : line.status === "warn" ? "warn" : "good"}>
                    {pct(ratio, 0)}
                  </strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={rules.metrics.budgetM}
                  step={0.1}
                  value={cap}
                  onChange={(event) => setBudget(line.role, Number(event.target.value))}
                  disabled={budgetLocked}
                  aria-label={`${info.shortName} budget cap`}
                />
              </div>
            );
          })}
        </div>
        <p className="muted tiny">
          Caps do not change spacecraft cost; they express ownership and drive the coordination
          score. Overspent lines reduce the final grade even if the total budget still passes.
        </p>
      </SectionCard>
    </div>
  );
}

function LaunchDock({
  rules,
  config,
  confirmations,
  simStatus,
  simError,
}: {
  rules: RuleReport;
  config: MissionConfig;
  confirmations: Record<TeamRole, boolean>;
  simStatus: string;
  simError: string | null;
}) {
  const launch = useMissionStore((state) => state.launch);
  const toggleConfirmation = useMissionStore((state) => state.toggleConfirmation);
  const setStage = useMissionStore((state) => state.setStage);
  const confirmed = TEAM_ROLES.filter((role) => confirmations[role]).length;
  const teamReady = !config.teamMode || confirmed === TEAM_ROLES.length;
  const blocked = rules.blockingFailures.length > 0 || !teamReady;
  const running = simStatus === "running";

  return (
    <div className={`launch-dock ${rules.pass && teamReady ? "ready" : ""}`}>
      <div className="launch-status">
        {rules.blockingFailures.length > 0 ? (
          <>
            <span className="launch-label bad">Launch blocked</span>
            <div className="failure-chips">
              {rules.blockingFailures.map((failure) => (
                <span key={failure.id} className="chip fail">{failure.label}: {failure.message}</span>
              ))}
            </div>
          </>
        ) : !teamReady ? (
          <>
            <span className="launch-label warn">Waiting on the team</span>
            <div className="failure-chips">
              <span className="chip warn">{confirmed} of 4 roles confirmed</span>
            </div>
          </>
        ) : rules.warnings.length > 0 ? (
          <>
            <span className="launch-label warn">Cleared with warnings</span>
            <div className="failure-chips">
              {rules.warnings.map((warning) => (
                <span key={warning.id} className="chip warn">{warning.label}: {warning.message}</span>
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="launch-label good">All constraints green</span>
            <p className="muted tiny">
              {config.teamMode ? "All four roles confirmed." : "Solo design."} Ready for 1,000 Monte Carlo runs.
            </p>
          </>
        )}
        {simError ? <p className="bad tiny">{simError}</p> : null}
      </div>

      {config.teamMode ? (
        <div className="dock-confirms">
          {TEAM_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              className={`dock-confirm ${confirmations[role] ? "on" : ""}`}
              onClick={() => toggleConfirmation(role)}
              style={{ "--role": ROLE_INFO[role].color } as CSSProperties}
            >
              {ROLE_INFO[role].shortName} {confirmations[role] ? "✓" : "○"}
            </button>
          ))}
        </div>
      ) : null}

      <div className="launch-actions">
        <button type="button" className="btn ghost" onClick={() => setStage("scenario")}>
          Change mission
        </button>
        <button
          type="button"
          className="btn primary launch-btn"
          onClick={launch}
          disabled={blocked || running}
        >
          {running ? "Running 1,000 missions…" : "Launch simulation"}
        </button>
      </div>
    </div>
  );
}

export default function BuilderScreen() {
  const config = useMissionStore((state) => state.config);
  const weather = useMissionStore((state) => state.weather);
  const view = useMissionStore((state) => state.view);
  const setView = useMissionStore((state) => state.setView);
  const confirmations = useMissionStore((state) => state.confirmations);
  const simStatus = useMissionStore((state) => state.simStatus);
  const simError = useMissionStore((state) => state.simError);
  const activeRole = useMissionStore((state) => state.activeRole);
  const [tab, setTab] = useState<ConsoleTab>("plan");
  const [busCategory, setBusCategory] = useState<BusCategory>("panel");
  const [focusCategory, setFocusCategory] = useState<PartCategory | null>(null);

  const resolved = useMemo(() => resolveMission(config, weather), [config, weather]);
  const rules = useMemo(() => evaluateMission(resolved), [resolved]);

  const selectFromScene = (category: PartCategory | null) => {
    setFocusCategory(category);
    if (!category) return;
    if (category === "camera") {
      setTab("instrument");
    } else {
      setBusCategory(category);
      setTab("bus");
    }
  };

  return (
    <div className="builder-screen">
      <ResourceStrip rules={rules} minDelivered={resolved.scenario.minDeliveredFraction} />

      <div className="builder-grid">
        <div className="builder-left">
          <MissionViewport
            resolved={resolved}
            metrics={rules.metrics}
            view={view}
            onViewChange={setView}
            focusCategory={focusCategory}
            onSelectPart={selectFromScene}
          />
          <div className="viewport-note">
            <div>
              <span className="eyebrow">Design state</span>
              <strong>{designLabel(config)}</strong>
            </div>
            <div className="design-tags">
              <span>{resolved.orbit.name}</span>
              <span>{resolved.rocket.name}</span>
              <span>{resolved.difficulty.name}</span>
              <span>{money(rules.metrics.totalCostM)}</span>
            </div>
          </div>
        </div>

        <aside className="builder-console">
          <div className="console-head">
            <div>
              <span className="eyebrow">Design console</span>
              <h2>{resolved.scenario.name}</h2>
            </div>
            <span className={`pass-badge ${rules.pass ? "pass" : "fail"}`}>
              {rules.pass ? "Constraints pass" : `${rules.blockingFailures.length} blocking`}
            </span>
          </div>

          <RoleBar onRoleTab={setTab} />

          <nav className="console-tabs" role="tablist" aria-label="Design console sections">
            {([
              ["plan", "Plan"],
              ["instrument", "Instrument"],
              ["bus", "Bus"],
              ["team", "Team"],
            ] as const).map(([id, label]) => {
              const owner = ROLE_INFO[ownerForField(TAB_OWNER[id])];
              const locked = !roleCanEdit(activeRole, TAB_OWNER[id]);
              return (
                <button
                  key={id}
                  id={`console-tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`console-tab ${tab === id ? "active" : ""}`}
                  onClick={() => setTab(id)}
                >
                  <span>{label}</span>
                  <span
                    className={`tab-owner ${locked ? "locked" : ""}`}
                    style={{ background: owner.color }}
                    title={`Owned by ${owner.name}${locked ? " (locked)" : ""}`}
                  />
                </button>
              );
            })}
          </nav>

          <div className="console-body">
            {tab === "plan" ? <PlanPanel config={config} resolved={resolved} rules={rules} /> : null}
            {tab === "instrument" ? <InstrumentPanel config={config} resolved={resolved} rules={rules} /> : null}
            {tab === "bus" ? (
              <BusPanel
                config={config}
                resolved={resolved}
                rules={rules}
                category={busCategory}
                onCategoryChange={setBusCategory}
              />
            ) : null}
            {tab === "team" ? <TeamPanel config={config} rules={rules} /> : null}
          </div>

          <div className="console-foot">
            <span>Score components</span>
            <div className="score-preview">
              <span>Success 55%</span>
              <span>Science 25%</span>
              <span>Budget 12%</span>
              <span>Team 8%</span>
            </div>
            <span className="muted tiny">
              {partsForCategory("camera", resolved.difficulty.allowedPartTiers).length} cameras available at this difficulty.
            </span>
          </div>
        </aside>
      </div>

      <LaunchDock
        rules={rules}
        config={config}
        confirmations={confirmations}
        simStatus={simStatus}
        simError={simError}
      />
    </div>
  );
}
