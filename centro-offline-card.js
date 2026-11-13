/*  DomHouse - Centro Dispositivi Offline Card
 *  Salvatore Lentini · DomHouse.it
 *  https://github.com/SalvatoreITA/Centro-Dispositivi-Offline-Card
 */
const COC_VERSION = "3.0.0";
console.info(
  `%c 📡 CENTRO OFFLINE CARD v${COC_VERSION} `,
  "color:#fff;background:#00b8d4;font-weight:bold;padding:2px 6px;border-radius:4px;"
);

// -----------------------------------------------------------------------------
//  Utilità
// -----------------------------------------------------------------------------
const COC_DEFAULTS = {
  title: "Centro Dispositivi Offline",
  border_radius: 16,
  entity: "sensor.dispositivi_offline",
  online_entity: "sensor.dispositivi_online",
  total_entity: "sensor.dispositivi_totali",
  notify_entity: "switch.notifiche_dispositivi_offline",
  layout: "hero",
  max_chips: 6,
  show_progress: true,
};

const COC_DOMAIN_ICONS = {
  light: "mdi:lightbulb",
  switch: "mdi:toggle-switch-variant",
  sensor: "mdi:eye",
  binary_sensor: "mdi:radiobox-marked",
  cover: "mdi:window-shutter",
  valve: "mdi:valve",
  climate: "mdi:thermostat",
  media_player: "mdi:speaker",
  lock: "mdi:lock",
  fan: "mdi:fan",
  camera: "mdi:cctv",
  button: "mdi:gesture-tap-button",
  event: "mdi:bell-badge",
  vacuum: "mdi:robot-vacuum",
  device_tracker: "mdi:map-marker",
  person: "mdi:account",
  update: "mdi:package-up",
  number: "mdi:ray-vertex",
  select: "mdi:format-list-bulleted",
  siren: "mdi:bullhorn",
  humidifier: "mdi:air-humidifier",
  water_heater: "mdi:water-boiler",
  alarm_control_panel: "mdi:shield-home",
  remote: "mdi:remote",
  scene: "mdi:palette",
  automation: "mdi:robot",
  script: "mdi:script-text",
};

const COC_REASONS = {
  unavailable: { label: "Non disponibile", cls: "off" },
  unknown: { label: "Sconosciuto", cls: "warn" },
  missing: { label: "Non trovata", cls: "ghost" },
  disabled: { label: "Disabilitata", cls: "ghost" },
  notloaded: { label: "Non caricata", cls: "warn" },
  online: { label: "Online", cls: "on" },
};

const cocEsc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const cocInt = (stateObj) => {
  const n = stateObj ? parseInt(stateObj.state, 10) : NaN;
  return isNaN(n) ? 0 : n;
};

// Pulisce i prefissi aggiunti dall'integrazione (❓ / ⛔ / "(Non Trovata/Eliminata)")
const cocCleanName = (name, entityId) => {
  let n = String(name || entityId || "");
  n = n.replace(/^[❓⛔]\s*/u, "").replace(/\s*\((Non Trovata\/Eliminata|Disabilitata|Non Caricata)\)\s*$/i, "");
  return n || entityId || "?";
};

