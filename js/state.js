(function (CG) {
  const cfg = CG.GAME_CONFIG;

  let savedBestWalls = 0;
  try {
    savedBestWalls = parseInt(localStorage.getItem(CG.BEST_WALLS_KEY) || '0', 10) || 0;
  } catch (_) {}

  CG.dom = {
    gameStage: document.getElementById('game-stage'),
    canvas: document.getElementById('game'),
    ctx: document.getElementById('game').getContext('2d'),
	ui: document.getElementById('ui'),
    scoreEl: document.getElementById('score'),
    comboEl: document.getElementById('combo'),
    livesEl: document.getElementById('lives'),
    tierBannerEl: document.getElementById('tier-banner'),
    snapBtn: document.getElementById('snap-btn'),
    gameoverOverlay: document.getElementById('gameover-overlay'),
    goWallsEl: document.getElementById('go-walls'),
    goScoreEl: document.getElementById('go-score'),
    goBestWallsEl: document.getElementById('go-best-walls'),
    goBestBadgeEl: document.getElementById('go-best-badge'),
    restartBtn: document.getElementById('restart-btn'),
	startOverlay: document.getElementById('start-overlay'),
    startBtn: document.getElementById('start-btn'),
    menuBestWallsEl: document.getElementById('menu-best-walls'),
    controlsHintEl: document.getElementById('controls-hint')
  };

  CG.state = {
    width: 450,
    height: 800,

    // Optional debug/playtest hooks (controlled by js/debug.js if loaded)
    godmodeEnabled: false,
	infiniteSurge: false,    
	disableVillains: false,
	
    showGizmos: false,
    showDebugText: false,
    isPaused: false,
    isolatedEnemyType: 'ALL',
    isolatedEnemyState: 'AUTO',

    damageFlashFrames: 0,
    damageMaxFrames: 26,
    hitStopFrames: 0,
    damagedLifeIndex: -1,
    damagedLifeTimer: 0,
    diamondPopFrames: 0,

    previousEcho: { x: 0, y: 0 },
    gameOver: false,
    gameOverTimestamp: 0,

    obstaclesPassed: 0,
    speedProgressWalls: 0,
    bestWallsCleared: savedBestWalls,
    chainScore: 0,
    combo: 1,
    comboPopFrames: 0,
    doubleChainFrames: 0,
    lives: cfg.INITIAL_LIVES,
    replenishBarPoints: 0,
    isMaxLifeExcited: false,
    nextDiamondAtObstacle: 20,

    echoStamina: cfg.STAMINA_MAX,
    staminaLockoutFrames: 0,
    surgeMerge: 0,

    speed: cfg.BASE_SPEED,
    frame: 0,
    spawnCooldown: 0,
    shakeTime: 0,
    highestStageAnnounced: 1,
    bannerTimer: 0,
    seenStageKeys: new Set(),
    recentSpawnHistory: [],

    obstacles: [],
    particles: [],
    telegraphs: [],
    floatingTexts: [],

    activePhaseShield: null,

    player: {
      leadX: cfg.PLAYER_LEAD_X,
      y: window.innerHeight / 2,
      vy: 0,
      radius: cfg.PARENT_RADIUS,
      echoX: cfg.PLAYER_LEAD_X - cfg.TETHER_HORIZONTAL_GAP,
      echoY: window.innerHeight / 2,
      unmergedEchoY: window.innerHeight / 2,
      radiusEcho: cfg.ECHO_RADIUS,
      history: [],
      leadTrail: []
    }
  };
})(window.ChronoGame);
