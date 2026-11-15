(function (CG) {
  const cfg = CG.GAME_CONFIG;
  const st = CG.state;
  const dom = CG.dom;

  const tuningControlRefs = [];
  const sectionRefs = [];
  let gizmoToggleBtnRef = null;

  CG.showSaveToast = function (msg = 'SAVED TO STORAGE') {
    dom.saveStatusEl.textContent = msg;
    dom.saveStatusEl.classList.add('visible');
    clearTimeout(CG.showSaveToast._t);
    CG.showSaveToast._t = setTimeout(() => {
      dom.saveStatusEl.classList.remove('visible');
    }, 1800);
  };

  CG.saveConfigToLocalStorage = function () {
    try {
      localStorage.setItem(CG.STORAGE_KEY, JSON.stringify(cfg));
      CG.showSaveToast('SAVED TO STORAGE');
    } catch (_) {
      CG.showSaveToast('SAVE FAILED');
    }
  };

  function formatTuningVal(item, val) {
    if (item.type === 'color') return String(val).toUpperCase();
    const numStr = item.integer ? String(Math.round(val)) : Number(val.toFixed(3)).toString();
    return item.suffix ? `${numStr}${item.suffix}` : numStr;
  }

  CG.syncTopDebugButtons = function () {
    if (dom.godmodeBtn) {
      dom.godmodeBtn.classList.toggle('on', st.godmodeEnabled);
      dom.godmodeBtn.textContent = st.godmodeEnabled ? 'GOD MODE: ON' : 'GOD MODE: OFF';
    }
    if (dom.disableVillainsBtn) {
      dom.disableVillainsBtn.classList.toggle('on', st.disableVillains);
      dom.disableVillainsBtn.textContent = st.disableVillains ? 'VILLAINS: OFF' : 'VILLAINS: ON';
    }
  };

  CG.buildTuningUI = function () {
    dom.tuningScroll.innerHTML = '';
    tuningControlRefs.length = 0;
    sectionRefs.length = 0;
    CG.syncTopDebugButtons();

    CG.TUNING_SCHEMA.forEach(group => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'tuning-section';
      if (group.enemyTag) {
        sectionRefs.push({ tag: group.enemyTag, el: sectionEl });
      }

      const titleEl = document.createElement('div');
      titleEl.className = 'tuning-section-title';
      titleEl.textContent = group.section;
      sectionEl.appendChild(titleEl);

      if (group.isDebugToggles) {
        const gizmoRow = document.createElement('div');
        gizmoRow.className = 'tuning-toggle-row cyan-theme';
        const gizmoLabel = document.createElement('span');
        gizmoLabel.textContent = 'ENGINE GIZMOS (HITBOXES & ZONES)';

        const gizmoBtn = document.createElement('button');
        gizmoBtn.type = 'button';
        gizmoBtn.className = 'tuning-toggle-btn' + (st.showGizmos ? ' on' : '');
        gizmoBtn.textContent = st.showGizmos ? 'VISIBLE [ON]' : 'HIDDEN';

        gizmoBtn.addEventListener('click', () => {
          st.showGizmos = !st.showGizmos;
          gizmoBtn.className = 'tuning-toggle-btn' + (st.showGizmos ? ' on' : '');
          gizmoBtn.textContent = st.showGizmos ? 'VISIBLE [ON]' : 'HIDDEN';
          if (st.isPaused) CG.draw();
        });
        gizmoToggleBtnRef = gizmoBtn;

        gizmoRow.appendChild(gizmoLabel);
        gizmoRow.appendChild(gizmoBtn);
        sectionEl.appendChild(gizmoRow);
      }

      group.items.forEach(item => {
        const rowEl = document.createElement('div');
        rowEl.className = 'tuning-row';

        const labelEl = document.createElement('label');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.label;

        const valBadge = document.createElement('span');
        valBadge.className = 'val-badge';
        valBadge.textContent = formatTuningVal(item, item.target[item.key]);

        labelEl.appendChild(nameSpan);
        labelEl.appendChild(valBadge);
        rowEl.appendChild(labelEl);

        if (item.desc) {
          const descEl = document.createElement('div');
          descEl.className = 'tuning-desc';
          descEl.textContent = item.desc;
          rowEl.appendChild(descEl);
        }

        const inputsWrap = document.createElement('div');
        inputsWrap.className = 'tuning-inputs';

        if (item.type === 'color') {
          const colorEl = document.createElement('input');
          colorEl.type = 'color';
          colorEl.value = item.target[item.key];
          colorEl.style.width = '100%';
          colorEl.style.height = '26px';
          colorEl.style.cursor = 'pointer';
          colorEl.style.border = '1px solid rgba(255,255,255,0.2)';
          colorEl.style.borderRadius = '4px';
          colorEl.style.background = 'transparent';

          colorEl.addEventListener('input', () => {
            item.target[item.key] = colorEl.value;
            CG.updateUI();
            CG.syncTuningUI();
            if (st.isPaused) CG.draw();
          });

          inputsWrap.appendChild(colorEl);
          rowEl.appendChild(inputsWrap);
          sectionEl.appendChild(rowEl);
          tuningControlRefs.push({ item, colorEl, valBadge });
          return;
        }

        const rangeEl = document.createElement('input');
        rangeEl.type = 'range';
        rangeEl.min = item.min;
        rangeEl.max = item.max;
        rangeEl.step = item.step;
        rangeEl.value = item.target[item.key];

        const numEl = document.createElement('input');
        numEl.type = 'number';
        numEl.min = item.min;
        numEl.step = item.step;
        numEl.value = item.target[item.key];

        function applyNewValue(rawVal) {
          if (Number.isNaN(rawVal)) return;
          let clamped = Math.max(item.min, rawVal);
          if (item.integer) clamped = Math.round(clamped);
          item.target[item.key] = clamped;

          const player = st.player;
          player.radius = cfg.PARENT_RADIUS;
          player.radiusEcho = cfg.ECHO_RADIUS;
          player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
          const unmergedEchoX = player.leadX - cfg.TETHER_HORIZONTAL_GAP;
          player.echoX = unmergedEchoX + (player.leadX - unmergedEchoX) * (st.surgeMerge || 0);
          if (st.lives > cfg.MAX_LIVES) st.lives = cfg.MAX_LIVES;

          while (player.history.length > cfg.ECHO_DELAY_FRAMES + 1) {
            player.history.shift();
          }
          while (player.history.length < cfg.ECHO_DELAY_FRAMES + 1) {
            player.history.unshift(player.history[0] ?? player.y);
          }

          st.obstacles.forEach(obs => {
            if (obs.kind === 'dual_target_gate') {
              obs.w = cfg.DUAL_RECT_WIDTH;
              obs.h = cfg.DUAL_RECT_HEIGHT;
              obs.leadRectX = obs.echoRectX + (cfg.DUAL_RECT_X_GAP ?? cfg.TETHER_HORIZONTAL_GAP);
              obs.gateX = Math.max(obs.echoRectX + obs.w, obs.leadRectX + obs.w) + (cfg.DUAL_RECT_GATE_DIST ?? 130);
            } else if (obs.kind === 'echo_pad_gate') {
              obs.padR = cfg.ECHO_PAD_RADIUS;
              obs.gateW = cfg.PHASE_GATE_WIDTH;
              obs.gateX = obs.x + (cfg.ECHO_PAD_GATE_DIST ?? 110);
            } else if (obs.kind === 'node' && obs.id !== null) {
              const gate = st.obstacles.find(o => o.kind === 'locked_gate' && o.id === obs.id);
              if (gate) {
                const newGateX = obs.x + (cfg.GATE_NODE_DIST ?? 140);
                obs.targetX = newGateX;
                gate.x = newGateX;
              }
            } else if (obs.kind === 'trail_missile') {
              obs.r = cfg.MISSILE_RADIUS;
            }
          });

          CG.updateUI();
          CG.syncTuningUI();
          if (st.isPaused) CG.draw();
        }

        rangeEl.addEventListener('input', () => applyNewValue(parseFloat(rangeEl.value)));
        numEl.addEventListener('input', () => {
          if (numEl.value === '') return;
          applyNewValue(parseFloat(numEl.value));
        });
        numEl.addEventListener('blur', () => CG.syncTuningUI());

        inputsWrap.appendChild(rangeEl);
        inputsWrap.appendChild(numEl);
        rowEl.appendChild(inputsWrap);
        sectionEl.appendChild(rowEl);

        tuningControlRefs.push({ item, rangeEl, numEl, valBadge });
      });

      dom.tuningScroll.appendChild(sectionEl);
    });
  };

  CG.syncTuningUI = function () {
    tuningControlRefs.forEach(({ item, rangeEl, numEl, colorEl, valBadge }) => {
      const val = item.target[item.key];
      if (item.type === 'color') {
        if (colorEl) colorEl.value = val;
        valBadge.textContent = formatTuningVal(item, val);
        return;
      }
      rangeEl.value = Math.min(item.max, Math.max(item.min, val));
      if (document.activeElement !== numEl) {
        numEl.value = val;
      }
      valBadge.textContent = formatTuningVal(item, val);
    });
    CG.syncTopDebugButtons();
    if (gizmoToggleBtnRef) {
      gizmoToggleBtnRef.className = 'tuning-toggle-btn' + (st.showGizmos ? ' on' : '');
      gizmoToggleBtnRef.textContent = st.showGizmos ? 'VISIBLE [ON]' : 'HIDDEN';
    }
  };

  CG.setPaused = function (nextPaused) {
    if (st.gameOver) return;
    st.isPaused = nextPaused;
    if (st.isPaused) {
      CG.clearAllInputs();
      dom.pauseToggleBtn.textContent = '▶';
      dom.pauseToggleBtn.classList.add('paused');
    } else {
      dom.pauseToggleBtn.textContent = '||';
      dom.pauseToggleBtn.classList.remove('paused');
    }
  };

  CG.toggleInspector = function (forceState) {
    if (typeof forceState === 'boolean') {
      dom.engineInspector.classList.toggle('collapsed', !forceState);
    } else {
      dom.engineInspector.classList.toggle('collapsed');
    }
  };

  CG.setIsolatedEnemy = function (type) {
    st.isolatedEnemyType = type;
    dom.enemySelect.value = type;

    let highlightedEl = null;
    sectionRefs.forEach(({ tag, el }) => {
      if (tag === type) {
        el.classList.add('highlighted');
        highlightedEl = el;
      } else {
        el.classList.remove('highlighted');
      }
    });
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  CG.setIsolatedEnemyState = function (motionState) {
    st.isolatedEnemyState = motionState;
    dom.enemyStateSelect.value = motionState;
  };

  CG.triggerImmediateSandboxSpawn = function () {
    if (st.gameOver) CG.resetGame();
    st.obstacles = [];
    st.telegraphs = [];
    st.spawnCooldown = 0;
    CG.queuePattern(true);
    if (st.isPaused) CG.draw();
  };

  CG.bindInspectorEvents = function () {
    // Secret 5-tap trigger on main score counter
    let secretTapCount = 0;
    let secretTapTimer = null;
    dom.scoreEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      secretTapCount++;
      clearTimeout(secretTapTimer);
      secretTapTimer = setTimeout(() => {
        secretTapCount = 0;
      }, 1100);
      if (secretTapCount >= 5) {
        secretTapCount = 0;
        clearTimeout(secretTapTimer);
        CG.toggleInspector();
      }
    });

    if (dom.closeInspectorBtn) {
      dom.closeInspectorBtn.addEventListener('click', () => {
        CG.toggleInspector(false);
      });
    }

    if (dom.godmodeBtn) {
      dom.godmodeBtn.addEventListener('click', () => {
        st.godmodeEnabled = !st.godmodeEnabled;
        if (st.godmodeEnabled) st.lives = cfg.MAX_LIVES;
        CG.syncTopDebugButtons();
        CG.updateUI();
      });
    }

    if (dom.disableVillainsBtn) {
      dom.disableVillainsBtn.addEventListener('click', () => {
        st.disableVillains = !st.disableVillains;
        CG.syncTopDebugButtons();
      });
    }

    dom.pauseToggleBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!st.gameOver) CG.setPaused(!st.isPaused);
    });

    dom.enemySelect.addEventListener('change', () => {
      CG.setIsolatedEnemy(dom.enemySelect.value);
      CG.triggerImmediateSandboxSpawn();
    });

    dom.enemyStateSelect.addEventListener('change', () => {
      CG.setIsolatedEnemyState(dom.enemyStateSelect.value);
      CG.triggerImmediateSandboxSpawn();
    });

    dom.spawnNowBtn.addEventListener('click', () => {
      CG.triggerImmediateSandboxSpawn();
    });

    dom.clearFieldBtn.addEventListener('click', () => {
      st.obstacles = [];
      st.telegraphs = [];
      st.activePhaseShield = null;
      if (st.isPaused) CG.draw();
    });

    dom.savePresetBtn.addEventListener('click', () => {
      CG.saveConfigToLocalStorage();
    });

    dom.resetTuningBtn.addEventListener('click', () => {
      Object.assign(cfg, CG.DEFAULT_GAME_CONFIG);
      cfg.COLORS = { ...CG.DEFAULT_GAME_CONFIG.COLORS };
      localStorage.removeItem(CG.STORAGE_KEY);
      st.godmodeEnabled = true;
      st.disableVillains = false;
      st.showGizmos = false;
      st.player.radius = cfg.PARENT_RADIUS;
      st.player.radiusEcho = cfg.ECHO_RADIUS;
      st.player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
      st.player.echoX = st.player.leadX - cfg.TETHER_HORIZONTAL_GAP;
      CG.syncTuningUI();
      CG.updateUI();
      CG.showSaveToast('RESET TO DEFAULTS');
      if (st.isPaused) CG.draw();
    });

    dom.copyConfigBtn.addEventListener('click', async () => {
      const exported = JSON.stringify(cfg, null, 2);
      try {
        await navigator.clipboard.writeText(exported);
        CG.showSaveToast('JSON COPIED');
      } catch (_) {
        console.log(exported);
      }
    });

    dom.importConfigBtn.addEventListener('click', () => {
      const pasted = prompt('Paste a Chrono-Thread JSON configuration object:');
      if (!pasted) return;
      try {
        const parsed = JSON.parse(pasted);
        for (const k of Object.keys(CG.DEFAULT_GAME_CONFIG)) {
          if (k === 'COLORS' && parsed.COLORS && typeof parsed.COLORS === 'object') {
            for (const ck of Object.keys(CG.DEFAULT_GAME_CONFIG.COLORS)) {
              if (typeof parsed.COLORS[ck] === 'string') {
                cfg.COLORS[ck] = parsed.COLORS[ck];
              }
            }
          } else if (typeof parsed[k] === typeof CG.DEFAULT_GAME_CONFIG[k]) {
            cfg[k] = parsed[k];
          }
        }
        st.player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
        st.player.echoX = st.player.leadX - cfg.TETHER_HORIZONTAL_GAP;
        CG.syncTuningUI();
        CG.updateUI();
        CG.saveConfigToLocalStorage();
        CG.showSaveToast('JSON IMPORTED & SAVED');
        if (st.isPaused) CG.draw();
      } catch (err) {
        alert('Invalid JSON format.');
      }
    });
  };
})(window.ChronoGame);
