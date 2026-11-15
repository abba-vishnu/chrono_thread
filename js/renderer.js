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

  CG.addFloatingText = function (x, y, text, color) {
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

  CG.draw = function () {
    const width = st.width;
    const height = st.height;
    const player = st.player;
    const cols = cfg.COLORS;

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

        // Individual tethers from each target rectangle to the gate wall (broken once its rectangle triggers)
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

        if (!obs.unlocked) {
          ctx.fillStyle = hexToRgba(cols.VILLAIN_SECONDARY, 0.24);
          ctx.strokeStyle = cols.VILLAIN_SECONDARY;
          ctx.shadowColor = cols.VILLAIN_SECONDARY;
          ctx.shadowBlur = 18;
          ctx.lineWidth = 3;
          ctx.fillRect(obs.gateX, 0, obs.gateW, height);
          ctx.strokeRect(obs.gateX, 0, obs.gateW, height);

          // Draw tether anchor nodes on the gate wall while intact
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
        } else {
          ctx.strokeStyle = hexToRgba(cols.VILLAIN_SECONDARY, 0.2);
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.gateX, 0, obs.gateW, height);
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

        if (isAttuned) {
          ctx.fillStyle = getRosterRgba(obs.gateColor, 0.08);
          ctx.strokeStyle = getRosterRgba(obs.gateColor, 0.42);
          ctx.shadowColor = gateHex;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 6]);
          ctx.fillRect(obs.gateX, 0, obs.gateW, height);
          ctx.strokeRect(obs.gateX, 0, obs.gateW, height);
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = getRosterRgba(obs.gateColor, 0.34);
          ctx.strokeStyle = gateHex;
          ctx.shadowColor = gateHex;
          ctx.shadowBlur = 22;
          ctx.lineWidth = 3.5;
          ctx.fillRect(obs.gateX, 0, obs.gateW, height);
          ctx.strokeRect(obs.gateX, 0, obs.gateW, height);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(obs.gateX + obs.gateW * 0.5, 0);
          ctx.lineTo(obs.gateX + obs.gateW * 0.5, height);
          ctx.stroke();
        }

      } else if (obs.kind === 'locked_gate') {
        if (!obs.unlocked) {
          ctx.fillStyle = cols.VILLAIN_AMBER;
          ctx.shadowColor = cols.VILLAIN_AMBER;
          ctx.shadowBlur = 18;
          ctx.fillRect(obs.x, 0, obs.w, height);

          ctx.fillStyle = '#08090e';
          for (let y = 15; y < height; y += 30) {
            ctx.fillRect(obs.x + 4, y, obs.w - 8, 10);
          }
        } else {
          ctx.strokeStyle = hexToRgba(cols.VILLAIN_AMBER, 0.2);
          ctx.lineWidth = 2;
          ctx.strokeRect(obs.x, 0, obs.w, height);
        }

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

    // Background Chrono Grid
    ctx.save();
    ctx.lineWidth = 1;
    const gridOffset = (st.frame * st.speed * 0.35) % 48;
    ctx.strokeStyle = hexToRgba(cols.VILLAIN_SECONDARY, 0.075);
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

    // Unified core palette: shifts to Surge cyan across Lead Core, Echo Twin, and trails during Surge
    const unifiedCoreColor = activeShieldHex || (isLockedOut ? cols.FEEDBACK_ALERT : (isSurging ? cols.FEEDBACK_BOOST : playerColor));

    // 1. Wave History Trail (collapses into Lead Core as merge -> 1, and shifts color during Surge)
    if (player.history.length > 1 && merge < 0.98) {
      ctx.save();
      ctx.strokeStyle = unifiedCoreColor;
      ctx.globalAlpha = (isLockedOut ? 0.14 : (isSurging ? 0.45 : 0.24)) * (1 - merge);
      ctx.lineWidth = isSurging ? 3 : 2;
      ctx.beginPath();
      const len = player.history.length;
      const autoEchoY = player.history[0];
      const echoOffset = player.unmergedEchoY - autoEchoY;
      const unmergedEchoX = player.leadX - cfg.TETHER_HORIZONTAL_GAP;
      for (let i = 0; i < len; i++) {
        const t = i / (len - 1);
        const rawHx = unmergedEchoX + (player.leadX - unmergedEchoX) * t;
        const bend = (1 - t) * (1 - t);
        const rawHy = player.history[i] + echoOffset * bend;
        const hx = rawHx + (player.leadX - rawHx) * merge;
        const hy = rawHy + (leadY - rawHy) * merge;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Phase Tether connecting Echo Twin to Lead Core (shortens & fuses during Surge)
    if (merge < 0.98) {
      ctx.save();
      ctx.lineCap = 'round';
      if (isLockedOut || staminaRatio < 0.25) {
        ctx.strokeStyle = cols.FEEDBACK_ALERT;
        ctx.globalAlpha = (0.55 + Math.sin(st.frame * 0.9) * 0.35) * (1 - merge);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.echoX, echoY);
        const midX = (player.echoX + player.leadX) * 0.5;
        const midY = (echoY + leadY) * 0.5 + (Math.random() - 0.5) * 16;
        ctx.lineTo(midX, midY);
        ctx.lineTo(player.leadX, leadY);
        ctx.stroke();
      } else {
        ctx.strokeStyle = unifiedCoreColor;
        ctx.globalAlpha = (0.4 + staminaRatio * 0.6) * (1 - merge * 0.65);
        ctx.lineWidth = (1.6 + staminaRatio * 2.0) * (1 + merge * 0.4);
        ctx.beginPath();
        ctx.moveTo(player.echoX, echoY);
        ctx.lineTo(player.leadX, leadY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Echo Twin Ghost & Orb (pulled into Lead Core and absorbed when Surge is active)
    if (merge < 0.98) {
      ctx.save();
      const echoDistMoved = Math.hypot(player.echoX - st.previousEcho.x, echoY - st.previousEcho.y);
      if (echoDistMoved > 2.5) {
        ctx.fillStyle = hexToRgba(unifiedCoreColor, 0.32 * (1 - merge));
        ctx.beginPath();
        ctx.arc(st.previousEcho.x, st.previousEcho.y, player.radiusEcho * 0.8 * (1 - merge * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = unifiedCoreColor;
      ctx.globalAlpha = Math.max(0, 1 - merge * 0.95);
      if (activeShieldHex || isSurging) {
        ctx.shadowColor = unifiedCoreColor;
        ctx.shadowBlur = 16;
      }
      const baseEchoR = isLockedOut ? player.radiusEcho * 0.8 : player.radiusEcho * (0.68 + staminaRatio * 0.32);
      const dynamicEchoR = Math.max(0.5, baseEchoR * (1 - merge * 0.88));
      ctx.beginPath();
      ctx.arc(player.echoX, echoY, dynamicEchoR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Lead Core High-Speed Motion Smear (shows vertical/speed surge on Lead Core)
    if (player.leadTrail && player.leadTrail.length > 1) {
      const speedMag = Math.abs(player.vy);
      if (isSurging || speedMag > 2.2) {
        ctx.save();
        const trailLen = player.leadTrail.length;
        for (let i = 0; i < trailLen - 1; i++) {
          const pt = player.leadTrail[i];
          const progress = (i + 1) / trailLen;
          // Offset backward slightly in X so horizontal + vertical velocity creates a sleek comet smear
          const smearX = pt.x - (trailLen - 1 - i) * (isSurging ? 3.2 : 1.6);
          const smearR = player.radius * (0.35 + progress * 0.58) * (1 + merge * 0.14);
          ctx.fillStyle = unifiedCoreColor;
          ctx.globalAlpha = progress * progress * (isSurging ? 0.36 : 0.18);
          ctx.beginPath();
          ctx.arc(smearX, pt.y, smearR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Directional velocity capsule smear directly behind Lead Core
        if (isSurging && speedMag > 0.8) {
          const stretchY = Math.max(-26, Math.min(26, -player.vy * 2.4));
          const stretchX = -14;
          const grad = ctx.createLinearGradient(player.leadX, leadY, player.leadX + stretchX, leadY + stretchY);
          grad.addColorStop(0, hexToRgba(unifiedCoreColor, 0.55));
          grad.addColorStop(1, hexToRgba(unifiedCoreColor, 0));
          ctx.strokeStyle = grad;
          ctx.lineCap = 'round';
          ctx.lineWidth = player.radius * 1.65;
          ctx.beginPath();
          ctx.moveTo(player.leadX, leadY);
          ctx.lineTo(player.leadX + stretchX, leadY + stretchY);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // 5. Front-Balanced Half-Circle Stamina Arc mounted ahead of the Lead Core
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
      // Dim half-circle track balanced in front (+X nose) of Lead Core
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(player.leadX, leadY, frontArcR, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();

      // Active stamina arc symmetrically balanced around 0 rad (front tip)
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

    // 6. Lead Core (absorbs Echo Twin & radiates Surge aura)
    ctx.save();
    const isRising = player.vy < -0.3;
    const effectiveLeadR = player.radius * (1 + merge * 0.16);
    ctx.fillStyle = unifiedCoreColor;
    ctx.shadowColor = unifiedCoreColor;
    ctx.shadowBlur = isSurging || isRising ? 18 : 6;
    ctx.beginPath();
    ctx.arc(player.leadX, leadY, effectiveLeadR, 0, Math.PI * 2);
    ctx.fill();

    // Inner fused core spark when Surge is active or rising
    if (isSurging || isRising) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(player.leadX + 2, leadY + (isRising ? -1.5 : 0), effectiveLeadR * (0.42 + merge * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (st.showGizmos) {
      ctx.save();
      ctx.strokeStyle = cols.FEEDBACK_POSITIVE;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(player.echoX, echoY);
      ctx.lineTo(player.leadX, leadY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = hexToRgba(cols.FEEDBACK_POSITIVE, 0.22);
      ctx.beginPath();
      ctx.arc(player.leadX, leadY, player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (merge < 0.96) {
        const effectiveEchoR = player.radiusEcho * (1 - merge * 0.85);
        ctx.beginPath();
        ctx.arc(player.echoX, echoY, effectiveEchoR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      st.obstacles.forEach(obs => {
        if (obs.kind === 'echo_pad_gate') {
          ctx.strokeStyle = hexToRgba(cols.FEEDBACK_POSITIVE, 0.55);
          ctx.setLineDash([3, 3]);
          for (let k = 0; k < obs.keys.length; k++) {
            const key = obs.keys[k];
            if (key.collected) continue;
            ctx.beginPath();
            ctx.arc(obs.x, obs.currentCenterY + key.offsetY, obs.padR + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        } else if (obs.kind === 'dual_target_gate' && !obs.unlocked) {
          ctx.strokeStyle = hexToRgba(cols.VILLAIN_AMBER, 0.55);
          ctx.beginPath();
          ctx.moveTo(obs.echoRectX - 10, obs.y);
          ctx.lineTo(obs.leadRectX + obs.w + 10, obs.y);
          ctx.stroke();
        } else if (obs.kind === 'staggered_step') {
          ctx.fillStyle = cols.FEEDBACK_POSITIVE;
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`ΔX: ${Math.round(obs.rearX - obs.x)}px`, obs.x, Math.min(obs.frontGapTop, obs.rearGapTop) - 6);
        }
      });
      ctx.restore();
    }

    st.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Larger, high-contrast floating callouts for mobile readability
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
