console.info("%c 📡 CENTRO OFFLINE SUITE v2.2 (STABLE POPUP FIX) IS LOADED ", "color: white; background: #00d1ff; font-weight: bold; border: 1px solid white; padding: 2px 6px; border-radius: 4px;");

// Estrazione di LitElement nativo di Home Assistant per l'Editor
const LitElement = customElements.get("ha-panel-lovelace")
  ? Object.getPrototypeOf(customElements.get("ha-panel-lovelace"))
  : Object.getPrototypeOf(customElements.get("hc-lovelace"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

// =============================================================================
//  1. MAIN CARD: CENTRO OFFLINE (Widget Dashboard)
// =============================================================================
class CentroOfflineCard extends HTMLElement {
  
  static getConfigElement() {
    return document.createElement("centro-offline-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Centro Offline",
      automation_entity: "", 
      entity: "sensor.dispositivi_offline",
      online_entity: "sensor.dispositivi_online",
      total_entity: "sensor.dispositivi_totali"
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Configurazione non valida");
    this.config = config;
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass) {
    this._hass = hass;
    
    this.entityId = this.config.entity || "sensor.dispositivi_offline_c";
    this.onlineId = this.config.online_entity || "sensor.dispositivi_online_c";
    this.totalId = this.config.total_entity || "sensor.dispositivi_totali_c";
    this.automationId = this.config.automation_entity || this.config.switch_entity || "";
    
    const cardTitle = this.config.title !== undefined ? this.config.title : "Centro Offline";

    const offlineState = hass.states[this.entityId];
    const totalState = hass.states[this.totalId];
    const automationState = this.automationId ? hass.states[this.automationId] : null;

    if (!offlineState) return; 

    if (!this.content) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          ha-card {
            border-radius: 15px;
            padding: 16px;
            transition: all 0.3s ease;
            cursor: pointer;
            box-sizing: border-box;
            background: rgba(50, 255, 50, 0.1);
            border: 1px solid rgba(50, 255, 50, 0.5);
          }
          .container {
            display: grid;
            grid-template-areas:
              "icon name switch"
              "count count count"
              "list list list";
            grid-template-columns: min-content 1fr min-content;
            gap: 5px;
            align-items: center;
          }
          .icon ha-icon {
            width: 35px;
            height: 35px;
            color: #00C851;
          }
          .name {
            font-weight: bold;
            font-size: 18px;
            padding-left: 10px;
            color: var(--primary-text-color);
          }
          .switch {
            grid-area: switch;
            justify-self: end;
            z-index: 2;
          }
          .switch ha-icon-button {
             --mdc-icon-button-size: 40px;
          }
          .count {
            grid-area: count;
            padding-top: 0px;
            font-size: 14px;
          }
          .list {
            grid-area: list;
            padding-top: 5px;
            font-size: 12px;
            color: var(--secondary-text-color);
            line-height: 1.4;
          }
          @keyframes blink {
            50% { opacity: 0.3; }
          }
          .blinking {
            animation: blink 2s ease infinite;
          }
        </style>
        <ha-card id="card">
          <div class="container" id="main-container">
            <div class="icon" style="grid-area: icon;"><ha-icon id="main-icon" icon="mdi:lan-disconnect"></ha-icon></div>
            <div class="name" id="card-title" style="grid-area: name;">${cardTitle}</div>
            <div class="switch">
              <ha-icon-button id="btn-switch">
                <ha-icon id="icon-switch" icon="mdi:bell-off"></ha-icon>
              </ha-icon-button>
            </div>
            <div class="count" id="count-text"></div>
            <div class="list" id="list-text"></div>
          </div>
        </ha-card>
      `;

      this.content = this.shadowRoot.getElementById("card");
      const btnSwitch = this.shadowRoot.getElementById("btn-switch");

      btnSwitch.addEventListener("click", (e) => {
        e.stopPropagation(); 
        this._toggleAutomation();
      });

      // FIX CHUSURA ACCIDENTALE POPUP
      this.content.addEventListener("click", (e) => {
        e.stopPropagation(); // Evita che il click rimbalzi fuori chiudendo subito la finestra
        this._showPopup();
      });
    }

    const titleEl = this.shadowRoot.getElementById("card-title");
    if (titleEl && titleEl.innerText !== cardTitle) {
      titleEl.innerText = cardTitle;
    }

    this._updateUI(offlineState, totalState, automationState);
  }

  _updateUI(offlineState, totalState, automationState) {
    const card = this.shadowRoot.getElementById("card");
    const mainIcon = this.shadowRoot.getElementById("main-icon");
    const countText = this.shadowRoot.getElementById("count-text");
    const listText = this.shadowRoot.getElementById("list-text");
    const iconSwitch = this.shadowRoot.getElementById("icon-switch");

    const rawOffline = parseInt(offlineState.state);
    const offlineCount = isNaN(rawOffline) ? 0 : rawOffline;
    const totalCount = totalState ? totalState.state : "?";
    const isOffline = offlineCount > 0;

    card.style.background = isOffline ? "rgba(255, 50, 50, 0.1)" : "rgba(50, 255, 50, 0.1)";
    card.style.border = isOffline ? "1px solid rgba(255, 50, 50, 0.5)" : "1px solid rgba(50, 255, 50, 0.5)";

    mainIcon.style.color = isOffline ? "#ff4444" : "#00C851";
    mainIcon.setAttribute("icon", isOffline ? "mdi:lan-disconnect" : "mdi:lan-connect");
    
    if (isOffline) {
      mainIcon.classList.add("blinking");
    } else {
      mainIcon.classList.remove("blinking");
    }

    if (isOffline) {
      if (offlineCount === 1) {
        countText.innerHTML = `<span style="color: #ff4444; font-weight: bold;">⚠️ 1 Dispositivo offline su ${totalCount}</span>`;
      } else {
        countText.innerHTML = `<span style="color: #ff4444; font-weight: bold;">⚠️ ${offlineCount} Dispositivi offline su ${totalCount}</span>`;
      }
    } else {
      countText.innerHTML = `<span style="color: #00C851; font-weight: bold;">✅ Tutti i dispositivi sono online (${totalCount})</span>`;
    }

    if (isOffline && offlineState.attributes && offlineState.attributes.elenco_nomi) {
      const nomi = offlineState.attributes.elenco_nomi.join(', ');
      listText.innerHTML = `<b>Verificare:</b> <i>${nomi}</i>`;
    } else {
      listText.innerHTML = "Rete stabile. Nessun intervento richiesto.";
    }

    if (automationState) {
      const isAutomationOn = automationState.state === "on";
      iconSwitch.setAttribute("icon", isAutomationOn ? "mdi:bell-ring" : "mdi:bell-off");
      iconSwitch.style.color = isAutomationOn ? "#FFD700" : "#9E9E9E";
    } else {
      iconSwitch.setAttribute("icon", "mdi:bell-alert");
      iconSwitch.style.color = "#ff4444"; 
    }
  }

  _toggleAutomation() {
    if (!this.automationId) return; 
    this._hass.callService("automation", "toggle", {
      entity_id: this.automationId
    });
  }

  _showPopup() {
    const actionConfig = {
      action: "fire-dom-event",
      browser_mod: {
        service: "browser_mod.popup",
        data: {
          title: "📊 Centro di Controllo Rete",
          size: "normal",
          content: {
            type: "custom:centro-offline-popup-card",
            entity: this.entityId,
            online_entity: this.onlineId,
            total_entity: this.totalId
          }
        }
      }
    };

    const event = new Event("hass-action", { bubbles: true, composed: true });
    event.detail = { config: { tap_action: actionConfig }, action: "tap" };
    this.dispatchEvent(event);
  }

  getCardSize() {
    return 3;
  }
}
customElements.define("centro-offline-card", CentroOfflineCard);


// =============================================================================
//  2. POPUP CARD: CENTRO OFFLINE (OCTOPUS STYLING & STABLE ENGINE)
// =============================================================================
class CentroOfflinePopupCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    // FIX: Se Home Assistant tenta di inviare aggiornamenti prima che la card sia caricata, fermalo!
    if (!this.config) return;

    if (!this.content) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            font-family: var(--primary-font-family, sans-serif);
            display: block;
          }
          
          /* TOP GRID BOXES */
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px; }
          .stat-card {
            border-radius: 15px;
            padding: 18px 5px;
            text-align: center;
            border: 1px solid var(--divider-color);
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            position: relative;
          }
          .stat-card.offline { border-color: rgba(255, 82, 82, 0.4); background: rgba(255, 82, 82, 0.05); color: #ff5252; }
          .stat-card.online { border-color: rgba(0, 230, 118, 0.4); background: rgba(0, 230, 118, 0.05); color: #00e676; }
          .stat-card.total { border-color: rgba(0, 209, 255, 0.4); background: rgba(0, 209, 255, 0.05); color: #00d1ff; }
          
          .val { font-size: 28px; font-weight: 900; line-height: 1; margin: 10px 0 4px 0; }
          .lbl { font-size: 11px; font-weight: bold; color: var(--primary-text-color); text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }

          /* ACCORDION (GLASS BOX) */
          .glass-accordion {
            background: transparent;
            border: 1px solid var(--divider-color);
            border-radius: 15px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            overflow: hidden;
            transition: all 0.3s ease;
          }
          
          summary {
            padding: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            outline: none;
            list-style: none;
            background: rgba(150, 150, 150, 0.03);
            transition: background 0.3s;
          }
          summary:hover { background: rgba(150, 150, 150, 0.08); }
          summary::-webkit-details-marker { display: none; }
          
          .title-flex { 
            display: flex; 
            align-items: center; 
            font-size: 16px; 
            font-weight: bold; 
          }
          .title-flex ha-icon { margin-right: 12px; --mdc-icon-size: 22px; }
          
          .badge {
            font-size: 13px;
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: bold;
          }
          .badge-off { background: rgba(255, 82, 82, 0.15); color: #ff5252; border: 1px solid rgba(255, 82, 82, 0.3);}
          .badge-on { background: rgba(0, 230, 118, 0.15); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.3);}
          .badge-tot { background: rgba(0, 209, 255, 0.15); color: #00d1ff; border: 1px solid rgba(0, 209, 255, 0.3);}

          .glass-accordion[open] summary { border-bottom: 1px dashed var(--divider-color); }
          
          /* LISTA INTERNA */
          .list-wrapper { 
            padding: 15px; 
            display: flex; 
            flex-direction: column; 
            gap: 10px; 
          }
          
          .device-pill {
            display: flex;
            align-items: center;
            background: var(--secondary-background-color);
            border: 1px solid var(--divider-color);
            padding: 12px 15px;
            border-radius: 10px;
            transition: transform 0.2s ease;
          }
          .device-pill:hover { transform: scale(1.01); }
          .device-pill ha-icon { margin-right: 15px; --mdc-icon-size: 20px; }
          .device-pill span { font-size: 14px; font-weight: 500; color: var(--primary-text-color); line-height: 1.3; }
          
          .empty-state {
            padding: 20px 0;
            text-align: center;
            color: var(--secondary-text-color);
            font-style: italic;
            font-size: 13px;
          }
        </style>
        <div id="content"></div>
      `;
      this.content = this.shadowRoot.getElementById("content");
      this.lastStateHash = ""; // Variabile per la memoria grafica
    }

    const offlineState = hass.states[this.config.entity];
    const onlineState = hass.states[this.config.online_entity];
    const totalState = hass.states[this.config.total_entity];

    // FIX PRESTAZIONALE: Aggiorna il popup SOLO se c'è un vero cambiamento nella lista!
    const currentStateHash = JSON.stringify([offlineState, onlineState, totalState]);
    if (this.lastStateHash === currentStateHash) {
      return; // Rilevato aggiornamento finto di HA (es. orologio che scatta), non ricreare il popup!
    }
    this.lastStateHash = currentStateHash; // Salva la nuova memoria

    const rawOffline = offlineState ? parseInt(offlineState.state) : 0;
    const isOffline = !isNaN(rawOffline) && rawOffline > 0;
    const offlineCount = isNaN(rawOffline) ? 0 : rawOffline;
    
    const rawOnline = onlineState ? parseInt(onlineState.state) : 0;
    const onlineCount = isNaN(rawOnline) ? 0 : rawOnline;

    const rawTotal = totalState ? parseInt(totalState.state) : 0;
    const totalCount = isNaN(rawTotal) ? 0 : rawTotal;

    const renderList = (stateObj, color, icon) => {
      if (stateObj && stateObj.attributes && stateObj.attributes.elenco_nomi && stateObj.attributes.elenco_nomi.length > 0) {
        return stateObj.attributes.elenco_nomi.map(nome => `
          <div class="device-pill">
            <ha-icon icon="${icon}" style="color: ${color}"></ha-icon>
            <span>${nome}</span>
          </div>
        `).join('');
      }
      return `<div class="empty-state">✨ Nessun dispositivo in questa lista ✨</div>`;
    };

    this.content.innerHTML = `
      <div class="grid">
        <div class="stat-card offline">
          <ha-icon icon="mdi:lan-disconnect" style="--mdc-icon-size: 32px;"></ha-icon>
          <div class="val">${offlineCount}</div>
          <div class="lbl">Offline</div>
        </div>
        <div class="stat-card online">
          <ha-icon icon="mdi:check-network-outline" style="--mdc-icon-size: 32px;"></ha-icon>
          <div class="val">${onlineCount}</div>
          <div class="lbl">Online</div>
        </div>
        <div class="stat-card total">
          <ha-icon icon="mdi:format-list-numbered" style="--mdc-icon-size: 32px;"></ha-icon>
          <div class="val">${totalCount}</div>
          <div class="lbl">Totali</div>
        </div>
      </div>

      <details ${isOffline ? 'open' : ''} class="glass-accordion">
        <summary>
          <div class="title-flex" style="color: #ff5252;">
            <ha-icon icon="mdi:alert-outline"></ha-icon> DISPOSITIVI OFFLINE
          </div>
          <div class="badge badge-off">${offlineCount}</div>
        </summary>
        <div class="list-wrapper">
          ${renderList(offlineState, '#ff5252', 'mdi:lan-disconnect')}
        </div>
      </details>

      <details class="glass-accordion">
        <summary>
          <div class="title-flex" style="color: #00e676;">
            <ha-icon icon="mdi:check-network-outline"></ha-icon> DISPOSITIVI ONLINE
          </div>
          <div class="badge badge-on">${onlineCount}</div>
        </summary>
        <div class="list-wrapper">
          ${renderList(onlineState, '#00e676', 'mdi:check-circle')}
        </div>
      </details>

      <details class="glass-accordion">
        <summary>
          <div class="title-flex" style="color: #00d1ff;">
            <ha-icon icon="mdi:format-list-numbered"></ha-icon> TUTTI I MONITORATI
          </div>
          <div class="badge badge-tot">${totalCount}</div>
        </summary>
        <div class="list-wrapper">
          ${renderList(totalState, '#00d1ff', 'mdi:information-outline')}
        </div>
      </details>
    `;
  }
}
customElements.define("centro-offline-popup-card", CentroOfflinePopupCard);


// =============================================================================
//  3. UI EDITOR: CENTRO OFFLINE (LitElement)
// =============================================================================
class CentroOfflineCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {} }; }
  
  setConfig(config) { this._config = config; }

  _setConfigValue(configValue, newValue) {
    if (!this._config || !this.hass) return;
    if (!configValue) return;

    if (this._config[configValue] === newValue) return;

    const newConfig = { ...this._config };
    if (newValue === "" || newValue === undefined || newValue === null) {
      delete newConfig[configValue];
    } else {
      newConfig[configValue] = newValue;
    }

    this._config = newConfig;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    if (!configValue) return;

    let newValue = ev.detail && ev.detail.value !== undefined ? ev.detail.value : target.value;
    this._setConfigValue(configValue, newValue);
  }

  _renderClearableEntitySelector({ selector, value, configValue, label, style }) {
    const currentValue = value || "";
    return html`
      <div class="entity-row" style=${style || ""}>
        <ha-selector
          .hass=${this.hass}
          .selector=${selector}
          .value=${currentValue}
          .configValue=${configValue}
          .label=${label}
          @value-changed=${this._valueChanged}
        ></ha-selector>
        <ha-icon-button
          class="clear-btn"
          title="Svuota"
          .disabled=${!currentValue}
          @click=${(ev) => {
            ev.stopPropagation();
            this._setConfigValue(configValue, "");
          }}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </ha-icon-button>
      </div>
    `;
  }

  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <div class="card-config">
        
        <div class="sensor-group">
          <h4>✍️ Aspetto</h4>
          <ha-selector
            .hass=${this.hass}
            .selector=${{ text: {} }}
            .value=${this._config.title !== undefined ? this._config.title : 'Centro Dispositivi Offline'}
            .configValue=${"title"}
            .label=${"Titolo della Card"}
            @value-changed=${this._valueChanged}>
          </ha-selector>
        </div>

        <div class="sensor-group">
          <h4>🔔 Automazione Notifiche (Obbligatorio)</h4>
          <p style="font-size: 12px; color: var(--secondary-text-color); margin-top: 0;">Seleziona l'automazione responsabile per l'invio delle notifiche. Il tasto a forma di campanella abiliterà o disabiliterà questa automazione.</p>
          
          ${this._renderClearableEntitySelector({
              selector: { entity: { domain: "automation" } },
              value: this._config.automation_entity,
              configValue: "automation_entity",
              label: "Automazione Notifiche Offline"
          })}
        </div>

        <div class="sensor-group">
          <h4>⚙️ Sensori Collegati (Opzionali)</h4>
          <p style="font-size: 12px; color: var(--secondary-text-color); margin-top: 0;">Modifica queste entità solo se hai cambiato il loro nome di default nell'integrazione.</p>
          
          ${this._renderClearableEntitySelector({
              selector: { entity: { domain: "sensor" } },
              value: this._config.entity || "sensor.dispositivi_offline",
              configValue: "entity",
              label: "Sensore Dispositivi Offline"
          })}

          ${this._renderClearableEntitySelector({
              selector: { entity: { domain: "sensor" } },
              value: this._config.online_entity || "sensor.dispositivi_online",
              configValue: "online_entity",
              label: "Sensore Dispositivi Online"
          })}

          ${this._renderClearableEntitySelector({
              selector: { entity: { domain: "sensor" } },
              value: this._config.total_entity || "sensor.dispositivi_totali",
              configValue: "total_entity",
              label: "Sensore Totale Dispositivi"
          })}
        </div>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid var(--divider-color); text-align: center; opacity: 0.7; font-size: 0.9em;">
          Powered by <a href="https://www.domhouse.it" target="_blank" style="color: var(--primary-color); text-decoration: none; font-weight: bold;">DomHouse.it</a>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      .card-config { padding: 10px; display: flex; flex-direction: column; gap: 15px; }
      h4 { margin-bottom: 10px; margin-top: 0; padding-bottom: 5px; color: var(--primary-text-color); }
      .sensor-group { background: var(--secondary-background-color); padding: 15px; border-radius: 8px; border: 1px solid var(--divider-color); display: flex; flex-direction: column; gap: 12px;}
      ha-selector { width: 100%; display: block; }
      
      .entity-row { display: grid; grid-template-columns: 1fr auto; gap: 4px; align-items: center; min-width: 0; }
      .clear-btn {
        color: var(--secondary-text-color, #888);
        width: 32px; height: 32px; min-width: 32px; min-height: 32px;
        display: inline-flex; align-items: center; justify-content: center;
        opacity: 1; z-index: 2;
        --mdc-icon-button-size: 32px; --mdc-icon-size: 20px;
        --mdc-icon-button-ink-color: var(--secondary-text-color);
        --mdc-icon-button-disabled-ink-color: var(--disabled-text-color);
      }
      .clear-btn:hover { color: var(--primary-text-color, #fff); --mdc-icon-button-ink-color: var(--primary-text-color); }
      .clear-btn ha-icon { color: inherit; opacity: 1; }
    `;
  }
}
customElements.define("centro-offline-card-editor", CentroOfflineCardEditor);

// =============================================================================
//  REGISTRAZIONE UI HOME ASSISTANT
// =============================================================================
window.customCards = window.customCards || [];
window.customCards.push({
  type: "centro-offline-card",
  name: "DomHouse - Centro Offline Card",
  description: "Card Custom per il monitoraggio dei dispositivi offline con popup interattivo.",
  preview: true,
  documentationURL: "https://www.domhouse.it",
});