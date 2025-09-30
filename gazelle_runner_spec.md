# Gazelle Runner - Gaze-Controlled Endless Runner Game

## Project Overview
An endless runner game similar to Chrome's T-Rex dinosaur game, but featuring a gazelle that's controlled by eye movements or finger gestures. Players navigate obstacles by looking up (jump), down (duck), left/right (dodge), with an optional finger tracking mode for accessibility.

## Game Concept

### Core Gameplay
- **Endless Runner**: Gazelle runs automatically through African savanna landscape
- **Obstacle Navigation**: Jump over rocks, duck under low branches, dodge left/right around trees
- **Increasing Difficulty**: Speed and obstacle frequency increase over time
- **Score System**: Distance traveled + style points for smooth movements
- **Power-ups**: Speed boost, invincibility, double points

### Visual Style
- **Setting**: African savanna with acacia trees, grasslands, and distant mountains
- **Art Style**: Clean, colorful 2D sprites with parallax scrolling background
- **Gazelle Animation**: Running, jumping, ducking, and dodging animations
- **Obstacles**: Rocks, fallen logs, low branches, thorn bushes, other animals

## Control Schemes

### Primary: Gaze Control
- **Look Up**: Gazelle jumps (hold gaze up for longer/higher jumps)
- **Look Down**: Gazelle ducks/slides under obstacles
- **Look Left**: Gazelle moves to left lane
- **Look Right**: Gazelle moves to right lane
- **Center Gaze**: Default running position

### Alternative: Finger Tracking
- **Finger Up**: Jump
- **Finger Down**: Duck  
- **Finger Left**: Move left
- **Finger Right**: Move right
- **Closed Fist**: Default running

## Technical Architecture

### System Components
```
Input System → Movement Detection → Game Logic → Rendering → Audio
     ↓               ↓                ↓           ↓         ↓
Gaze/Finger     Motion Analysis   Collision    PyGame    Sound FX
 Tracking        & Smoothing      Detection    Graphics   Manager
```

### Hardware Requirements
- **Camera**: Any USB webcam or laptop camera (720p minimum)
- **Compute**: Modern laptop/desktop (4GB RAM, integrated graphics sufficient)
- **Display**: Any resolution (game scales automatically)
- **OS**: Windows, macOS, or Linux

## Detailed Technical Specifications

### 1. Input Detection System

#### Gaze Control Module
```python
class GazeController:
    def __init__(self):
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        self.eye_tracker = EyeTracker()
        self.gaze_zones = {
            'up': (-15, 15, -45, -10),      # (left, right, bottom, top) degrees
            'down': (-15, 15, 10, 45),
            'left': (-45, -15, -10, 10),
            'right': (15, 45, -10, 10),
            'center': (-15, 15, -10, 10)
        }
    
    def get_gaze_direction(self, frame):
        """
        Returns: 'up', 'down', 'left', 'right', 'center', or None
        """
        results = self.face_mesh.process(frame)
        if not results.multi_face_landmarks:
            return None
            
        landmarks = results.multi_face_landmarks[0]
        gaze_vector = self.eye_tracker.estimate_gaze(landmarks)
        return self.classify_gaze_direction(gaze_vector)
```

#### Finger Tracking Module
```python
class FingerController:
    def __init__(self):
        self.hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        self.gesture_recognizer = HandGestureRecognizer()
    
    def get_hand_gesture(self, frame):
        """
        Returns: 'up', 'down', 'left', 'right', 'fist', or None
        """
        results = self.hands.process(frame)
        if not results.multi_hand_landmarks:
            return None
            
        landmarks = results.multi_hand_landmarks[0]
        return self.gesture_recognizer.classify_gesture(landmarks)
```

