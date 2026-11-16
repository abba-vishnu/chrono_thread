(function (CG) {
  const cfg = CG.GAME_CONFIG;
  const st = CG.state;

  const WEIGHT_KEY_MAP = {
    pink_wall: 'SPAWN_WEIGHT_PINK_WALL',
    gate_node: 'SPAWN_WEIGHT_GATE_NODE',
    mail_slot: 'SPAWN_WEIGHT_MAIL_SLOT',
    double_slit: 'SPAWN_WEIGHT_DOUBLE_SLIT',
    dual_target_gate: 'SPAWN_WEIGHT_DUAL_RECT',
    staggered_step: 'SPAWN_WEIGHT_STAGGERED',
    trail_missile: 'SPAWN_WEIGHT_MISSILE',
    echo_pad_gate: 'SPAWN_WEIGHT_ECHO_PAD'
  };

  const HEAVY_PUZZLE_TYPES = new Set([
    'dual_target_gate',
    'echo_pad_gate',
    'trail_missile'
  ]);

  let pendingInterVillainOrbsRemaining = 0;
  let lastOrbX = -Infinity;
  let lastOrbY = null;

  CG.scheduleNextDiamond = function () {
    const span = Math.max(0, cfg.DIAMOND_MAX_INTERVAL - cfg.DIAMOND_MIN_INTERVAL);
    const offset = cfg.DIAMOND_MIN_INTERVAL + Math.floor(Math.random() * (span + 1));
    st.nextDiamondAtObstacle = st.obstaclesPassed + offset;
  };

  CG.getUnlockedStageCount = function () {
    const step = Math.max(1, cfg.OBSTACLES_PER_UNLOCK_STAGE);
    return Math.min(CG.PROGRESSION_STAGES.length, 1 + Math.floor(st.obstaclesPassed / step));
  };

  CG.checkTierAnnouncement = function () {
    if (st.isolatedEnemyType !== 'ALL') return;
    const currentStage = CG.getUnlockedStageCount();
    if (currentStage > st.highestStageAnnounced) {
      st.highestStageAnnounced = currentStage;
      CG.dom.tierBannerEl.textContent = CG.PROGRESSION_STAGES[currentStage - 1].name;
      CG.dom.tierBannerEl.classList.add('visible');
      st.bannerTimer = 200;
    }
  };

  CG.hasLockingMissile = function () {
    return st.telegraphs.some(t => t.type === 'trail_missile') ||
           st.obstacles.some(o => o.kind === 'trail_missile' && o.state === 'locking');
  };

  CG.getRightmostHazardEdge = function () {
    let maxRight = -Infinity;
    for (let i = 0; i < st.obstacles.length; i++) {
      const obs = st.obstacles[i];
      if (obs.kind === 'node' || obs.kind === 'special_diamond' || obs.kind === 'trail_missile') continue;
      let rightEdge = obs.x + (obs.w || 0);
      if (obs.gateX !== undefined) {
        rightEdge = Math.max(rightEdge, obs.gateX + (obs.gateW || 0));
      }
      if (obs.rearX !== undefined) {
        rightEdge = Math.max(rightEdge, obs.rearX + (obs.w || 0));
      }
      if (rightEdge > maxRight) maxRight = rightEdge;
    }
    if (st.telegraphs.length > 0) {
      maxRight = Math.max(maxRight, st.width + 110);
    }
    return maxRight;
  };

  CG.hasActiveComplexGateAhead = function () {
    for (let i = 0; i < st.obstacles.length; i++) {
      const obs = st.obstacles[i];
      if (
        obs.kind === 'dual_target_gate' ||
        obs.kind === 'echo_pad_gate' ||
        obs.kind === 'mail_slot' ||
        obs.kind === 'staggered_step' ||
        obs.kind === 'locked_gate'
      ) {
        const rightEdge = obs.gateX ?? obs.rearX ?? obs.x;
        if (!obs.passed && rightEdge > st.player.echoX) {
          return true;
        }
      }
    }
    return false;
  };

  function hasNearbyFreeOrb(targetX, minSep = 120) {
    for (let i = 0; i < st.obstacles.length; i++) {
      const obs = st.obstacles[i];
      if (obs.kind === 'node' && obs.id === null && !obs.sliced) {
        if (Math.abs(obs.x - targetX) < minSep) return true;
      }
    }
    return false;
  }

  function isOrbPositionInsideHazard(ox, oy, pad = 34) {
    for (let i = 0; i < st.obstacles.length; i++) {
      const obs = st.obstacles[i];
      if (obs.kind === 'node' || obs.kind === 'special_diamond' || obs.kind === 'trail_missile') continue;
      const leftEdge = Math.min(
        obs.x ?? Infinity,
        obs.echoRectX ?? Infinity,
        obs.leadRectX ?? Infinity,
        obs.gateX ?? Infinity
      );
      const rightEdge = Math.max(
        (obs.x ?? -Infinity) + (obs.w || 0),
        (obs.rearX ?? -Infinity) + (obs.w || 0),
        (obs.echoRectX ?? -Infinity) + (obs.w || 0),
        (obs.leadRectX ?? -Infinity) + (obs.w || 0),
        (obs.gateX ?? -Infinity) + (obs.gateW || 0)
      );
      if (ox >= leftEdge - pad && ox <= rightEdge + pad) {
        return true;
      }
    }
    return false;
  }

  function rollWhiteOrbBatchCount() {
    const minC = Math.max(0, Math.round(cfg.WHITE_ORB_MIN_COUNT ?? 1));
    const maxC = Math.max(minC, Math.round(cfg.WHITE_ORB_MAX_COUNT ?? 2));
    return minC + Math.floor(Math.random() * (maxC - minC + 1));
  }

  CG.spawnSingleWhiteOrb = function (orbX, preferredY, minXAfterPrevious = 115) {
    const height = st.height;
    const minY = 64;
    const maxY = height - 64;

    const wallPad = Math.round((cfg.WHITE_ORB_WALL_CLEARANCE ?? 100) * 0.65);
    if (hasNearbyFreeOrb(orbX, minXAfterPrevious)) return false;
    if (isOrbPositionInsideHazard(orbX, preferredY, wallPad)) return false;

    let clampedY = Math.max(minY, Math.min(maxY, preferredY));
    if (lastOrbY !== null && Math.abs(orbX - lastOrbX) < 240) {
      const maxDeltaY = 120;
      clampedY = Math.max(
        minY,
        Math.min(maxY, Math.max(lastOrbY - maxDeltaY, Math.min(lastOrbY + maxDeltaY, clampedY)))
      );
    }

    st.obstacles.push({
      kind: 'node',
      id: null,
      motionState: 'static',
      x: orbX,
      y: clampedY,
      spawnY: clampedY,
      phase: 0,
      targetX: null,
      r: 13,
      sliced: false,
      missed: false
    });

    lastOrbX = orbX;
    lastOrbY = clampedY;
    return true;
  };

  CG.maintainInterVillainOrbs = function () {
    const maxAllowed = Math.max(0, Math.round(cfg.WHITE_ORB_MAX_COUNT ?? 2));
    if (maxAllowed <= 0) {
      pendingInterVillainOrbsRemaining = 0;
      return;
    }

    const width = st.width;
    const height = st.height;
    const rightmostHazard = CG.getRightmostHazardEdge();

    if (pendingInterVillainOrbsRemaining > 0) {
      const candidateX = Math.max(width + 45, rightmostHazard + 82);
      if (candidateX <= width + 220) {
        const guideY = lastOrbY !== null
          ? (lastOrbY * 0.55 + height * (0.28 + Math.random() * 0.44) * 0.45)
          : height * (0.32 + Math.random() * 0.36);
        if (CG.spawnSingleWhiteOrb(candidateX, guideY, 110)) {
          pendingInterVillainOrbsRemaining--;
        }
      }
    }

    let activeFreeOrbsAhead = 0;
    let rightmostFreeOrbX = -Infinity;
    for (let i = 0; i < st.obstacles.length; i++) {
      const obs = st.obstacles[i];
      if (obs.kind === 'node' && obs.id === null && !obs.sliced && obs.x > st.player.echoX) {
        activeFreeOrbsAhead++;
        if (obs.x > rightmostFreeOrbX) rightmostFreeOrbX = obs.x;
      }
    }

    const wallClearance = cfg.WHITE_ORB_WALL_CLEARANCE ?? 100;
    const minOrbSpacing = Math.max(135, Math.round(st.speed * 32));
    const canPlaceOpenOrb =
      activeFreeOrbsAhead < maxAllowed &&
      rightmostFreeOrbX < width - minOrbSpacing + 55 &&
      (rightmostHazard < (width + 55 - wallClearance) || rightmostHazard === -Infinity);

    if (canPlaceOpenOrb) {
      const spawnX = width + 55;
      const baseY = lastOrbY !== null ? lastOrbY : height * 0.5;
      const waveShift = (Math.random() - 0.5) * 140;
      const targetY = Math.max(72, Math.min(height - 72, baseY + waveShift));
      CG.spawnSingleWhiteOrb(spawnX, targetY, minOrbSpacing);
    }
  };

  function clampTelYForVillain(villain, motionState, rawY) {
    const height = st.height;
    const edgePad = 34;
    let halfSpan = 40;
    let oscAmp = 0;
    const parentAmp = cfg.GLOBAL_OSC_AMP ?? 68;

    if (villain === 'pink_wall') {
      halfSpan = cfg.PINK_WALL_GAP * 0.5;
      oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.PINK_WALL_OSC_AMP_MULT ?? 1) : 0;
    } else if (villain === 'mail_slot') {
      halfSpan = cfg.MAIL_SLOT_GAP * 0.5;
      oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.MAIL_SLOT_OSC_AMP_MULT ?? 1) : 0;
    } else if (villain === 'double_slit') {
      halfSpan = cfg.DOUBLE_SLIT_GAP + cfg.DOUBLE_SLIT_DIVIDER * 0.5;
      oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.DOUBLE_SLIT_OSC_AMP_MULT ?? 1) : 0;
    } else if (villain === 'dual_target_gate') {
      halfSpan = cfg.DUAL_MAX_OFFSET + cfg.DUAL_RECT_HEIGHT * 0.5;
      oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.DUAL_RECT_OSC_AMP_MULT ?? 1) : 0;
    } else if (villain === 'gate_node') {
      halfSpan = 28;
      oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.GATE_NODE_OSC_AMP_MULT ?? 1) : 0;
    } else if (villain === 'echo_pad_gate') {
      const maxC = Math.max(cfg.ECHO_PAD_MIN_COUNT, cfg.ECHO_PAD_MAX_COUNT);
      const padSpacing = cfg.ECHO_PAD_RADIUS * 2 + cfg.ECHO_PAD_VERTICAL_PADDING;
      halfSpan = ((maxC - 1) * padSpacing) * 0.5 + cfg.ECHO_PAD_RADIUS;
      oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.ECHO_PAD_OSC_AMP_MULT ?? 1) : 0;
    }

    const totalMargin = Math.min(height * 0.42, edgePad + halfSpan + oscAmp * 0.5);
    return Math.max(totalMargin, Math.min(height - totalMargin, rawY));
  }

  function pickProgressiveVillainAndState(unlockedCount) {
    const availableStages = CG.PROGRESSION_STAGES.slice(0, unlockedCount);

    for (let i = 0; i < availableStages.length; i++) {
      const stage = availableStages[i];
      const key = `${stage.villain}:${stage.state}`;
      if (!st.seenStageKeys.has(key)) {
        return { villain: stage.villain, motionState: stage.state };
      }
    }

    const lastKey = st.recentSpawnHistory[st.recentSpawnHistory.length - 1] || '';
    const lastVillain = lastKey.split(':')[0] || '';
    const secondLastKey = st.recentSpawnHistory[st.recentSpawnHistory.length - 2] || '';
    const secondLastVillain = secondLastKey.split(':')[0] || '';
    const complexGateActive = CG.hasActiveComplexGateAhead();

    const recentCounts = {};
    for (let i = 0; i < st.recentSpawnHistory.length; i++) {
      const v = st.recentSpawnHistory[i].split(':')[0];
      recentCounts[v] = (recentCounts[v] || 0) + 1;
    }

    const progressionFactor = Math.max(0, (unlockedCount - 4) / Math.max(1, CG.PROGRESSION_STAGES.length - 4));

    const candidates = availableStages.map((stage, idx) => {
      let baseW = Math.max(0, cfg[WEIGHT_KEY_MAP[stage.villain]] || 1);
      if (baseW <= 0) return { villain: stage.villain, motionState: stage.state, weight: 0 };

      if (stage.villain === 'trail_missile' && complexGateActive) {
        return { villain: stage.villain, motionState: stage.state, weight: 0 };
      }

      if (stage.villain === 'pink_wall') {
        baseW *= (1 - progressionFactor * 0.52);
      }

      if (idx >= unlockedCount - 2 && unlockedCount > 2) {
        baseW *= 1.85;
      }

      const seenRecently = recentCounts[stage.villain] || 0;
      if (seenRecently > 0) {
        baseW /= (1 + seenRecently * 1.6);
      }

      if (stage.villain === lastVillain) {
        baseW *= 0.08;
      } else if (stage.villain === secondLastVillain) {
        baseW *= 0.45;
      }

      if (HEAVY_PUZZLE_TYPES.has(lastVillain) && HEAVY_PUZZLE_TYPES.has(stage.villain)) {
        baseW *= 0.25;
      }

      return {
        villain: stage.villain,
        motionState: stage.state,
        weight: Math.max(0.05, baseW)
      };
    });

    let total = 0;
    for (let i = 0; i < candidates.length; i++) total += candidates[i].weight;
    if (total <= 0) return { villain: 'pink_wall', motionState: 'static' };

    let rnd = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      if (rnd < candidates[i].weight) {
        return { villain: candidates[i].villain, motionState: candidates[i].motionState };
      }
      rnd -= candidates[i].weight;
    }
    return { villain: 'pink_wall', motionState: 'static' };
  }

  CG.queuePattern = function (instantSpawn = false) {
    if (!instantSpawn) {
      if (CG.hasLockingMissile()) return;

      const minClearance = cfg.MIN_RIFT_CLEARANCE_PX ?? 270;
      const rightmostEdge = CG.getRightmostHazardEdge();
      if (rightmostEdge > st.width - minClearance) {
        return;
      }
    }

    const height = st.height;
    const cols = cfg.COLORS;
    let chosen = st.isolatedEnemyType;
    let motionState = st.isolatedEnemyState;

    if (chosen === 'ALL') {
      if (st.obstaclesPassed >= st.nextDiamondAtObstacle && !CG.hasActiveComplexGateAhead()) {
        CG.scheduleNextDiamond();
        const diamondY = height * (0.28 + Math.random() * 0.44);
        const tel = { type: 'special_diamond', motionState: 'static', y: diamondY, color: cols.COLLECTIBLE_DIAMOND_OUTER, timer: cfg.TELEGRAPH_FRAMES };
        if (instantSpawn) CG.spawnFromTelegraph(tel); else st.telegraphs.push(tel);
        return;
      }

      const unlockedCount = CG.getUnlockedStageCount();
      const picked = pickProgressiveVillainAndState(unlockedCount);
      chosen = picked.villain;
      if (motionState === 'AUTO') {
        motionState = picked.motionState;
      }
    } else if (motionState === 'AUTO') {
      motionState = 'static';
    }

    st.seenStageKeys.add(`${chosen}:${motionState}`);
    st.recentSpawnHistory.push(`${chosen}:${motionState}`);
    if (st.recentSpawnHistory.length > 5) st.recentSpawnHistory.shift();

    let tel = null;
    if (chosen === 'trail_missile') {
      st.spawnCooldown = cfg.MISSILE_LOCK_FRAMES + cfg.MISSILE_OVERLAP_DELAY_FRAMES;
      tel = { type: 'trail_missile', motionState, y: st.player.y, color: cols.VILLAIN_SECONDARY, timer: 10 };
    } else if (chosen === 'gate_node') {
      const rawY = height * (0.24 + Math.random() * 0.52);
      tel = { type: 'gate_node', motionState, y: clampTelYForVillain('gate_node', motionState, rawY), color: cols.VILLAIN_AMBER, timer: cfg.TELEGRAPH_FRAMES };
    } else if (chosen === 'pink_wall') {
      const rawY = height * (0.26 + Math.random() * 0.48);
      tel = { type: 'pink_wall', motionState, y: clampTelYForVillain('pink_wall', motionState, rawY), color: cols.VILLAIN_PRIMARY, timer: cfg.TELEGRAPH_FRAMES };
    } else if (chosen === 'mail_slot') {
      const rawY = height * (0.26 + Math.random() * 0.48);
      tel = { type: 'mail_slot', motionState, y: clampTelYForVillain('mail_slot', motionState, rawY), color: cols.VILLAIN_SECONDARY, timer: cfg.TELEGRAPH_FRAMES };
    } else if (chosen === 'double_slit') {
      const rawY = height * (0.32 + Math.random() * 0.36);
      tel = { type: 'double_slit', motionState, y: clampTelYForVillain('double_slit', motionState, rawY), color: cols.VILLAIN_PRIMARY, timer: cfg.TELEGRAPH_FRAMES };
    } else if (chosen === 'dual_target_gate') {
      const rawY = height * (0.28 + Math.random() * 0.44);
      tel = { type: 'dual_target_gate', motionState, y: clampTelYForVillain('dual_target_gate', motionState, rawY), color: cols.VILLAIN_SECONDARY, timer: cfg.TELEGRAPH_FRAMES };
    } else if (chosen === 'staggered_step') {
      const goUp = Math.random() > 0.5;
      const minOff = Math.min(cfg.STAGGERED_MIN_OFFSET, cfg.STAGGERED_MAX_OFFSET);
      const maxOff = Math.max(cfg.STAGGERED_MIN_OFFSET, cfg.STAGGERED_MAX_OFFSET);
      const offset = minOff + Math.random() * Math.max(0, maxOff - minOff);
      const parentAmp = cfg.GLOBAL_OSC_AMP ?? 68;
      const oscAmp = motionState === 'oscillating' ? parentAmp * (cfg.STAGGERED_OSC_AMP_MULT ?? 1) : 0;
      const safeMargin = cfg.STAGGERED_STEP_GAP * 0.5 + oscAmp * 0.5 + 34;
      const midY = height * (0.42 + Math.random() * 0.16);
      const frontY = goUp
        ? Math.min(height - safeMargin, midY + offset * 0.5)
        : Math.max(safeMargin, midY - offset * 0.5);
      const rearY = goUp
        ? Math.max(safeMargin, midY - offset * 0.5)
        : Math.min(height - safeMargin, midY + offset * 0.5);
      tel = {
        type: 'staggered_step',
        motionState,
        y: frontY,
        y2: rearY,
        color: cols.VILLAIN_PRIMARY,
        color2: cols.VILLAIN_AMBER,
        timer: cfg.TELEGRAPH_FRAMES
      };
    } else if (chosen === 'echo_pad_gate') {
      const rawY = height * (0.30 + Math.random() * 0.40);
      tel = { type: 'echo_pad_gate', motionState, y: clampTelYForVillain('echo_pad_gate', motionState, rawY), color: cols.ROSTER_CYAN, timer: cfg.TELEGRAPH_FRAMES };
    }

    if (tel) {
      if (instantSpawn) {
        CG.spawnFromTelegraph(tel);
      } else {
        st.telegraphs.push(tel);
      }
    }
  };

  CG.spawnFromTelegraph = function (tel) {
    const width = st.width;
    const height = st.height;
    const motionState = tel.motionState || 'static';
    const startPhase = Math.random() * Math.PI * 2;
    const minSpeedRatio = Math.max(0.1, Math.min(1, cfg.OSC_MIN_SPEED_RATIO ?? 0.65));
    const minAmpRatio = Math.max(0.1, Math.min(1, cfg.OSC_MIN_AMP_RATIO ?? 0.45));
    const randOscSpeedScale = minSpeedRatio + Math.random() * (1 - minSpeedRatio);
    const randOscAmpScale = minAmpRatio + Math.random() * (1 - minAmpRatio);
    const orbClearance = cfg.WHITE_ORB_WALL_CLEARANCE ?? 100;
    let exitOrbX = null;
    let exitOrbY = tel.y;

    if (tel.type === 'gate_node') {
      const nodeY = tel.y;
      const nodeX = width + 70;
      const gateDist = cfg.GATE_NODE_DIST ?? Math.max(140, cfg.TETHER_HORIZONTAL_GAP + 55);
      const gateX = nodeX + gateDist;
      const gateId = Math.random();

      st.obstacles.push({
        kind: 'node',
        id: gateId,
        motionState,
        x: nodeX,
        y: nodeY,
        spawnY: nodeY,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        targetX: gateX,
        r: 15,
        sliced: false,
        missed: false
      });
      st.obstacles.push({
        kind: 'locked_gate',
        id: gateId,
        x: gateX,
        w: 22,
        unlocked: false,
        passed: false
      });
      exitOrbX = gateX + orbClearance;
      exitOrbY = nodeY;

    } else if (tel.type === 'pink_wall') {
      const gapCenter = tel.y;
      const gapSize = cfg.PINK_WALL_GAP;
      st.obstacles.push({
        kind: 'pink_wall',
        motionState,
        x: width + 60,
        w: 24,
        spawnY: gapCenter,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        gapSize,
        gapTop: gapCenter - gapSize / 2,
        gapBottom: gapCenter + gapSize / 2,
        passed: false
      });
      exitOrbX = width + 60 + 24 + orbClearance;
      exitOrbY = motionState === 'oscillating' ? (gapCenter + height * 0.5) * 0.5 : gapCenter;

    } else if (tel.type === 'mail_slot') {
      const slotCenter = tel.y;
      const gapSize = cfg.MAIL_SLOT_GAP;
      const tunnelWidth = cfg.MAIL_SLOT_WIDTH ?? 96;
      st.obstacles.push({
        kind: 'mail_slot',
        motionState,
        x: width + 60,
        w: tunnelWidth,
        spawnY: slotCenter,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        gapSize,
        gapTop: slotCenter - gapSize / 2,
        gapBottom: slotCenter + gapSize / 2,
        passed: false
      });
      exitOrbX = width + 60 + tunnelWidth + orbClearance;
      exitOrbY = motionState === 'oscillating' ? (slotCenter + height * 0.5) * 0.5 : slotCenter;

    } else if (tel.type === 'double_slit') {
      const center = tel.y;
      const gapSize = cfg.DOUBLE_SLIT_GAP;
      const dividerH = cfg.DOUBLE_SLIT_DIVIDER;
      const dividerTop = center - dividerH * 0.5;
      const dividerBottom = center + dividerH * 0.5;
      st.obstacles.push({
        kind: 'double_slit',
        motionState,
        x: width + 60,
        w: 26,
        spawnY: center,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        gapSize,
        dividerH,
        dividerTop,
        dividerBottom,
        topGapTop: dividerTop - gapSize,
        bottomGapBottom: dividerBottom + gapSize,
        passed: false
      });
      const exitY = Math.random() > 0.5 ? dividerTop - gapSize * 0.5 : dividerBottom + gapSize * 0.5;
      exitOrbX = width + 60 + 26 + orbClearance;
      exitOrbY = motionState === 'oscillating' ? (exitY + height * 0.5) * 0.5 : exitY;

    } else if (tel.type === 'special_diamond') {
      st.obstacles.push({ kind: 'special_diamond', x: width + 70, y: tel.y, r: 22, sliced: false, missed: false });
      return;

    } else if (tel.type === 'dual_target_gate') {
      const echoRectX = width + 70;
      const xGap = cfg.DUAL_RECT_X_GAP ?? cfg.TETHER_HORIZONTAL_GAP;
      const leadRectX = echoRectX + xGap;
      const gateDist = cfg.DUAL_RECT_GATE_DIST ?? 130;
      const gateX = Math.max(echoRectX + cfg.DUAL_RECT_WIDTH, leadRectX + cfg.DUAL_RECT_WIDTH) + gateDist;

      const minOff = Math.min(cfg.DUAL_MIN_OFFSET, cfg.DUAL_MAX_OFFSET);
      const maxOff = Math.max(cfg.DUAL_MIN_OFFSET, cfg.DUAL_MAX_OFFSET);
      const spanOff = maxOff - minOff;
      const magnitude = minOff + Math.random() * spanOff;
      const sign = Math.random() < 0.5 ? 1 : -1;
      const currentOffset = magnitude * sign;

      st.obstacles.push({
        kind: 'dual_target_gate',
        motionState,
        echoRectX: echoRectX,
        leadRectX: leadRectX,
        y: tel.y,
        spawnY: tel.y,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        w: cfg.DUAL_RECT_WIDTH,
        h: cfg.DUAL_RECT_HEIGHT,
        offset: currentOffset,
        echoHit: false,
        leadHit: false,
        gateX: gateX,
        gateW: 24,
        unlocked: false,
        passed: false
      });

      exitOrbX = gateX + 24 + orbClearance;
      exitOrbY = tel.y;

    } else if (tel.type === 'staggered_step') {
      const gapSize = cfg.STAGGERED_STEP_GAP;
      const frontX = width + 60;
      const distSpan = cfg.STAGGERED_MAX_DIST - cfg.STAGGERED_MIN_DIST;
      const stepDist = cfg.STAGGERED_MIN_DIST + Math.random() * Math.max(0, distSpan);
      const rearX = frontX + stepDist;

      st.obstacles.push({
        kind: 'staggered_step',
        motionState,
        x: frontX,
        rearX: rearX,
        w: 22,
        spawnY: (tel.y + tel.y2) * 0.5,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        gapSize,
        frontBaseY: tel.y,
        rearBaseY: tel.y2,
        frontGapTop: tel.y - gapSize / 2,
        frontGapBottom: tel.y + gapSize / 2,
        rearGapTop: tel.y2 - gapSize / 2,
        rearGapBottom: tel.y2 + gapSize / 2,
        passed: false
      });
      exitOrbX = rearX + 22 + orbClearance;
      exitOrbY = tel.y2;

    } else if (tel.type === 'trail_missile') {
      st.obstacles.push({
        kind: 'trail_missile',
        motionState,
        x: width - 36,
        y: st.player.y,
        spawnY: st.player.y,
        phase: 0,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        r: cfg.MISSILE_RADIUS,
        lockTimer: cfg.MISSILE_LOCK_FRAMES,
        maxLock: cfg.MISSILE_LOCK_FRAMES,
        state: 'locking',
        trail: [],
        passed: false
      });

      const batchTarget = rollWhiteOrbBatchCount();
      if (batchTarget > 0) {
        const safeOrbY = st.player.y > height * 0.5
          ? Math.max(78, st.player.y - 135)
          : Math.min(height - 78, st.player.y + 135);
        const placed = CG.spawnSingleWhiteOrb(width + 115, safeOrbY, 115);
        pendingInterVillainOrbsRemaining = Math.max(0, batchTarget - (placed ? 1 : 0));
      }
      return;

    } else if (tel.type === 'echo_pad_gate') {
      const padCenterX = width + 95;
      const gateX = padCenterX + (cfg.ECHO_PAD_GATE_DIST ?? 110);
      const roster = ['cyan', 'amber', 'pink'];
      const gateColor = roster[Math.floor(Math.random() * roster.length)];
      const decoyColors = roster.filter(c => c !== gateColor);

      const minC = Math.min(cfg.ECHO_PAD_MIN_COUNT, cfg.ECHO_PAD_MAX_COUNT);
      const maxC = Math.max(cfg.ECHO_PAD_MIN_COUNT, cfg.ECHO_PAD_MAX_COUNT);
      const padR = cfg.ECHO_PAD_RADIUS;
      const padSpacing = padR * 2 + cfg.ECHO_PAD_VERTICAL_PADDING;

      const maxFittingCount = Math.max(1, Math.min(maxC, Math.floor((height - 110) / padSpacing)));
      const effectiveMin = Math.min(minC, maxFittingCount);
      const count = effectiveMin + Math.floor(Math.random() * (maxFittingCount - effectiveMin + 1));

      const matchingIndex = Math.floor(Math.random() * count);
      const totalSpan = (count - 1) * padSpacing;
      const keys = [];
      for (let k = 0; k < count; k++) {
        const offsetY = -totalSpan * 0.5 + k * padSpacing;
        const color = k === matchingIndex
          ? gateColor
          : decoyColors[Math.floor(Math.random() * decoyColors.length)];
        keys.push({
          offsetY,
          color,
          collected: false
        });
      }

      const columnHalfHeight = totalSpan * 0.5 + padR;
      const clampedSpawnY = Math.max(
        columnHalfHeight + 36,
        Math.min(height - columnHalfHeight - 36, tel.y)
      );

      st.obstacles.push({
        kind: 'echo_pad_gate',
        motionState,
        x: padCenterX,
        spawnY: clampedSpawnY,
        currentCenterY: clampedSpawnY,
        phase: startPhase,
        oscSpeedScale: randOscSpeedScale,
        oscAmpScale: randOscAmpScale,
        padR,
        columnHalfHeight,
        keys,
        gateColor,
        gateX,
        gateW: cfg.PHASE_GATE_WIDTH,
        phasedThrough: false,
        damagedPlayer: false,
        passed: false
      });
      exitOrbX = gateX + cfg.PHASE_GATE_WIDTH + orbClearance;
      exitOrbY = clampedSpawnY;
    }

    const batchTarget = rollWhiteOrbBatchCount();
    if (batchTarget > 0) {
      let placed = false;
      if (exitOrbX !== null) {
        placed = CG.spawnSingleWhiteOrb(exitOrbX, exitOrbY, 115);
      }
      pendingInterVillainOrbsRemaining = Math.max(0, batchTarget - (placed ? 1 : 0));
    } else {
      pendingInterVillainOrbsRemaining = 0;
    }
  };
})(window.ChronoGame);
