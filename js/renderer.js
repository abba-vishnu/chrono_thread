(function (CG) {
  const cfg = CG.GAME_CONFIG;
  const st = CG.state;
  const ctx = CG.dom.ctx;

  CG.createBurst = function (x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      st.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 1, color });
    }
  };

  // Extra descriptive callouts only spawn when Debug Text is enabled; score popups always spawn
  CG.addFloatingText = function (x, y, text, color, isScore = false) {
    if (!isScore && !st.showDebugText) return;
    st.floatingTexts.push({ x, y, text, color, life: 1, vy: -1.15 });
  };

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(255, 255, 255, ${alpha})`;
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    const num = parseInt(clean, 16);
    if (Number.isNaN(num)) return `rgba(255, 255, 255, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getRosterHex(colorKey) {
    if (colorKey === 'cyan') return cfg.COLORS.ROSTER_CYAN;
    if (colorKey === 'amber') return cfg.COLORS.ROSTER_AMBER;
    return cfg.COLORS.ROSTER_PINK;
  }

  function getRosterRgba(colorKey, alpha) {
    return hexToRgba(getRosterHex(colorKey), alpha);
  }

  function drawPrizeDiamond(cx, cy, r, pulsePhase) {
    const outerCol = cfg.COLORS.COLLECTIBLE_DIAMOND_OUTER;
    const innerCol = cfg.COLORS.COLLECTIBLE_DIAMOND_INNER;
    ctx.save();
    const scale = 1 + Math.sin(pulsePhase) * 0.08;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.85, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.85, 0);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(outerCol, 0.26);
    ctx.strokeStyle = outerCol;
    ctx.shadowColor = outerCol;
    ctx.shadowBlur = 22;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -r * 0.56);
    ctx.lineTo(r * 0.48, 0);
    ctx.lineTo(0, r * 0.56);
    ctx.lineTo(-r * 0.48, 0);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(innerCol, 0.45);
    ctx.strokeStyle = innerCol;
    ctx.lineWidth = 1.8;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -r * 0.26);
    ctx.lineTo(r * 0.22, 0);
    ctx.lineTo(0, r * 0.26);
    ctx.lineTo(-r * 0.22, 0);
    ctx.closePath();
    ctx.fillStyle = innerCol;
    ctx.fill();
    ctx.restore();
  }

  function traceHexagonPath(cx, cy, r, rotation = 0) {
    ctx.beginPath();
    for (let s = 0; s < 6; s++) {
      const ang = rotation + (s * Math.PI) / 3;
      const vx = cx + Math.cos(ang) * r;
      const vy = cy + Math.sin(ang) * r;
      if (s === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
  }

  function drawHexKeyPad(cx, cy, r, activePulse, colorKey, isCollected) {
    ctx.save();
    const baseColor = getRosterHex(colorKey);

    if (isCollected) {
      ctx.globalAlpha = 0.22;
      traceHexagonPath(cx, cy, r * 0.88, 0);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    traceHexagonPath(cx, cy, r, 0);
    ctx.fillStyle = getRosterRgba(colorKey, 0.2);
    ctx.strokeStyle = baseColor;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.5;
    ctx.fill();
    ctx.stroke();

    const innerR = r * (0.62 + Math.sin(activePulse) * 0.05);
    traceHexagonPath(cx, cy, innerR, activePulse * 0.35);
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, r * 0.24), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
  
  // Common renderer for all shatter-able walls
  function drawShatterWall(x, w, height, hexColor, isUnlocked) {
    ctx.save();
    if (!isUnlocked) {
      // Soft semi-transparent interior fill
      ctx.fillStyle = hexToRgba(hexColor, 0.22);
      ctx.fillRect(x, 0, w, height);

      // Dark horizontal slits inside
      ctx.fillStyle = '#08090e';
      for (let y = 15; y < height; y += 30) {
        ctx.fillRect(x + 4, y, w - 8, 10);
      }

      // Crisp neon outer border
      ctx.strokeStyle = hexColor;
      ctx.shadowColor = hexColor;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, 0, w, height);
    } else {
      ctx.strokeStyle = hexToRgba(hexColor, 0.2);
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 0, w, height);
    }
    ctx.restore();
  }
  
  // Continuously drive diegetic combo scale & max-sync vibration every frame
  function syncWorldComboAnimation() {
    const comboEl = CG.dom.comboEl;
    if (!comboEl) return;

    const effectiveChain = CG.getEffectiveChain();
    if (effectiveChain <= 1) return;

    const popBoost = st.comboPopFrames > 0 ? (st.comboPopFrames / 14) * 0.22 : 0;
    const isMaxed = effectiveChain >= cfg.MAX_COMBO;

    if (isMaxed && !st.gameOver && !st.isPaused) {
      const shiverX = (Math.random() - 0.5) * 4.4;
      const shiverY = (Math.random() - 0.5) * 4.4;
      const shiverRot = (Math.random() - 0.5) * 2.2;
      const pulseScale = 1.04 + Math.sin(st.frame * 0.35) * 0.035 + popBoost;
      comboEl.style.transform = `translate3d(${shiverX.toFixed(2)}px, ${shiverY.toFixed(2)}px, 0) rotate(${shiverRot.toFixed(2)}deg) scale(${pulseScale.toFixed(3)})`;
    } else {
      const baseScale = 1 + popBoost;
      comboEl.style.transform = `translate3d(0px, 0px, 0) scale(${baseScale.toFixed(3)})`;
    }
  }

  CG.draw = function () {
    const width = st.width;
    const height = st.height;
    const player = st.player;
    const cols = cfg.COLORS;

    syncWorldComboAnimation();

    ctx.save();
    if (!st.gameOver && !st.isPaused && st.shakeTime > 0) {
      const mag = st.damageFlashFrames > 0 ? 13 : 7;
      const dx = (Math.random() - 0.5) * mag;
      const dy = (Math.random() - 0.5) * mag;
      ctx.translate(dx, dy);
    }

    ctx.clearRect(0, 0, width, height);

    const leadY = player.y;
    const echoY = player.echoY;
    const merge = st.surgeMerge || 0;
    const isOvercharged = CG.isPlayerOvercharged();

    st.telegraphs.forEach(tel => {
      const alpha = Math.sin((1 - tel.timer / Math.max(1, cfg.TELEGRAPH_FRAMES)) * Math.PI);
      ctx.save();
      ctx.fillStyle = tel.color;
      ctx.shadowColor = tel.color;
      ctx.shadowBlur = 14;
      ctx.globalAlpha = Math.max(0.2, alpha * 0.9);

      ctx.fillRect(width - 6, tel.y - 26, 6, 52);
      ctx.beginPath();
      ctx.moveTo(width - 18, tel.y);
      ctx.lineTo(width - 9, tel.y - 7);
      ctx.lineTo(width - 9, tel.y + 7);
      ctx.closePath();
      ctx.fill();

      if (tel.type === 'staggered_step' && tel.y2 !== undefined) {
        ctx.fillStyle = tel.color2;
        ctx.shadowColor = tel.color2;
        ctx.fillRect(width - 6, tel.y2 - 22, 6, 44);
      }
      ctx.restore();
    });

    st.obstacles.forEach(obs => {
      if (obs.kind === 'node' && !obs.sliced && obs.targetX !== null) {
        ctx.strokeStyle = hexToRgba(cols.VILLAIN_AMBER, 0.35);
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.targetX, obs.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (obs.kind === 'dual_target_gate' && !obs.unlocked) {
        const echoYPos = obs.y - obs.offset;
        const leadYPos = obs.y + obs.offset;

        ctx.save();
        ctx.strokeStyle = hexToRgba(cols.VILLAIN_SECONDARY, 0.65);
        ctx.shadowColor = cols.VILLAIN_SECONDARY;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 4]);

        if (!obs.echoHit) {
          ctx.beginPath();
          ctx.moveTo(obs.echoRectX + obs.w, echoYPos);
          ctx.lineTo(obs.gateX, echoYPos);
          ctx.stroke();
        }

        if (!obs.leadHit) {
          ctx.beginPath();
          ctx.moveTo(obs.leadRectX + obs.w, leadYPos);
          ctx.lineTo(obs.gateX, leadYPos);
          ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
      }
    });

    st.obstacles.forEach(obs => {
      ctx.save();

      if (obs.kind === 'pink_wall') {
        ctx.fillStyle = cols.VILLAIN_PRIMARY;
        ctx.shadowColor = cols.VILLAIN_PRIMARY;
        ctx.shadowBlur = 14;
        ctx.fillRect(obs.x, 0, obs.w, obs.gapTop);
        ctx.fillRect(obs.x, obs.gapBottom, obs.w, height - obs.gapBottom);

        if (obs.motionState === 'oscillating') {
          ctx.fillStyle = cols.VILLAIN_AMBER;
          ctx.fillRect(obs.x - 2, obs.gapTop - 4, obs.w + 4, 4);
          ctx.fillRect(obs.x - 2, obs.gapBottom, obs.w + 4, 4);
        }

      } else if (obs.kind === 'mail_slot') {
        ctx.fillStyle = cols.VILLAIN_PRIMARY;
        ctx.shadowColor = cols.VILLAIN_PRIMARY;
        ctx.shadowBlur = 14;
        ctx.fillRect(obs.x, 0, obs.w, obs.gapTop);
        ctx.fillRect(obs.x, obs.gapBottom, obs.w, height - obs.gapBottom);

        ctx.fillStyle = obs.motionState === 'oscillating' ? cols.VILLAIN_AMBER : cols.VILLAIN_SECONDARY;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.fillRect(obs.x - 2, obs.gapTop - 4, obs.w + 4, 4);
        ctx.fillRect(obs.x - 2, obs.gapBottom, obs.w + 4, 4);

        const midY = (obs.gapTop + obs.gapBottom) * 0.5;
        ctx.strokeStyle = hexToRgba(cols.VILLAIN_SECONDARY, 0.35);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(obs.x + 6, midY);
        ctx.lineTo(obs.x + obs.w - 6, midY);
        ctx.stroke();
        ctx.setLineDash([]);

      } else if (obs.kind === 'double_slit') {
        ctx.fillStyle = cols.VILLAIN_PRIMARY;
        ctx.shadowColor = cols.VILLAIN_PRIMARY;
        ctx.shadowBlur = 15;
        ctx.fillRect(obs.x, 0, obs.w, obs.topGapTop);
        ctx.fillRect(obs.x, obs.dividerTop, obs.w, obs.dividerH);
        ctx.fillRect(obs.x, obs.bottomGapBottom, obs.w, height - obs.bottomGapBottom);

        const trimColor = obs.motionState === 'oscillating' ? cols.VILLAIN_AMBER : cols.VILLAIN_SECONDARY;
        ctx.fillStyle = trimColor;
        ctx.shadowColor = trimColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(obs.x - 2, obs.topGapTop - 3, obs.w + 4, 3);
        ctx.fillRect(obs.x - 2, obs.dividerTop, obs.w + 4, 3);
        ctx.fillRect(obs.x - 2, obs.dividerBottom - 3, obs.w + 4, 3);
        ctx.fillRect(obs.x - 2, obs.bottomGapBottom, obs.w + 4, 3);

      } else if (obs.kind === 'staggered_step') {
        ctx.fillStyle = hexToRgba(cols.VILLAIN_PRIMARY, 0.14);
        ctx.fillRect(obs.x, 0, (obs.rearX - obs.x) + obs.w, 10);
        ctx.fillRect(obs.x, height - 10, (obs.rearX - obs.x) + obs.w, 10);

        ctx.fillStyle = cols.VILLAIN_PRIMARY;
        ctx.shadowColor = cols.VILLAIN_PRIMARY;
        ctx.shadowBlur = 14;
        ctx.fillRect(obs.x, 0, obs.w, obs.frontGapTop);
        ctx.fillRect(obs.x, obs.frontGapBottom, obs.w, height - obs.frontGapBottom);
        ctx.fillRect(obs.rearX, 0, obs.w, obs.rearGapTop);
        ctx.fillRect(obs.rearX, obs.rearGapBottom, obs.w, height - obs.rearGapBottom);

        ctx.strokeStyle = hexToRgba(cols.VILLAIN_AMBER, 0.45);
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.w * 0.5, (obs.frontGapTop + obs.frontGapBottom) * 0.5);
        ctx.lineTo(obs.rearX + obs.w * 0.5, (obs.rearGapTop + obs.rearGapBottom) * 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

      } else if (obs.kind === 'dual_target_gate') {
        const echoYPos = obs.y - obs.offset;
        const leadYPos = obs.y + obs.offset;

        drawShatterWall(obs.gateX, obs.gateW, height, cols.VILLAIN_SECONDARY, obs.unlocked);

        if (!obs.unlocked) {
          if (!obs.echoHit) {
            ctx.beginPath();
            ctx.arc(obs.gateX, echoYPos, 4, 0, Math.PI * 2);
            ctx.fillStyle = cols.VILLAIN_SECONDARY;
            ctx.fill();
          }
          if (!obs.leadHit) {
            ctx.beginPath();
            ctx.arc(obs.gateX, leadYPos, 4, 0, Math.PI * 2);
            ctx.fillStyle = cols.VILLAIN_SECONDARY;
            ctx.fill();
          }

          [
            { rx: obs.echoRectX, ry: echoYPos - obs.h / 2, active: obs.echoHit },
            { rx: obs.leadRectX, ry: leadYPos - obs.h / 2, active: obs.leadHit }
          ].forEach(rect => {
            ctx.beginPath();
            ctx.roundRect(rect.rx, rect.ry, obs.w, obs.h, 6);
            ctx.fillStyle = rect.active ? hexToRgba(cols.FEEDBACK_POSITIVE, 0.45) : hexToRgba(cols.VILLAIN_SECONDARY, 0.22);
            ctx.strokeStyle = rect.active ? cols.FEEDBACK_POSITIVE : cols.VILLAIN_SECONDARY;
            ctx.shadowColor = rect.active ? cols.FEEDBACK_POSITIVE : cols.VILLAIN_SECONDARY;
            ctx.lineWidth = 2.5;
            ctx.fill();
            ctx.stroke();
          });
        }
      } else if (obs.kind === 'trail_missile') {
        const isLockedPhase = obs.state === 'locking';
        const lockProgress = isLockedPhase ? (1 - obs.lockTimer / Math.max(1, obs.maxLock)) : 1;

        ctx.save();
        ctx.strokeStyle = isLockedPhase
          ? (lockProgress > 0.65 ? hexToRgba(cols.VILLAIN_PRIMARY, 0.85) : hexToRgba(cols.VILLAIN_SECONDARY, 0.55))
          : hexToRgba(cols.VILLAIN_PRIMARY, 0.35);
        ctx.lineWidth = isLockedPhase && lockProgress > 0.65 ? 2.5 : 1.5;
        ctx.setLineDash(isLockedPhase && lockProgress > 0.65 ? [12, 6] : [6, 8]);
        ctx.beginPath();
        ctx.moveTo(0, obs.y);
        ctx.lineTo(obs.x, obs.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        obs.trail.forEach((pt, idx) => {
          if (pt.life <= 0) return;
          ctx.fillStyle = hexToRgba(cols.VILLAIN_SECONDARY, pt.life * 0.45);
          ctx.beginPath();
          ctx.arc(pt.x + idx * 1.4, pt.y, Math.max(2, obs.r * 0.72 * pt.life), 0, Math.PI * 2);
          ctx.fill();
        });

        const pulse = 1 + Math.sin(st.frame * 0.35) * 0.12;
        const orbR = obs.r * (isLockedPhase ? 0.65 + lockProgress * 0.35 : pulse);
        const grad = ctx.createRadialGradient(obs.x, obs.y, 1, obs.x, obs.y, orbR * 1.6);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.38, cols.VILLAIN_SECONDARY);
        grad.addColorStop(0.75, cols.VILLAIN_PRIMARY);
        grad.addColorStop(1, hexToRgba(cols.VILLAIN_PRIMARY, 0));

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, orbR * 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, orbR * 0.75, 0, Math.PI * 2);
        ctx.stroke();

      } else if (obs.kind === 'echo_pad_gate') {
        const gateHex = getRosterHex(obs.gateColor);
        const isAttuned = obs.phasedThrough || st.activePhaseShield === obs.gateColor;

        for (let k = 0; k < obs.keys.length; k++) {
          const key = obs.keys[k];
          const keyY = obs.currentCenterY + key.offsetY;
          drawHexKeyPad(obs.x, keyY, obs.padR, st.frame * 0.08 + k * 0.6, key.color, key.collected);
        }

        drawShatterWall(obs.gateX, obs.gateW, height, gateHex, isAttuned);

      } else if (obs.kind === 'locked_gate') {
        drawShatterWall(obs.x, obs.w, height, cols.VILLAIN_AMBER, obs.unlocked);

      } else if (obs.kind === 'special_diamond' && !obs.sliced) {
        drawPrizeDiamond(obs.x, obs.y, obs.r, st.frame * 0.14);

      } else if (obs.kind === 'node' && !obs.sliced) {
        const isGateKey = obs.id !== null;
        const orbColor = isGateKey ? cols.VILLAIN_AMBER : cols.COLLECTIBLE_ORB;
        ctx.strokeStyle = orbColor;
        ctx.fillStyle = hexToRgba(orbColor, 0.3);
        ctx.shadowColor = orbColor;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
    ctx.shadowBlur = 0;

    // Background Grid (warms slightly to golden hue during Overcharge)
    ctx.save();
    ctx.lineWidth = 1;
    const gridOffset = (st.frame * st.speed * 0.35) % 48;
    ctx.strokeStyle = isOvercharged
      ? hexToRgba(cols.VILLAIN_AMBER, 0.085)
      : hexToRgba(cols.VILLAIN_SECONDARY, 0.075);
    for (let x = -48 + gridOffset; x < width + 48; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height + 48; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();

    const playerColor = CG.getPlayerColor();
    const staminaRatio = Math.max(0, Math.min(1, st.echoStamina / Math.max(1, cfg.STAMINA_MAX)));
    const isLockedOut = st.staminaLockoutFrames > 0;
    const isSurging = (CG.isBoostRequested() && staminaRatio > 0 && !isLockedOut) || merge > 0.12;
    const activeShieldHex = st.activePhaseShield ? getRosterHex(st.activePhaseShield) : null;

    // Priority: Phase Shield > Surge Overheat Alert > Surge Boost > Golden Overcharge > White Default
    const unifiedCoreColor = activeShieldHex || (isLockedOut ? cols.FEEDBACK_ALERT : (isSurging ? cols.FEEDBACK_BOOST : playerColor));

    // Golden Overcharge Aura Halo around Lead Core
    if (isOvercharged && !activeShieldHex && !isLockedOut) {
      ctx.save();
      const goldHex = cfg.PLAYER_OVERCHARGE_COLOR || cols.VILLAIN_AMBER;
      const auraPulse = 1 + Math.sin(st.frame * 0.16) * 0.16;
      const auraR = player.radius * (st.isMaxLifeExcited ? 2.45 : 1.95) * auraPulse;
      const grad = ctx.createRadialGradient(player.leadX, leadY, player.radius * 0.4, player.leadX, leadY, auraR);
      grad.addColorStop(0, hexToRgba(goldHex, st.isMaxLifeExcited ? 0.42 : 0.28));
      grad.addColorStop(0.65, hexToRgba(goldHex, 0.12));
      grad.addColorStop(1, hexToRgba(goldHex, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(player.leadX, leadY, auraR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Configurable Curved Trail Dots bridging Echo -> Lead Core
    if (player.history.length > 1 && merge < 0.98) {
      ctx.save();
      const dotCount   = 24;   // Total number of trail dots
      const startScale = 1.0; // Dot size multiplier at Lead Core end (t = 1)
      const midScale   = 0.4; // Dot size multiplier at the middle pinch (t = 0.5)
      const endScale   = 0.8; // Dot size multiplier at Echo end (t = 0)

      const len = player.history.length;
      const autoEchoY = player.history[0];
      const echoOffset = player.unmergedEchoY - autoEchoY;
      const unmergedEchoX = player.leadX - cfg.TETHER_HORIZONTAL_GAP;
      const trailColor = isLockedOut ? cols.FEEDBACK_ALERT : unifiedCoreColor;

      const baseAlpha = isLockedOut
        ? (0.35 + Math.sin(st.frame * 0.8) * 0.25)
        : (isSurging ? 0.62 : (isOvercharged ? 0.52 : 0.42));

      for (let d = dotCount - 2; d >= 1; d--) {
        const t = d / (dotCount - 1); // 1 = Lead Core, 0 = Echo

        // Smoothly sample player.history at fractional index
        const exactIdx = t * (len - 1);
        const i0 = Math.floor(exactIdx);
        const i1 = Math.min(len - 1, i0 + 1);
        const frac = exactIdx - i0;
        const sampledHistY = player.history[i0] + (player.history[i1] - player.history[i0]) * frac;

        const rawHx = unmergedEchoX + (player.leadX - unmergedEchoX) * t;
        const bend = 1 - t;
        const rawHy = sampledHistY + echoOffset * bend;

        const x = rawHx + (player.leadX - rawHx) * merge;
        const y = rawHy + (leadY - rawHy) * merge;

        // Smooth U-curve scale: endScale (t=0) -> midScale (t=0.5) -> startScale (t=1)
        let sizeMult;
        if (t >= 0.5) {
          const u = (t - 0.5) * 2; // 0 at middle, 1 at Lead Core
          sizeMult = midScale + (startScale - midScale) * (u * u);
        } else {
          const u = (0.5 - t) * 2; // 0 at middle, 1 at Echo
          sizeMult = midScale + (endScale - midScale) * (u * u);
        }

        const distFromMid = Math.abs(t - 0.5) * 2;
        const dotR = player.radius * sizeMult;

        // 1. Outer glow dot
        ctx.fillStyle = trailColor;
        ctx.globalAlpha = baseAlpha * (0.45 + 0.55 * distFromMid) * (1 - merge * 0.85);
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();

        // 2. Bright inner core dot
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = (baseAlpha * 0.55) * (0.45 + 0.55 * distFromMid) * (1 - merge * 0.85);
        ctx.beginPath();
        ctx.arc(x, y, dotR * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Echo Orb (anchored at the tail end of the curved trail)
    if (merge < 0.98) {
      ctx.save();
      ctx.fillStyle = unifiedCoreColor;
      ctx.globalAlpha = Math.max(0, 1 - merge * 0.95);
      ctx.shadowColor = unifiedCoreColor;
      ctx.shadowBlur = (activeShieldHex || isSurging || isOvercharged) ? 16 : 8;
      const baseEchoR = isLockedOut ? player.radiusEcho * 0.8 : player.radiusEcho * (0.72 + staminaRatio * 0.28);
      const dynamicEchoR = Math.max(0.5, baseEchoR * (1 - merge * 0.88));
      ctx.beginPath();
      ctx.arc(player.echoX, echoY, dynamicEchoR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Independent Configurable Long Surge Trail for Main Orb (Lead Core)
    const targetGrow = isSurging ? 1 : 0;
    const growSpeed = isSurging ? 0.08 : 0.14;
    st.surgeTrailGrow = (st.surgeTrailGrow || 0) + (targetGrow - (st.surgeTrailGrow || 0)) * growSpeed;
    if (st.surgeTrailGrow < 0.01) st.surgeTrailGrow = 0;
    if (st.surgeTrailGrow > 0.995) st.surgeTrailGrow = 1;

    if (st.surgeTrailGrow > 0) {
      ctx.save();

      const maxTrailLength   = cfg.SURGE_TRAIL_LENGTH ?? 120;
      const surgeTrailLength = maxTrailLength * st.surgeTrailGrow;
      const surgeDotCount    = Math.max(2, Math.round(cfg.SURGE_TRAIL_DOT_COUNT ?? 32));
      const surgeStartScale  = cfg.SURGE_TRAIL_START_SCALE ?? 0.95;
      const surgeEndScale    = cfg.SURGE_TRAIL_END_SCALE ?? 0.15;
      const surgeMaxAlpha    = (cfg.SURGE_TRAIL_MAX_ALPHA ?? 0.7) * Math.min(1, st.surgeTrailGrow * 2.5);

      const maxSamples = Math.max(2, Math.round(cfg.SURGE_TRAIL_HISTORY ?? 20));

      if (!player.surgeWakeY || player.surgeWakeY.length === 0) {
        player.surgeWakeY = Array(maxSamples).fill(leadY);
      } else if (!st.isPaused && !st.gameOver) {
        player.surgeWakeY.push(leadY);
        while (player.surgeWakeY.length > maxSamples) {
          player.surgeWakeY.shift();
        }
      }

      const wakeLen = player.surgeWakeY.length;
      if (wakeLen > 1) {
        for (let i = surgeDotCount - 1; i >= 1; i--) {
          const t = i / (surgeDotCount - 1);
          const fade = 1 - t;

          const activeHistSpan = (wakeLen - 1) * st.surgeTrailGrow;
          const histOffset = t * activeHistSpan;
          const idxFromEnd = (wakeLen - 1) - histOffset;
          const i0 = Math.max(0, Math.floor(idxFromEnd));
          const i1 = Math.min(wakeLen - 1, i0 + 1);
          const frac = idxFromEnd - i0;
          const wakeY = player.surgeWakeY[i0] + (player.surgeWakeY[i1] - player.surgeWakeY[i0]) * frac;

          const wakeX = player.leadX - (t * surgeTrailLength);
          const sizeMult = surgeEndScale + (surgeStartScale - surgeEndScale) * (fade * fade);
          const dotR = (player.radius * (1 + merge * 0.16)) * sizeMult;

          // 1. Outer colored glow dot
          ctx.fillStyle = unifiedCoreColor;
          ctx.globalAlpha = surgeMaxAlpha * (fade * fade);
          ctx.beginPath();
          ctx.arc(wakeX, wakeY, dotR, 0, Math.PI * 2);
          ctx.fill();

          // 2. Bright white inner core dot
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = (surgeMaxAlpha * 0.65) * (fade * fade);
          ctx.beginPath();
          ctx.arc(wakeX, wakeY, dotR * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    } else if (player.surgeWakeY && player.surgeWakeY.length > 0 && !st.isPaused) {
      player.surgeWakeY.length = 0;
    }

    // Front Stamina Arc
    ctx.save();
    const frontArcR = player.radius + 6.5;
    if (isLockedOut) {
      ctx.strokeStyle = cols.FEEDBACK_ALERT;
      ctx.shadowColor = cols.FEEDBACK_ALERT;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55 + Math.sin(st.frame * 0.7) * 0.45;
      ctx.beginPath();
      ctx.arc(player.leadX, leadY, frontArcR + 1, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    } else if (staminaRatio < 0.999 || isSurging) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(player.leadX, leadY, frontArcR, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();

      const halfSpan = (Math.PI * 0.5) * staminaRatio;
      const arcColor = staminaRatio > 0.3 ? cols.FEEDBACK_BOOST : cols.VILLAIN_AMBER;
      ctx.strokeStyle = arcColor;
      ctx.shadowColor = arcColor;
      ctx.shadowBlur = isSurging ? 12 : 5;
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(player.leadX, leadY, frontArcR, -halfSpan, halfSpan);
      ctx.stroke();
    }
    ctx.restore();

    // Lead Core
    ctx.save();
    const isRising = player.vy < -0.3;
    const effectiveLeadR = player.radius * (1 + merge * 0.16);
    ctx.fillStyle = unifiedCoreColor;
    ctx.shadowColor = unifiedCoreColor;
    ctx.shadowBlur = (isSurging || isRising || isOvercharged) ? 18 : 6;
    ctx.beginPath();
    ctx.arc(player.leadX, leadY, effectiveLeadR, 0, Math.PI * 2);
    ctx.fill();

    if (isSurging || isRising || isOvercharged) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(player.leadX + 2, leadY + (isRising ? -1.5 : 0), effectiveLeadR * (0.42 + merge * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Optional post-render hook for standalone js/debug.js gizmos
    if (typeof CG.drawDebugOverlay === 'function') {
      CG.drawDebugOverlay(ctx);
    }

    st.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    st.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = '900 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(4, 6, 14, 0.9)';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    ctx.restore();
  };
})(window.ChronoGame);