### 2. Game Engine (PyGame)
```python
class GazelleRunner:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((1200, 600))
        self.clock = pygame.time.Clock()
        self.game_state = GameState()
        self.gazelle = Gazelle()
        self.obstacle_manager = ObstacleManager()
        self.background = ScrollingBackground()
        self.input_controller = self.setup_input_controller()
        
    def setup_input_controller(self):
        """Let user choose gaze or finger control"""
        choice = self.show_control_selection_menu()
        if choice == "gaze":
            return GazeController()
        else:
            return FingerController()
    
    def game_loop(self):
        running = True
        while running:
            dt = self.clock.tick(60) / 1000.0  # 60 FPS
            
            # Input processing
            frame = self.capture_camera_frame()
            command = self.input_controller.get_command(frame)
            
            # Game logic
            self.gazelle.update(command, dt)
            self.obstacle_manager.update(dt)
            self.check_collisions()
            self.update_score()
            
            # Rendering
            self.render_frame()
            
            # Check game over
            if self.game_state.is_game_over:
                running = self.handle_game_over()
```

### 3. Gazelle Character System
```python
class Gazelle:
    def __init__(self):
        self.x = 200  # Fixed horizontal position (scrolling world)
        self.y = 400  # Ground level
        self.lane = 1  # 0=left, 1=center, 2=right
        self.state = "running"  # running, jumping, ducking, dodging
        self.velocity_y = 0
        self.animations = self.load_animations()
        self.jump_power = -300
        self.gravity = 800
        
    def update(self, command, dt):
        # Handle input commands
        if command == "up" and self.state in ["running", "dodging"]:
            self.jump()
        elif command == "down" and self.state in ["running", "jumping", "dodging"]:
            self.duck()
        elif command == "left":
            self.move_lane(-1)
        elif command == "right":
            self.move_lane(1)
        elif command == "center":
            self.return_to_running()
            
        # Physics update
        self.apply_physics(dt)
        self.update_animation(dt)
    
    def jump(self):
        self.state = "jumping"
        self.velocity_y = self.jump_power
        
    def duck(self):
        self.state = "ducking"
        
    def move_lane(self, direction):
        new_lane = max(0, min(2, self.lane + direction))
        if new_lane != self.lane:
            self.lane = new_lane
            self.state = "dodging"
```

### 4. Obstacle System
```python
class ObstacleManager:
    def __init__(self):
        self.obstacles = []
        self.obstacle_types = {
            'rock': {'height': 60, 'requires': 'jump', 'lanes': [0, 1, 2]},
            'branch': {'height': 40, 'requires': 'duck', 'lanes': [0, 1, 2]},
            'tree': {'height': 200, 'requires': 'dodge', 'lanes': [0, 2]},  # blocks center
            'bush': {'height': 80, 'requires': 'jump_or_dodge', 'lanes': [1]}
        }
        self.spawn_timer = 0
        self.spawn_interval = 2.0  # seconds
        
    def spawn_obstacle(self):
        obstacle_type = random.choice(list(self.obstacle_types.keys()))
        lanes = self.obstacle_types[obstacle_type]['lanes']
        lane = random.choice(lanes)
        
        obstacle = Obstacle(
            type=obstacle_type,
            x=1200,  # Start off-screen right
            lane=lane,
            speed=self.get_current_speed()
        )
        self.obstacles.append(obstacle)
    
    def update(self, dt):
        # Update existing obstacles
        for obstacle in self.obstacles[:]:
            obstacle.update(dt)
            if obstacle.x < -100:  # Remove off-screen obstacles
                self.obstacles.remove(obstacle)
        
        # Spawn new obstacles
        self.spawn_timer += dt
        if self.spawn_timer >= self.spawn_interval:
            self.spawn_obstacle()
            self.spawn_timer = 0
            self.spawn_interval = max(0.8, self.spawn_interval * 0.995)  # Increase difficulty
```

