# Gazelle Runner - Gaze Controlled Game

A pixelated endless runner game featuring a gazelle controlled by eye movements, inspired by Chrome's T-Rex game but with an African savanna theme.

## 🎮 How to Play

### Controls
- **Gaze Control** (after enabling camera): Look up/down/left/right to control the gazelle
- **Keyboard Alternative**: Arrow keys or WASD + Spacebar

### Actions
- **Look UP** or **Spacebar/↑**: Jump over rocks and low obstacles
- **Look DOWN** or **↓**: Duck under branches and high obstacles
- **Look LEFT** or **←**: Move to left lane
- **Look RIGHT** or **→**: Move to right lane

### Gameplay
- Avoid obstacles by jumping, ducking, or changing lanes
- Score increases based on distance traveled
- Game speed increases over time for added difficulty
- Try to beat your high score!

## 🚀 Getting Started

### Play Online (GitHub Pages)
Visit the live demo: [GitHub Pages Link]
- Pure browser-based game
- No installation required
- Works on any modern browser

### Run Locally
1. Clone this repository
2. Open `index.html` directly in your browser, OR
3. Start a local server: `python -m http.server 8000`
4. Visit: `http://localhost:8000`
5. Click "Enable Gaze Control" and allow camera access
6. Start playing!

## 🛠 Technical Features

### Gaze Tracking
- **MediaPipe Face Mesh** for real-time eye tracking
- **468 facial landmarks** for precise face detection
- **Advanced gaze calculation** with head pose compensation
- **Temporal smoothing** to reduce jitter and false inputs
- **Confidence filtering** for stable detection
- **Pure browser implementation** - no server required

### Game Engine
- Pure HTML5 Canvas and JavaScript
- 60 FPS game loop with smooth animations
- Pixelated art style with crisp edges
- Progressive difficulty scaling

### Visual Style
- **Chrome T-Rex inspired design** with clean, minimalist graphics
- **Simple pixelated style** with crisp edges
- **Smooth scrolling clouds** and ground textures
- **African savanna gazelle** character with antlers

## 🌍 Browser Compatibility

- Chrome 88+ (recommended for MediaPipe)
- Firefox 85+
- Safari 14+
- Edge 88+

**Note**: Camera access required for gaze control functionality

## 🔧 Development

Built with modern web technologies:
- **Vanilla JavaScript** - no frameworks needed
- **MediaPipe Face Mesh** for gaze tracking
- **HTML5 Canvas** with pixel-perfect rendering
- **WebRTC** for camera access
- **LocalStorage** for high score persistence

## 📁 File Structure

```
gazelle-runner/
├── index.html          # Main game page with UI
├── game.js            # Complete game engine and gaze tracking
├── README.md          # Documentation
├── LICENSE            # MIT License
└── CLAUDE.md          # Development notes
```

## 🎯 Game Objects

### Gazelle
- Smooth animations for running, jumping, and ducking
- Three-lane movement system
- Collision detection with obstacles
- Antler and eye details for character

### Obstacles
- **Rocks**: Jump over these ground obstacles
- **Trees**: Large acacia trees blocking lanes
- **Branches**: Duck under these hanging obstacles

### Background
- Multi-layer parallax scrolling
- Mountains, grass, and textured ground
- Dynamic particle effects

## 🏆 Future Enhancements

- [ ] Calibration system for improved gaze accuracy
- [ ] Power-ups and collectibles
- [ ] Sound effects and background music
- [ ] Mobile touch controls
- [ ] Multiplayer leaderboards

## 📱 Deployment

Ready for GitHub Pages deployment - just enable Pages in repository settings and point to the main branch.

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the game!

## 📄 License

This project is open source and available under the MIT License.