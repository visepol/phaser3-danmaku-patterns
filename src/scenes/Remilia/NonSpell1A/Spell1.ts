import Phaser from 'phaser';

// =========================
// Config & Constants
// =========================
const FPS = 60;
const SEC = 1000;

const PLAYER_CONFIG = {
  size: 16,
  speedPxPerSec: 300,
  startOffsetY: 100,
  color: 0x00ff00,
};

const BOSS_CONFIG = {
  size: 48,
  startY: 60,
  moveTarget: { xOffset: 0, y: 135 },
  moveSpeedPxPerSec: 120,
  color: 0xff0000,
  life: 4000,
};

const INVINCIBILITY_FRAMES = {
  intro: 60,
  reducedDamageEnd: 300,
};

const LASER_MESH_CONFIG = {
  pad: 120,
  step: 120,
  lifeMs: 2000,
  thickness: 14,
  hue: 140,
  alphaPct: 60,
  angleDegA: 45,  // sy
  angleDegB: -45, // -sy
  burstDelayFrames: 60,
  betweenBurstsFrames: 240,
};

const PLAYER_VERTICAL_LASER_CONFIG = {
  thickness: 16,
  hue: 210,        // azul
  alphaPct: 70,
  angleDeg: 90,
};

const PLAYER_HORIZONTAL_LASER_CONFIG = {
  thickness: 16,
  hue: 210,        // azul
  alphaPct: 70,
  angleDeg: 0,     // horizontal
};

const AIM_SHOT_CONFIG = {
  waitFrames: 60,
  rings: 10,
  orbitRadius: 150,
  perRingBullets: 22, // 0..21 inclusive = 22
  bulletSpeed: 2,
  spriteId: 293,
  size: 6,
  visualDelaySec: 10 / FPS,
  betweenBurstsFrames: 240,
};

const BOSS_SHOT_CONFIG = {
  waitFrames: 60,
  rings: 11, // 0..10 inclusive = 11
  perRingBullets: 7, // 0..6 inclusive = 7
  setA: { baseSpeed: 2.5, speedStep: -0.225, angleJStep: 3, spriteId: 358, size: 10 },
  setB: { baseSpeed: 1.5, speedStep: 0.1, offsetAngle: 30, angleJStep: -12, spriteId: 327, size: 10 },
  betweenBurstsFrames: 240,
};

const PENTAGRAM_CONFIG = {
  centerY: 220,            // posição vertical aproximada do pentagrama
  outerRadius: 260,        // raio externo
  thickness: 14,
  lifeMs: LASER_MESH_CONFIG.lifeMs,
  hue: LASER_MESH_CONFIG.hue,
  alphaPct: LASER_MESH_CONFIG.alphaPct,
};

export default class Spell1 extends Phaser.Scene {
  // =========================
  // State
  // =========================
  player!: Phaser.GameObjects.Rectangle;
  boss!: Phaser.GameObjects.Rectangle;
  bullets!: Phaser.GameObjects.Group;
  lasers!: Phaser.GameObjects.Group;

  bossLife = BOSS_CONFIG.life;
  invinframe = 0;

