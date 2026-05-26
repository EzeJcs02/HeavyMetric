import { useState, useEffect, useRef } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&family=Inter:wght@300;400;500&display=swap');

  .hm-root {
    width: 100%;
    min-height: 520px;
    background: #0b0c0e;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    border-radius: 6px;
  }

  .hm-grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    animation: hmGridDrift 20s linear infinite;
  }
  @keyframes hmGridDrift {
    from { background-position: 0 0; }
    to { background-position: 48px 48px; }
  }

  .hm-scanline {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,212,255,0.12), transparent);
    animation: hmScanDown 6s ease-in-out infinite;
    pointer-events: none;
    z-index: 5;
  }
  @keyframes hmScanDown {
    0% { top: -2px; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 0.5; }
    100% { top: 100%; opacity: 0; }
  }

  .hm-vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%);
    pointer-events: none;
    z-index: 2;
  }

  .hm-content {
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    min-height: 520px;
    align-items: center;
  }

  .hm-left {
    padding: 48px 32px 72px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    border-right: 1px solid rgba(255,255,255,0.04);
    height: 100%;
    box-sizing: border-box;
  }

  .hm-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .hm-logo-symbol {
    font-size: 20px;
    color: #fff;
    line-height: 1;
    filter: drop-shadow(0 0 6px rgba(0,212,255,0.5));
  }
  .hm-logo-text {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.18em;
    color: rgba(255,255,255,0.7);
  }
  .hm-logo-text span { color: #00d4ff; }

  .hm-tagline {
    font-size: 10px;
    letter-spacing: 0.14em;
    color: rgba(255,255,255,0.22);
    text-transform: uppercase;
  }

  .hm-headline {
    font-size: 22px;
    font-weight: 300;
    color: rgba(255,255,255,0.88);
    line-height: 1.45;
    letter-spacing: -0.01em;
  }
  .hm-headline strong {
    font-weight: 500;
    color: #fff;
  }

  .hm-metrics-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hm-metric {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .hm-metric-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: hmPulse 3s ease-in-out infinite;
  }
  @keyframes hmPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  .hm-metric-label {
    font-size: 10px;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.28);
    text-transform: uppercase;
    min-width: 80px;
    font-family: 'Inter', sans-serif;
  }
  .hm-metric-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: rgba(255,255,255,0.75);
  }

  .hm-cta {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
  .hm-btn-primary {
    padding: 9px 20px;
    background: transparent;
    border: 1px solid #00d4ff;
    color: #00d4ff;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 3px;
    font-family: 'Inter', sans-serif;
    transition: background 0.2s;
  }
  .hm-btn-primary:hover { background: rgba(0,212,255,0.08); }
  .hm-btn-secondary {
    padding: 9px 20px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.4);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 3px;
    font-family: 'Inter', sans-serif;
    transition: border-color 0.2s, color 0.2s;
  }
  .hm-btn-secondary:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.65); }

  .hm-right {
    padding: 24px 24px 72px 24px;
    display: flex;
    flex-direction: column;
    min-height: 520px;
    box-sizing: border-box;
  }

  .hm-tabs {
    display: flex;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 20px;
  }
  .hm-tab {
    padding: 10px 18px;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.28);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.2s, border-color 0.2s;
    user-select: none;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
  }
  .hm-tab.active { color: #fff; border-bottom-color: #00d4ff; }
  .hm-tab:hover:not(.active) { color: rgba(255,255,255,0.55); }

  .hm-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    animation: hmFadeUp 0.2s ease-out;
    flex: 1;
  }
  @keyframes hmFadeUp {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hm-vehicle-area {
    position: relative;
    height: 200px;
    background: #0e1015;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }
  .hm-vehicle-area::before {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40px;
    background: linear-gradient(to top, rgba(0,212,255,0.03), transparent);
  }
  .hm-floor-line {
    position: absolute;
    bottom: 28px;
    left: 5%; right: 5%;
    height: 1px;
    background: rgba(0,212,255,0.1);
  }

  .hm-tel-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: hmTelPulse 2s ease-in-out infinite;
  }
  @keyframes hmTelPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,255,0.6); }
    50% { box-shadow: 0 0 0 6px rgba(0,212,255,0); }
  }
  .hm-tel-dot-green { animation: hmTelPulseGreen 2.5s ease-in-out infinite !important; }
  @keyframes hmTelPulseGreen {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,230,118,0.6); }
    50% { box-shadow: 0 0 0 5px rgba(0,230,118,0); }
  }

  .hm-tel-chip {
    position: absolute;
    background: #0e1015;
    border: 1px solid rgba(0,212,255,0.25);
    border-radius: 3px;
    padding: 4px 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: rgba(255,255,255,0.72);
    white-space: nowrap;
    z-index: 2;
  }
  .hm-tel-chip-amber { border-color: rgba(255,171,0,0.28) !important; }

  .hm-data-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .hm-data-card {
    background: #0e1015;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-left-width: 2px;
    border-left-style: solid;
  }
  .hm-data-label {
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.22);
    font-family: 'Inter', sans-serif;
  }
  .hm-data-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 500;
    line-height: 1;
  }
  .hm-data-sub {
    font-size: 9px;
    color: rgba(255,255,255,0.18);
    font-family: 'JetBrains Mono', monospace;
  }
  .hm-bar-wrap {
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    height: 2px;
    overflow: hidden;
    margin-top: 4px;
  }
  .hm-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.8s ease-out;
  }

  .hm-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2px;
  }
  .hm-meta-text {
    font-size: 9px;
    color: rgba(255,255,255,0.18);
    font-family: 'JetBrains Mono', monospace;
  }

  .hm-ot-header {
    background: #0e1015;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .hm-ot-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
  }
  .hm-ot-sub {
    font-size: 10px;
    color: rgba(255,255,255,0.28);
    margin-top: 3px;
    font-family: 'Inter', sans-serif;
  }
  .hm-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 2px;
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    border-width: 1px;
    border-style: solid;
  }

  .hm-progress-bar {
    height: 1px;
    background: rgba(255,255,255,0.05);
    flex-shrink: 0;
  }
  .hm-progress-fill {
    height: 100%;
    transition: width 1s ease-out;
  }

  .hm-task-list {
    background: #0e1015;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .hm-task {
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    font-size: 11px;
    font-family: 'Inter', sans-serif;
  }
  .hm-task:last-child { border-bottom: none; }
  .hm-task-icon {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
  }
  .hm-task-icon-active {
    animation: hmTaskPulse 2s ease-in-out infinite;
  }
  @keyframes hmTaskPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  .hm-task-time {
    margin-left: auto;
    font-size: 9px;
    color: rgba(255,255,255,0.18);
    font-family: 'JetBrains Mono', monospace;
  }

  .hm-alerts-panel {
    background: #0e1015;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    padding: 14px 16px;
    display: flex;
    gap: 24px;
    align-items: center;
    flex-shrink: 0;
  }
  .hm-alert-item { display: flex; flex-direction: column; gap: 2px; }
  .hm-alert-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    font-weight: 500;
    line-height: 1;
  }
  .hm-alert-desc {
    font-size: 9px;
    color: rgba(255,255,255,0.22);
    letter-spacing: 0.08em;
    font-family: 'Inter', sans-serif;
  }
  .hm-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.06); }

  .hm-stock-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .hm-stock-card {
    background: #0e1015;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 4px;
    padding: 12px;
    border-left-width: 2px;
    border-left-style: solid;
  }
  .hm-stock-ref {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    color: rgba(255,255,255,0.18);
    margin-bottom: 4px;
  }
  .hm-stock-name {
    font-size: 10px;
    font-weight: 500;
    color: rgba(255,255,255,0.78);
    line-height: 1.3;
    margin-bottom: 8px;
    font-family: 'Inter', sans-serif;
  }
  .hm-stock-qty {
    font-family: 'JetBrains Mono', monospace;
    font-size: 20px;
    font-weight: 500;
    line-height: 1;
  }
  .hm-stock-min {
    font-size: 8px;
    color: rgba(255,255,255,0.18);
    font-family: 'JetBrains Mono', monospace;
    margin-top: 3px;
  }
  .hm-stock-tag {
    display: inline-block;
    margin-top: 6px;
    font-size: 8px;
    padding: 2px 6px;
    border-radius: 2px;
    letter-spacing: 0.08em;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }

  .hm-footer {
    position: absolute;
    bottom: 12px;
    left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 24px 0 40px;
    z-index: 20;
    align-items: center;
  }
  .hm-footer-logo {
    font-size: 9px;
    color: rgba(255,255,255,0.14);
    letter-spacing: 0.12em;
    font-family: 'JetBrains Mono', monospace;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hm-footer-logo span { color: #00d4ff; }
  .hm-status-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0,230,118,0.06);
    border: 1px solid rgba(0,230,118,0.15);
    border-radius: 20px;
    font-size: 9px;
    color: #00e676;
    letter-spacing: 0.1em;
    font-family: 'Inter', sans-serif;
  }
  .hm-status-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: #00e676;
    animation: hmPulse 2s ease-in-out infinite;
  }
