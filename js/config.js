window.ChronoGame = window.ChronoGame || {};

(function (CG) {
  CG.STORAGE_KEY = 'chrono_thread_engine_config_v7';
  CG.BEST_WALLS_KEY = 'chrono_thread_best_walls_v1';

  CG.DEFAULT_GAME_CONFIG = {
    // High-Level Gameplay, Lives & Progression
    INITIAL_LIVES: 2,
    MAX_LIVES: 3,
    OBSTACLES_PER_UNLOCK_STAGE: 10,
    BASE_SPEED: 3.1,
    MAX_SPEED: 6.4,
    SPEED_SCALING_FACTOR: 0.02,
    PRISM_SPEED_DAMPEN_FACTOR: 0.8,

    // Spawner Pacing & White Orbs
    BASE_SPAWN_INTERVAL: 155,
    MIN_SPAWN_INTERVAL: 100,
    SPAWN_SCALING: 0.30,
    MIN_RIFT_CLEARANCE_PX: 270,
    TELEGRAPH_FRAMES: 32,
    WHITE_ORB_MIN_COUNT: 0,
    WHITE_ORB_MAX_COUNT: 1,
    WHITE_ORB_WALL_CLEARANCE: 135,

    // Global Oscillation Parents
    GLOBAL_OSC_SPEED: 0.75,
    GLOBAL_OSC_AMP: 68,
    STAGGERED_PHASE_DELAY: 0.01,

    // Lives Gauge, Scoring & Sync Combos
    LIFE_BAR_MAX: 20,
    MAX_LIFE_BONUS_BAR_MAX: 10,
    YELLOW_ORB_BAR_VALUE: 1,
    DIAMOND_BAR_VALUE: 20,
    DIAMOND_MIN_INTERVAL: 25,
    DIAMOND_MAX_INTERVAL: 40,
    DIAMOND_DOUBLE_CHAIN_SECONDS: 5,
    POINTS_PER_OBSTACLE: 1,
    MAX_LIFE_BAR_BONUS: 2,
    MAX_COMBO: 10,

    // Lead Core, Echo Twin, Phase Tether & Surge
    PLAYER_LEAD_X: 112,
    GRAVITY_UP: 0.6,
    GRAVITY_DOWN: 0.6,

    VELOCITY_DAMPING: 0.89,
    
	PARENT_RADIUS: 12,
    TETHER_HORIZONTAL_GAP: 40,
    ECHO_DELAY_FRAMES: 4,
    ECHO_RETURN_BLEND: 0.16,
    MAX_VERTICAL_STRETCH: 190,
    ECHO_RADIUS: 10,
    SWEEP_HARVEST_RADIUS: 12,
    BOOST_GRAVITY_MULTIPLIER: 1.95,
    
	STAMINA_MAX: 100,
    STAMINA_DRAIN_RATE: 0.85,
    STAMINA_RECOVERY_RATE: 0.5,
    STAMINA_LOCKOUT_SECONDS: 2.2,

    SURGE_SNAP_IN_RATE: 0.1,
    SURGE_SNAP_OUT_RATE: 0.1,

    SURGE_TRAIL_LENGTH: 40,
    SURGE_TRAIL_HISTORY: 10,
    SURGE_TRAIL_DOT_COUNT: 24,
    SURGE_TRAIL_START_SCALE: 1,
    SURGE_TRAIL_END_SCALE: 1,
    SURGE_TRAIL_MAX_ALPHA: 0.2,

    // Rift Spawn Weights
    SPAWN_WEIGHT_PINK_WALL: 36,
    SPAWN_WEIGHT_GATE_NODE: 13,
    SPAWN_WEIGHT_MAIL_SLOT: 13,
    SPAWN_WEIGHT_DOUBLE_SLIT: 11,
    SPAWN_WEIGHT_DUAL_RECT: 9,
    SPAWN_WEIGHT_STAGGERED: 9,
    SPAWN_WEIGHT_MISSILE: 4,
    SPAWN_WEIGHT_ECHO_PAD: 5,

    // Rift Geometry & Oscillation Multipliers (Relative to Global Parent)
    PINK_WALL_GAP: 155,
    PINK_WALL_OSC_SPEED_MULT: 1.0,
    PINK_WALL_OSC_AMP_MULT: 1.0,

    GATE_NODE_DIST: 140,
    GATE_NODE_OSC_SPEED_MULT: 1.0,
    GATE_NODE_OSC_AMP_MULT: 1.0,

    MAIL_SLOT_GAP: 92,
    MAIL_SLOT_OSC_SPEED_MULT: 0.5,
    MAIL_SLOT_OSC_AMP_MULT: 0.5,

    DOUBLE_SLIT_GAP: 112,
    DOUBLE_SLIT_DIVIDER: 76,
    DOUBLE_SLIT_OSC_SPEED_MULT: 1.0,
    DOUBLE_SLIT_OSC_AMP_MULT: 1.0,

    DUAL_RECT_WIDTH: 20,
    DUAL_RECT_HEIGHT: 80,
    DUAL_RECT_X_GAP: 80,
    DUAL_RECT_GATE_DIST: 60,
    DUAL_MIN_OFFSET: 10,
    DUAL_MAX_OFFSET: 40,
    DUAL_RECT_OSC_SPEED_MULT: 1.0,
    DUAL_RECT_OSC_AMP_MULT: 1.0,

    STAGGERED_MIN_DIST: 100,
    STAGGERED_MAX_DIST: 150,
    STAGGERED_STEP_GAP: 145,
    STAGGERED_STEP_OFFSET: 100,
    STAGGERED_PHASE_DELAY: 0,
    STAGGERED_OSC_SPEED_MULT: 1.0,
    STAGGERED_OSC_AMP_MULT: 1.0,

    MISSILE_SPEED: 6.2,
    MISSILE_RADIUS: 12,
    MISSILE_LOCK_FRAMES: 40,
    MISSILE_OVERLAP_DELAY_FRAMES: 44,
    MISSILE_OSC_SPEED_MULT: 1.0,
    MISSILE_OSC_AMP_MULT: 1.0,

    ECHO_PAD_RADIUS: 28,
    ECHO_PAD_MIN_COUNT: 1,
    ECHO_PAD_MAX_COUNT: 3,
    ECHO_PAD_VERTICAL_PADDING: 40,
    PHASE_GATE_WIDTH: 50,
    ECHO_PAD_GATE_DIST: 50,
    ECHO_PAD_OSC_SPEED_MULT: 1.0,
    ECHO_PAD_OSC_AMP_MULT: 1.0,

    // Colors
    PLAYER_DEFAULT_COLOR: '#ffffff',
    PLAYER_OVERCHARGE_COLOR: '#ffbe0b',

    COLORS: {
      COLLECTIBLE_ORB: '#ffffff',
      COLLECTIBLE_DIAMOND_OUTER: '#00f0ff',
      COLLECTIBLE_DIAMOND_INNER: '#ffffff',
      VILLAIN_PRIMARY: '#ff2a85',
      VILLAIN_SECONDARY: '#00f0ff',
      VILLAIN_AMBER: '#ffbe0b',
      ROSTER_CYAN: '#00f0ff',
      ROSTER_AMBER: '#ffbe0b',
      ROSTER_PINK: '#ff2a85',
      FEEDBACK_POSITIVE: '#39ff14',
      FEEDBACK_BOOST: '#00f0ff',
      FEEDBACK_ALERT: '#ff2a85'
    }
  };

  // Ordered progression: initial static rifts -> early oscillating rifts -> advanced static -> advanced oscillating
  CG.PROGRESSION_STAGES = [
    { villain: 'pink_wall', state: 'static', name: 'PHASE 1: STATIC PINK WALLS' },
    { villain: 'gate_node', state: 'static', name: 'PHASE 2: AMBER KEY + LOCKED GATE' },
    { villain: 'mail_slot', state: 'static', name: 'PHASE 3: MAIL-SLOT TUNNEL' },
    { villain: 'pink_wall', state: 'oscillating', name: 'PHASE 4: OSCILLATING PINK WALLS' },
    { villain: 'double_slit', state: 'static', name: 'PHASE 5: DOUBLE-SLIT BARRIER' },
    { villain: 'gate_node', state: 'oscillating', name: 'PHASE 6: OSCILLATING KEY + GATE' },
    { villain: 'dual_target_gate', state: 'static', name: 'PHASE 7: DUAL TARGET RECTANGLES' },
    { villain: 'mail_slot', state: 'oscillating', name: 'PHASE 8: OSCILLATING MAIL-SLOT' },
    { villain: 'staggered_step', state: 'static', name: 'PHASE 9: STAGGERED STEP-GATES' },
    { villain: 'double_slit', state: 'oscillating', name: 'PHASE 10: OSCILLATING DOUBLE-SLIT' },
    { villain: 'trail_missile', state: 'static', name: 'PHASE 11: TRACKING ENERGY MISSILE' },
    { villain: 'dual_target_gate', state: 'oscillating', name: 'PHASE 12: OSCILLATING DUAL TARGETS' },
    { villain: 'echo_pad_gate', state: 'static', name: 'PHASE 13: CHROMATIC PHASE PADS' },
    { villain: 'staggered_step', state: 'oscillating', name: 'PHASE 14: OSCILLATING STEP-GATES' },
    { villain: 'trail_missile', state: 'oscillating', name: 'PHASE 15: WAVE-TRAIL MISSILE' },
    { villain: 'echo_pad_gate', state: 'oscillating', name: 'PHASE 16: OSCILLATING PHASE PADS' }
  ];

  CG.loadInitialConfig = function () {
    const cfg = {
      ...CG.DEFAULT_GAME_CONFIG,
      COLORS: { ...CG.DEFAULT_GAME_CONFIG.COLORS }
    };
    try {
      const raw = localStorage.getItem(CG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
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
      }
    } catch (_) {}
    return cfg;
  };

  CG.GAME_CONFIG = CG.loadInitialConfig();
})(window.ChronoGame);
