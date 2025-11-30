// ...existing code...
import Phaser from 'phaser';

export default class Nonspell1 extends Phaser.Scene {
  player!: Phaser.GameObjects.Rectangle;
  boss!: Phaser.GameObjects.Rectangle;
  bullets!: Phaser.GameObjects.Group;

  bossLife = 2000;
  invinframe = 0;

  bossVX = 0;
  bossVY = 0;

  // Controles e velocidade do player
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; };
  playerSpeed = 300;

  constructor() { super('Remilia_NonSpell1A_Nonspell1'); }

  create(): void {
    // Center (cx) and max x (mx) approximations for DNH variables
    const cx = this.scale.width / 2;
    const mx = this.scale.width;

    // Player and Boss
    this.player = this.add.rectangle(cx, this.scale.height - 100, 16, 16, 0x00ff00).setOrigin(0.5);
    this.boss   = this.add.rectangle(cx, 60, 48, 48, 0xff0000).setOrigin(0.5);

    // Move boss to dest at speed (ObjMove_SetDestAtSpeed)
    this.moveBossTo(cx, 120, 120); // speed ~5px/frame -> ~300px/s, adapt

    // Bullet group
    this.bullets = this.add.group();

    // Start main task after init
    this.mainTask(mx);

    // Debug input to reduce boss life
    this.input.on('pointerdown', () => { this.bossLife = Math.max(0, this.bossLife - 100); });

    // Controles: setas e WASD
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    }) as any;
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    // Movimento do player (livre 8 direções)
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    let mvx = (right ? 1 : 0) - (left ? 1 : 0);
    let mvy = (down ? 1 : 0) - (up ? 1 : 0);

    if (mvx !== 0 || mvy !== 0) {
      const len = Math.hypot(mvx, mvy);
      mvx /= len;
      mvy /= len;
      this.player.x += mvx * this.playerSpeed * dt;
      this.player.y += mvy * this.playerSpeed * dt;

      // Limitar dentro da tela
      const halfW = this.player.width / 2;
      const halfH = this.player.height / 2;
      this.player.x = Phaser.Math.Clamp(this.player.x, halfW, this.scale.width - halfW);
      this.player.y = Phaser.Math.Clamp(this.player.y, halfH, this.scale.height - halfH);
    }

    // Boss movement integration
    this.boss.x += this.bossVX * dt;
    this.boss.y += this.bossVY * dt;

    // Shots update
    this.bullets.getChildren().forEach((b: any) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // cull
      if (b.x < -50 || b.x > this.scale.width + 50 || b.y < -50 || b.y > this.scale.height + 50) {
        b.destroy();
      }
    });

    // Invincibility frame behavior (damage rate staging)
    if (this.invinframe < 300) {
      // reduced damage phase
      this.invinframe++;
    } else {
      // normal damage phase
    }

    // End condition (ObjEnemy_GetInfo <= 0)
    if (this.bossLife <= 0) {
      this.bullets.clear(true, true);
      this.boss.destroy();
      // CloseScript -> stop scene
      this.scene.stop();
    }
  }

  async mainTask(mx: number): Promise<void> {
    // movement: wait(120) then fire and motion
    await this.wait(120 * (1000 / 60));
    this.fire();   // start concurrent firing tasks
    this.motion(mx); // start motion loop
  }

  async fire(): Promise<void> {
    // let Ang = 0; rotation; clod;
    let Ang = 0;

    // rotation task
    this.rotationTask(() => Ang, (val) => { Ang = val; });

    // clod task
    this.clodTask(() => Ang);
  }

  async rotationTask(getAng: () => number, setAng: (v: number) => void): Promise<void> {
    while (true) {
      // let angle = Ang;
      let angle = getAng();

      // ascent (i in 0..10) { CreateShotA1(..., speed=2, angle, sprite=303, size=5); angle+=25; yield; }
      for (let i = 0; i <= 10; i++) {
        this.createShotA1(this.boss.x, this.boss.y, 2, angle, 303, 5);
        angle += 25;
        await this.wait(1000 / 60); // yield
      }

      // PlaySound("shot1",85)
      this.playSoundStub('shot1', 85);

      // Ang+=15; yield;
      setAng(getAng() + 15);
      await this.wait(1000 / 60);
    }
  }

  async clodTask(getAng: () => number): Promise<void> {
    let Ang2 = getAng() - 90;
    while (true) {
      // CreateShotA1(bossX,bossY,2.5,Ang2,363,5);
      this.createShotA1(this.boss.x, this.boss.y, 2.5, Ang2, 363, 5);

      // loop(40) { CreateShotA1(bossX,bossY,rand(1,2.25),Ang2+rand(-60,60),76,5); }
      for (let i = 0; i < 40; i++) {
        const spd = this.randRange(1, 2.25);
        const ang = Ang2 + this.randRange(-60, 60);
        this.createShotA1(this.boss.x, this.boss.y, spd, ang, 76, 5);
      }

      // PlaySound("shot2",70);
      this.playSoundStub('shot2', 70);

      // Ang2+=45; wait(33);
      Ang2 += 45;
      await this.wait(33 * (1000 / 60));
    }
  }

  async motion(mx: number): Promise<void> {
    while (true) {
      await this.wait(150 * (1000 / 60));
      // RandMove(bossObj,100,60,10,2,64,80,mx-64,120);
      // Approximate: random destination box near center and some speed profile
      const destX = this.randRange(64, mx - 64);
      const destY = this.randRange(80, 120 + 60); // around y ~120..180
      const speed = 220; // tune to taste
      this.moveBossTo(destX, destY, speed);
    }
  }

  // CreateShotA1(bossX,bossY, speed, angleDeg, spriteId, size)
  createShotA1(x: number, y: number, speed: number, angleDeg: number, spriteId: number, size: number): Phaser.GameObjects.Arc {
    const bullet = this.add.circle(x, y, size, this.colorForSprite(spriteId));
    const rad = Phaser.Math.DegToRad(angleDeg);
    (bullet as any).vx = Math.cos(rad) * speed * 60; // speed per second; DNH speed ~= px/frame
    (bullet as any).vy = Math.sin(rad) * speed * 60;
    this.bullets.add(bullet);
    return bullet;
  }

  colorForSprite(id: number): number {
    // quick palette mapping for different sprite IDs
    if (id === 303) return 0x66ccff;
    if (id === 363) return 0xff66aa;
    if (id === 76)  return 0xffff66;
    return 0x00aaff;
  }

  playSoundStub(name: string, volume: number): void {
    // Hook up to Phaser Sound if available
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

  randRange(min: number, max: number): number {
    return Phaser.Math.FloatBetween(min, max);
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve));
  }
}
// ...existing code...