### 5. Calibration & Settings System
```python
class CalibrationSystem:
    def __init__(self):
        self.gaze_zones = {}
        self.sensitivity = 1.0
        self.smoothing = 0.3
        
    def run_calibration(self, input_controller):
        """
        Simple 4-point calibration for gaze control:
        1. Look up and hold - calibrate up zone
        2. Look down and hold - calibrate down zone  
        3. Look left and hold - calibrate left zone
        4. Look right and hold - calibrate right zone
        """
        calibration_points = [
            ("Look UP and hold for 3 seconds", "up"),
            ("Look DOWN and hold for 3 seconds", "down"), 
            ("Look LEFT and hold for 3 seconds", "left"),
            ("Look RIGHT and hold for 3 seconds", "right")
        ]
        
        for instruction, direction in calibration_points:
            self.show_calibration_instruction(instruction)
            samples = self.collect_gaze_samples(input_controller, duration=3.0)
            self.gaze_zones[direction] = self.calculate_zone_bounds(samples)
    
    def show_control_selection(self):
        """
        Menu to choose between gaze and finger control
        """
        screen = pygame.display.set_mode((800, 600))
        font = pygame.font.Font(None, 48)
        
        while True:
            screen.fill((100, 200, 100))  # Green background
            
            # Title
            title = font.render("Choose Control Method", True, (255, 255, 255))
            screen.blit(title, (200, 150))
            
            # Options
            gaze_text = font.render("1 - Eye Gaze Control", True, (255, 255, 255))
            finger_text = font.render("2 - Finger Tracking", True, (255, 255, 255))
            
            screen.blit(gaze_text, (200, 250))
            screen.blit(finger_text, (200, 320))
            
            for event in pygame.event.get():
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_1:
                        return "gaze"
                    elif event.key == pygame.K_2:
                        return "finger"
                elif event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
            
            pygame.display.flip()
```

## Game Assets & Art Requirements

### Gazelle Sprites
- **Running Animation**: 8 frames, 64x64 pixels each
- **Jumping Animation**: 6 frames showing leap arc
- **Ducking Animation**: 4 frames showing slide/duck
- **Dodging Animation**: 4 frames for left/right movement

### Background Elements
- **Ground Layer**: Scrolling savanna grass texture
- **Mid Layer**: Acacia trees, rocks, bushes (parallax scrolling)
- **Sky Layer**: Mountains, clouds, sun (slow parallax)
- **Particle Effects**: Dust clouds, grass particles

### Obstacles
- **Rocks**: Various sizes, 32x32 to 64x64 pixels
- **Branches**: Horizontal obstacles, 128x32 pixels
- **Trees**: Large vertical obstacles, 96x200 pixels
- **Bushes**: Medium obstacles, 80x60 pixels

### UI Elements
- **Score Display**: Clean, readable font
- **Game Over Screen**: Restart and settings options
- **Calibration UI**: Simple instruction overlays
- **Control Selection Menu**: Clear option buttons

## Implementation File Structure
```
gazelle_runner/
├── src/
│   ├── core/
│   │   ├── game.py                  # Main game loop and logic
│   │   ├── gazelle.py              # Gazelle character class
│   │   ├── obstacles.py            # Obstacle management
│   │   └── background.py           # Scrolling background
│   ├── input/
│   │   ├── gaze_controller.py      # Eye tracking input
│   │   ├── finger_controller.py    # Hand gesture input
│   │   ├── calibration.py          # Calibration system
│   │   └── input_manager.py        # Input abstraction layer
│   ├── graphics/
│   │   ├── renderer.py             # PyGame rendering
│   │   ├── animations.py           # Sprite animation system
│   │   └── effects.py              # Particle effects
│   ├── audio/
│   │   ├── sound_manager.py        # Audio system
│   │   └── music_player.py         # Background music
│   └── ui/
│       ├── menus.py                # Game menus
│       ├── hud.py                  # In-game UI
│       └── settings.py             # Settings screen
├── assets/
│   ├── sprites/
│   │   ├── gazelle/                # Gazelle animation frames
│   │   ├── obstacles/              # Obstacle sprites
│   │   └── background/             # Background elements
│   ├── audio/
│   │   ├── sfx/                    # Sound effects
│   │   └── music/                  # Background music
│   └── ui/
│       └── fonts/                  # Game fonts
├── config/
│   ├── game_settings.json          # Game configuration
│   ├── input_settings.json         # Input sensitivity settings
│   └── user_calibration.json       # User calibration data
├── tests/
│   ├── test_input.py               # Input system tests
│   ├── test_collision.py           # Collision detection tests
│   └── test_game_logic.py          # Game logic tests
├── requirements.txt                # Python dependencies
├── main.py                        # Game entry point
└── README.md                      # Setup instructions
```

## Dependencies
```txt
# Game engine
pygame==2.5.2

# Computer vision
opencv-python==4.8.1.78
mediapipe==0.10.8

# Deep learning (optional, for advanced gaze)
torch==2.1.0
numpy==1.24.3

# Utilities
scipy==1.11.1
matplotlib==3.7.2  # For calibration visualization
pillow==10.0.1

# Audio (optional)
pygame-mixer  # Usually included with pygame
```

