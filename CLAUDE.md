# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a working implementation of **Gazelle Runner** - a gaze-controlled endless runner game featuring a llama that's controlled by head movements or keyboard input. The game is implemented as a browser-based HTML5 Canvas application with real-time head tracking using MediaPipe.

## Repository Status

This repository contains a **fully functional implementation** of the Gazelle Runner game along with technical specifications for future enhancements. Key files include:

### Implemented Game Files:
- `index.html` - Main game interface with UI controls and MediaPipe integration
- `game.js` - Complete game engine with classes for Gazelle, Obstacles, Background, Particles, and Input management
- `simple_head_tracker.js` - Head tracking implementation using MediaPipe Face Mesh
- `advanced_tracker.js` - Advanced tracking features (supplementary)

### Assets:
- `llama/` - Directory containing llama sprite sheets and animations
- `*.png` files - Game sprites (llama, duck, tree, etc.)
- `shape_predictor_68_face_landmarks.dat` - Facial landmark detection model

### Specifications (Reference):
- `README.md` - User-facing documentation and game instructions
- `gazelle_runner_spec.md` - Technical specification for game features
- `gaze_interface_spec.md` - Specification for gaze control interface

## Technical Architecture

The implemented game follows this architecture:

```
Browser → MediaPipe Face Mesh → Head Pose Calculation → Game Input → HTML5 Canvas Rendering
    ↓            ↓                      ↓                    ↓              ↓
WebRTC API   JavaScript API        Math/Geometry      Game Classes    Canvas 2D API
```

### Core Components:
- **GazelleRunner**: Main game controller class managing game state, scoring, and main loop
- **Gazelle**: Player character with physics, animations, and collision detection
- **Obstacle**: Procedurally spawned obstacles (rocks, trees, branches) with varied collision boxes
- **ScrollingBackground**: Parallax scrolling system with ground textures and clouds
- **ParticleSystem**: Dust particles for visual effects
- **InputManager**: Keyboard input handling with WASD/Arrow key support
- **GazeTracker**: Head pose estimation and movement detection using MediaPipe

### Key Features:
- **Head Tracking**: Uses MediaPipe Face Mesh for real-time head pose detection
- **Fallback Controls**: Keyboard support (Spacebar/↑ for jump, ↓ for duck)
- **Progressive Difficulty**: Speed and obstacle frequency increase over time
- **Visual Polish**: Smooth animations, shadows, gradients, and particle effects
- **High Score Persistence**: LocalStorage for score tracking across sessions

## Development Commands

This is a browser-based JavaScript application. Development workflow:

### Running the Game:
- **Local Development**: `python -m http.server 8000` or similar local server
- **Direct Browser**: Open `index.html` directly (limited camera access)
- **Production**: Deploy to any static web host or GitHub Pages

### No Build Process Required:
- Pure HTML5/JavaScript/CSS - no compilation needed
- External dependencies loaded via CDN (MediaPipe)
- Assets served directly from file system

### Testing:
- **Manual Testing**: Open in browser, test head tracking and keyboard controls
- **Camera Testing**: Ensure proper camera permissions and MediaPipe initialization
- **Performance Testing**: Monitor frame rate and input latency in browser dev tools

## Code Architecture

### Main Game Classes (game.js):

1. **GazelleRunner** - Core game engine
   - Manages game states (menu, playing, gameOver)
   - Handles scoring and difficulty progression
   - Coordinates all game systems

2. **Gazelle** - Player character
   - Physics simulation (gravity, jumping, ducking)
   - Sprite animation system
   - Collision boundary calculation

3. **Obstacle** - Dynamic obstacles
   - Procedural spawning system
   - Type-specific collision boxes
   - Enhanced visual rendering with gradients/shadows

4. **ScrollingBackground** - Environment
   - Multi-layer parallax scrolling
   - Dynamic cloud generation
   - Ground texture patterns

5. **GazeTracker** - Head tracking
   - MediaPipe Face Mesh integration
   - Head pose calculation using facial landmarks
   - Smoothing and filtering for stable input

### Input System:
- **Keyboard**: Space/↑ (jump), ↓ (duck), WASD/Arrow keys
- **Head Tracking**: Tilt up (jump), tilt down (duck)
- **Input Priority**: Keyboard OR head tracking (not combined)

### Rendering Pipeline:
- **60 FPS Game Loop**: requestAnimationFrame for smooth rendering
- **High DPI Support**: Automatic pixel ratio scaling
- **Canvas 2D Rendering**: Optimized drawing with shadows and gradients

## Implementation Notes

When working on this codebase:

1. **Camera Permissions**: Head tracking requires camera access - test locally with HTTPS or local server
2. **MediaPipe Dependencies**: Loaded via CDN - ensure internet connection for head tracking features
3. **Sprite Management**: Sprite loading is asynchronous - fallback shapes render while loading
4. **Performance**: Game targets 60 FPS - profile performance if adding features
5. **Cross-browser**: Tested on modern browsers (Chrome, Firefox, Safari, Edge)

### Common Development Tasks:
- **Adding Obstacles**: Extend `Obstacle` class with new types in `spawnObstacle()`
- **Tuning Difficulty**: Modify speed progression in `update()` method
- **Improving Tracking**: Adjust thresholds in `calculateHeadPose()`
- **Visual Enhancements**: Add effects in `ParticleSystem` or sprite rendering
- **UI Changes**: Modify HTML/CSS in `index.html`

### File Organization:
```
├── index.html              # Game UI and MediaPipe integration
├── game.js                # Core game engine and classes
├── simple_head_tracker.js # Head tracking implementation
├── advanced_tracker.js    # Extended tracking features
├── llama/                 # Sprite assets and animation data
├── *.png                  # Individual game sprites
└── *.md                   # Documentation and specifications
```