`;

function TelemetryChip({ style, accentColor, children }) {
  return (
    <div
      className="hm-tel-chip"
      style={{
        ...style,
        borderColor: accentColor === "amber"
          ? "rgba(255,171,0,0.28)"
          : "rgba(0,212,255,0.25)",
      }}
    >
      {children}
    </div>
  );
}

function TelDot({ style, color = "#00d4ff", green = false }) {
  return (
    <div
      className={`hm-tel-dot${green ? " hm-tel-dot-green" : ""}`}
      style={{ background: color, ...style }}
    />
  );
}

function DataCard({ label, value, sub, barWidth, barColor, accentColor }) {
  const borderColor =
    accentColor === "amber"
      ? "#ffab00"
      : accentColor === "green"
      ? "#00e676"
      : "rgba(255,255,255,0.06)";
  const textColor =
    accentColor === "amber"
      ? "#ffab00"
      : accentColor === "cyan"
      ? "#00d4ff"
      : accentColor === "green"
      ? "#00e676"
      : "#fff";
  const fillColor =
    barColor === "amber"
      ? "#ffab00"
      : barColor === "green"
      ? "#00e676"
      : "#00d4ff";

  return (
    <div className="hm-data-card" style={{ borderLeftColor: borderColor }}>
      <div className="hm-data-label">{label}</div>
      <div className="hm-data-val" style={{ color: textColor }}>{value}</div>
      <div className="hm-data-sub">{sub}</div>
      <div className="hm-bar-wrap">
        <div className="hm-bar-fill" style={{ width: barWidth, background: fillColor }} />
      </div>
    </div>
  );
}

function Badge({ children, variant = "open" }) {
  const variants = {
    open:    { bg: "rgba(0,230,118,0.1)",  color: "#00e676", border: "rgba(0,230,118,0.2)"  },
    pending: { bg: "rgba(255,171,0,0.1)",  color: "#ffab00", border: "rgba(255,171,0,0.2)"  },
    ok:      { bg: "rgba(0,212,255,0.08)", color: "#00d4ff", border: "rgba(0,212,255,0.15)" },
  };
  const s = variants[variant] || variants.open;
  return (
    <span
      className="hm-badge"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {children}
    </span>
  );
}

function StockCard({ ref_, name, qty, min, status }) {
  const configs = {
    critical: { border: "#ffab00", qtyColor: "#ffab00", tagBg: "rgba(255,171,0,0.1)",   tagColor: "#ffab00", tagBorder: "rgba(255,171,0,0.2)",   label: "⚠ Crítico"  },
    rupture:  { border: "#ff1744", qtyColor: "#ff1744", tagBg: "rgba(255,23,68,0.1)",   tagColor: "#ff1744", tagBorder: "rgba(255,23,68,0.2)",   label: "✕ Sin stock" },
    ok:       { border: "rgba(255,255,255,0.07)", qtyColor: "#fff", tagBg: "rgba(0,230,118,0.08)", tagColor: "#00e676", tagBorder: "rgba(0,230,118,0.15)", label: "OK" },
  };
  const c = configs[status] || configs.ok;
  return (
    <div className="hm-stock-card" style={{ borderLeftColor: c.border }}>
      <div className="hm-stock-ref">{ref_}</div>
      <div className="hm-stock-name">{name}</div>
      <div className="hm-stock-qty" style={{ color: c.qtyColor }}>{qty}</div>
      <div className="hm-stock-min">Mín: {min}</div>
      <div
        className="hm-stock-tag"
        style={{ background: c.tagBg, color: c.tagColor, border: `1px solid ${c.tagBorder}` }}
      >
        {c.label}
      </div>
    </div>
  );
}

function PanelActivos({ horometer }) {
  return (
    <div className="hm-panel">
      <div className="hm-vehicle-area">
        <div className="hm-floor-line" />
        <svg viewBox="0 0 420 160" width="90%" height="90%" style={{ position: "absolute" }}>
          <g opacity="0.8">
            <rect x="60" y="70" width="300" height="55" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <rect x="80" y="50" width="140" height="30" rx="4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <line x1="80" y1="80" x2="80" y2="70" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <line x1="220" y1="80" x2="220" y2="70" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <rect x="200" y="48" width="100" height="28" rx="3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
            <line x1="300" y1="70" x2="360" y2="70" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <rect x="340" y="55" width="50" height="20" rx="3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
            <circle cx="110" cy="130" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="110" cy="130" r="7" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <circle cx="310" cy="130" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="310" cy="130" r="7" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <rect x="30" y="75" width="40" height="35" rx="3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          </g>
          <line x1="140" y1="60" x2="40" y2="30" stroke="rgba(0,212,255,0.22)" strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="260" y1="55" x2="350" y2="20" stroke="rgba(0,212,255,0.22)" strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="310" y1="115" x2="380" y2="90" stroke="rgba(0,212,255,0.18)" strokeWidth="0.75" strokeDasharray="3 3" />
        </svg>
        <TelDot style={{ top: 26, left: "9%" }} />
        <TelemetryChip style={{ top: 8, left: "2%" }}>
          <span style={{ color: "#00d4ff" }}>2.340</span> RPM
        </TelemetryChip>
        <TelDot style={{ top: 16, right: "24%" }} />
        <TelemetryChip style={{ top: 2, right: "10%" }}>
          <span style={{ color: "#00d4ff" }}>87°C</span> Temp
        </TelemetryChip>
        <TelDot green style={{ bottom: 36, right: "12%", background: "#00e676" }} />
        <TelemetryChip accentColor="amber" style={{ bottom: 54, right: "2%" }}>
          <span style={{ color: "#ffab00" }}>⚠</span> Filtro
        </TelemetryChip>
      </div>

      <div className="hm-data-row">
        <DataCard
          label="Horómetro"
          value={horometer.toLocaleString("es-AR")}
          sub="horas totales"
          barWidth="68%"
          barColor="cyan"
          accentColor="cyan"
        />
        <DataCard
          label="Próx. servicio"
          value="179"
          sub="horas restantes"
          barWidth="35%"
          barColor="green"
          accentColor="green"
        />
        <DataCard
          label="P. hidráulica"
          value="210"
          sub="bar · revisar"
          barWidth="88%"
          barColor="amber"
          accentColor="amber"
        />
      </div>

      <div className="hm-meta-row">
        <span className="hm-meta-text">CAT 336 GC · XY-4821 · Sector B-4</span>
        <span className="hm-meta-text">Actualizado hace 4 min</span>
      </div>
    </div>
  );
}

function PanelTaller() {
  const tasks = [
    { id: 1, state: "done",    label: "Diagnóstico inicial",       time: "15 min"    },
    { id: 2, state: "active",  label: "Cambio filtros + aceite",   time: "En proceso" },
    { id: 3, state: "pending", label: "Revisión frenos traseros",  time: "Pendiente"  },
    { id: 4, state: "pending", label: "Test ruta final",            time: "Pendiente"  },
  ];

  return (
    <div className="hm-panel">
      <div className="hm-ot-header">
        <div>
          <div className="hm-ot-id">OT #2847</div>
          <div className="hm-ot-sub">Ford F-250 · AAB-234 · KM 87.420 · Bahía 3</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <Badge variant="open">● En proceso</Badge>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace" }}>Ingresó 09:14hs</span>
        </div>
      </div>

      <div className="hm-progress-bar">
        <div className="hm-progress-fill" style={{ width: "35%", background: "#00e676" }} />
      </div>

      <div className="hm-vehicle-area" style={{ height: 140 }}>
        <div className="hm-floor-line" />
        <svg viewBox="0 0 380 120" width="85%" height="85%" style={{ position: "absolute" }}>
          <g opacity="0.8">
            <rect x="50" y="55" width="280" height="40" rx="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <rect x="60" y="35" width="160" height="25" rx="3" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <rect x="220" y="38" width="80" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
            <rect x="300" y="45" width="50" height="16" rx="2" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
            <circle cx="100" cy="98" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="100" cy="98" r="6"  fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <circle cx="280" cy="98" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="280" cy="98" r="6"  fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <line x1="30" y1="70" x2="50" y2="70" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <rect x="20" y="62" width="15" height="16" rx="2" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.75" />
          </g>
          <line x1="140" y1="45" x2="80" y2="12" stroke="rgba(0,230,118,0.2)"  strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="280" y1="87" x2="330" y2="70" stroke="rgba(255,171,0,0.2)" strokeWidth="0.75" strokeDasharray="3 3" />
        </svg>
        <TelemetryChip style={{ top: 5, left: "10%", borderColor: "rgba(0,230,118,0.25)" }}>
          <span style={{ color: "#00e676" }}>►</span> Cambio filtros
        </TelemetryChip>
        <TelemetryChip accentColor="amber" style={{ bottom: 28, right: "4%" }}>
          <span style={{ color: "#ffab00" }}>⚠</span> Frenos
        </TelemetryChip>
      </div>

      <div className="hm-task-list">
        {tasks.map((t) => {
          const iconStyles = {
            done:    { bg: "rgba(0,230,118,0.15)", color: "#00e676", symbol: "✓" },
            active:  { bg: "rgba(0,212,255,0.1)",  color: "#00d4ff", symbol: "►" },
            pending: { bg: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.18)", symbol: "○" },
          };
          const ic = iconStyles[t.state];
          const textColor =
            t.state === "done"   ? "rgba(255,255,255,0.25)" :
            t.state === "active" ? "rgba(255,255,255,0.9)"  :
            "rgba(255,255,255,0.55)";
          return (
            <div key={t.id} className="hm-task" style={{ color: textColor }}>
              <div
                className={`hm-task-icon${t.state === "active" ? " hm-task-icon-active" : ""}`}
                style={{ background: ic.bg, color: ic.color }}
              >
                {ic.symbol}
              </div>
              {t.label}
              <span className="hm-task-time">{t.time}</span>
            </div>
          );
        })}
      </div>

      <div className="hm-meta-row">
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", fontFamily: "'Inter', sans-serif" }}>
          Técnico: M. Rodríguez · 3 repuestos solicitados
        </span>
        <Badge variant="pending">Aprobación pendiente</Badge>
      </div>
    </div>
  );
}

function PanelStock() {
  const items = [
    { ref_: "P550342", name: "Filtro aceite Donaldson", qty: "2", min: "5 u.", status: "critical" },
    { ref_: "B2430X",  name: "Correa poly-v 8PK",       qty: "0", min: "2 u.", status: "rupture"  },
    { ref_: "HY-7712", name: "Sello hidráulico 80mm",   qty: "1", min: "3 u.", status: "critical" },
    { ref_: "TR-4490", name: "Pastillas freno trasero",  qty: "12", min: "4 u.", status: "ok"     },
    { ref_: "OL-220W", name: "Aceite motor 20W-50",      qty: "8",  min: "5 u.", status: "ok"     },
    { ref_: "GR-190",  name: "Grasa alta temp. cartucho",qty: "3",  min: "8 u.", status: "critical"},
  ];

  return (
    <div className="hm-panel">
      <div className="hm-alerts-panel">
        <div className="hm-alert-item">
          <div className="hm-alert-num" style={{ color: "#ffab00" }}>4</div>
          <div className="hm-alert-desc">Bajo mínimo</div>
        </div>
        <div className="hm-divider" />
        <div className="hm-alert-item">
          <div className="hm-alert-num" style={{ color: "#ff1744" }}>1</div>
          <div className="hm-alert-desc">Sin stock</div>
        </div>
        <div className="hm-divider" />
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "rgba(255,255,255,0.68)" }}>
            $ 1.284.500
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'Inter', sans-serif" }}>
            Valor total inventario
          </div>
        </div>
      </div>

      <div className="hm-stock-grid">
        {items.map((item) => (
          <StockCard key={item.ref_} {...item} />
        ))}
      </div>

      <div className="hm-meta-row">
        <span className="hm-meta-text">
          Último movimiento: Egreso · Correa poly-v · Hace 2h · M. López
        </span>
      </div>
    </div>
  );
}

export default function HeroOperations() {
  const [activeTab, setActiveTab] = useState("activos");
  const [horometer, setHorometer] = useState(4821);
  const styleInjected = useRef(false);

  useEffect(() => {
    if (!styleInjected.current) {
      const el = document.createElement("style");
      el.textContent = styles;
      document.head.appendChild(el);
      styleInjected.current = true;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHorometer((h) => (Math.random() > 0.7 ? h + 1 : h));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: "activos", label: "◈ Activos" },
    { id: "taller",  label: "⚙ Taller"  },
    { id: "stock",   label: "▦ Stock"   },
  ];

  const metrics = [
    { dot: "#00d4ff", delay: "2s",  label: "Activos", value: `${horometer.toLocaleString("es-AR")} h horómetro` },
    { dot: "#00e676", delay: "0s",  label: "Taller",  value: "3 OT en proceso"  },
    { dot: "#ffab00", delay: "1s",  label: "Stock",   value: "4 ítems críticos" },
  ];

  return (
    <div className="hm-root">
      <div className="hm-grid-bg" />
      <div className="hm-scanline" />
      <div className="hm-vignette" />

      <div className="hm-content">
        {/* LEFT */}
        <div className="hm-left">
          <div className="hm-logo">
            <span className="hm-logo-symbol">∞</span>
            <span className="hm-logo-text">HEAVY<span>METRIC</span></span>
          </div>
          <div className="hm-tagline">Operations · Intelligence · Continuity</div>

          <div className="hm-headline">
            <strong>Control total</strong> sobre<br />
            maquinaria, taller,<br />
            stock y tesorería.
          </div>

          <div className="hm-metrics-row">
            {metrics.map((m) => (
              <div key={m.label} className="hm-metric">
                <div
                  className="hm-metric-dot"
                  style={{ background: m.dot, animationDelay: m.delay }}
                />
                <div className="hm-metric-label">{m.label}</div>
                <div className="hm-metric-value">{m.value}</div>
              </div>
            ))}
          </div>

          <div className="hm-cta">
            <button className="hm-btn-primary" type="button">Ver demo ↗</button>
            <button className="hm-btn-secondary" type="button">Más información</button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="hm-right">
          <div className="hm-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`hm-tab${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "activos" && <PanelActivos horometer={horometer} />}
          {activeTab === "taller"  && <PanelTaller />}
          {activeTab === "stock"   && <PanelStock />}
        </div>
      </div>

      <div className="hm-footer">
        <div className="hm-footer-logo">
          <span>∞</span> HeavyMetric OS · v2.1.4 · Conectado
        </div>
        <div className="hm-status-pill">
          <div className="hm-status-dot" />
          Live System
        </div>
      </div>
    </div>
  );
}
