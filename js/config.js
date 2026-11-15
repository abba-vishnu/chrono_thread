window.ChronoGame = window.ChronoGame || {};

(function (CG) {
  CG.STORAGE_KEY = 'chrono_thread_engine_config_v5';
  CG.BEST_WALLS_KEY = 'chrono_thread_best_walls_v1';

  CG.DEFAULT_GAME_CONFIG = {
    // Gameplay, Lives, Scoring & Sync Combos
    INITIAL_LIVES: 3,
    MAX_LIVES: 3,
    LIFE_BAR_MAX: 20,
    MAX_LIFE_BONUS_BAR_MAX: 10,
    YELLOW_ORB_BAR_VALUE: 1,
    DIAMOND_BAR_VALUE: 20,
    DIAMOND_MIN_INTERVAL: 18,
    DIAMOND_MAX_INTERVAL: 28,
    DIAMOND_DOUBLE_CHAIN_SECONDS: 8,
    POINTS_PER_OBSTACLE: 10,
    MAX_LIFE_BAR_BONUS: 100,
    MAX_COMBO: 10,

    // Lead Core, Echo Twin, Phase Tether & Surge
    PLAYER_LEAD_X: 112,
    GRAVITY_UP: 0.58,
    GRAVITY_DOWN: 0.52,
    VELOCITY_DAMPING: 0.92,
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

    // World Speed & Spawner Timing
    BASE_SPEED: 3.8,
    MAX_SPEED: 6.4,
    SPEED_SCALING_FACTOR: 0.025,
    BASE_SPAWN_INTERVAL: 145,
    MIN_SPAWN_INTERVAL: 98,
    SPAWN_SCALING: 0.35,
    TELEGRAPH_FRAMES: 32,
    MIN_RIFT_CLEARANCE_PX: 260,

    // Oscillation & Progression
    OBSTACLES_PER_UNLOCK_STAGE: 2,
    OSCILLATE_SPEED: 1.0,
    OSCILLATE_AMPLITUDE: 68,
    STAGGERED_PHASE_DELAY: 0,

    // Rift Spawn Weights
    SPAWN_WEIGHT_PINK_WALL: 36,
    SPAWN_WEIGHT_GATE_NODE: 13,
    SPAWN_WEIGHT_MAIL_SLOT: 13,
    SPAWN_WEIGHT_DOUBLE_SLIT: 11,
    SPAWN_WEIGHT_DUAL_RECT: 9,
    SPAWN_WEIGHT_STAGGERED: 9,
    SPAWN_WEIGHT_MISSILE: 4,
    SPAWN_WEIGHT_ECHO_PAD: 5,

    // Rift Geometry & Mechanics
    PINK_WALL_GAP: 155,
    PINK_WALL_OSC_SPEED: 1.0,
    PINK_WALL_OSC_AMP: 68,

    GATE_NODE_DIST: 140,
    GATE_NODE_OSC_SPEED: 1.0,
    GATE_NODE_OSC_AMP: 68,

    MAIL_SLOT_GAP: 92,
    MAIL_SLOT_OSC_SPEED: 1.0,
    MAIL_SLOT_OSC_AMP: 68,

    DOUBLE_SLIT_GAP: 112,
    DOUBLE_SLIT_DIVIDER: 76,
    DOUBLE_SLIT_OSC_SPEED: 1.0,
    DOUBLE_SLIT_OSC_AMP: 68,

    STAGGERED_MIN_DIST: 100,
    STAGGERED_MAX_DIST: 150,
    STAGGERED_STEP_GAP: 145,
    STAGGERED_STEP_OFFSET: 100,
    STAGGERED_OSC_SPEED: 1.0,
    STAGGERED_OSC_AMP: 68,

    DUAL_RECT_WIDTH: 20,
    DUAL_RECT_HEIGHT: 80,
    DUAL_RECT_X_GAP: 80,
    DUAL_RECT_GATE_DIST: 60,
    DUAL_MIN_OFFSET: 10,
    DUAL_MAX_OFFSET: 40,
    DUAL_RECT_OSC_SPEED: 1.0,
    DUAL_RECT_OSC_AMP: 68,

    MISSILE_SPEED: 6.4,
    MISSILE_RADIUS: 12,
    MISSILE_LOCK_FRAMES: 38,
    MISSILE_OVERLAP_DELAY_FRAMES: 42,
    MISSILE_OSC_SPEED: 1.0,
    MISSILE_OSC_AMP: 68,

    ECHO_PAD_RADIUS: 28,
    ECHO_PAD_MIN_COUNT: 1,
    ECHO_PAD_MAX_COUNT: 3,
    ECHO_PAD_VERTICAL_PADDING: 40,
    PHASE_GATE_WIDTH: 50,
    ECHO_PAD_GATE_DIST: 50,
    ECHO_PAD_OSC_SPEED: 1.0,
    ECHO_PAD_OSC_AMP: 68,

    // Colors
    PLAYER_DEFAULT_COLOR: '#ffffff',
    PLAYER_FULL_COMBO_COLOR: '#39ff14',

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

  const cfg = CG.GAME_CONFIG;

  CG.TUNING_SCHEMA = [
    {
      section: 'Core Gameplay, Lives & Scoring',
      items: [
        { target: cfg, key: 'INITIAL_LIVES', label: 'INITIAL_LIVES', desc: 'Starting lives on a fresh run.', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'MAX_LIVES', label: 'MAX_LIVES', desc: 'Maximum life diamond slots.', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'LIFE_BAR_MAX', label: 'LIFE_BAR_MAX', desc: 'Spark charge points required to restore an empty life diamond.', min: 5, max: 100, step: 1, integer: true },
        { target: cfg, key: 'MAX_LIFE_BONUS_BAR_MAX', label: 'MAX_LIFE_BONUS_BAR_MAX', desc: 'Extra spark charge required when all lives are full to trigger max bonus & excited glow.', min: 1, max: 60, step: 1, integer: true },
        { target: cfg, key: 'YELLOW_ORB_BAR_VALUE', label: 'YELLOW_ORB_BAR_VALUE', desc: 'Life gauge points granted per Spark orb.', min: 1, max: 20, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_BAR_VALUE', label: 'DIAMOND_BAR_VALUE', desc: 'Life gauge points granted per Chrono Prism.', min: 1, max: 60, step: 1, integer: true },
        { target: cfg, key: 'MAX_LIFE_BAR_BONUS', label: 'MAX_LIFE_BAR_BONUS', desc: 'Score points awarded when full-life golden gauge completes.', min: 50, max: 1000, step: 25, integer: true },
        { target: cfg, key: 'POINTS_PER_OBSTACLE', label: 'POINTS_PER_OBSTACLE', desc: 'Base score per wall cleared (multiplied by Sync).', min: 1, max: 100, step: 1, integer: true },
        { target: cfg, key: 'MAX_COMBO', label: 'MAX_COMBO', desc: 'Maximum Sync multiplier.', min: 2, max: 20, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_MIN_INTERVAL', label: 'DIAMOND_MIN_INTERVAL', desc: 'Minimum walls cleared between Chrono Prism spawns.', min: 5, max: 60, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_MAX_INTERVAL', label: 'DIAMOND_MAX_INTERVAL', desc: 'Maximum walls cleared between Chrono Prism spawns.', min: 8, max: 80, step: 1, integer: true },
        { target: cfg, key: 'DIAMOND_DOUBLE_CHAIN_SECONDS', label: 'DIAMOND_DOUBLE_CHAIN_SECONDS', desc: 'Duration in seconds of 2X Overdrive after collecting a Chrono Prism.', min: 2, max: 25, step: 1, integer: true, suffix: 's' }
      ]
    },
    {
      section: 'Lead Core, Echo Twin & Surge',
      items: [
        { target: cfg, key: 'PLAYER_LEAD_X', label: 'PLAYER_LEAD_X', desc: 'Horizontal X coordinate of the Lead Core inside the 9:16 playfield.', min: 50, max: 260, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'GRAVITY_UP', label: 'GRAVITY_UP', desc: 'Upward lift responsiveness when ascending.', min: 0.1, max: 1.5, step: 0.02 },
        { target: cfg, key: 'GRAVITY_DOWN', label: 'GRAVITY_DOWN', desc: 'Downward gravity responsiveness when falling.', min: 0.1, max: 1.5, step: 0.02 },
        { target: cfg, key: 'VELOCITY_DAMPING', label: 'VELOCITY_DAMPING', desc: 'Vertical air drag damping factor per frame.', min: 0.75, max: 0.99, step: 0.01 },
        { target: cfg, key: 'PARENT_RADIUS', label: 'PARENT_RADIUS', desc: 'Collision and visual radius of the Lead Core.', min: 4, max: 20, step: 1, integer: true, suffix: 'px' },
        { target: cfg, key: 'ECHO_RADIUS', label: 'ECHO_RADIUS', desc: 'Collision and visual radius of the Echo Twin when unmerged.', min: 3, max: 16, step: 1, integer: true, suffix: 'px' },
        { target: cfg, key: 'TETHER_HORIZONTAL_GAP', label: 'TETHER_HORIZONTAL_GAP', desc: 'Horizontal distance between Lead Core and Echo Twin.', min: 20, max: 200, step: 2, suffix: 'px' },
        { target: cfg, key: 'ECHO_DELAY_FRAMES', label: 'ECHO_DELAY_FRAMES', desc: 'Delay in frames for Echo Twin wave tracking trajectory.', min: 1, max: 45, step: 1, integer: true, suffix: 'f' },
        { target: cfg, key: 'ECHO_RETURN_BLEND', label: 'ECHO_RETURN_BLEND', desc: 'Responsiveness of Echo Twin smoothing toward delayed path.', min: 0.04, max: 0.6, step: 0.02 },
        { target: cfg, key: 'MAX_VERTICAL_STRETCH', label: 'MAX_VERTICAL_STRETCH', desc: 'Maximum vertical separation allowed between Lead Core and Echo Twin.', min: 60, max: 320, step: 5, integer: true, suffix: 'px' },
        { target: cfg, key: 'SWEEP_HARVEST_RADIUS', label: 'SWEEP_HARVEST_RADIUS', desc: 'Harvest forgiveness radius when slicing Sparks & nodes.', min: 0, max: 30, step: 1, integer: true, suffix: 'px' },
        { target: cfg, key: 'BOOST_GRAVITY_MULTIPLIER', label: 'BOOST_GRAVITY_MULTIPLIER', desc: 'Amplifies Lead Core vertical responsiveness when Surge is active.', min: 1.0, max: 3.5, step: 0.05 },
        { target: cfg, key: 'STAMINA_MAX', label: 'STAMINA_MAX', desc: 'Maximum Surge stamina capacity.', min: 20, max: 300, step: 10, integer: true },
        { target: cfg, key: 'STAMINA_DRAIN_RATE', label: 'STAMINA_DRAIN_RATE', desc: 'Stamina depleted per frame while holding Surge.', min: 0.1, max: 3.0, step: 0.05 },
        { target: cfg, key: 'STAMINA_RECOVERY_RATE', label: 'STAMINA_RECOVERY_RATE', desc: 'Stamina regeneration rate when Surge is inactive.', min: 0.05, max: 3.0, step: 0.05 },
        { target: cfg, key: 'STAMINA_LOCKOUT_SECONDS', label: 'STAMINA_LOCKOUT_SECONDS', desc: 'Overheat cooldown duration in seconds when stamina hits 0.', min: 0.5, max: 8.0, step: 0.25, suffix: 's' }
      ]
    },
    {
      section: 'Universal Speed, Spawner & Progression',
      items: [
        { target: cfg, key: 'BASE_SPEED', label: 'BASE_SPEED', desc: 'Baseline horizontal world scroll speed.', min: 1.0, max: 10.0, step: 0.2 },
        { target: cfg, key: 'MAX_SPEED', label: 'MAX_SPEED', desc: 'Maximum speed limit for timeline progression.', min: 2.0, max: 14.0, step: 0.2 },
        { target: cfg, key: 'SPEED_SCALING_FACTOR', label: 'SPEED_SCALING_FACTOR', desc: 'Horizontal speed added per wall cleared.', min: 0, max: 0.2, step: 0.005 },
        { target: cfg, key: 'BASE_SPAWN_INTERVAL', label: 'BASE_SPAWN_INTERVAL', desc: 'Base frame interval between rift spawn cycles.', min: 45, max: 240, step: 5, integer: true, suffix: 'f' },
        { target: cfg, key: 'MIN_SPAWN_INTERVAL', label: 'MIN_SPAWN_INTERVAL', desc: 'Minimum frame interval floor at high wall counts.', min: 35, max: 180, step: 5, integer: true, suffix: 'f' },
        { target: cfg, key: 'SPAWN_SCALING', label: 'SPAWN_SCALING', desc: 'Frames subtracted from spawn interval per wall cleared.', min: 0, max: 2.0, step: 0.05 },
        { target: cfg, key: 'MIN_RIFT_CLEARANCE_PX', label: 'MIN_RIFT_CLEARANCE_PX', desc: 'Minimum horizontal recovery gap required after the trailing edge of an active obstacle before spawning the next villain.', min: 120, max: 480, step: 10, integer: true, suffix: 'px' },
        { target: cfg, key: 'TELEGRAPH_FRAMES', label: 'TELEGRAPH_FRAMES', desc: 'Warning indicator duration before rifts enter screen.', min: 10, max: 60, step: 2, integer: true, suffix: 'f' },
        { target: cfg, key: 'OBSTACLES_PER_UNLOCK_STAGE', label: 'OBSTACLES_PER_UNLOCK_STAGE', desc: 'Walls cleared to advance each static/oscillating unlock phase.', min: 1, max: 10, step: 1, integer: true },
        { target: cfg, key: 'OSCILLATE_SPEED', label: 'OSCILLATE_SPEED', desc: 'Fallback vertical oscillation cycle frequency.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'OSCILLATE_AMPLITUDE', label: 'OSCILLATE_AMPLITUDE', desc: 'Fallback vertical swing amplitude around spawn Y in pixels.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_PHASE_DELAY', label: 'STAGGERED_PHASE_DELAY', desc: 'Phase lag in radians between front and rear step-gate gaps (0 = unison).', min: 0, max: 1, step: 0.02, suffix: 'rad' }
      ]
    },
    {
      section: '1. Pink Wall Parameters',
      enemyTag: 'pink_wall',
      items: [
        { target: cfg, key: 'PINK_WALL_GAP', label: 'PINK_WALL_GAP', desc: 'Vertical gap opening for standard pink walls.', min: 80, max: 240, step: 5, suffix: 'px' },
        { target: cfg, key: 'PINK_WALL_OSC_SPEED', label: 'PINK_WALL_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating pink walls.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'PINK_WALL_OSC_AMP', label: 'PINK_WALL_OSC_AMP', desc: 'Vertical swing amplitude for oscillating pink walls.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_PINK_WALL', label: 'SPAWN_WEIGHT_PINK_WALL', desc: 'Spawn weight in ALL mode.', min: 0, max: 80, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '2. Amber Key Node & Locked Gate',
      enemyTag: 'gate_node',
      items: [
        { target: cfg, key: 'GATE_NODE_DIST', label: 'GATE_NODE_DIST', desc: 'Horizontal distance between the Amber Key node and its locked gate.', min: 30, max: 280, step: 5, suffix: 'px' },
        { target: cfg, key: 'GATE_NODE_OSC_SPEED', label: 'GATE_NODE_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating Amber Keys.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'GATE_NODE_OSC_AMP', label: 'GATE_NODE_OSC_AMP', desc: 'Vertical swing amplitude for oscillating Amber Keys.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_GATE_NODE', label: 'SPAWN_WEIGHT_GATE_NODE', desc: 'Spawn weight in ALL mode.', min: 0, max: 50, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '3. Horizontal Mail-Slot Tunnel',
      enemyTag: 'mail_slot',
      items: [
        { target: cfg, key: 'MAIL_SLOT_GAP', label: 'MAIL_SLOT_GAP', desc: 'Vertical clearance opening inside horizontal mail-slot tunnels.', min: 56, max: 150, step: 2, suffix: 'px' },
        { target: cfg, key: 'MAIL_SLOT_OSC_SPEED', label: 'MAIL_SLOT_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating mail-slot tunnels.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'MAIL_SLOT_OSC_AMP', label: 'MAIL_SLOT_OSC_AMP', desc: 'Vertical swing amplitude for oscillating mail-slot tunnels.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_MAIL_SLOT', label: 'SPAWN_WEIGHT_MAIL_SLOT', desc: 'Spawn weight in ALL mode.', min: 0, max: 50, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '4. Double-Slit Barrier Wall',
      enemyTag: 'double_slit',
      items: [
        { target: cfg, key: 'DOUBLE_SLIT_GAP', label: 'DOUBLE_SLIT_GAP', desc: 'Vertical height of each of the two slit openings.', min: 65, max: 160, step: 5, suffix: 'px' },
        { target: cfg, key: 'DOUBLE_SLIT_DIVIDER', label: 'DOUBLE_SLIT_DIVIDER', desc: 'Height of the solid center blocker separating the upper and lower slits.', min: 30, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'DOUBLE_SLIT_OSC_SPEED', label: 'DOUBLE_SLIT_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating double-slit barriers.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'DOUBLE_SLIT_OSC_AMP', label: 'DOUBLE_SLIT_OSC_AMP', desc: 'Vertical swing amplitude for oscillating double-slit barriers.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_DOUBLE_SLIT', label: 'SPAWN_WEIGHT_DOUBLE_SLIT', desc: 'Spawn weight in ALL mode.', min: 0, max: 50, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '5. Dual Target Rectangles',
      enemyTag: 'dual_target_gate',
      items: [
        { target: cfg, key: 'DUAL_RECT_WIDTH', label: 'DUAL_RECT_WIDTH', desc: 'Horizontal width of dual target rectangles.', min: 20, max: 80, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_HEIGHT', label: 'DUAL_RECT_HEIGHT', desc: 'Vertical height of dual target rectangles.', min: 16, max: 80, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_X_GAP', label: 'DUAL_RECT_X_GAP', desc: 'Horizontal X distance between the two dual target rectangles.', min: 0, max: 180, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_GATE_DIST', label: 'DUAL_RECT_GATE_DIST', desc: 'Horizontal distance between the dual target rectangles and the gate wall.', min: 20, max: 260, step: 5, suffix: 'px' },
        { target: cfg, key: 'DUAL_MIN_OFFSET', label: 'DUAL_MIN_OFFSET', desc: 'Minimum vertical offset magnitude for Echo & Lead target rectangles.', min: 10, max: 70, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_MAX_OFFSET', label: 'DUAL_MAX_OFFSET', desc: 'Maximum vertical offset magnitude for Echo & Lead target rectangles.', min: 30, max: 140, step: 2, suffix: 'px' },
        { target: cfg, key: 'DUAL_RECT_OSC_SPEED', label: 'DUAL_RECT_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating dual targets.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'DUAL_RECT_OSC_AMP', label: 'DUAL_RECT_OSC_AMP', desc: 'Vertical swing amplitude for oscillating dual targets.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_DUAL_RECT', label: 'SPAWN_WEIGHT_DUAL_RECT', desc: 'Spawn weight in ALL mode.', min: 0, max: 50, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '6. Staggered Step-Gates',
      enemyTag: 'staggered_step',
      items: [
        { target: cfg, key: 'STAGGERED_MIN_DIST', label: 'STAGGERED_MIN_DIST', desc: 'Minimum decoupled horizontal distance between step walls.', min: 30, max: 140, step: 2, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_MAX_DIST', label: 'STAGGERED_MAX_DIST', desc: 'Maximum decoupled horizontal distance between step walls.', min: 80, max: 240, step: 2, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_STEP_GAP', label: 'STAGGERED_STEP_GAP', desc: 'Vertical gap opening inside each staggered step wall.', min: 80, max: 220, step: 5, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_STEP_OFFSET', label: 'STAGGERED_STEP_OFFSET', desc: 'Vertical elevation step difference between front and rear gates.', min: 40, max: 200, step: 5, suffix: 'px' },
        { target: cfg, key: 'STAGGERED_OSC_SPEED', label: 'STAGGERED_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating step-gates.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'STAGGERED_OSC_AMP', label: 'STAGGERED_OSC_AMP', desc: 'Vertical swing amplitude for oscillating step-gates.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_STAGGERED', label: 'SPAWN_WEIGHT_STAGGERED', desc: 'Spawn weight in ALL mode.', min: 0, max: 50, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '7. Tracking Energy Missile',
      enemyTag: 'trail_missile',
      items: [
        { target: cfg, key: 'MISSILE_SPEED', label: 'MISSILE_SPEED', desc: 'Horizontal velocity of launched energy missiles.', min: 3.0, max: 12.0, step: 0.2 },
        { target: cfg, key: 'MISSILE_RADIUS', label: 'MISSILE_RADIUS', desc: 'Collision radius of energy missiles.', min: 6, max: 24, step: 1, integer: true, suffix: 'px' },
        { target: cfg, key: 'MISSILE_LOCK_FRAMES', label: 'MISSILE_LOCK_FRAMES', desc: 'Frames spent tracking player altitude before launch.', min: 15, max: 90, step: 3, integer: true, suffix: 'f' },
        { target: cfg, key: 'MISSILE_OVERLAP_DELAY_FRAMES', label: 'MISSILE_OVERLAP_DELAY_FRAMES', desc: 'Cooldown frames after missile lock before next rift spawns.', min: 0, max: 120, step: 3, integer: true, suffix: 'f' },
        { target: cfg, key: 'MISSILE_OSC_SPEED', label: 'MISSILE_OSC_SPEED', desc: 'Wave oscillation speed for wave-trail missiles.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'MISSILE_OSC_AMP', label: 'MISSILE_OSC_AMP', desc: 'Vertical wave amplitude for wave-trail missiles.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_MISSILE', label: 'SPAWN_WEIGHT_MISSILE', desc: 'Spawn weight in ALL mode.', min: 0, max: 30, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: '8. Chromatic Phase-Shift Hex Pad',
      enemyTag: 'echo_pad_gate',
      items: [
        { target: cfg, key: 'ECHO_PAD_RADIUS', label: 'ECHO_PAD_RADIUS', desc: 'Radius of each hexagonal chromatic key in the vertical column.', min: 18, max: 48, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'ECHO_PAD_MIN_COUNT', label: 'ECHO_PAD_MIN_COUNT', desc: 'Minimum vertical hex keys spawned per gate.', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'ECHO_PAD_MAX_COUNT', label: 'ECHO_PAD_MAX_COUNT', desc: 'Maximum vertical hex keys spawned per gate.', min: 1, max: 5, step: 1, integer: true },
        { target: cfg, key: 'ECHO_PAD_VERTICAL_PADDING', label: 'ECHO_PAD_VERTICAL_PADDING', desc: 'Vertical spacing gap between stacked hex keys.', min: 10, max: 50, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'PHASE_GATE_WIDTH', label: 'PHASE_GATE_WIDTH', desc: 'Thickness of the chromatic phase-shifter gate.', min: 28, max: 72, step: 2, integer: true, suffix: 'px' },
        { target: cfg, key: 'ECHO_PAD_GATE_DIST', label: 'ECHO_PAD_GATE_DIST', desc: 'Horizontal distance between the chromatic hex pads and the phase gate.', min: 0, max: 240, step: 5, suffix: 'px' },
        { target: cfg, key: 'ECHO_PAD_OSC_SPEED', label: 'ECHO_PAD_OSC_SPEED', desc: 'Oscillation cycle speed for oscillating chromatic hex pads.', min: 0.2, max: 3.0, step: 0.1 },
        { target: cfg, key: 'ECHO_PAD_OSC_AMP', label: 'ECHO_PAD_OSC_AMP', desc: 'Vertical swing amplitude for oscillating chromatic hex pads.', min: 20, max: 160, step: 4, suffix: 'px' },
        { target: cfg, key: 'SPAWN_WEIGHT_ECHO_PAD', label: 'SPAWN_WEIGHT_ECHO_PAD', desc: 'Spawn weight in ALL mode.', min: 0, max: 30, step: 1, integer: true, suffix: '%' }
      ]
    },
    {
      section: 'Consolidated Color Palette',
      items: [
        { target: cfg, key: 'PLAYER_DEFAULT_COLOR', type: 'color', label: 'PLAYER_DEFAULT_COLOR', desc: 'Default color of Lead Core, Echo Twin & active life diamonds.' },
        { target: cfg, key: 'PLAYER_FULL_COMBO_COLOR', type: 'color', label: 'PLAYER_FULL_COMBO_COLOR', desc: 'Color of Lead Core, Echo Twin & life diamonds at max Sync.' },
        { target: cfg.COLORS, key: 'COLLECTIBLE_ORB', type: 'color', label: 'COLLECTIBLE_ORB', desc: 'Color of free-floating collectible Sparks.' },
        { target: cfg.COLORS, key: 'COLLECTIBLE_DIAMOND_OUTER', type: 'color', label: 'COLLECTIBLE_DIAMOND_OUTER', desc: 'Outer frame color of 2X Chrono Prisms.' },
        { target: cfg.COLORS, key: 'COLLECTIBLE_DIAMOND_INNER', type: 'color', label: 'COLLECTIBLE_DIAMOND_INNER', desc: 'Inner core color of 2X Chrono Prisms.' },
        { target: cfg.COLORS, key: 'VILLAIN_PRIMARY', type: 'color', label: 'VILLAIN_PRIMARY', desc: 'Primary barrier color (Walls, Mail-Slots, Double-Slit, Steps, Missiles).' },
        { target: cfg.COLORS, key: 'VILLAIN_SECONDARY', type: 'color', label: 'VILLAIN_SECONDARY', desc: 'Secondary hazard color (Dual-Target gates & static trims).' },
        { target: cfg.COLORS, key: 'VILLAIN_AMBER', type: 'color', label: 'VILLAIN_AMBER', desc: 'Locked Gate + Amber Key color and oscillating edge trim.' },
        { target: cfg.COLORS, key: 'ROSTER_CYAN', type: 'color', label: 'ROSTER_CYAN', desc: 'Chromatic Phase-Shift roster color 1 (Cyan).' },
        { target: cfg.COLORS, key: 'ROSTER_AMBER', type: 'color', label: 'ROSTER_AMBER', desc: 'Chromatic Phase-Shift roster color 2 (Amber).' },
        { target: cfg.COLORS, key: 'ROSTER_PINK', type: 'color', label: 'ROSTER_PINK', desc: 'Chromatic Phase-Shift roster color 3 (Pink).' },
        { target: cfg.COLORS, key: 'FEEDBACK_POSITIVE', type: 'color', label: 'FEEDBACK_POSITIVE', desc: 'Positive floating text & gizmo highlight color.' },
        { target: cfg.COLORS, key: 'FEEDBACK_BOOST', type: 'color', label: 'FEEDBACK_BOOST', desc: 'Surge fusion & 2X Overdrive feedback color.' },
        { target: cfg.COLORS, key: 'FEEDBACK_ALERT', type: 'color', label: 'FEEDBACK_ALERT', desc: 'Damage, overheat & reset alert color.' }
      ]
    },
    {
      section: 'Debug & Gizmo Toggles',
      isDebugToggles: true,
      items: []
    }
  ];
})(window.ChronoGame);