const cocAgo = (iso) => {
  if (!iso) return "";
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "adesso";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} g`;
};

/** Costruisce l'elenco dispositivi a partire dai sensori dell'integrazione. */
function cocCollect(hass, cfg) {
  const off = hass.states[cfg.entity];
  const on = hass.states[cfg.online_entity];
  const tot = hass.states[cfg.total_entity];

  const build = (stateObj, status) => {
    if (!stateObj) return [];
    const ids = stateObj.attributes.elenco_entita || [];
    const names = stateObj.attributes.elenco_nomi || [];
    const len = Math.max(ids.length, names.length);
    const out = [];
    for (let i = 0; i < len; i++) {
      const eid = ids[i] || null;
      const rawName = names[i] || eid;
      const st = eid ? hass.states[eid] : null;
      let reason = "online";
      if (status === "offline") {
        if (!eid) reason = "unavailable";
        else if (!st) {
          reason = String(rawName).startsWith("⛔") ? "disabled" : /Non Caricata/i.test(rawName) ? "notloaded" : "missing";
        } else reason = st.state === "unknown" ? "unknown" : "unavailable";
      }
      const domain = eid ? eid.split(".")[0] : "";
      out.push({
        entity_id: eid,
        name: cocCleanName(rawName, eid),
        status,
        reason,
        since: st ? st.last_changed : null,
        icon: (st && st.attributes.icon) || COC_DOMAIN_ICONS[domain] || "mdi:devices",
        domain,
      });
    }
    return out;
  };

  const offline = build(off, "offline");
  const online = build(on, "online");
  offline.sort((a, b) => (a.since && b.since ? new Date(b.since) - new Date(a.since) : 0));
  online.sort((a, b) => a.name.localeCompare(b.name, "it"));

  return {
    exists: !!off,
    offline,
    online,
    offlineCount: off ? cocInt(off) : 0,
    onlineCount: on ? cocInt(on) : online.length,
    totalCount: tot ? cocInt(tot) : offline.length + online.length,
  };
}

const COC_BASE_CSS = `
  :host { --coc-ok: #00c853; --coc-ok-rgb: 0,200,83; --coc-bad: #ff5252; --coc-bad-rgb: 255,82,82;
          --coc-warn: #ffab00; --coc-info: #00b8d4; --coc-info-rgb: 0,184,212;
          --coc-grad-bad: linear-gradient(135deg, #ff4d6d 0%, #ff7a45 100%);
          --coc-grad-ok: linear-gradient(135deg, #00b894 0%, #0097e6 100%);
          --coc-grad-info: linear-gradient(135deg, #636e72 0%, #2d3436 100%); }
  .pill { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600;
          padding:2px 8px; border-radius:999px; white-space:nowrap; }
  .pill.off   { color: var(--coc-bad);  background: rgba(var(--coc-bad-rgb),.14); }
  .pill.warn  { color: var(--coc-warn); background: rgba(255,171,0,.14); }
  .pill.ghost { color: var(--secondary-text-color); background: rgba(127,127,127,.16); }
  .pill.on    { color: var(--coc-ok);   background: rgba(var(--coc-ok-rgb),.14); }
`;

// =============================================================================
//  1. CARD PRINCIPALE  (layout: ring | hero | compact)
// =============================================================================
class CentroOfflineCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("centro-offline-card-editor");
  }

  static getStubConfig() {
    return { title: COC_DEFAULTS.title };
  }

  setConfig(config) {
    if (!config) throw new Error("Configurazione non valida");
    // Retro-compatibilità con la v2: automation_entity / switch_entity
    const notify = config.notify_entity ?? config.automation_entity ?? config.switch_entity;
    this._config = { ...COC_DEFAULTS, ...config, notify_entity: notify ?? COC_DEFAULTS.notify_entity };
    this._lastKey = null;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._dialog) this._dialog.hass = hass;
    this._render();
  }

  connectedCallback() {
    this._timer = setInterval(() => { this._lastKey = null; this._render(); }, 60000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
  }

  getCardSize() {
    return this._config && this._config.layout === "compact" ? 1 : 3;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  _ensureDom() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${COC_BASE_CSS}
        :host { display:block; }
        ha-card { display:block; height:100%; box-sizing:border-box; position:relative; overflow:hidden; cursor:pointer; padding:16px;
                  transition: box-shadow .3s ease, transform .15s ease; }
        ha-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.18); }
        ha-card:active { transform: scale(.995); }
        ha-card:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
        .title { font-size:15px; font-weight:700; color: var(--primary-text-color);
                 white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .bell { width:36px; height:36px; flex:0 0 36px; border-radius:50%; border:none; cursor:pointer;
                display:grid; place-items:center; background: rgba(127,127,127,.12);
                color: var(--secondary-text-color); transition: background .2s, transform .1s; padding:0; }
        .bell ha-icon { --mdc-icon-size: 20px; }
        .bell:active { transform: scale(.9); }
        .bell.on { color:#ffb300; background: rgba(255,179,0,.16); }
        .bell[hidden] { display:none; }
        .dot { width:8px; height:8px; border-radius:50%; background: rgb(var(--tone-rgb)); flex:0 0 8px; }
        .alert .dot { box-shadow: 0 0 0 0 rgba(var(--tone-rgb),.6); animation: coc-ping 1.6s infinite; }
        @keyframes coc-ping { 70% { box-shadow: 0 0 0 7px rgba(var(--tone-rgb),0); } 100% { box-shadow: 0 0 0 0 rgba(var(--tone-rgb),0); } }
        .status { display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:600;
                  color: rgb(var(--tone-rgb)); margin-top:3px; }

        /* ---------- RING ---------- */
        .ring-wrap { display:flex; align-items:center; gap:18px; }
        .ring { position:relative; width:108px; height:108px; flex:0 0 108px; }
        .ring svg { width:100%; height:100%; transform: rotate(-90deg); }
        .ring circle { fill:none; stroke-width:10; }
        .ring .track { stroke: rgba(127,127,127,.16); }
        .ring .seg { stroke-linecap: round; transition: stroke-dasharray .8s ease, stroke-dashoffset .8s ease; }
        .ring .seg-on { stroke: var(--coc-ok); }
        .ring .seg-off { stroke: var(--coc-bad); }
        .ring .center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .ring .big { font-size:30px; font-weight:800; line-height:1; color: var(--primary-text-color); }
        .ring .big small { font-size:14px; font-weight:600; color: var(--secondary-text-color); }
        .ring .lbl { font-size:9.5px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
                     color: var(--secondary-text-color); margin-top:4px; }
        .ring .center ha-icon { --mdc-icon-size: 34px; color: var(--coc-ok); }
        .info { flex:1; min-width:0; align-self:stretch; display:flex; flex-direction:column; }
        .info-top { display:flex; align-items:flex-start; gap:8px; }
        .info-top .txt { flex:1; min-width:0; }
        .devs { margin-top:12px; display:flex; flex-direction:column; gap:7px; }
        .dev { display:flex; align-items:center; gap:9px; font-size:13px; color: var(--primary-text-color); min-width:0; }
        .dev .di { width:26px; height:26px; flex:0 0 26px; border-radius:8px; display:grid; place-items:center;
                   color: var(--coc-bad); background: rgba(var(--coc-bad-rgb),.13); }
        .dev .di ha-icon { --mdc-icon-size: 15px; }
        .dev .dn { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .dev .dt { font-size:11px; color: var(--secondary-text-color); white-space:nowrap; }
        .more { font-size:11.5px; color: var(--secondary-text-color); padding-left:35px; }
        .calm { margin-top:12px; font-size:12.5px; color: var(--secondary-text-color); line-height:1.45; }
        .stats-line { display:flex; gap:14px; margin-top:12px; }
        .stats-line div { font-size:11px; color: var(--secondary-text-color); }
        .stats-line b { display:block; font-size:17px; color: var(--primary-text-color); }

        /* ---------- HERO ---------- */
        .hero { margin:-16px -16px 0; padding:18px 18px 20px; color:#fff; position:relative; overflow:hidden;
                background: var(--grad); }
        .hero::before, .hero::after { content:""; position:absolute; border-radius:50%; background: rgba(255,255,255,.12); }
        .hero::before { width:180px; height:180px; right:-50px; top:-70px; }
        .hero::after  { width:110px; height:110px; right:60px; bottom:-60px; background: rgba(255,255,255,.08); }
        .hero-top { display:flex; align-items:center; gap:10px; position:relative; z-index:1; }
        .hero-top ha-icon.hi { --mdc-icon-size:20px; opacity:.9; }
        .hero-top .ht { flex:1; font-size:13.5px; font-weight:600; opacity:.92;
                        white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hero .bell { background: rgba(255,255,255,.2); color:#fff; }
        .hero .bell.on { background: rgba(255,255,255,.3); color:#fff; }
        .hero-num { position:relative; z-index:1; margin-top:14px; display:flex; align-items:baseline; gap:10px; }
        .hero-num .n { font-size:46px; font-weight:800; line-height:.9; letter-spacing:-1px; }
        .hero-num .l { font-size:14px; font-weight:600; opacity:.92; }
        .hero-bar { position:relative; z-index:1; margin-top:14px; height:5px; border-radius:5px;
                    background: rgba(255,255,255,.25); overflow:hidden; }
        .hero-bar div { height:100%; background:#fff; border-radius:5px; transition: width .8s ease; }
        .tiles { display:grid; grid-template-columns: repeat(auto-fill, minmax(128px,1fr)); gap:8px; margin-top:14px; }
        .tile { border-radius:14px; padding:10px 11px; background: var(--secondary-background-color, rgba(127,127,127,.08));
                border:1px solid var(--divider-color); min-width:0; }
        .tile ha-icon { --mdc-icon-size:18px; color: var(--coc-bad); }
        .tile .tn { font-size:12.5px; font-weight:600; margin-top:6px; color: var(--primary-text-color);
                    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3; overflow-wrap:anywhere; }
        .tile .tt { font-size:11px; color: var(--secondary-text-color); margin-top:3px; }
        .tile.more-t { display:grid; place-items:center; font-size:13px; font-weight:700; color: var(--secondary-text-color); }
        .mini { display:grid; grid-template-columns: repeat(3,1fr); gap:8px; margin-top:14px; }
        .mini div { text-align:center; padding:8px 4px; border-radius:12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
        .mini b { display:block; font-size:18px; color: var(--primary-text-color); }
        .mini span { font-size:10px; letter-spacing:1px; text-transform:uppercase; color: var(--secondary-text-color); }

        /* ---------- COMPACT ---------- */
        ha-card.l-compact { padding:12px 14px; }
        .cmp { display:flex; align-items:center; gap:12px; }
        .cmp .ci { position:relative; width:42px; height:42px; flex:0 0 42px; border-radius:50%; display:grid; place-items:center;
                   color: rgb(var(--tone-rgb)); background: rgba(var(--tone-rgb),.15); }
        .cmp .ci ha-icon { --mdc-icon-size:22px; }
        .cmp .ci .cnt { position:absolute; top:-3px; right:-3px; min-width:18px; height:18px; padding:0 5px; border-radius:9px;
                        background: var(--coc-bad); color:#fff; font-size:11px; font-weight:700; display:grid; place-items:center;
                        box-shadow: 0 0 0 2px var(--ha-card-background, var(--card-background-color, #fff)); }
        .cmp .ct { flex:1; min-width:0; }
        .cmp .ct .title { font-size:14px; }
        .cmp .ct .status { margin-top:1px; font-size:12px; }
        .avs { display:flex; padding-left:8px; }
        .av { width:28px; height:28px; border-radius:50%; margin-left:-8px; display:grid; place-items:center;
              color: var(--coc-bad); background: var(--ha-card-background, var(--card-background-color, #fff));
              box-shadow: 0 0 0 2px var(--ha-card-background, var(--card-background-color, #fff)); position:relative; }
        .av::before { content:""; position:absolute; inset:0; border-radius:50%; background: rgba(var(--coc-bad-rgb),.16); }
        .av ha-icon { --mdc-icon-size:15px; position:relative; }
        .av.plus { color: var(--secondary-text-color); font-size:10.5px; font-weight:700; }
        .av.plus::before { background: rgba(127,127,127,.18); }
        .av.plus span { position:relative; }

        .warn-box { color: var(--secondary-text-color); font-size:13px; line-height:1.5; }
      </style>
      <ha-card tabindex="0" role="button"><div id="root"></div></ha-card>
    `;
    const card = this.shadowRoot.querySelector("ha-card");
    card.addEventListener("click", (e) => {
      if (e.composedPath().some((el) => el.classList && el.classList.contains("bell"))) return;
      this._openDialog();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._openDialog(); }
    });
  }

  _bell(notifyState) {
    const on = notifyState && notifyState.state === "on";
    return `<button class="bell ${on ? "on" : ""}" ${notifyState ? "" : "hidden"}
              title="${on ? "Notifiche attive" : "Notifiche disattivate"}" aria-label="Notifiche">
              <ha-icon icon="${on ? "mdi:bell-ring" : "mdi:bell-off-outline"}"></ha-icon></button>`;
  }

  _statusText(d) {
    if (d.offlineCount > 0) {
      return `${d.offlineCount} ${d.offlineCount === 1 ? "dispositivo offline" : "dispositivi offline"}`;
    }
    return "Tutti i dispositivi online";
  }

  _render() {
    if (!this._hass || !this._config) return;
    this._ensureDom();
    const cfg = this._config;
    const hass = this._hass;
    const data = cocCollect(hass, cfg);
    const notifyState = cfg.notify_entity ? hass.states[cfg.notify_entity] : null;

    const key = JSON.stringify([cfg, data, notifyState && notifyState.state]);
    if (key === this._lastKey) return;
    this._lastKey = key;

    const card = this.shadowRoot.querySelector("ha-card");
    const root = this.shadowRoot.getElementById("root");
    const layout = ["ring", "hero", "compact"].includes(cfg.layout) ? cfg.layout : "hero";
    card.style.borderRadius = `${cfg.border_radius}px`;
    card.className = `l-${layout}`;

    if (!data.exists) {
      card.style.setProperty("--tone-rgb", "var(--coc-info-rgb)");
      root.innerHTML = `<div class="warn-box">⚠️ Sensore <b>${cocEsc(cfg.entity)}</b> non trovato.<br>
        Installa l'integrazione <b>Centro Dispositivi Offline</b> o controlla le entità nell'editor della card.</div>`;
      return;
    }

    const alert = data.offlineCount > 0;
    card.classList.toggle("alert", alert);
    card.style.setProperty("--tone-rgb", alert ? "var(--coc-bad-rgb)" : "var(--coc-ok-rgb)");
    card.style.setProperty("--grad", alert ? "var(--coc-grad-bad)" : "var(--coc-grad-ok)");

    if (layout === "hero") root.innerHTML = this._hero(cfg, data, notifyState, alert);
    else if (layout === "compact") root.innerHTML = this._compact(cfg, data, notifyState, alert);
    else root.innerHTML = this._ring(cfg, data, notifyState, alert);

    const bell = root.querySelector(".bell");
    if (bell) bell.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!cfg.notify_entity) return;
      this._hass.callService("homeassistant", "toggle", { entity_id: cfg.notify_entity });
    });
  }

  _ring(cfg, d, notifyState, alert) {
    const total = d.totalCount || 0;
    const R = 46, C = 2 * Math.PI * R;
    const gap = total && d.offlineCount && d.onlineCount ? 6 : 0;
    const offLen = total ? Math.max(0, (d.offlineCount / total) * C - gap) : 0;
    const onLen = total ? Math.max(0, (d.onlineCount / total) * C - gap) : C;
    const max = Number(cfg.max_chips);
    const shown = d.offline.slice(0, max);
    const rest = d.offline.length - shown.length;

    const center = alert
      ? `<div class="big">${d.offlineCount}<small>/${total}</small></div><div class="lbl">offline</div>`
      : `<ha-icon icon="mdi:check-network"></ha-icon><div class="lbl">${total} online</div>`;

    const body = alert
      ? (max > 0 ? `<div class="devs">
          ${shown.map((x) => `<div class="dev"><span class="di"><ha-icon icon="${cocEsc(x.icon)}"></ha-icon></span>
            <span class="dn">${cocEsc(x.name)}</span>${x.since ? `<span class="dt">${cocAgo(x.since)}</span>` : ""}</div>`).join("")}
          ${rest > 0 ? `<div class="more">+ altri ${rest}</div>` : ""}</div>` : "")
      : `<div class="stats-line"><div><b>${d.onlineCount}</b>online</div><div><b>0</b>offline</div><div><b>${total}</b>monitorati</div></div>`;

    return `
      <div class="ring-wrap">
        <div class="ring">
          <svg viewBox="0 0 108 108">
            <circle class="track" cx="54" cy="54" r="${R}"></circle>
            ${d.offlineCount ? `<circle class="seg seg-off" cx="54" cy="54" r="${R}" stroke-dasharray="${offLen} ${C}"></circle>` : ""}
            <circle class="seg seg-on" cx="54" cy="54" r="${R}" stroke-dasharray="${onLen} ${C}"
                    stroke-dashoffset="${d.offlineCount ? -(offLen + gap) : 0}"></circle>
          </svg>
          <div class="center">${center}</div>
        </div>
        <div class="info">
          <div class="info-top">
            <div class="txt"><div class="title">${cocEsc(cfg.title)}</div>
              <div class="status"><span class="dot"></span>${this._statusText(d)}</div></div>
            ${this._bell(notifyState)}
          </div>
          ${body}
        </div>
      </div>`;
  }

  _hero(cfg, d, notifyState, alert) {
    const total = d.totalCount || 0;
    const pct = total ? Math.round((d.onlineCount / total) * 100) : 100;
    const max = Number(cfg.max_chips);
    const shown = d.offline.slice(0, max);
    const rest = d.offline.length - shown.length;
    const below = alert
      ? (max > 0 ? `<div class="tiles">
          ${shown.map((x) => `<div class="tile"><ha-icon icon="${cocEsc(x.icon)}"></ha-icon>
            <div class="tn">${cocEsc(x.name)}</div><div class="tt">${x.since ? `offline da ${cocAgo(x.since)}` : COC_REASONS[x.reason].label}</div></div>`).join("")}
          ${rest > 0 ? `<div class="tile more-t">+${rest}</div>` : ""}</div>` : "")
      : `<div class="mini"><div><b>${d.onlineCount}</b><span>Online</span></div><div><b>0</b><span>Offline</span></div><div><b>${total}</b><span>Totali</span></div></div>`;
    return `
      <div class="hero">
        <div class="hero-top"><ha-icon class="hi" icon="${alert ? "mdi:lan-disconnect" : "mdi:lan-connect"}"></ha-icon>
          <div class="ht">${cocEsc(cfg.title)}</div>${this._bell(notifyState)}</div>
        <div class="hero-num"><span class="n">${alert ? d.offlineCount : pct + "%"}</span>
          <span class="l">${alert ? (d.offlineCount === 1 ? "dispositivo offline" : "dispositivi offline") : "rete operativa"}</span></div>
        ${cfg.show_progress ? `<div class="hero-bar"><div style="width:${pct}%"></div></div>` : ""}
      </div>
      ${below}`;
  }

  _compact(cfg, d, notifyState, alert) {
    const avs = d.offline.slice(0, 4);
    const rest = d.offline.length - avs.length;
    return `
      <div class="cmp">
        <div class="ci"><ha-icon icon="${alert ? "mdi:lan-disconnect" : "mdi:lan-connect"}"></ha-icon>
          ${alert ? `<span class="cnt">${d.offlineCount}</span>` : ""}</div>
        <div class="ct"><div class="title">${cocEsc(cfg.title)}</div>
          <div class="status"><span class="dot"></span>${alert ? `${d.offlineCount} offline su ${d.totalCount}` : `Tutti online · ${d.totalCount}`}</div></div>
        ${alert ? `<div class="avs">${avs.map((x) => `<span class="av" title="${cocEsc(x.name)}"><ha-icon icon="${cocEsc(x.icon)}"></ha-icon></span>`).join("")}
          ${rest > 0 ? `<span class="av plus"><span>+${rest}</span></span>` : ""}</div>` : ""}
        ${this._bell(notifyState)}
      </div>`;
  }

  _openDialog() {
    if (this._dialog && this._dialog.isConnected) return;
    const dlg = document.createElement("centro-offline-dialog");
    dlg.config = this._config;
    dlg.source = this;
    dlg.hass = this._hass;
    dlg.addEventListener("closed", () => { this._dialog = null; });
    document.body.appendChild(dlg);
    this._dialog = dlg;
  }
}
customElements.define("centro-offline-card", CentroOfflineCard);

