/**
 * Standalone Debug, Playtest & Engine Inspector Module for Chrono-Thread.
 * Self-contained: injects its own HUD controls, sidebar UI, CSS styles, hotkeys, and hitbox gizmos.
 * To ship a clean production build, simply delete `js/debug.js` and remove its <script> tag from `index.html`.
 */
(function (CG) {
  const cfg = CG.GAME_CONFIG;
  const st = CG.state;
  const dom = CG.dom;

  const TUNING_SCHEMA = [
    {
      section: 'High-Level Gameplay & Progression',
      items: [
        { target: cfg, key: 'INITIAL_LIVES', label: 'INITIAL_LIVES', desc: 'Starting lives on a fresh run.', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'MAX_LIVES', label: 'MAX_LIVES', desc: 'Maximum life diamond slots.', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'OBSTACLES_PER_UNLOCK_STAGE', label: 'WALLS_PER_UNLOCK_STAGE', desc: 'Walls survived to unlock the next villain/oscillation phase.', min: 1, max: 25, step: 1, integer: true },
        { target: cfg, key: 'BASE_SPEED', label: 'BASE_SPEED', desc: 'Initial world speed (also reset target on life lost).', min: 1.5, max: 8.0, step: 0.1 },
        { target: cfg, key: 'MAX_SPEED', label: 'MAX_SPEED', desc: 'Maximum world speed cap.', min: 3.0, max: 14.0, step: 0.2 },
        { target: cfg, key: 'SPEED_SCALING_FACTOR', label: 'SPEED_SCALING_FACTOR', desc: 'Speed added per wall survived.', min: 0, max: 0.1, step: 0.005 },
        { target: cfg, key: 'PRISM_SPEED_DAMPEN_FACTOR', label: 'PRISM_SPEED_DAMPEN_FACTOR', desc: 'Speed multiplier while 2X Diamond Overdrive is active.', min: 0.4, max: 1.0, step: 0.02, suffix: 'x' },
        { target: cfg, key: 'BASE_SPAWN_INTERVAL', label: 'BASE_SPAWN_INTERVAL', desc: 'Base frames between villain spawn checks.', min: 60, max: 240, step: 5, integer: true, suffix: 'f' },
        { target: cfg, key: 'MIN_SPAWN_INTERVAL', label: 'MIN_SPAWN_INTERVAL', desc: 'Minimum frame interval floor at high wall counts.', min: 45, max: 180, step: 5, integer: true, suffix: 'f' },
        { target: cfg, key: 'SPAWN_SCALING', label: 'SPAWN_SCALING', desc: 'Frames subtracted from spawn interval per wall survived.', min: 0, max: 2.0, step: 0.05 },
        { target: cfg, key: 'MIN_RIFT_CLEARANCE_PX', label: 'MIN_RIFT_CLEARANCE_PX', desc: 'Minimum horizontal clearance gap after an obstacle before spawning next.', min: 140, max: 480, step: 10, integer: true, suffix: 'px' },
        { target: cfg, key: 'WHITE_ORB_MIN_COUNT', label: 'WHITE_ORB_MIN_COUNT', desc: 'Minimum white Spark orbs spawned in recovery corridors.', min: 0, max: 5, step: 1, integer: true },
        { target: cfg, key: 'WHITE_ORB_MAX_COUNT', label: 'WHITE_ORB_MAX_COUNT', desc: 'Maximum white Spark orbs spawned in recovery corridors.', min: 0, max: 6, step: 1, integer: true },
        { target: cfg, key: 'WHITE_ORB_WALL_CLEARANCE', label: 'WHITE_ORB_WALL_CLEARANCE', desc: 'Minimum horizontal distance in pixels between white orbs and walls.', min: 50, max: 260, step: 5, integer: true, suffix: 'px' },
        { target: cfg, key: 'GLOBAL_OSC_SPEED', label: 'GLOBAL_OSC_SPEED (PARENT)', desc: 'Max oscillation frequency multiplier for all villains.', min: 0.1, max: 2.5, step: 0.05 },
        { target: cfg, key: 'GLOBAL_OSC_AMP', label: 'GLOBAL_OSC_AMP (PARENT)', desc: 'Max vertical oscillation amplitude in pixels for all villains.', min: 10, max: 150, step: 2, suffix: 'px' },
        { target: cfg, key: 'OSC_MIN_SPEED_RATIO', label: 'OSC_MIN_SPEED_RATIO', desc: 'Minimum random oscillation speed floor (ratio of max).', min: 0.1, max: 1.0, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'OSC_MIN_AMP_RATIO', label: 'OSC_MIN_AMP_RATIO', desc: 'Minimum random oscillation amplitude floor (ratio of max).', min: 0.1, max: 1.0, step: 0.05, suffix: 'x' }
      ]
    },
    {
      section: '1. Pink Wall Fine-Tuning',
      enemyTag: 'pink_wall',
      items: [
        { target: cfg, key: 'PINK_WALL_GAP', label: 'PINK_WALL_GAP', min: 80, max: 240, step: 5, suffix: 'px' },
        { target: cfg, key: 'PINK_WALL_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'PINK_WALL_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_PINK_WALL', label: 'SPAWN_WEIGHT', min: 0, max: 80, step: 1, integer: true }
      ]
    },
    {
      section: '2. Amber Key Node & Gate Fine-Tuning',
      enemyTag: 'gate_node',
      items: [
        { target: cfg, key: 'GATE_NODE_DIST', label: 'GATE_NODE_DIST', min: 30, max: 280, step: 5, suffix: 'px' },
        { target: cfg, key: 'GATE_NODE_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'GATE_NODE_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_GATE_NODE', label: 'SPAWN_WEIGHT', min: 0, max: 50, step: 1, integer: true }
      ]
    },
    {
      section: '3. Mail-Slot Tunnel Fine-Tuning',
      enemyTag: 'mail_slot',
      items: [
        { target: cfg, key: 'MAIL_SLOT_GAP', label: 'MAIL_SLOT_GAP', min: 56, max: 150, step: 2, suffix: 'px' },
        { target: cfg, key: 'MAIL_SLOT_WIDTH', label: 'MAIL_SLOT_WIDTH', min: 30, max: 260, step: 2, suffix: 'px' },
        { target: cfg, key: 'MAIL_SLOT_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'MAIL_SLOT_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_MAIL_SLOT', label: 'SPAWN_WEIGHT', min: 0, max: 50, step: 1, integer: true }
      ]
    },
    {
      section: '4. Double-Slit Barrier Fine-Tuning',
      enemyTag: 'double_slit',
      items: [
        { target: cfg, key: 'DOUBLE_SLIT_GAP', label: 'DOUBLE_SLIT_GAP', min: 65, max: 160, step: 5, suffix: 'px' },
        { target: cfg, key: 'DOUBLE_SLIT_DIVIDER', label: 'DOUBLE_SLIT_DIVIDER', min: 30, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'DOUBLE_SLIT_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'DOUBLE_SLIT_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_DOUBLE_SLIT', label: 'SPAWN_WEIGHT', min: 0, max: 50, step: 1, integer: true }
      ]
    },
    {
      section: '5. Dual Target Rectangles Fine-Tuning',
      enemyTag: 'dual_target_gate',
      items: [
        { target: cfg, key: 'DUAL_RECT_WIDTH', label: 'DUAL_RECT_WIDTH', min: 16, max: 80, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_HEIGHT', label: 'DUAL_RECT_HEIGHT', min: 16, max: 100, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_X_GAP', label: 'DUAL_RECT_X_GAP', min: 0, max: 180, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_GATE_DIST', label: 'DUAL_RECT_GATE_DIST', min: 20, max: 260, step: 5, suffix: 'px' },
        { target: cfg, key: 'DUAL_MIN_OFFSET', label: 'DUAL_MIN_OFFSET', min: 10, max: 70, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_MAX_OFFSET', label: 'DUAL_MAX_OFFSET', min: 30, max: 140, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'DUAL_RECT_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_DUAL_RECT', label: 'SPAWN_WEIGHT', min: 0, max: 50, step: 1, integer: true }
      ]
    },
    {
      section: '6. Staggered Step-Gates Fine-Tuning',
      enemyTag: 'staggered_step',
      items: [
        { target: cfg, key: 'STAGGERED_MIN_DIST', label: 'STAGGERED_MIN_DIST', min: 30, max: 140, step: 2, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_MAX_DIST', label: 'STAGGERED_MAX_DIST', min: 80, max: 240, step: 2, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_STEP_GAP', label: 'STAGGERED_STEP_GAP', min: 80, max: 220, step: 5, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_MIN_OFFSET', label: 'STAGGERED_MIN_OFFSET', min: 20, max: 160, step: 5, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_MAX_OFFSET', label: 'STAGGERED_MAX_OFFSET', min: 40, max: 240, step: 5, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_PHASE_DELAY', label: 'STAGGERED_PHASE_DELAY', min: 0, max: 1, step: 0.02, suffix: 'rad' },
        { target: cfg, key: 'STAGGERED_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'STAGGERED_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_STAGGERED', label: 'SPAWN_WEIGHT', min: 0, max: 50, step: 1, integer: true }
      ]
    },
    {
      section: '7. Tracking Energy Missile Fine-Tuning',
      enemyTag: 'trail_missile',
      items: [
        { target: cfg, key: 'MISSILE_SPEED', label: 'MISSILE_SPEED', min: 3.0, max: 12.0, step: 0.2 },
        { target: cfg, key: 'MISSILE_RADIUS', label: 'MISSILE_RADIUS', min: 6, max: 24, step: 1, integer: true, suffix: 'px' },
        { target: cfg, key: 'MISSILE_LOCK_FRAMES', label: 'MISSILE_LOCK_FRAMES', min: 15, max: 90, step: 3, integer: true, suffix: 'f' },
        { target: cfg, key: 'MISSILE_OVERLAP_DELAY_FRAMES', label: 'MISSILE_OVERLAP_DELAY', min: 0, max: 120, step: 3, integer: true, suffix: 'f' },
        { target: cfg, key: 'MISSILE_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'MISSILE_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_MISSILE', label: 'SPAWN_WEIGHT', min: 0, max: 30, step: 1, integer: true }
      ]
    },
    {
      section: '8. Chromatic Phase Hex Pad Fine-Tuning',
      enemyTag: 'echo_pad_gate',
      items: [
        { target: cfg, key: 'ECHO_PAD_RADIUS', label: 'ECHO_PAD_RADIUS', min: 18, max: 48, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'ECHO_PAD_MIN_COUNT', label: 'ECHO_PAD_MIN_COUNT', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'ECHO_PAD_MAX_COUNT', label: 'ECHO_PAD_MAX_COUNT', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'ECHO_PAD_VERTICAL_PADDING', label: 'ECHO_PAD_VERT_PAD', min: 10, max: 50, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'PHASE_GATE_WIDTH', label: 'PHASE_GATE_WIDTH', min: 28, max: 72, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'ECHO_PAD_GATE_DIST', label: 'ECHO_PAD_GATE_DIST', min: 0, max: 240, step: 5, suffix: 'px' },
        { target: cfg, key: 'ECHO_PAD_OSC_SPEED_MULT', label: 'OSC_SPEED_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'ECHO_PAD_OSC_AMP_MULT', label: 'OSC_AMP_MULT', min: 0.1, max: 2.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SPAWN_WEIGHT_ECHO_PAD', label: 'SPAWN_WEIGHT', min: 0, max: 30, step: 1, integer: true }
      ]
    },
    {
      section: 'Scoring, Prisms & Player Physics',
      items: [
        { target: cfg, key: 'LIFE_BAR_MAX', label: 'LIFE_BAR_MAX', min: 5, max: 100, step: 1, integer: true },
        { target: cfg, key: 'MAX_LIFE_BONUS_BAR_MAX', label: 'MAX_LIFE_BONUS_BAR_MAX', min: 1, max: 60, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_MIN_INTERVAL', label: 'DIAMOND_MIN_INTERVAL', min: 5, max: 60, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_MAX_INTERVAL', label: 'DIAMOND_MAX_INTERVAL', min: 8, max: 80, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_DOUBLE_CHAIN_SECONDS', label: 'DIAMOND_2X_SECONDS', min: 2, max: 25, step: 1, integer: true, suffix: 's' },
        { target: cfg, key: 'POINTS_PER_OBSTACLE', label: 'POINTS_PER_OBSTACLE', min: 1, max: 100, step: 1, integer: true },
        { target: cfg, key: 'MAX_COMBO', label: 'MAX_COMBO', min: 2, max: 20, step: 1, integer: true },
        { target: cfg, key: 'GRAVITY_UP', label: 'GRAVITY_UP', min: 0.1, max: 1.5, step: 0.02 },
        { target: cfg, key: 'GRAVITY_DOWN', label: 'GRAVITY_DOWN', min: 0.1, max: 1.5, step: 0.02 },
        { target: cfg, key: 'VELOCITY_DAMPING', label: 'VELOCITY_DAMPING', min: 0.75, max: 0.99, step: 0.01 },
        { target: cfg, key: 'BOOST_GRAVITY_MULTIPLIER', label: 'SURGE_GRAVITY_MULT', min: 1.0, max: 3.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'STAMINA_MAX', label: 'STAMINA_MAX', min: 20, max: 300, step: 10, integer: true },
        { target: cfg, key: 'STAMINA_LOCKOUT_SECONDS', label: 'STAMINA_LOCKOUT_SEC', min: 0.5, max: 8.0, step: 0.25, suffix: 's' },
		{ target: cfg, key: 'SURGE_SNAP_IN_RATE', label: 'SURGE_SNAP_IN_RATE', min: 0.02, max: 1.0, step: 0.02 },
        { target: cfg, key: 'SURGE_SNAP_OUT_RATE', label: 'SURGE_SNAP_OUT_RATE', min: 0.02, max: 1.0, step: 0.02 },
		{ target: cfg, key: 'SURGE_TRAIL_LENGTH', label: 'SURGE_TRAIL_LENGTH', min: 10, max: 300, step: 5, integer: true, suffix: 'px' },
        { target: cfg, key: 'SURGE_TRAIL_HISTORY', label: 'SURGE_TRAIL_HISTORY', min: 2, max: 90, step: 1, integer: true, suffix: 'f' },
        { target: cfg, key: 'SURGE_TRAIL_DOT_COUNT', label: 'SURGE_TRAIL_DOT_COUNT', min: 4, max: 100, step: 2, integer: true },
        { target: cfg, key: 'SURGE_TRAIL_START_SCALE', label: 'SURGE_TRAIL_START_SCALE', min: 0.1, max: 1.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SURGE_TRAIL_END_SCALE', label: 'SURGE_TRAIL_END_SCALE', min: 0.0, max: 1.5, step: 0.05, suffix: 'x' },
        { target: cfg, key: 'SURGE_TRAIL_MAX_ALPHA', label: 'SURGE_TRAIL_MAX_ALPHA', min: 0.05, max: 1.0, step: 0.05 },        
		{ target: cfg, key: 'TELEGRAPH_FRAMES', label: 'TELEGRAPH_FRAMES', min: 10, max: 60, step: 2, integer: true, suffix: 'f' }
      ]
    },
    {
      section: 'Debug & Gizmo Toggles',
      isDebugToggles: true,
      items: []
    }
  ];

  function injectDebugStyles() {
    if (document.getElementById('chrono-debug-styles')) return;
    const style = document.createElement('style');
    style.id = 'chrono-debug-styles';
    style.textContent = `
      #score { cursor: pointer; }
      #score:active { transform: scale(0.95); }
      #playtest-controls {
        position: absolute;
        top: max(18px, env(safe-area-inset-top));
        right: 14px;
        display: flex;
        gap: 8px;
        z-index: 15;
      }
      .hud-pill-btn {
        width: 42px;
        height: 42px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(12, 16, 30, 0.78);
        border: 1.5px solid rgba(255, 255, 255, 0.28);
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.92);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.5px;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        transition: all 0.12s ease;
      }
      .hud-pill-btn:hover {
        border-color: #00f0ff;
        color: #00f0ff;
      }
      #pause-toggle.paused {
        background: rgba(255, 190, 11, 0.24);
        border-color: #ffbe0b;
        color: #ffbe0b;
        box-shadow: 0 0 16px rgba(255, 190, 11, 0.45);
      }
      #engine-inspector {
        position: fixed;
        right: 0;
        top: 0;
        width: 360px;
        max-width: 94vw;
        height: 100dvh;
        background: #0b0e19;
        border-left: 1.5px solid rgba(57, 255, 20, 0.38);
        display: flex;
        flex-direction: column;
        z-index: 30;
        box-shadow: -10px 0 35px rgba(0, 0, 0, 0.78);
        transition: transform 0.22s ease, opacity 0.2s ease;
        touch-action: auto;
      }
      #engine-inspector.collapsed {
        transform: translateX(102%);
        opacity: 0;
        pointer-events: none;
      }
      #inspector-header {
        padding: 12px 14px;
        background: rgba(57, 255, 20, 0.06);
        border-bottom: 1px solid rgba(57, 255, 20, 0.24);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      #inspector-header h3 {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 1.3px;
        color: #39ff14;
        text-transform: uppercase;
      }
      .inspector-header-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #save-status {
        font-size: 10px;
        font-weight: 700;
        color: #39ff14;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      #save-status.visible {
        opacity: 1;
      }
      #close-inspector-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #close-inspector-btn:hover {
        border-color: #ff2a85;
        color: #ff2a85;
      }
      #top-debug-bar {
        display: flex;
        gap: 8px;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(57, 255, 20, 0.22);
      }
      .top-debug-btn {
        flex: 1;
        padding: 7px 8px;
        border-radius: 6px;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        cursor: pointer;
        border: 1.5px solid rgba(255, 255, 255, 0.28);
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        transition: all 0.12s ease;
      }
      .top-debug-btn.on {
        background: rgba(57, 255, 20, 0.18);
        border-color: #39ff14;
        color: #39ff14;
      }
      #disable-villains-btn.on {
        background: rgba(255, 42, 133, 0.2);
        border-color: #ff2a85;
        color: #ff2a85;
      }
      #sandbox-bar {
        padding: 10px 14px;
        background: rgba(57, 255, 20, 0.04);
        border-bottom: 1px solid rgba(57, 255, 20, 0.22);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .sandbox-title {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.1px;
        color: #39ff14;
        text-transform: uppercase;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #enemy-select, #enemy-state-select {
        width: 100%;
        padding: 7px 10px;
        background: #121729;
        border: 1.5px solid #39ff14;
        border-radius: 7px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        outline: none;
      }
      .sandbox-state-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .sandbox-state-row .state-label {
        font-size: 11px;
        font-weight: 800;
        color: #39ff14;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        white-space: nowrap;
      }
      #enemy-state-select {
        border-color: rgba(57, 255, 20, 0.6);
        padding: 5px 8px;
        font-size: 11px;
      }
      .sandbox-btn-row {
        display: flex;
        gap: 8px;
      }
      .sandbox-btn {
        flex: 1;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        cursor: pointer;
        border: 1px solid rgba(57, 255, 20, 0.5);
        background: rgba(57, 255, 20, 0.14);
        color: #39ff14;
      }
      .sandbox-btn:hover {
        background: rgba(57, 255, 20, 0.25);
      }
      .sandbox-btn.secondary {
        border-color: rgba(255, 42, 133, 0.5);
        background: rgba(255, 42, 133, 0.14);
        color: #ff2a85;
      }
      #tuning-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        touch-action: pan-y;
      }
      #tuning-scroll::-webkit-scrollbar {
        width: 6px;
      }
      #tuning-scroll::-webkit-scrollbar-thumb {
        background: rgba(57, 255, 20, 0.35);
        border-radius: 3px;
      }
      .tuning-section {
        display: flex;
        flex-direction: column;
        gap: 7px;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .tuning-section.highlighted {
        border-color: #39ff14;
        background: rgba(57, 255, 20, 0.06);
        box-shadow: 0 0 18px rgba(57, 255, 20, 0.14);
      }
      .tuning-section-title {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.1px;
        color: #39ff14;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .tuning-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      .tuning-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .tuning-row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      .tuning-label-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }
      .tuning-label-name {
        font-size: 11px;
        font-weight: 700;
        color: #e2e8f0;
        letter-spacing: 0.3px;
      }
      .tuning-bounds {
        font-size: 10px;
        font-family: monospace;
        color: #94a3b8;
      }
      .tuning-desc {
        font-size: 10px;
        color: #8892b0;
        line-height: 1.3;
      }
      .tuning-input-compact {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .tuning-input-compact input[type="number"] {
        width: 78px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(57, 255, 20, 0.48);
        border-radius: 6px;
        color: #ffbe0b;
        font-family: monospace;
        font-weight: 800;
        font-size: 12px;
        padding: 5px 7px;
        text-align: right;
        outline: none;
      }
      .tuning-input-compact input[type="number"]:focus {
        border-color: #00f0ff;
        background: rgba(0, 240, 255, 0.1);
      }
      .tuning-unit {
        font-size: 10px;
        font-family: monospace;
        color: #94a3b8;
        min-width: 16px;
      }
      .tuning-single-toggle-btn {
        width: 100%;
        padding: 9px 12px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        cursor: pointer;
        border: 1.5px solid rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
        transition: all 0.14s ease;
      }
      .tuning-single-toggle-btn.on {
        background: rgba(57, 255, 20, 0.18);
        border-color: #39ff14;
        color: #39ff14;
        box-shadow: 0 0 12px rgba(57, 255, 20, 0.22);
      }
      .tuning-single-toggle-btn.amber.on {
        background: rgba(255, 190, 11, 0.18);
        border-color: #ffbe0b;
        color: #ffbe0b;
        box-shadow: 0 0 12px rgba(255, 190, 11, 0.22);
      }
      .tuning-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 12px 14px;
        background: #080a12;
        border-top: 1px solid rgba(57, 255, 20, 0.22);
      }
      .tuning-actions button {
        padding: 8px 10px;
        border-radius: 7px;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        cursor: pointer;
      }
      #save-preset-btn {
        background: rgba(57, 255, 20, 0.2);
        border: 1.5px solid #39ff14;
        color: #39ff14;
      }
      #copy-config-btn {
        background: rgba(0, 240, 255, 0.14);
        border: 1px solid rgba(0, 240, 255, 0.5);
        color: #00f0ff;
      }
      #import-config-btn {
        background: rgba(255, 190, 11, 0.14);
        border: 1px solid rgba(255, 190, 11, 0.5);
        color: #ffbe0b;
      }
      #reset-tuning-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #cbd5e1;
      }
    `;
    document.head.appendChild(style);
  }

  function injectDebugDOM() {
    if (dom.scoreEl) {
      dom.scoreEl.title = 'Tap 5x for Engine Inspector';
    }

    if (!document.getElementById('playtest-controls') && dom.gameStage) {
      const controlsDiv = document.createElement('div');
      controlsDiv.id = 'playtest-controls';
      controlsDiv.innerHTML = `<button id="pause-toggle" class="hud-pill-btn" type="button" aria-label="Pause">||</button>`;
      dom.gameStage.appendChild(controlsDiv);
    }

    if (!document.getElementById('engine-inspector')) {
      const aside = document.createElement('aside');
      aside.id = 'engine-inspector';
      aside.className = 'collapsed';
      aside.innerHTML = `
        <div id="inspector-header">
          <h3>Engine Inspector</h3>
          <div class="inspector-header-right">
            <span id="save-status">SAVED TO STORAGE</span>
            <button id="close-inspector-btn" type="button" aria-label="Close Inspector">&times;</button>
          </div>
        </div>

        <div id="top-debug-bar">
          <button id="godmode-btn" class="top-debug-btn" type="button">GOD MODE: OFF</button>
          <button id="infinite-surge-btn" class="top-debug-btn" type="button">INF SURGE: OFF</button>
		  <button id="disable-villains-btn" class="top-debug-btn" type="button">VILLAINS: ON</button>
		</div>

        <div id="sandbox-bar">
          <div class="sandbox-title">
            <span>Rift Isolation & Playtest</span>
            <span>[R] = Spawn</span>
          </div>
          <select id="enemy-select">
            <option value="ALL">ALL RIFTS (Progressive Static → Oscillating)</option>
            <option value="pink_wall">1. Pink Wall (Single Gap)</option>
            <option value="gate_node">2. Amber Key Node + Locked Gate</option>
            <option value="mail_slot">3. Horizontal Mail-Slot Tunnel</option>
            <option value="double_slit">4. Double-Slit Barrier Wall</option>
            <option value="dual_target_gate">5. Dual Target Rectangles</option>
            <option value="staggered_step">6. Staggered Step-Gates</option>
            <option value="trail_missile">7. Tracking Energy Missile</option>
            <option value="echo_pad_gate">8. Chromatic Phase-Shift Hex Pad</option>
          </select>
          <div class="sandbox-state-row">
            <span class="state-label">Motion State:</span>
            <select id="enemy-state-select">
              <option value="AUTO">AUTO (Progression)</option>
              <option value="static">STATIC</option>
              <option value="oscillating">OSCILLATING</option>
            </select>
          </div>
          <div class="sandbox-btn-row">
            <button id="spawn-now-btn" class="sandbox-btn" type="button">Spawn Now [R]</button>
            <button id="clear-field-btn" class="sandbox-btn secondary" type="button">Clear Field</button>
          </div>
        </div>

        <div id="tuning-scroll"></div>

        <div class="tuning-actions">
          <button id="save-preset-btn" type="button">Save Preset</button>
          <button id="copy-config-btn" type="button">Copy JSON</button>
          <button id="import-config-btn" type="button">Paste JSON</button>
          <button id="reset-tuning-btn" type="button">Reset Defaults</button>
        </div>
      `;
      document.body.appendChild(aside);
    }

    dom.pauseToggleBtn = document.getElementById('pause-toggle');
    dom.engineInspector = document.getElementById('engine-inspector');
    dom.closeInspectorBtn = document.getElementById('close-inspector-btn');
    dom.godmodeBtn = document.getElementById('godmode-btn');
    dom.infiniteSurgeBtn = document.getElementById('infinite-surge-btn');
    dom.disableVillainsBtn = document.getElementById('disable-villains-btn');
    dom.enemySelect = document.getElementById('enemy-select');
    dom.enemyStateSelect = document.getElementById('enemy-state-select');
    dom.spawnNowBtn = document.getElementById('spawn-now-btn');
    dom.clearFieldBtn = document.getElementById('clear-field-btn');
    dom.tuningScroll = document.getElementById('tuning-scroll');
    dom.savePresetBtn = document.getElementById('save-preset-btn');
    dom.saveStatusEl = document.getElementById('save-status');
    dom.copyConfigBtn = document.getElementById('copy-config-btn');
    dom.importConfigBtn = document.getElementById('import-config-btn');
    dom.resetTuningBtn = document.getElementById('reset-tuning-btn');
  }

  const tuningControlRefs = [];
  const sectionRefs = [];
  let gizmoToggleBtnRef = null;
  let debugTextToggleBtnRef = null;

  function syncDebugToggleButtons() {
    if (gizmoToggleBtnRef) {
      gizmoToggleBtnRef.className = 'tuning-single-toggle-btn' + (st.showGizmos ? ' on' : '');
      gizmoToggleBtnRef.textContent = st.showGizmos ? 'ENGINE GIZMOS: ON' : 'ENGINE GIZMOS: OFF';
    }
    if (debugTextToggleBtnRef) {
      debugTextToggleBtnRef.className = 'tuning-single-toggle-btn amber' + (st.showDebugText ? ' on' : '');
      debugTextToggleBtnRef.textContent = st.showDebugText ? 'SHOW DEBUG TEXT: ON' : 'SHOW DEBUG TEXT: OFF';
    }
  }

  CG.showSaveToast = function (msg = 'SAVED TO STORAGE') {
    if (!dom.saveStatusEl) return;
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

  CG.syncTopDebugButtons = function () {
    if (dom.godmodeBtn) {
      dom.godmodeBtn.classList.toggle('on', st.godmodeEnabled);
      dom.godmodeBtn.textContent = st.godmodeEnabled ? 'GOD MODE: ON' : 'GOD MODE: OFF';
    }
	if (dom.infiniteSurgeBtn) {
      dom.infiniteSurgeBtn.classList.toggle('on', st.infiniteSurge);
      dom.infiniteSurgeBtn.textContent = st.infiniteSurge ? 'INF SURGE: ON' : 'INF SURGE: OFF';
    }
    if (dom.disableVillainsBtn) {
      dom.disableVillainsBtn.classList.toggle('on', st.disableVillains);
      dom.disableVillainsBtn.textContent = st.disableVillains ? 'VILLAINS: OFF' : 'VILLAINS: ON';
    }
  };

  CG.buildTuningUI = function () {
    if (!dom.tuningScroll) return;
    dom.tuningScroll.innerHTML = '';
    tuningControlRefs.length = 0;
    sectionRefs.length = 0;
    CG.syncTopDebugButtons();

    TUNING_SCHEMA.forEach(group => {
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
        const gizmoBtn = document.createElement('button');
        gizmoBtn.type = 'button';
        gizmoBtn.addEventListener('click', () => {
          st.showGizmos = !st.showGizmos;
          syncDebugToggleButtons();
          if (st.isPaused) CG.draw();
        });
        gizmoToggleBtnRef = gizmoBtn;
        sectionEl.appendChild(gizmoBtn);

        const debugTextBtn = document.createElement('button');
        debugTextBtn.type = 'button';
        debugTextBtn.addEventListener('click', () => {
          st.showDebugText = !st.showDebugText;
          if (!st.showDebugText) {
            st.floatingTexts = st.floatingTexts.filter(ft => /^\+\d+$/.test(ft.text));
          }
          syncDebugToggleButtons();
          if (st.isPaused) CG.draw();
        });
        debugTextToggleBtnRef = debugTextBtn;
        sectionEl.appendChild(debugTextBtn);

        syncDebugToggleButtons();
      }

      group.items.forEach(item => {
        const rowEl = document.createElement('div');
        rowEl.className = 'tuning-row';

        const topRow = document.createElement('div');
        topRow.className = 'tuning-row-top';

        const labelGroup = document.createElement('div');
        labelGroup.className = 'tuning-label-group';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tuning-label-name';
        nameSpan.textContent = item.label;

        const boundsSpan = document.createElement('span');
        boundsSpan.className = 'tuning-bounds';
        boundsSpan.textContent = `min: ${item.min}  |  max: ${item.max}`;

        labelGroup.appendChild(nameSpan);
        labelGroup.appendChild(boundsSpan);

        const inputWrap = document.createElement('div');
        inputWrap.className = 'tuning-input-compact';

        const numEl = document.createElement('input');
        numEl.type = 'number';
        numEl.min = item.min;
        numEl.max = item.max;
        numEl.step = item.step;
        numEl.value = item.target[item.key];

        inputWrap.appendChild(numEl);
        if (item.suffix) {
          const unitSpan = document.createElement('span');
          unitSpan.className = 'tuning-unit';
          unitSpan.textContent = item.suffix;
          inputWrap.appendChild(unitSpan);
        }

        topRow.appendChild(labelGroup);
        topRow.appendChild(inputWrap);
        rowEl.appendChild(topRow);

        if (item.desc) {
          const descEl = document.createElement('div');
          descEl.className = 'tuning-desc';
          descEl.textContent = item.desc;
          rowEl.appendChild(descEl);
        }

        function applyNewValue(rawVal) {
          if (Number.isNaN(rawVal)) return;
          let clamped = Math.max(item.min, Math.min(item.max, rawVal));
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
            } else if (obs.kind === 'mail_slot') {
              obs.w = cfg.MAIL_SLOT_WIDTH;
            }
          });

          CG.updateUI();
          if (st.isPaused) CG.draw();
        }

        numEl.addEventListener('input', () => {
          if (numEl.value === '') return;
          applyNewValue(parseFloat(numEl.value));
        });
        numEl.addEventListener('blur', () => CG.syncTuningUI());

        sectionEl.appendChild(rowEl);
        tuningControlRefs.push({ item, numEl });
      });

      dom.tuningScroll.appendChild(sectionEl);
    });
  };

  CG.syncTuningUI = function () {
    tuningControlRefs.forEach(({ item, numEl }) => {
      const val = item.target[item.key];
      if (document.activeElement !== numEl) {
        numEl.value = val;
      }
    });
    CG.syncTopDebugButtons();
    syncDebugToggleButtons();
  };

  CG.setPaused = function (nextPaused) {
    if (st.gameOver) return;
    st.isPaused = nextPaused;
    if (st.isPaused) {
      CG.clearAllInputs();
      if (dom.pauseToggleBtn) {
        dom.pauseToggleBtn.textContent = '▶';
        dom.pauseToggleBtn.classList.add('paused');
      }
    } else if (dom.pauseToggleBtn) {
      dom.pauseToggleBtn.textContent = '||';
      dom.pauseToggleBtn.classList.remove('paused');
    }
  };

  CG.toggleInspector = function (forceState) {
    if (!dom.engineInspector) return;
    if (typeof forceState === 'boolean') {
      dom.engineInspector.classList.toggle('collapsed', !forceState);
    } else {
      dom.engineInspector.classList.toggle('collapsed');
    }
  };

  CG.setIsolatedEnemy = function (type) {
    st.isolatedEnemyType = type;
    if (dom.enemySelect) dom.enemySelect.value = type;

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
    if (dom.enemyStateSelect) dom.enemyStateSelect.value = motionState;
  };

  CG.triggerImmediateSandboxSpawn = function () {
    if (st.gameOver) CG.resetGame();
    st.obstacles = [];
    st.telegraphs = [];
    st.spawnCooldown = 0;
    CG.queuePattern(true);
    if (st.isPaused) CG.draw();
  };

  // Post-render canvas gizmo drawer called automatically by renderer.js when present
  CG.drawDebugOverlay = function (ctx) {
    if (!st.showGizmos) return;
    const player = st.player;
    const cols = cfg.COLORS;
    const leadY = player.y;
    const echoY = player.echoY;
    const merge = st.surgeMerge || 0;

    ctx.save();
    ctx.strokeStyle = cols.FEEDBACK_POSITIVE;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(player.echoX, echoY);
    ctx.lineTo(player.leadX, leadY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(57, 255, 20, 0.22)';
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
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.55)';
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
        ctx.strokeStyle = 'rgba(255, 190, 11, 0.55)';
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
  };

  function bindDebugEvents() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (!st.gameOver && !e.repeat) {
          e.preventDefault();
          CG.setPaused(!st.isPaused);
        }
      } else if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        CG.toggleInspector();
      } else if (e.code === 'KeyR' && !e.repeat) {
        e.preventDefault();
        CG.triggerImmediateSandboxSpawn();
      }
    });

    let secretTapCount = 0;
    let secretTapTimer = null;
    if (dom.scoreEl) {
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
    }

    if (dom.closeInspectorBtn) {
      dom.closeInspectorBtn.addEventListener('click', () => CG.toggleInspector(false));
    }

    if (dom.godmodeBtn) {
      dom.godmodeBtn.addEventListener('click', () => {
        st.godmodeEnabled = !st.godmodeEnabled;
        if (st.godmodeEnabled) st.lives = cfg.MAX_LIVES;
        CG.syncTopDebugButtons();
        CG.updateUI();
      });
    }

	if (dom.infiniteSurgeBtn) {
      dom.infiniteSurgeBtn.addEventListener('click', () => {
        st.infiniteSurge = !st.infiniteSurge;
        if (st.infiniteSurge) {
          st.echoStamina = cfg.STAMINA_MAX;
          st.staminaLockoutFrames = 0;
          CG.syncBoostButtonVisual();
        }
        CG.syncTopDebugButtons();
      });
    }

    if (dom.disableVillainsBtn) {
      dom.disableVillainsBtn.addEventListener('click', () => {
        st.disableVillains = !st.disableVillains;
        CG.syncTopDebugButtons();
      });
    }

    if (dom.pauseToggleBtn) {
      dom.pauseToggleBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!st.gameOver) CG.setPaused(!st.isPaused);
      });
    }

    if (dom.enemySelect) {
      dom.enemySelect.addEventListener('change', () => {
        CG.setIsolatedEnemy(dom.enemySelect.value);
        CG.triggerImmediateSandboxSpawn();
      });
    }

    if (dom.enemyStateSelect) {
      dom.enemyStateSelect.addEventListener('change', () => {
        CG.setIsolatedEnemyState(dom.enemyStateSelect.value);
        CG.triggerImmediateSandboxSpawn();
      });
    }

    if (dom.spawnNowBtn) {
      dom.spawnNowBtn.addEventListener('click', () => CG.triggerImmediateSandboxSpawn());
    }

    if (dom.clearFieldBtn) {
      dom.clearFieldBtn.addEventListener('click', () => {
        st.obstacles = [];
        st.telegraphs = [];
        st.activePhaseShield = null;
        if (st.isPaused) CG.draw();
      });
    }

    if (dom.savePresetBtn) {
      dom.savePresetBtn.addEventListener('click', () => CG.saveConfigToLocalStorage());
    }

    if (dom.resetTuningBtn) {
      dom.resetTuningBtn.addEventListener('click', () => {
        Object.assign(cfg, CG.DEFAULT_GAME_CONFIG);
        cfg.COLORS = { ...CG.DEFAULT_GAME_CONFIG.COLORS };
        localStorage.removeItem(CG.STORAGE_KEY);
        st.godmodeEnabled = false;
        st.disableVillains = false;
        st.showGizmos = false;
        st.showDebugText = false;
        st.player.radius = cfg.PARENT_RADIUS;
        st.player.radiusEcho = cfg.ECHO_RADIUS;
        st.player.leadX = Math.max(24, Math.min(st.width - 24, cfg.PLAYER_LEAD_X));
        st.player.echoX = st.player.leadX - cfg.TETHER_HORIZONTAL_GAP;
        CG.syncTuningUI();
        CG.updateUI();
        CG.showSaveToast('RESET TO DEFAULTS');
        if (st.isPaused) CG.draw();
      });
    }

    if (dom.copyConfigBtn) {
      dom.copyConfigBtn.addEventListener('click', async () => {
        const exported = JSON.stringify(cfg, null, 2);
        try {
          await navigator.clipboard.writeText(exported);
          CG.showSaveToast('JSON COPIED');
        } catch (_) {
          console.log(exported);
        }
      });
    }

    if (dom.importConfigBtn) {
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
    }
  }

  injectDebugStyles();
  injectDebugDOM();
  CG.buildTuningUI();
  bindDebugEvents();
})(window.ChronoGame);
