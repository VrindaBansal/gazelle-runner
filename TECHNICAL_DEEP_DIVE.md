# Gazelle Runner - Technical Deep Dive

A comprehensive technical analysis of the gaze-controlled endless runner game, covering computer vision algorithms, game engine architecture, and real-time interaction design.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Gaze Tracking Implementation](#gaze-tracking-implementation)
3. [Game Engine Design](#game-engine-design)
4. [Performance Optimization](#performance-optimization)
5. [User Experience Design](#user-experience-design)
6. [Technical Challenges & Solutions](#technical-challenges--solutions)

---

## System Architecture

### High-Level System Flow
```
Browser Camera → MediaPipe Face Mesh → Landmark Processing → Head Pose Calculation → Game Input → Canvas Rendering
     ↓              ↓                      ↓                     ↓                    ↓              ↓
WebRTC API     JavaScript API        Computer Vision      Game Logic        Game State    60 FPS Rendering
```

### Core Components

#### 1. **Modular Architecture**
- **SimpleHeadTracker**: Handles all computer vision and gaze detection
- **GazelleRunner**: Main game controller managing state transitions
- **Gazelle**: Player entity with physics simulation
- **Obstacle**: Dynamic obstacle system with procedural generation
- **ScrollingBackground**: Multi-layer parallax rendering system
- **InputManager**: Unified input handling (keyboard + gaze)

#### 2. **Data Flow Design**
```javascript
Camera Frame → Face Detection → Landmark Extraction → Head Pose → Game Input → Physics Update → Rendering
```

---

## Gaze Tracking Implementation

### MediaPipe Face Mesh Integration

#### **Facial Landmark Detection**
```javascript
this.faceMesh = new FaceMesh({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
    }
});

this.faceMesh.setOptions({
    maxNumFaces: 1,              // Single face optimization
    refineLandmarks: true,        // High precision mode
    minDetectionConfidence: 0.8,  // Strict detection threshold
    minTrackingConfidence: 0.7    // Temporal consistency
});
```

#### **Key Landmarks Used**
- **Nose Tip (Index 1)**: Primary reference point
- **Chin (Index 175)**: Vertical head orientation
- **Eyes (Index 33, 362)**: Horizontal reference plane
- **Forehead (Index 10)**: Face height calculation

### Head Pose Calculation Algorithm

#### **Multi-Method Approach**
The system combines multiple geometric calculations for robust head pose estimation:

```javascript
// Method 1: Eye-to-Nose Vertical Relationship
const eyeLevel = (leftEye.y + rightEye.y) / 2;
const faceHeight = Math.abs(chin.y - forehead.y);
const eyeToNoseRatio = (eyeLevel - noseTip.y) / faceHeight;

// Method 2: Nose-Chin Angular Relationship
const noseToChain = {
    x: chin.x - noseTip.x,
    y: chin.y - noseTip.y
};
const noseChinAngle = Math.atan2(noseToChain.y, noseToChain.x) * 180 / Math.PI - 90;

// Weighted Combination
const eyeBasedPitch = eyeToNoseRatio * 60; // Amplified sensitivity
const angleBasedPitch = noseChinAngle;
let pitch = (eyeBasedPitch * 0.7 + angleBasedPitch * 0.3); // Eye-based weighted higher
```

#### **Coordinate System Convention**
- **Negative Pitch**: Head tilted up (chin up, nose up)
- **Positive Pitch**: Head tilted down (chin down, nose down)
- **Zero Pitch**: Neutral head position (calibrated baseline)

### Calibration System

#### **Automatic Neutral Position Detection**
```javascript
startCalibration() {
    this.calibrationSamples = [];
    // Collect 60 frames (2 seconds at 30fps) of neutral position
}

finishCalibration() {
    // Calculate average neutral position
    const avgPitch = this.calibrationSamples.reduce((sum, sample) =>
        sum + sample.pitch, 0) / this.calibrationSamples.length;

    this.neutralPosition = { pitch: avgPitch };

    // Set adaptive thresholds relative to neutral
    this.upThreshold = avgPitch - 5;    // 5° up from neutral
    this.downThreshold = avgPitch + 5;  // 5° down from neutral
}
```

#### **Adaptive Threshold Calculation**
- **Personalized Calibration**: Adapts to individual head position preferences
- **Environmental Adaptation**: Accounts for camera angle and user setup
- **Threshold Sensitivity**: ±5° from neutral for responsive but stable control

### Temporal Smoothing & Filtering

#### **Pose History Smoothing**
```javascript
updateHeadPose(newPose, headData) {
    // Maintain sliding window of recent poses
    this.poseHistory.push(newPose);
    if (this.poseHistory.length > this.maxHistoryLength) {
        this.poseHistory.shift();
    }

    // Apply weighted temporal smoothing
    const smoothedPose = this.getSmoothedPose();
    this.currentHeadPose = smoothedPose;
}

getSmoothedPose() {
    // Weighted voting with recency bias
    const counts = {};
    this.poseHistory.forEach((pose, index) => {
        const weight = index === this.poseHistory.length - 1 ? 2 : 1;
        counts[pose] = (counts[pose] || 0) + weight;
    });

    // Return most confident pose with minimum threshold
    const sortedPoses = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topPose = sortedPoses[0];

    return (topPose[0] !== 'neutral' && topPose[1] >= this.minConfidenceFrames)
        ? topPose[0] : 'neutral';
}
```

#### **Confidence-Based Filtering**
- **Minimum Confidence Frames**: Requires 2+ consistent frames before action
- **Temporal Consistency**: Prevents single-frame noise from triggering actions
- **Graceful Degradation**: Falls back to neutral when confidence is low

---

## Game Engine Design

### Core Game Loop Architecture

#### **60 FPS Game Loop**
```javascript
update(deltaTime) {
    // 1. Input Processing
    const input = this.inputManager.getInput() ||
                 (window.simpleHeadTracker && window.simpleHeadTracker.getCurrentInput()) ||
                 this.gazeTracker.getCurrentGaze();

    // 2. Game State Update
    if (this.gameState === 'playing') {
        this.updateGameplay(input, deltaTime);
    }

    // 3. Physics Simulation
    this.gazelle.update(input, deltaTime);
    this.updateObstacles(deltaTime);
    this.background.update(deltaTime);

    // 4. Collision Detection
    this.checkCollisions();

    // 5. Rendering
    this.render();
}
```

### Physics System

#### **Gazelle Physics Model**
```javascript
// Gravity-based jumping physics
update(input, deltaTime) {
    if (this.onGround && input.up && this.state !== 'ducking') {
        this.velocityY = -this.jumpPower; // Negative = upward
        this.onGround = false;
        this.state = 'jumping';
    }

    // Apply gravity
    if (!this.onGround) {
        this.velocityY += this.gravity * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Ground collision
        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.onGround = true;
            this.velocityY = 0;
            this.state = 'running';
        }
    }

    // Ducking state management
    if (input.down) {
        this.duck();
    } else if (this.state === 'ducking' && this.onGround) {
        this.state = 'running';
    }
}
```

#### **Collision Detection System**
```javascript
// Precise bounding box collision with state-aware hitboxes
getCollisionBounds() {
    let bounds = {
        x: this.x - this.width / 2,
        y: this.y - this.height,
        width: this.width,
        height: this.height
    };

    // Adjust hitbox based on state
    if (this.state === 'ducking') {
        bounds.height *= 0.5;  // Reduced height when ducking
        bounds.y += bounds.height;
    }

    return bounds;
}
```

### Procedural Content Generation

#### **Dynamic Obstacle Spawning**
```javascript
spawnObstacle() {
    const types = ['rock', 'tree', 'branch'];
    const lanes = [0, 1, 2]; // Three-lane system

    // Difficulty-based spawn rate
    const spawnChance = Math.min(0.7, 0.3 + this.score * 0.0001);

    if (Math.random() < spawnChance) {
        const type = types[Math.floor(Math.random() * types.length)];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];

        // Type-specific collision boxes
        const collisionData = {
            rock: { width: 40, height: 25, requiresJump: true },
            tree: { width: 60, height: 120, blocksLane: true },
            branch: { width: 80, height: 20, requiresDuck: true }
        };

        this.obstacles.push(new Obstacle(
            800, // Spawn off-screen right
            this.groundY - collisionData[type].height,
            type,
            collisionData[type]
        ));
    }
}
```

#### **Progressive Difficulty Scaling**
```javascript
// Speed increases with score
const speedMultiplier = 1 + Math.floor(this.score / 1000) * 0.1;
this.gameSpeed = this.baseSpeed * speedMultiplier;

// More frequent obstacles
const difficultyFactor = Math.min(2.0, 1.0 + this.score / 5000);
this.obstacleSpawnRate *= difficultyFactor;
```

### Rendering Pipeline

#### **Multi-Layer Parallax System**
```javascript
update(deltaTime) {
    // Layer-specific scroll speeds for depth perception
    this.cloudOffset -= this.speed * 0.3 * deltaTime;      // Slow background
    this.mountainOffset -= this.speed * 0.6 * deltaTime;   // Mid background
    this.groundOffset -= this.speed * deltaTime;           // Foreground

    // Seamless texture wrapping
    if (this.groundOffset <= -this.groundTextureWidth) {
        this.groundOffset = 0;
    }
}

render(ctx) {
    // 1. Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#F0E68C');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 300);

    // 2. Parallax layers (back to front)
    this.renderClouds(ctx);
    this.renderMountains(ctx);
    this.renderGround(ctx);
}
```

#### **High-DPI Canvas Optimization**
```javascript
// Automatic pixel ratio scaling for crisp rendering
const dpr = window.devicePixelRatio || 1;
canvas.width = 800 * dpr;
canvas.height = 400 * dpr;
canvas.style.width = '800px';
canvas.style.height = '400px';
ctx.scale(dpr, dpr);

// Pixel-perfect rendering
ctx.imageSmoothingEnabled = false;
canvas.style.imageRendering = 'pixelated';
```

---

## Performance Optimization

### Computational Efficiency

#### **Frame Rate Management**
```javascript
// MediaPipe processing throttling
this.processEveryNFrames = 3; // Process every 3rd frame
this.frameCounter++;
if (this.frameCounter % this.processEveryNFrames !== 0) {
    return; // Skip heavy face detection on some frames
}
```

#### **Memory Management**
```javascript
// Tensor cleanup in ML pipeline
const imageTensor = tf.tidy(() => {
    return tf.browser.fromPixels(canvas)
        .expandDims(0)
        .div(255.0)
        .cast('float32');
});

// Explicit disposal after use
predictions.dispose();
imageTensor.dispose();
```

#### **Object Pool Pattern**
```javascript
// Obstacle recycling to prevent garbage collection spikes
updateObstacles(deltaTime) {
    this.obstacles = this.obstacles.filter(obstacle => {
        obstacle.update(deltaTime);

        if (obstacle.x < -100) {
            // Recycle off-screen obstacles
            this.obstaclePool.push(obstacle);
            return false;
        }
        return true;
    });
}
```

### Browser Optimization

#### **WebGL Acceleration**
```javascript
// Enable hardware acceleration for MediaPipe
this.faceMesh.setOptions({
    selfieMode: false,
    enableWebGL: true,  // GPU acceleration
    maxNumFaces: 1      // Single face for performance
});
```

#### **Canvas Performance**
```javascript
// Batch rendering operations
ctx.save();
// Multiple draw operations without state changes
ctx.restore();

// Use integer pixel coordinates
ctx.translate(Math.floor(x), Math.floor(y));
```

---

## User Experience Design

### Accessibility Considerations

#### **Multi-Modal Input**
```javascript
// Fallback input hierarchy
const input = this.inputManager.getInput() ||                    // Keyboard first
             (window.simpleHeadTracker &&
              window.simpleHeadTracker.getCurrentInput()) ||      // Gaze second
             this.gazeTracker.getCurrentGaze();                   // Legacy fallback
```

#### **Visual Feedback Systems**
```javascript
// Real-time gaze indicator with clear state visualization
updateUI(headData) {
    // Color-coded confidence display
    const confidence = (this.confidence * 100).toFixed(0);
    document.getElementById('gazeStatus').textContent =
        `Head: ${this.currentHeadPose} (${confidence}%)`;

    // Large, clear direction indicator
    let displayText = 'NEUTRAL';
    if (this.currentHeadPose === 'up') {
        displayText = 'TILT UP';
        this.gazeIndicator.classList.add('up');
    } else if (this.currentHeadPose === 'down') {
        displayText = 'TILT DOWN';
        this.gazeIndicator.classList.add('down');
    }

    this.gazeIndicator.textContent = displayText;
}
```

### Calibration User Experience

#### **Progressive Disclosure**
1. **Simple Start**: One-click calibration initiation
2. **Clear Instructions**: "Keep head neutral" with visual countdown
3. **Progress Feedback**: Real-time progress percentage
4. **Success Confirmation**: Clear "Calibrated!" state

#### **Error Recovery**
```javascript
// Automatic fallback to default calibration
finishCalibration() {
    if (this.calibrationSamples.length > 10) {
        // Use collected samples
        this.setupPersonalizedThresholds();
    } else {
        // Fallback to defaults
        console.log('Calibration failed - using default values.');
        this.setDefaultCalibration();
    }
}
```

---

## Technical Challenges & Solutions

### Challenge 1: Input Mapping Inversion

#### **Problem**
Initial implementation had inverted head movement mapping - tilting head up made character duck instead of jump.

#### **Root Cause Analysis**
```javascript
// Original problematic logic
if (pitch < this.upThreshold) {
    return 'up';   // When user tilts UP, game receives 'up'
}
// But game logic: input.up = jump, input.down = duck
// User expectation: Tilt UP = character ducks under obstacles
```

#### **Solution**
```javascript
// Corrected mapping based on user mental model
if (pitch < this.upThreshold) {
    console.log(`PHYSICAL TILT UP DETECTED: returning 'down' for DUCK`);
    return 'down';   // Physical tilt up → return 'down' → input.down=true → DUCK
} else if (pitch > this.downThreshold) {
    console.log(`PHYSICAL TILT DOWN DETECTED: returning 'up' for JUMP`);
    return 'up';     // Physical tilt down → return 'up' → input.up=true → JUMP
}
```

#### **Design Principle**
User mental model: "I tilt my head UP to duck under branches, DOWN to jump over rocks" - matches intuitive physical movements.

### Challenge 2: MediaPipe Coordinate System

#### **Problem**
MediaPipe facial landmarks use normalized coordinates (0-1) with origin at top-left, requiring careful mathematical transformation.

#### **Solution**
```javascript
// Robust multi-point calculation accounting for face size and orientation
const eyeLevel = (leftEye.y + rightEye.y) / 2;
const faceHeight = Math.abs(chin.y - forehead.y);
const eyeToNoseRatio = (eyeLevel - noseTip.y) / faceHeight;

// Scale to meaningful degrees
const eyeBasedPitch = eyeToNoseRatio * 60;
```

### Challenge 3: Real-Time Performance

#### **Problem**
Face detection is computationally expensive and can cause frame drops.

#### **Solutions**
1. **Frame Skipping**: Process every 3rd frame for face detection
2. **Asynchronous Processing**: Non-blocking MediaPipe pipeline
3. **Tensor Memory Management**: Explicit disposal of GPU resources
4. **Reduced Input Size**: 128x128 input for ML models vs full resolution

### Challenge 4: Temporal Stability

#### **Problem**
Single-frame noise in face detection causing jittery game controls.

#### **Solution**
```javascript
// Multi-frame consensus with confidence thresholding
getSmoothedPose() {
    const counts = {};
    this.poseHistory.forEach((pose, index) => {
        // Recent poses weighted higher
        const weight = index === this.poseHistory.length - 1 ? 2 : 1;
        counts[pose] = (counts[pose] || 0) + weight;
    });

    // Require minimum confidence before action
    if (topPose[1] >= this.minConfidenceFrames) {
        return topPose[0];
    }
    return 'neutral';
}
```

---

## Implementation Lessons

### 1. **User Mental Models Over Technical Logic**
The most critical insight was prioritizing user expectations over technical coordinate systems. Users expect intuitive head movements that match physical actions.

### 2. **Graceful Degradation**
Multiple input methods (keyboard + gaze) with clear fallback hierarchy ensures accessibility across different user capabilities and hardware.

### 3. **Real-Time Feedback Loops**
Immediate visual feedback for calibration and gaze detection builds user confidence and enables rapid problem diagnosis.

### 4. **Performance vs Accuracy Trade-offs**
Strategic frame skipping and reduced precision in non-critical areas maintains 60 FPS while preserving gameplay responsiveness.

### 5. **Modular Architecture Benefits**
Clean separation between computer vision, game logic, and rendering enables independent optimization and debugging of each system.

---

## Future Technical Enhancements

1. **WebAssembly Optimization**: Compile face detection pipeline to WASM for performance
2. **Machine Learning Personalization**: Adaptive thresholds based on user behavior patterns
3. **Edge Computing**: Offload heavy computation to service workers
4. **WebXR Integration**: Enhanced head tracking via WebXR device APIs
5. **Progressive Web App**: Offline capability and native-like installation

---

This technical deep dive demonstrates the intersection of computer vision, real-time systems, game engine architecture, and user experience design in creating an accessible, responsive gaze-controlled game experience.