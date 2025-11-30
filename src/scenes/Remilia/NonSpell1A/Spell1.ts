import Phaser from 'phaser';

export default class Spell1 extends Phaser.Scene {
  player!: Phaser.GameObjects.Rectangle;
  boss!: Phaser.GameObjects.Rectangle;
  bullets!: Phaser.GameObjects.Group;
  lasers!: Phaser.GameObjects.Group;

  bossLife = 4000;
  invinframe = 0;

  bossVX = 0;
  bossVY = 0;

  // Controles e velocidade do player (opcional para testes locais)
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };
  playerSpeed = 300;

  constructor() { super('Remilia_Spell1'); }

  create(): void {
    const cx = this.scale.width / 2;
    const mx = this.scale.width;

    // Player and Boss
    this.player = this.add.rectangle(cx, this.scale.height - 100, 16, 16, 0x00ff00).setOrigin(0.5);
    this.boss   = this.add.rectangle(cx, 60, 48, 48, 0xff0000).setOrigin(0.5);

    // Move boss to initial dest at speed ~120px/s
    this.moveBossTo(cx, 135, 120);

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

    // Start flow: mainTask -> movement -> fire
    this.mainTask(mx);
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    // Player move
    const left = this.cursors.left?.isDown || this.keys.A?.isDown;
    const right = this.cursors.right?.isDown || this.keys.D?.isDown;
    const up = this.cursors.up?.isDown || this.keys.W?.isDown;
    const down = this.cursors.down?.isDown || this.keys.S?.isDown;

    let mvx = (right ? 1 : 0) - (left ? 1 : 0);
    let mvy = (down ? 1 : 0) - (up ? 1 : 0);
    if (mvx !== 0 || mvy !== 0) {
      const len = Math.hypot(mvx, mvy);
      mvx /= len; mvy /= len;
      this.player.x += mvx * this.playerSpeed * dt;
      this.player.y += mvy * this.playerSpeed * dt;
      const halfW = this.player.width / 2;
      const halfH = this.player.height / 2;
      this.player.x = Phaser.Math.Clamp(this.player.x, halfW, this.scale.width - halfW);
      this.player.y = Phaser.Math.Clamp(this.player.y, halfH, this.scale.height - halfH);
    }

    // Boss integration
    this.boss.x += this.bossVX * dt;
    this.boss.y += this.bossVY * dt;

    // Bullets update
    this.bullets.getChildren().forEach((b: any) => {
      if (!b.active) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.delay && b.delay > 0) { b.delay -= dt; }
      if (b.x < -80 || b.x > this.scale.width + 80 || b.y < -80 || b.y > this.scale.height + 80) {
        b.destroy();
      }
    });

    // Lasers update (straight lines with lifetime)
    this.lasers.getChildren().forEach((l: any) => {
      if (!l.active) return;
      l.life -= delta;
      if (l.life <= 0) {
        l.destroy();
        return;
      }
      // keep end points based on angle and len
      const rad = l.rad;
      const sx = l.sx, sy = l.sy;
      const ex = sx + Math.cos(rad) * l.len;
      const ey = sy + Math.sin(rad) * l.len;
      l.setTo(sx, sy, ex, ey);
      l.setLineWidth(l.thickness);
    });

    // Damage staging
    if (this.invinframe < 60) {
      this.invinframe++;
    } else if (this.invinframe === 60) {
      // Boss cutin / BG start placeholders
      this.playSoundStub('spell_start', 50);
      this.invinframe++;
    } else if (this.invinframe < 300) {
      // reduced damage phase (no real damage pipeline here, just placeholder)
      this.invinframe++;
    } // at 300 -> normal damage

    // End condition
    if (this.bossLife <= 0) {
      this.clearAllShots();
      this.boss.destroy();
      this.scene.stop();
    }
  }

  async mainTask(mx: number): Promise<void> {
    // Render boss colliders placeholder could be here
    this.movement(mx);
  }

  async movement(mx: number): Promise<void> {
    await this.wait(180 * (1000 / 60));
    this.fire(mx);
  }

  async fire(mx: number): Promise<void> {
    this.diagonalMeshLoop(); // periodic diagonal mesh (inclui agora o laser azul vertical)
    this.aimShot(mx);
    this.bossShot();
  }

  // Single-shot diagonal mesh (X grid). Clears previous lasers, lasts 2s.
  private spawnDiagonalMesh(): void {
    this.lasers.clear(true, true); // remove any remaining previous mesh

    const w = this.scale.width;
    const h = this.scale.height;
    const pad = 120;
    const step = 120;          // spacing between diagonal lines
    const lifeMs = 2000;       // 2s lifetime
    const thickness = 14;
    const hue = 140;
    const alpha = 60;
    const len = Math.hypot(w + pad * 2, h + pad * 2); // ensure full coverage

    // Diagonals starting from left edge (both directions)
    const sy = 45;
    for (let y = -pad; y <= h + pad; y += step) {
      this.createStraightLaserA1(-pad, y, sy, len, thickness, lifeMs, hue, alpha);
      this.createStraightLaserA1(-pad, y, -sy, len, thickness, lifeMs, hue, alpha);
    }

    // Additional diagonals starting from top/bottom edges to densify mesh
    for (let x = -pad; x <= w + pad; x += step) {
      this.createStraightLaserA1(x, -pad, sy, len, thickness, lifeMs, hue, alpha);
      this.createStraightLaserA1(x, h + pad, -sy, len, thickness, lifeMs, hue, alpha);
    }

    // Laser azul vertical alinhado ao player renderizado junto com os demais
    this.createStraightLaserA1(this.player.x, -pad, 90, this.scale.height + pad * 2, 16, lifeMs, 210, 70);
    this.playSoundStub('laser_mesh', 80);
  }

  // Periodic diagonal mesh respawn loop
  private async diagonalMeshLoop(): Promise<void> {
    const burstDelayFrames = 60;   // aligns with aimShot/bossShot initial wait
    const betweenBurstsFrames = 240;
    while (true) {
      await this.wait(burstDelayFrames * (1000 / 60));
      this.spawnDiagonalMesh(); // lasers appear with new bullets
      await this.wait(betweenBurstsFrames * (1000 / 60));
    }
  }

  // Aimed ring bursts from an orbit point around boss
  async aimShot(mx: number): Promise<void> {
    while (true) {
      let angle = this.getAngleToPlayer(this.boss.x, this.boss.y);
      await this.wait(60 * (1000 / 60));
      for (let i = 0; i <= 9; i++) {
        for (let j = 0; j <= 21; j++) {
          const ox = this.boss.x + 150 * Math.cos(Phaser.Math.DegToRad(angle));
          const oy = this.boss.y + 150 * Math.sin(Phaser.Math.DegToRad(angle));
          const angle2 = this.getAngleToPoint(ox, oy, this.player.x, this.player.y);
          const shotAngle = angle2 + j * (360 / 20);
          const shot = this.createShotA1(ox, oy, 2, shotAngle, 293, 6);
          // delay visual placeholder
          (shot as any).delay = 10 / 60;
          angle += 360 / 8;
        }
      }
      await this.wait(240 * (1000 / 60));
    }
  }

  // Boss radial mix shot
  async bossShot(): Promise<void> {
    while (true) {
      await this.wait(60 * (1000 / 60));
      const baseAngle = this.randRange(0, 359);
      for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 6; j++) {
          this.createShotA1(this.boss.x, this.boss.y, 2.5 - j * 0.225, baseAngle + i * (360 / 10) + j * 3, 358, 10);
          this.createShotA1(this.boss.x, this.boss.y, 1.5 + j * 0.1, baseAngle + 30 + i * (360 / 10) - j * 12, 327, 10);
        }
      }
      this.playSoundStub('shot2', 90);
      await this.wait(240 * (1000 / 60));
    }
  }

  // Helpers

  // Create straight laser as a line with lifetime
  createStraightLaserA1(sx: number, sy: number, angleDeg: number, len: number, thickness: number, lifeMs: number, colorHue: number, alphaPct: number): Phaser.GameObjects.Line {
    const rad = Phaser.Math.DegToRad(angleDeg);
    const ex = sx + Math.cos(rad) * len;
    const ey = sy + Math.sin(rad) * len;
    const color = Phaser.Display.Color.HSLToColor((colorHue % 360) / 360, 0.7, 0.5).color;
    const line = this.add.line(0, 0, sx, sy, ex, ey, color).setOrigin(0).setAlpha(alphaPct / 100);
    (line as any).sx = sx; (line as any).sy = sy;
    (line as any).rad = rad;
    (line as any).len = len;
    (line as any).thickness = thickness;
    (line as any).life = lifeMs;
    this.lasers.add(line);
    return line;
  }

  // Create bullet
  createShotA1(x: number, y: number, speed: number, angleDeg: number, spriteId: number, size: number): Phaser.GameObjects.Arc {
    const color = this.colorForSprite(spriteId);
    const bullet = this.add.circle(x, y, size, color).setAlpha(0.95);
    const rad = Phaser.Math.DegToRad(angleDeg);
    (bullet as any).vx = Math.cos(rad) * speed * 60;
    (bullet as any).vy = Math.sin(rad) * speed * 60;
    (bullet as any).delay = 0;
    this.bullets.add(bullet);
    return bullet;
  }

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
    const timeMs = (len / speed) * 1000;
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