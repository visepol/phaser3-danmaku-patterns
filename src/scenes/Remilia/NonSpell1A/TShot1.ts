import Phaser from 'phaser';

export default class TShot1 extends Phaser.Scene {
  player!: Phaser.GameObjects.Rectangle;
  boss!: Phaser.GameObjects.Rectangle;
  bullets!: Phaser.GameObjects.Group;

  constructor() { super('Remilia_NonSpell1A_TShot1'); }

  create(): void {
    this.player = this.add.rectangle(400, 500, 40, 40, 0x00ff00).setOrigin(0.5);
    this.boss   = this.add.rectangle(400, 150, 60, 60, 0xff0000).setOrigin(0.5);
    this.bullets = this.add.group();

    this.runTShot01();
  }

  update(): void {
    const dt = 1 / 60;
    this.bullets.getChildren().forEach((b: any) => { b.x += b.vx * dt; b.y += b.vy * dt; });
  }

  async runTShot01(): Promise<void> {
    const atk = {
      repeat: 5,
      pattern: {
        shotsPerRevolution: 60,
        timeBetweenShots: 0,
        pauseBetweenRevolutions: 500,
        bulletsPerShot: [{ speed: 150 }, { speed: 200 }, { speed: 250 }],
        angle: { incrementPerShot: 360 / 60, relativeToPlayer: false }
      }
    } as const;

    for (let rotation = 0; rotation < atk.repeat; rotation++) {
      for (let i = 0; i < atk.pattern.shotsPerRevolution; i++) {
        const angleToPlayer = Phaser.Math.RadToDeg(
          Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y)
        );
        const finalAngle = atk.pattern.angle.incrementPerShot * i + angleToPlayer;

        atk.pattern.bulletsPerShot.forEach((b) => {
          this.spawnBullet(this.boss.x, this.boss.y, finalAngle, b.speed);
        });

        if (atk.pattern.timeBetweenShots > 0) await this.wait(atk.pattern.timeBetweenShots);
      }
      if (atk.pattern.pauseBetweenRevolutions > 0) await this.wait(atk.pattern.pauseBetweenRevolutions);
    }
  }

  spawnBullet(x: number, y: number, angleDeg: number, speed: number): Phaser.GameObjects.Arc {
    const bullet = this.add.circle(x, y, 6, 0x00aaff);
    (bullet as any).vx = Math.cos(Phaser.Math.DegToRad(angleDeg)) * speed;
    (bullet as any).vy = Math.sin(Phaser.Math.DegToRad(angleDeg)) * speed;
    this.bullets.add(bullet);
    return bullet;
  }

  wait(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}