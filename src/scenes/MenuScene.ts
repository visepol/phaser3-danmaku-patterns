import Phaser from 'phaser';

type SceneInfo = { key: string; title: string };

export default class MenuScene extends Phaser.Scene {
  private scenes: SceneInfo[] = [
    { key: 'Remilia_NonSpell1A_Nonspell1', title: 'Remilia NonSpell1A - Nonspell1' },
    { key: 'Remilia_Spell1', title: 'Remilia Spell1' },
  ];

  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#001018');

    this.add.text(width / 2, 60, 'Phaser Danmaku Patterns', {
      fontSize: '34px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 110, 'Select a Scene', {
      fontSize: '22px',
      color: '#cfe9ff',
    }).setOrigin(0.5);

    let y = 170;
    const gap = 48;

    this.scenes.forEach((s) => {
      const btn = this.add.text(width / 2, y, s.title, {
        fontSize: '22px',
        color: '#a0d8ff',
        backgroundColor: '#00243a',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ color: '#ffffff', backgroundColor: '#013a5c' }));
      btn.on('pointerout', () => btn.setStyle({ color: '#a0d8ff', backgroundColor: '#00243a' }));
      btn.on('pointerup', () => {
        this.scene.start(s.key);
      });

      y += gap;
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('Menu');
    });
  }
}
