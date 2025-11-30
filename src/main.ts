import Phaser from 'phaser';
import Nonspell1 from './scenes/Remilia/NonSpell1A/Nonspell1';
import Spell1 from './scenes/Remilia/NonSpell1A/Spell1';
import MenuScene from './scenes/MenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000',
  parent: 'app',
  scene: [MenuScene, Nonspell1, Spell1]
};

new Phaser.Game(config);