  bossVX = 0;
  bossVY = 0;

  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };

  constructor() { super('Remilia_Spell1'); }

  // =========================
  // Lifecycle
  // =========================
  create(): void {
    const centerX = this.scale.width / 2;
    const stageWidth = this.scale.width;

    // Player and Boss
    this.player = this.add
      .rectangle(centerX, this.scale.height - PLAYER_CONFIG.startOffsetY, PLAYER_CONFIG.size, PLAYER_CONFIG.size, PLAYER_CONFIG.color)
      .setOrigin(0.5);

    this.boss = this.add
      .rectangle(centerX, BOSS_CONFIG.startY, BOSS_CONFIG.size, BOSS_CONFIG.size, BOSS_CONFIG.color)
      .setOrigin(0.5);

    // Move boss to initial destination
    const targetX = centerX + BOSS_CONFIG.moveTarget.xOffset;
    this.moveBossTo(targetX, BOSS_CONFIG.moveTarget.y, BOSS_CONFIG.moveSpeedPxPerSec);

    // Groups
    this.bullets = this.add.group();
    this.lasers = this.add.group();

    // Controles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any;

    // Flow
    this.mainTask(stageWidth);
  }

  update(time: number, deltaMs: number): void {
    const dt = deltaMs / SEC;

    // Player movement
    this.updatePlayerMovement(dt);

    // Boss movement
    this.boss.x += this.bossVX * dt;
    this.boss.y += this.bossVY * dt;

    // Bullets update
    this.updateBullets(dt);

    // Lasers update (straight lines with lifetime)
    this.updateLasers(deltaMs);

    // Damage staging
    this.updateInvincibility();

    // End condition
    if (this.bossLife <= 0) {
      this.clearAllShots();
      this.boss.destroy();
      this.scene.stop();
    }
  }

  // =========================
  // Orchestration
  // =========================
  async mainTask(stageWidth: number): Promise<void> {
    // Render boss colliders placeholder could be here
    await this.movement(stageWidth);
  }

  async movement(stageWidth: number): Promise<void> {
    await this.wait(180 * (SEC / FPS));
    await this.fire(stageWidth);
  }

  async fire(stageWidth: number): Promise<void> {
    // Mesh loop (agora desenha um pentagrama + laser vertical do player)
    this.runLaserMeshLoop();
    // Shots
    this.runAimedRingBursts(stageWidth);
    this.runBossRadialMix();
  }

  // =========================
  // Update helpers
  // =========================
  private updatePlayerMovement(dt: number): void {
    const left = this.cursors.left?.isDown || this.keys.A?.isDown;
    const right = this.cursors.right?.isDown || this.keys.D?.isDown;
    const up = this.cursors.up?.isDown || this.keys.W?.isDown;
    const down = this.cursors.down?.isDown || this.keys.S?.isDown;

    let mvx = (right ? 1 : 0) - (left ? 1 : 0);
    let mvy = (down ? 1 : 0) - (up ? 1 : 0);

    if (mvx === 0 && mvy === 0) return;

    const len = Math.hypot(mvx, mvy) || 1;
    mvx /= len; mvy /= len;

    this.player.x += mvx * PLAYER_CONFIG.speedPxPerSec * dt;
    this.player.y += mvy * PLAYER_CONFIG.speedPxPerSec * dt;

    const halfW = this.player.width / 2;
    const halfH = this.player.height / 2;
    this.player.x = Phaser.Math.Clamp(this.player.x, halfW, this.scale.width - halfW);
    this.player.y = Phaser.Math.Clamp(this.player.y, halfH, this.scale.height - halfH);
  }

  private updateBullets(dt: number): void {
    this.bullets.getChildren().forEach((b: any) => {
      if (!b.active) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.delay && b.delay > 0) b.delay -= dt;

      const outOfBounds =
        b.x < -80 || b.x > this.scale.width + 80 ||
        b.y < -80 || b.y > this.scale.height + 80;

      if (outOfBounds) b.destroy();
    });
  }

  private updateLasers(deltaMs: number): void {
    this.lasers.getChildren().forEach((l: any) => {
      if (!l.active) return;
      l.life -= deltaMs;
      if (l.life <= 0) { l.destroy(); return; }

      // keep end points based on angle and len
      const rad = l.rad;
      const sx = l.sx, sy = l.sy;
      const ex = sx + Math.cos(rad) * l.len;
      const ey = sy + Math.sin(rad) * l.len;
      l.setTo(sx, sy, ex, ey);
      l.setLineWidth(l.thickness);
    });
  }

  private updateInvincibility(): void {
    if (this.invinframe < INVINCIBILITY_FRAMES.intro) {
      this.invinframe++;
    } else if (this.invinframe === INVINCIBILITY_FRAMES.intro) {
      this.playSoundStub('spell_start', 50);
      this.invinframe++;
    } else if (this.invinframe < INVINCIBILITY_FRAMES.reducedDamageEnd) {
      this.invinframe++;
    }
  }

  // =========================
  // Patterns
  // =========================
  private spawnPentagramMeshWithPlayerLaser(): void {
    this.lasers.clear(true, true);

    const w = this.scale.width;
    const { pad } = LASER_MESH_CONFIG;

    // Pontos do pentagrama (5 pontos igualmente espaçados)
    const centerX = w / 2;
    const centerY = PENTAGRAM_CONFIG.centerY;
    const R = PENTAGRAM_CONFIG.outerRadius;

    const points: { x: number; y: number }[] = [];
    // Começa no topo (-90°) e avança no sentido horário
    for (let i = 0; i < 5; i++) {
      const angleRad = Phaser.Math.DegToRad(-90 + i * 72);
      points.push({ x: centerX + Math.cos(angleRad) * R, y: centerY + Math.sin(angleRad) * R });
    }

    // Conectar pulando 2 pontos para formar a estrela (pentagrama)
    const thickness = PENTAGRAM_CONFIG.thickness;
    const lifeMs = PENTAGRAM_CONFIG.lifeMs;
    const hue = PENTAGRAM_CONFIG.hue;
    const alphaPct = PENTAGRAM_CONFIG.alphaPct;

    for (let i = 0; i < 5; i++) {
      const a = points[i];
      const b = points[(i + 2) % 5];
      this.createLaserSegmentExtended(a.x, a.y, b.x, b.y, thickness, lifeMs, hue, alphaPct);
    }

    // Laser azul vertical alinhado ao player
    const playerX = this.player.x;
    const verticalLen = this.scale.height + pad * 2;
    this.createStraightLaserA1(
      playerX,
      -pad,
      PLAYER_VERTICAL_LASER_CONFIG.angleDeg,
      verticalLen,
      PLAYER_VERTICAL_LASER_CONFIG.thickness,
      lifeMs,
      PLAYER_VERTICAL_LASER_CONFIG.hue,
      PLAYER_VERTICAL_LASER_CONFIG.alphaPct
    );

    // Laser azul horizontal alinhado ao player
    const playerY = this.player.y;
    const horizontalLen = this.scale.width + pad * 2;
    this.createStraightLaserA1(
      -pad,
      playerY,
      PLAYER_HORIZONTAL_LASER_CONFIG.angleDeg,
      horizontalLen,
      PLAYER_HORIZONTAL_LASER_CONFIG.thickness,
      lifeMs,
      PLAYER_HORIZONTAL_LASER_CONFIG.hue,
      PLAYER_HORIZONTAL_LASER_CONFIG.alphaPct
    );

    this.playSoundStub('laser_mesh', 80);
  }

  private async runLaserMeshLoop(): Promise<void> {
    const { burstDelayFrames, betweenBurstsFrames } = LASER_MESH_CONFIG;
    while (true) {
      await this.wait(burstDelayFrames * (SEC / FPS));
      this.spawnPentagramMeshWithPlayerLaser();
      await this.wait(betweenBurstsFrames * (SEC / FPS));
    }
  }

  private async runAimedRingBursts(stageWidth: number): Promise<void> {
    const cfg = AIM_SHOT_CONFIG;
    while (true) {
      let angleToPlayer = this.getAngleToPlayer(this.boss.x, this.boss.y);
      await this.wait(cfg.waitFrames * (SEC / FPS));

      for (let ring = 0; ring < cfg.rings; ring++) {
        for (let j = 0; j < cfg.perRingBullets; j++) {
          const orbitX = this.boss.x + cfg.orbitRadius * Math.cos(Phaser.Math.DegToRad(angleToPlayer));
          const orbitY = this.boss.y + cfg.orbitRadius * Math.sin(Phaser.Math.DegToRad(angleToPlayer));
          const aimedAngle = this.getAngleToPoint(orbitX, orbitY, this.player.x, this.player.y);
          const shotAngle = aimedAngle + j * (360 / (cfg.perRingBullets - 1)); // mantém o padrão original

          const shot = this.createShotA1(orbitX, orbitY, cfg.bulletSpeed, shotAngle, cfg.spriteId, cfg.size);
          (shot as any).delay = cfg.visualDelaySec;
        }
        angleToPlayer += 360 / 8;
      }

      await this.wait(cfg.betweenBurstsFrames * (SEC / FPS));
    }
  }

  private async runBossRadialMix(): Promise<void> {
    const cfg = BOSS_SHOT_CONFIG;
    while (true) {
      await this.wait(cfg.waitFrames * (SEC / FPS));
      const baseAngle = this.randRange(0, 359);

      for (let i = 0; i < cfg.rings; i++) {
        for (let j = 0; j < cfg.perRingBullets; j++) {
          // Set A
          const speedA = cfg.setA.baseSpeed + j * cfg.setA.speedStep;
          const angleA = baseAngle + i * (360 / (cfg.rings - 1)) + j * cfg.setA.angleJStep;
          this.createShotA1(this.boss.x, this.boss.y, speedA, angleA, cfg.setA.spriteId, cfg.setA.size);

          // Set B
          const speedB = cfg.setB.baseSpeed + j * cfg.setB.speedStep;
          const angleB = baseAngle + cfg.setB.offsetAngle + i * (360 / (cfg.rings - 1)) + j * cfg.setB.angleJStep;
          this.createShotA1(this.boss.x, this.boss.y, speedB, angleB, cfg.setB.spriteId, cfg.setB.size);
        }
      }

      this.playSoundStub('shot2', 90);
      await this.wait(cfg.betweenBurstsFrames * (SEC / FPS));
    }
  }

  // =========================
  // Factories
  // =========================
  createStraightLaserA1(
    sx: number,
    sy: number,
    angleDeg: number,
    len: number,
    thickness: number,
    lifeMs: number,
    colorHue: number,
    alphaPct: number
  ): Phaser.GameObjects.Line {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const ex = sx + Math.cos(rad) * len;
    const ey = sy + Math.sin(rad) * len;

    const color = Phaser.Display.Color.HSLToColor((colorHue % 360) / 360, 0.7, 0.5).color;
    const line = this.add
      .line(0, 0, sx, sy, ex, ey, color)
      .setOrigin(0)
      .setAlpha(alphaPct / 100);

    (line as any).sx = sx;
    (line as any).sy = sy;
    (line as any).rad = rad;
    (line as any).len = len;
    (line as any).thickness = thickness;
    (line as any).life = lifeMs;

    this.lasers.add(line);
    return line;
  }

  // Novo: cria um laser segmento entre dois pontos
  private createLaserSegment(
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    thickness: number,
    lifeMs: number,
    colorHue: number,
    alphaPct: number
  ): Phaser.GameObjects.Line {
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const rad = Math.atan2(dy, dx);

    const color = Phaser.Display.Color.HSLToColor((colorHue % 360) / 360, 0.7, 0.5).color;
    const line = this.add
      .line(0, 0, sx, sy, ex, ey, color)
      .setOrigin(0)
      .setAlpha(alphaPct / 100);

    (line as any).sx = sx;
    (line as any).sy = sy;
    (line as any).rad = rad;
    (line as any).len = len;
    (line as any).thickness = thickness;
    (line as any).life = lifeMs;

    this.lasers.add(line);
    return line;
  }

  // Novo: cria um laser segmento entre dois pontos e estende-o além da tela
  private createLaserSegmentExtended(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    thickness: number,
    lifeMs: number,
    colorHue: number,
    alphaPct: number
  ): Phaser.GameObjects.Line {
    const dx = bx - ax;
    const dy = by - ay;
    const baseLen = Math.hypot(dx, dy) || 1;
    const rad = Math.atan2(dy, dx);

    // Extensão suficiente para sair da tela em ambas direções
    const extend = Math.hypot(this.scale.width, this.scale.height);
    const sx = ax - Math.cos(rad) * extend;
    const sy = ay - Math.sin(rad) * extend;
    const ex = bx + Math.cos(rad) * extend;
    const ey = by + Math.sin(rad) * extend;

    const color = Phaser.Display.Color.HSLToColor((colorHue % 360) / 360, 0.7, 0.5).color;
    const line = this.add.line(0, 0, sx, sy, ex, ey, color).setOrigin(0).setAlpha(alphaPct / 100);

    // Guardar dados para atualização contínua
    (line as any).sx = sx;
    (line as any).sy = sy;
    (line as any).rad = rad;
    (line as any).len = baseLen + extend * 2;
    (line as any).thickness = thickness;
    (line as any).life = lifeMs;

    this.lasers.add(line);
    return line;
  }

  createShotA1(
    x: number,
    y: number,
    speedTilesPerFrame: number,
    angleDeg: number,
    spriteId: number,
    size: number
  ): Phaser.GameObjects.Arc {
    const color = this.colorForSprite(spriteId);
    const bullet = this.add.circle(x, y, size, color).setAlpha(0.95);
    const rad = Phaser.Math.DegToRad(angleDeg);

    // bullets use speed scaled to 60fps logic
    (bullet as any).vx = Math.cos(rad) * speedTilesPerFrame * FPS;
    (bullet as any).vy = Math.sin(rad) * speedTilesPerFrame * FPS;
    (bullet as any).delay = 0;

    this.bullets.add(bullet);
    return bullet;
  }

  // =========================
  // Utils
  // =========================
  getAngleToPlayer(x: number, y: number): number {
    return Phaser.Math.RadToDeg(Math.atan2(this.player.y - y, this.player.x - x));
  }

  getAngleToPoint(x1: number, y1: number, x2: number, y2: number): number {
    return Phaser.Math.RadToDeg(Math.atan2(y2 - y1, x2 - x1));
  }

  playSoundStub(name: string, volume: number): void {
    // this.sound.play(name, { volume: volume / 100 });
  }

  moveBossTo(destX: number, destY: number, speed: number): void {
    const dx = destX - this.boss.x;
    const dy = destY - this.boss.y;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * speed;
    const vy = (dy / len) * speed;

    this.bossVX = vx;
    this.bossVY = vy;

    const timeMs = (len / speed) * SEC;
    this.time.delayedCall(timeMs, () => {
      this.boss.x = destX;
      this.boss.y = destY;
      this.bossVX = 0;
      this.bossVY = 0;
    });
  }

  clearAllShots(): void {
    this.bullets.clear(true, true);
    this.lasers.clear(true, true);
  }

  randRange(min: number, max: number): number {
    return Phaser.Math.FloatBetween(min, max);
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }

  colorForSprite(id: number): number {
    if (id === 358) return 0xff6699;
    if (id === 327) return 0x66ffcc;
    if (id === 293) return 0x99ccff;
    return 0xffffff;
  }
}