// =============================================================================
//  2. POPUP NATIVO (senza browser_mod)
// =============================================================================
class CentroOfflineDialog extends HTMLElement {
  constructor() {
    super();
    this._tab = null;
    this._query = "";
    this._onKey = (e) => { if (e.key === "Escape") this.close(); };
  }

  connectedCallback() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        ${COC_BASE_CSS}
        :host { position:fixed; inset:0; z-index:9999; font-family: var(--primary-font-family, Roboto, sans-serif); }
        .scrim { position:absolute; inset:0; background: rgba(0,0,0,.55); backdrop-filter: blur(4px); animation: fade .2s ease; }
        .panel { position:absolute; left:50%; top:50%; transform: translate(-50%,-50%);
                 width:min(560px, calc(100vw - 24px)); max-height: min(88vh, 780px);
                 display:flex; flex-direction:column; overflow:hidden; border-radius:24px;
                 background: var(--ha-card-background, var(--card-background-color, #1c1c1c));
                 color: var(--primary-text-color); box-shadow: 0 24px 70px rgba(0,0,0,.5);
                 animation: pop .24s cubic-bezier(.2,.9,.3,1.15); }
        @media (max-width: 600px) {
          .panel { left:0; right:0; bottom:0; top:auto; transform:none; width:100%;
                   max-height: 92vh; border-radius: 24px 24px 0 0; animation: up .26s ease; }
          .grab { display:block !important; }
        }
        @keyframes fade { from{opacity:0} } @keyframes pop { from{opacity:0; transform:translate(-50%,-46%) scale(.96)} }
        @keyframes up { from{transform: translateY(50px); opacity:0} }
        .head { flex:0 0 auto; position:relative; overflow:hidden; color:#fff; padding:16px 18px 18px; background: var(--grad); }
        .head::before { content:""; position:absolute; width:220px; height:220px; border-radius:50%;
                        right:-70px; top:-110px; background: rgba(255,255,255,.12); }
        .grab { display:none; width:40px; height:4px; border-radius:2px; background: rgba(255,255,255,.55); margin: -6px auto 10px; }
        .hrow { display:flex; align-items:center; gap:10px; position:relative; }
        .hrow h2 { margin:0; font-size:17px; font-weight:700; flex:1; }
        .x { border:none; background: rgba(255,255,255,.22); color:#fff; width:34px; height:34px;
             border-radius:50%; cursor:pointer; display:grid; place-items:center; padding:0; }
        .x ha-icon { --mdc-icon-size: 20px; }
        .big { position:relative; display:flex; align-items:baseline; gap:8px; margin-top:12px; }
        .big .n { font-size:40px; font-weight:800; line-height:.9; letter-spacing:-1px; }
        .big .l { font-size:13.5px; font-weight:600; opacity:.92; }
        .seg { position:relative; display:grid; grid-template-columns: repeat(3,1fr); gap:4px; margin-top:16px;
               padding:4px; border-radius:14px; background: rgba(0,0,0,.18); }
        .seg button { border:none; background:transparent; color: rgba(255,255,255,.85); font: inherit; font-size:12.5px;
                      font-weight:600; padding:8px 4px; border-radius:10px; cursor:pointer; transition: background .2s, color .2s; }
        .seg button b { font-weight:800; margin-left:4px; }
        .seg button.active { background:#fff; color:#222; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
        .search { flex:0 0 auto; margin: 14px 16px 6px; display:flex; align-items:center; gap:8px; padding: 0 12px;
                  border-radius:12px; background: rgba(127,127,127,.12); }
        .search ha-icon { --mdc-icon-size:18px; color: var(--secondary-text-color); }
        .search input { flex:1; border:none; outline:none; background:transparent; color:inherit;
                        font: inherit; font-size:14px; padding: 10px 0; }
        .list { overflow:auto; padding: 4px 10px 10px; }
        .row { display:flex; align-items:center; gap:12px; padding:10px 8px; border-radius:14px; cursor:pointer; transition: background .15s; }
        .row:hover { background: rgba(127,127,127,.1); }
        .row + .row { border-top: 1px solid var(--divider-color); border-radius:0; }
        .row:hover + .row, .row + .row:hover { border-top-color: transparent; }
        .ic { width:38px; height:38px; flex:0 0 38px; border-radius:12px; display:grid; place-items:center; }
        .ic.offline { color: var(--coc-bad); background: rgba(var(--coc-bad-rgb),.13); }
        .ic.online { color: var(--coc-ok); background: rgba(var(--coc-ok-rgb),.12); }
        .ic ha-icon { --mdc-icon-size:20px; }
        .meta { flex:1; min-width:0; }
        .nm { font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .id { font-size:11px; color: var(--secondary-text-color); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px; }
        .right { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
        .ago { font-size:11px; color: var(--secondary-text-color); }
        .empty { text-align:center; padding: 34px 10px; color: var(--secondary-text-color); font-size:13px; }
        .empty ha-icon { --mdc-icon-size: 44px; color: var(--coc-ok); display:block; margin: 0 auto 10px; }
        footer { flex:0 0 auto; text-align:center; font-size:11px; color: var(--secondary-text-color); padding: 8px 0 14px; opacity:.8;
                 border-top: 1px solid var(--divider-color); }
      </style>
      <div class="scrim"></div>
      <div class="panel" role="dialog" aria-modal="true">
        <div class="head">
          <div class="grab"></div>
          <div class="hrow"><ha-icon icon="mdi:lan-pending"></ha-icon><h2></h2>
            <button class="x" aria-label="Chiudi"><ha-icon icon="mdi:close"></ha-icon></button></div>
          <div class="big"></div>
          <div class="seg"></div>
        </div>
        <div class="search"><ha-icon icon="mdi:magnify"></ha-icon><input type="search" placeholder="Cerca dispositivo…"></div>
        <div class="list"></div>
        <footer>Salvatore Lentini · DomHouse.it</footer>
      </div>`;

    const sr = this.shadowRoot;
    sr.querySelector("h2").textContent = (this.config && this.config.title) || COC_DEFAULTS.title;
    sr.querySelector(".scrim").addEventListener("click", () => this.close());
    sr.querySelector(".x").addEventListener("click", () => this.close());
    sr.querySelector("input").addEventListener("input", (e) => { this._query = e.target.value.toLowerCase(); this._renderList(); });
    sr.querySelector(".seg").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) { this._tab = b.dataset.tab; this._lastKey = null; this._render(); }
    });
    sr.querySelector(".list").addEventListener("click", (e) => {
      const r = e.target.closest(".row");
      if (r && r.dataset.eid) this._moreInfo(r.dataset.eid);
    });
    window.addEventListener("keydown", this._onKey);
    this._render();
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this._onKey);
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) this._render();
  }

  close() {
    this.remove();
    this.dispatchEvent(new Event("closed"));
  }

  _moreInfo(entityId) {
    const target = this.source || this;
    target.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
    this.close();
  }

  _render() {
    if (!this._hass || !this.config) return;
    this._data = cocCollect(this._hass, this.config);
    if (!this._tab) this._tab = this._data.offlineCount > 0 ? "offline" : "online";
    const d = this._data;
    const key = JSON.stringify([d, this._tab]);
    if (key === this._lastKey) return;
    this._lastKey = key;

    const alert = d.offlineCount > 0;
    const total = d.totalCount || 0;
    this.shadowRoot.querySelector(".head").style.setProperty("--grad", alert ? "var(--coc-grad-bad)" : "var(--coc-grad-ok)");
    this.shadowRoot.querySelector(".big").innerHTML = alert
      ? `<span class="n">${d.offlineCount}</span><span class="l">${d.offlineCount === 1 ? "dispositivo offline" : "dispositivi offline"} su ${total}</span>`
      : `<span class="n">${total}</span><span class="l">dispositivi, tutti online</span>`;
    const b = (tab, label, v) => `<button class="${this._tab === tab ? "active" : ""}" data-tab="${tab}">${label}<b>${v}</b></button>`;
    this.shadowRoot.querySelector(".seg").innerHTML =
      b("offline", "Offline", d.offlineCount) + b("online", "Online", d.onlineCount) + b("all", "Tutti", total);
    this._renderList();
  }

  _renderList() {
    const d = this._data;
    if (!d) return;
    let items = this._tab === "offline" ? d.offline : this._tab === "online" ? d.online : [...d.offline, ...d.online];
    if (this._query) {
      items = items.filter((i) => i.name.toLowerCase().includes(this._query) || (i.entity_id || "").includes(this._query));
    }
    const list = this.shadowRoot.querySelector(".list");
    if (!items.length) {
      list.innerHTML = this._query
        ? `<div class="empty">Nessun risultato per “${cocEsc(this._query)}”</div>`
        : this._tab === "offline"
          ? `<div class="empty"><ha-icon icon="mdi:check-network"></ha-icon>Tutti i dispositivi sono online</div>`
          : `<div class="empty">Nessun dispositivo in questa lista</div>`;
      return;
    }
    list.innerHTML = items.map((i) => {
      const r = COC_REASONS[i.reason];
      return `
        <div class="row" data-eid="${cocEsc(i.entity_id || "")}">
          <div class="ic ${i.status}"><ha-icon icon="${cocEsc(i.icon)}"></ha-icon></div>
          <div class="meta"><div class="nm">${cocEsc(i.name)}</div><div class="id">${cocEsc(i.entity_id || "")}</div></div>
          <div class="right"><span class="pill ${r.cls}">${r.label}</span>
            ${i.status === "offline" && i.since ? `<span class="ago">da ${cocAgo(i.since)}</span>` : ""}</div>
        </div>`;
    }).join("");
  }
}
customElements.define("centro-offline-dialog", CentroOfflineDialog);

// Compatibilità: la vecchia popup card resta registrata ma ora apre la lista nativa
class CentroOfflinePopupCard extends HTMLElement {
  setConfig(config) { this._config = config; }
  set hass(hass) {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<div style="padding:16px;color:var(--secondary-text-color)">
        La popup card è stata integrata nella <b>centro-offline-card</b> (v3): non serve più browser_mod.</div>`;
    }
  }
}
customElements.define("centro-offline-popup-card", CentroOfflinePopupCard);

// =============================================================================
//  3. EDITOR GRAFICO (senza dipendenze da LitElement interno)
// =============================================================================
class CentroOfflineCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._build();
    this._sync();
  }

  set hass(hass) {
    this._hass = hass;
    this._build();
    this._sync();
  }

  _fields() {
    return [
      { group: "✍️ Aspetto" },
      { key: "title", label: "Titolo della card", selector: { text: {} } },
      { key: "layout", label: "Stile della card", selector: { select: { mode: "dropdown", options: [
        { value: "hero", label: "Hero (intestazione colorata + riquadri)" },
        { value: "ring", label: "Anello (grafico circolare)" },
        { value: "compact", label: "Compatta (una riga)" } ] } } },
      { key: "border_radius", label: "Arrotondamento bordi", selector: { number: { min: 0, max: 40, step: 1, mode: "slider" } } },
      { key: "show_progress", label: "Mostra barra (layout Hero)", selector: { boolean: {} } },
      { key: "max_chips", label: "Riquadri dispositivi offline mostrati nella card", selector: { number: { min: 0, max: 20, step: 1, mode: "box" } } },
      { group: "🔔 Notifiche" },
      { key: "notify_entity", label: "Interruttore notifiche (switch o automazione)",
        selector: { entity: { domain: ["switch", "automation", "input_boolean"] } } },
      { group: "⚙️ Sensori dell'integrazione" },
      { key: "entity", label: "Sensore dispositivi offline", selector: { entity: { domain: "sensor" } } },
      { key: "online_entity", label: "Sensore dispositivi online", selector: { entity: { domain: "sensor" } } },
      { key: "total_entity", label: "Sensore dispositivi totali", selector: { entity: { domain: "sensor" } } },
    ];
  }

  _build() {
    if (this._built || !this._hass) return;
    this._built = true;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display:flex; flex-direction:column; gap:14px; padding: 4px 0; }
        .group { background: var(--secondary-background-color); border:1px solid var(--divider-color);
                 border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:12px; }
        h4 { margin:0; color: var(--primary-text-color); }
        ha-selector { display:block; width:100%; }
        .credit { text-align:center; font-size:12px; color: var(--secondary-text-color);
                  padding-top:12px; border-top:1px solid var(--divider-color); }
        .credit a { color: var(--primary-color); text-decoration:none; font-weight:600; }
      </style>
      <div class="wrap"></div>`;
    const wrap = this.shadowRoot.querySelector(".wrap");
    this._selectors = {};
    let group = null;
    for (const f of this._fields()) {
      if (f.group) {
        group = document.createElement("div");
        group.className = "group";
        group.innerHTML = `<h4>${f.group}</h4>`;
        wrap.appendChild(group);
        continue;
      }
      const sel = document.createElement("ha-selector");
      sel.selector = f.selector;
      sel.label = f.label;
      sel.addEventListener("value-changed", (ev) => this._changed(f.key, ev.detail.value));
      group.appendChild(sel);
      this._selectors[f.key] = sel;
    }
    const credit = document.createElement("div");
    credit.className = "credit";
    credit.innerHTML = `Salvatore Lentini · <a href="https://www.domhouse.it" target="_blank" rel="noopener">DomHouse.it</a>`;
    wrap.appendChild(credit);
  }

  _sync() {
    if (!this._built || !this._config) return;
    const cfg = { ...COC_DEFAULTS, ...this._config };
    if (this._config.automation_entity && !this._config.notify_entity) cfg.notify_entity = this._config.automation_entity;
    for (const [key, sel] of Object.entries(this._selectors)) {
      sel.hass = this._hass;
      sel.value = cfg[key];
    }
  }

  _changed(key, value) {
    const cfg = { ...this._config };
    delete cfg.automation_entity;
    delete cfg.switch_entity;
    if (value === "" || value === undefined || value === null || value === COC_DEFAULTS[key]) delete cfg[key];
    else cfg[key] = value;
    if (key === "notify_entity" && (value === "" || value == null)) cfg.notify_entity = ""; // bell disattivata
    this._config = cfg;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
  }
}
customElements.define("centro-offline-card-editor", CentroOfflineCardEditor);

// =============================================================================
//  REGISTRAZIONE
// =============================================================================
window.customCards = window.customCards || [];
window.customCards.push({
  type: "centro-offline-card",
  name: "DomHouse - Centro Dispositivi Offline Card",
  description: "Monitoraggio dispositivi offline con popup nativo, ricerca e stato per ogni entità.",
  preview: true,
  documentationURL: "https://github.com/SalvatoreITA/Centro-Dispositivi-Offline-Card",
});