## Game Mechanics

### Scoring System
- **Distance Points**: 1 point per meter traveled
- **Style Points**: Bonus for smooth movements and close calls
- **Combo System**: Chain successful obstacle avoidance for multipliers
- **Perfect Runs**: Bonus for extended periods without mistakes

### Difficulty Progression
- **Speed Increase**: Gradual acceleration over time
- **Obstacle Density**: More frequent obstacles as game progresses
- **Complex Patterns**: Multi-obstacle combinations at higher levels
- **Environmental Hazards**: Wind effects, weather changes

### Power-ups & Special Features
- **Speed Boost**: Temporary faster movement
- **Invincibility**: Brief period of obstacle immunity
- **Double Points**: Score multiplier for limited time
- **Slow Motion**: Temporary time dilation for precision

## Input Processing Pipeline

### Gaze Control Flow
```
Camera Frame → Face Detection → Eye Landmark Extraction → Gaze Vector Calculation → Zone Classification → Game Command
```

### Finger Control Flow  
```
Camera Frame → Hand Detection → Finger Landmark Extraction → Gesture Classification → Game Command
```

### Smoothing & Filtering
- **Temporal Smoothing**: Average inputs over 3-5 frames to reduce jitter
- **Confidence Thresholding**: Only process high-confidence detections
- **Dead Zone**: Small center zone where no action is triggered
- **Hysteresis**: Different thresholds for entering vs. exiting zones

## Setup Requirements for User

### Software Setup
1. **Install Python 3.8+** from python.org
2. **Install dependencies**: `pip install -r requirements.txt`
3. **Camera permissions**: Ensure camera access is allowed
4. **Run calibration**: First-time setup calibration process

### Hardware Setup
1. **Camera positioning**: 
   - Mount camera at eye level
   - 18-24 inches from face
   - Good lighting on face (avoid backlighting)
   - Minimal camera shake/vibration

2. **Optimal environment**:
   - Consistent lighting (avoid direct sunlight on face)
   - Stable seating position
   - Minimal background movement
   - Camera should clearly see both eyes

### Performance Optimization
- **Close unnecessary applications** to free up CPU/memory
- **Use wired camera connection** if possible (more stable than wireless)
- **Adjust camera settings**: Higher resolution better for accuracy, but may reduce FPS
- **Monitor performance**: Game shows FPS and input latency in debug mode

## Testing & Validation

### Input Accuracy Testing
```python
def test_input_accuracy():
    """
    Test gaze/finger detection accuracy:
    - Show target on screen
    - User looks at/points to target
    - Measure detection accuracy vs. ground truth
    - Calculate precision, recall, latency
    """

def test_game_responsiveness():
    """
    Test game response to inputs:
    - Measure input-to-action latency
    - Test input buffering and smoothing
    - Validate obstacle collision detection
    """
```

### User Experience Testing
- **Usability Testing**: Can new users play within 5 minutes?
- **Fatigue Testing**: Comfortable to play for 10+ minutes?
- **Accessibility Testing**: Works for users with different abilities?
- **Calibration Quality**: How quickly can users get good calibration?

## Success Criteria

### Technical Performance
- **Input Latency**: <100ms from eye movement to gazelle response
- **Frame Rate**: Stable 60 FPS on modern hardware
- **Accuracy**: >90% correct input detection after calibration
- **Stability**: No crashes during normal gameplay

### User Experience
- **Setup Time**: <5 minutes from download to playing
- **Learning Curve**: Players understand controls within 2 minutes
- **Engagement**: Average session length >5 minutes
- **Accessibility**: Usable by people with motor disabilities

### Game Quality
- **Smooth Animation**: Fluid gazelle movement and obstacle scrolling
- **Responsive Controls**: Immediate visual feedback for all inputs
- **Progressive Difficulty**: Challenging but not frustrating difficulty curve
- **Visual Polish**: Clean, appealing graphics and smooth animations

This specification provides a complete roadmap for building an engaging, accessible endless runner game controlled by eye movements or finger gestures. The modular design allows for easy testing and iteration of individual components.