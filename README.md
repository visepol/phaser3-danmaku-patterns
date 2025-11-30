# Phaser Danmaku Patterns

A Phaser 3 project showcasing bullet-hell (danmaku) attack patterns. The app boots into a main menu where you can browse and run different patterns.

## Requirements
- Node.js 18+ (LTS recommended)
- npm

## Getting Started
1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```
3. Open the URL printed by Vite (usually `http://localhost:5173/`).

## Project Structure
```
index.html
package.json
tsconfig.json
src/
  main.ts
  scenes/
    MenuScene.ts
    Remilia/
      NonSpell1A/
        TShot1.ts
```

## Usage
- The game boots into `MenuScene`.
- Click on a menu item to start the corresponding scene.

## Scenes
- `Remilia_NonSpell1A_TShot1`: A simple radial pattern that aims bullets relative to the player.

## Adding More Scenes
1. Create your new scene file under `src/scenes/...` and give it a unique scene key in its constructor, e.g.:
   ```ts
   constructor() { super('My_New_Scene_Key'); }
   ```
2. Import and register the scene in `src/main.ts`:
   ```ts
   import MyScene from './scenes/.../MyScene';

   const config: Phaser.Types.Core.GameConfig = {
     // ...
     scene: [MenuScene, TShot1, MyScene]
   };
   ```
3. Add the scene to the list in `src/scenes/MenuScene.ts` so it appears in the menu:
   ```ts
   private scenes: SceneInfo[] = [
     { key: 'Remilia_NonSpell1A_TShot1', title: 'Remilia NonSpell1A - TShot1' },
     { key: 'My_New_Scene_Key', title: 'My New Scene' },
   ];
   ```

## Scripts
- `npm run dev`: Start Vite dev server.
- `npm run build`: Build for production.
- `npm run preview`: Preview production build.

## License
This repository is for personal/educational use. No license specified.
