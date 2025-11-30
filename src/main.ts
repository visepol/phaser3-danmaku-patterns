import Phaser from 'phaser';
import TShot1 from './scenes/Remilia/NonSpell1A/TShot1';
import MenuScene from './scenes/MenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000',
  parent: 'app',
  scene: [MenuScene, TShot1]
};

new Phaser.Game(config);
