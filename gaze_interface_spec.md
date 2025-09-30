# Gaze-Controlled Interface - Complete Technical Specification

## Project Overview
Build a real-time gaze tracking system that allows users to control their computer interface using only eye movements. The system will detect where the user is looking on the screen and provide various interaction methods including cursor control, clicking, and virtual keyboard typing.

## Core Requirements

### Functional Requirements
1. **Real-time gaze tracking** with <100ms latency
2. **Screen coordinate mapping** - translate gaze to screen coordinates
3. **Calibration system** - personalized calibration for accuracy
4. **Multiple interaction modes**:
   - Cursor control (mouse movement)
   - Click detection (dwell time or blink)
   - Virtual keyboard with gaze typing
   - Smooth pursuit for menu navigation
5. **Accessibility features** for users with motor disabilities
6. **Robust performance** across different lighting conditions
7. **User adaptation** - system improves with usage

### Performance Requirements
- **Accuracy**: <2 degrees of visual angle error
- **Precision**: <1 degree standard deviation
- **Latency**: <100ms from eye movement to screen response  
- **Frame Rate**: 30+ FPS for smooth tracking
- **Calibration Time**: <2 minutes for new users
- **CPU Usage**: <50% on modern laptops
- **Memory Usage**: <2GB RAM

## Technical Architecture

### System Components
```
Camera Feed → Eye Detection → Gaze Estimation → Screen Mapping → UI Control
     ↓              ↓              ↓              ↓              ↓
  OpenCV        MediaPipe      PyTorch CNN    Calibration    Action Engine
```

### Hardware Requirements
- **Camera**: USB webcam or laptop camera (720p minimum, 1080p preferred)
- **Compute**: CPU with 4+ cores, 8GB RAM (GPU optional but recommended)
- **Display**: Any standard monitor (calibration adapts to resolution)
- **OS**: Windows/macOS/Linux compatibility

## Detailed Technical Specifications

### 1. Eye Detection Module (OpenCV + MediaPipe)
```python
# Primary: MediaPipe Face Mesh for robust eye detection
# Backup: OpenCV Haar cascades + dlib

class EyeDetector:
    def __init__(self):
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
    def detect_eyes(self, frame):
        """
        Returns: {
            'left_eye': landmarks,
            'right_eye': landmarks, 
            'eye_region': bounding_box,
            'pupil_center': (x, y),
            'confidence': float
        }
        """
```

**Key Features:**
- 468 face landmarks with eye-specific points
- Pupil center detection using contour analysis
- Eye aspect ratio for blink detection
- Head pose estimation for compensation
- Robust tracking across head movements

### 2. Gaze Estimation Model (PyTorch)
```python
class GazeEstimationCNN(nn.Module):
    def __init__(self):
        super().__init__()
        # Input: Eye region image (64x64) + head pose (3 values)
        self.eye_cnn = nn.Sequential(
            nn.Conv2d(3, 32, 7, padding=3),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 5, padding=2),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d(4)
        )
        
        self.head_fc = nn.Linear(3, 32)
        
        self.fusion_fc = nn.Sequential(
            nn.Linear(128 * 4 * 4 + 32, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 2)  # (gaze_x, gaze_y) in degrees
        )
    
    def forward(self, eye_image, head_pose):
        eye_features = self.eye_cnn(eye_image).flatten(1)
        head_features = self.head_fc(head_pose)
        combined = torch.cat([eye_features, head_features], dim=1)
        return self.fusion_fc(combined)
```

### 3. Intention Prediction Module (RNN)
```python
class IntentionPredictor(nn.Module):
    def __init__(self, sequence_length=30):
        super().__init__()
        # Input: sequence of gaze points + eye states
        self.lstm = nn.LSTM(
            input_size=5,  # gaze_x, gaze_y, pupil_size, blink_state, fixation_duration
            hidden_size=64,
            num_layers=2,
            dropout=0.2,
            batch_first=True
        )
        
        self.classifier = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 4)  # click, dwell, saccade, fixation
        )
    
    def forward(self, gaze_sequence):
        lstm_out, _ = self.lstm(gaze_sequence)
        return self.classifier(lstm_out[:, -1, :])  # Use last timestep
```

### 4. Calibration System
```python
class CalibrationManager:
    def __init__(self):
        self.calibration_points = [
            (0.1, 0.1), (0.5, 0.1), (0.9, 0.1),  # Top row
            (0.1, 0.5), (0.5, 0.5), (0.9, 0.5),  # Middle row
            (0.1, 0.9), (0.5, 0.9), (0.9, 0.9)   # Bottom row
        ]
        self.polynomial_degree = 2
        
    def collect_calibration_data(self):
        """
        Show calibration points, collect gaze data
        Returns: mapping function from raw gaze to screen coordinates
        """
        
    def adaptive_recalibration(self, user_corrections):
        """
        Continuously improve calibration based on user corrections
        """
```

**Calibration Process:**
1. Display 9-point calibration grid
2. User fixates on each point for 2 seconds
3. Collect raw gaze estimates during fixation
4. Fit polynomial transformation (gaze → screen coordinates)
5. Validate with additional test points
6. Store user-specific calibration profile

### 5. Screen Mapping & UI Control
```python
class GazeInterface:
    def __init__(self):
        self.cursor_smoothing = KalmanFilter()  # Smooth cursor movement
        self.dwell_timer = DwellClickDetector()
        self.virtual_keyboard = VirtualKeyboard()
        
    def update_cursor(self, gaze_point):
        """Smooth cursor movement with prediction"""
        
    def detect_click_intention(self, gaze_history):
        """Use dwell time or blink detection for clicking"""
        
    def handle_keyboard_input(self, gaze_point):
        """Virtual keyboard with word prediction"""
```

## Data Requirements

### 1. Training Datasets (Free Sources)

#### MPIIGaze Dataset
- **Size**: 213,659 images from 15 participants
- **Labels**: Gaze direction in 3D coordinates
- **Features**: Multiple head poses, lighting conditions
- **Download**: https://www.mpi-inf.mpg.de/departments/computer-vision-and-machine-learning/research/gaze-based-human-computer-interaction/appearance-based-gaze-estimation-in-the-wild/

#### GazeCapture Dataset  
- **Size**: 2.5M frames from 1,450+ people
- **Labels**: Screen coordinates, device info
- **Features**: Mobile devices, diverse demographics
- **Download**: http://gazecapture.csail.mit.edu/

#### EyeDiap Dataset
- **Size**: 94 sessions, 16 participants
- **Labels**: 3D gaze, head pose, eye centers
- **Features**: Multiple cameras, controlled environment
- **Download**: https://www.idiap.ch/dataset/eyediap

### 2. Custom Data Collection
```python
# Data collection script for personalized training
class DataCollector:
    def collect_user_data(self, duration_minutes=10):
        """
        Collect personalized gaze data:
        - Random dot following task
        - Text reading patterns  
        - Natural browsing behavior
        - Different lighting conditions
        """
```

### 3. Data Augmentation Strategy
- **Synthetic eye generation** using GANs
- **Lighting variations** (brightness, contrast, shadows)
- **Head pose augmentation** (rotation, translation)
- **Eye appearance changes** (pupil size, eyelid position)
- **Camera distortion simulation**

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
```python
# Week 1: Basic eye detection
- Set up OpenCV + MediaPipe pipeline
- Implement real-time face and eye detection
- Extract eye regions and basic landmarks
- Create video capture and display system

# Week 2: Pupil tracking
- Implement pupil center detection algorithms
- Add head pose estimation
- Create basic gaze vector calculation
- Test with simple screen coordinate mapping
```

### Phase 2: Machine Learning Pipeline (Weeks 3-4)
```python
# Week 3: Data preparation
- Download and preprocess MPIIGaze dataset
- Implement data loaders and augmentation
- Create training/validation splits
- Set up experiment tracking (wandb/tensorboard)

# Week 4: Model training
- Implement and train gaze estimation CNN
- Add head pose compensation
- Validate model performance on test set
- Optimize for real-time inference
```

### Phase 3: Calibration System (Weeks 5-6)
```python
# Week 5: Calibration implementation
- Create calibration UI with target points
- Implement polynomial mapping functions
- Add calibration validation and scoring
- Store/load user calibration profiles

# Week 6: Advanced calibration
- Implement adaptive recalibration
- Add calibration quality assessment
- Handle calibration edge cases
- Optimize calibration point selection
```

### Phase 4: Intention Detection (Weeks 7-8)
```python
# Week 7: Click detection
- Implement dwell-time clicking
- Add blink detection for clicking
- Create smooth pursuit detection
- Test different interaction paradigms

# Week 8: RNN for intention prediction
- Collect temporal gaze sequence data
- Implement and train intention prediction RNN
- Integrate with real-time system
- Optimize for low-latency inference
```

### Phase 5: Interface Applications (Weeks 9-10)
```python
# Week 9: Basic UI control
- Implement smooth cursor control
- Add click and drag functionality
- Create gaze-controlled scrolling
- Test with standard applications

# Week 10: Virtual keyboard
- Design gaze-friendly keyboard layout
- Implement word prediction and autocomplete
- Add typing accuracy improvements
- Create custom text input methods
```

### Phase 6: Polish & Optimization (Weeks 11-12)
```python
# Week 11: Performance optimization
- Optimize models for CPU/GPU inference
- Implement multi-threading for real-time performance
- Add error handling and recovery
- Test system stability and robustness

# Week 12: User experience
- Create setup wizard and tutorials
- Add accessibility features
- Implement user feedback collection
- Create demonstration applications
```

## File Structure
```
gaze_interface/
├── src/
│   ├── core/
│   │   ├── eye_detector.py          # OpenCV + MediaPipe eye detection
│   │   ├── gaze_estimator.py        # PyTorch CNN model
│   │   ├── intention_predictor.py   # RNN for intention detection
│   │   └── calibration.py           # Calibration system
│   ├── interface/
│   │   ├── cursor_controller.py     # Mouse control
│   │   ├── virtual_keyboard.py      # Gaze typing
│   │   └── ui_manager.py           # Main interface
│   ├── data/
│   │   ├── dataset_loader.py        # Data loading utilities
│   │   ├── preprocessor.py          # Image preprocessing
│   │   └── augmentation.py          # Data augmentation
│   └── utils/
│       ├── camera.py                # Camera interface
│       ├── geometry.py              # Coordinate transformations
│       └── filters.py               # Kalman filter, smoothing
├── models/
│   ├── gaze_cnn.pth                # Trained gaze estimation model
│   ├── intention_rnn.pth            # Trained intention prediction model
│   └── calibration_profiles/        # User calibration data
├── data/
│   ├── raw/                         # Downloaded datasets
│   ├── processed/                   # Preprocessed training data
│   └── user_data/                   # Custom collected data
├── config/
│   ├── model_config.yaml            # Model hyperparameters
│   ├── system_config.yaml           # System settings
│   └── calibration_config.yaml      # Calibration parameters
├── scripts/
│   ├── download_datasets.py         # Automated dataset download
│   ├── train_gaze_model.py          # Model training script
│   ├── calibrate_user.py            # Calibration script
│   └── demo.py                      # Demo applications
├── tests/
│   ├── test_eye_detection.py        # Unit tests
│   ├── test_gaze_estimation.py
│   └── test_calibration.py
├── requirements.txt                 # Dependencies
├── setup.py                        # Package setup
└── README.md                       # Project documentation
```

## Dependencies
```txt
# Core computer vision
opencv-python==4.8.1.78
mediapipe==0.10.8

# Deep learning
torch==2.1.0
torchvision==0.16.0
numpy==1.24.3

# UI and system control
pyautogui==0.9.54
pynput==1.7.6
tkinter  # Usually comes with Python

# Data processing
pandas==2.0.3
scikit-learn==1.3.0
scipy==1.11.1

# Visualization and monitoring
matplotlib==3.7.2
opencv-contrib-python==4.8.1.78
wandb==0.15.8  # For experiment tracking

# Utilities
pyyaml==6.0.1
tqdm==4.65.0
argparse
```

## Key Algorithms & Techniques

### 1. Pupil Detection
```python
def detect_pupil_center(eye_region):
    """
    Multiple methods for robustness:
    1. Contour-based detection
    2. Hough circle detection  
    3. Gradient-based center finding
    4. Deep learning pupil segmentation
    """
```

### 2. Gaze Vector Calculation
```python
def calculate_gaze_vector(pupil_center, eye_corners, head_pose):
    """
    Convert 2D pupil position to 3D gaze direction:
    1. Eye coordinate system establishment
    2. Pupil displacement from eye center
    3. 3D gaze vector computation
    4. Head pose compensation
    """
```

### 3. Screen Coordinate Mapping
```python
def gaze_to_screen_coords(gaze_vector, calibration_params):
    """
    Transform gaze direction to screen coordinates:
    1. Polynomial transformation (degree 2-3)
    2. Bilinear interpolation between calibration points
    3. Neural network mapping (for complex cases)
    4. Adaptive correction based on user feedback
    """
```

### 4. Temporal Filtering
```python
class GazeFilter:
    def __init__(self):
        self.kalman = KalmanFilter()  # Smooth position
        self.savitzky_golay = SavitzkyGolayFilter()  # Smooth velocity
        
    def filter_gaze_point(self, raw_gaze, confidence):
        """Multi-stage filtering for smooth, accurate tracking"""
```

## Evaluation Metrics

### Accuracy Metrics
- **Angular Error**: Mean absolute error in degrees
- **Precision**: Standard deviation of gaze estimates  
- **Calibration Quality**: RMS error after calibration
- **Temporal Consistency**: Frame-to-frame smoothness

### Usability Metrics
- **Task Completion Time**: Time to complete standard tasks
- **Error Rate**: Percentage of incorrect selections
- **User Satisfaction**: Subjective rating (1-10)
- **Fatigue Assessment**: Performance over extended use

### Performance Metrics
- **Processing Latency**: End-to-end system delay
- **Frame Rate**: Sustainable FPS during operation
- **CPU/Memory Usage**: System resource consumption
- **Calibration Time**: Time to achieve good calibration

## Advanced Features (Future Enhancements)

### 1. Multi-User Support
- Face recognition for automatic user switching
- Personalized models and calibrations
- Family/shared computer scenarios

### 2. Adaptive Learning
- Continuous model improvement from user data
- Personalized intention prediction
- Automatic calibration refinement

### 3. Accessibility Integration
- Integration with screen readers
- Voice command combination
- Switch control compatibility
- Customizable interaction modes

### 4. Application-Specific Optimization
- Game control with prediction
- Text editing with smart selection
- CAD/design tools integration
- Video playback control

## Testing Strategy

### Unit Tests
```python
def test_eye_detection_accuracy():
    """Test eye detection on annotated dataset"""
    
def test_gaze_estimation_precision():
    """Test model accuracy on validation set"""
    
def test_calibration_convergence():
    """Test calibration algorithm convergence"""
```

### Integration Tests
```python
def test_end_to_end_pipeline():
    """Test complete pipeline with simulated input"""
    
def test_real_time_performance():
    """Test system performance under load"""
```

### User Testing
- **Controlled Lab Studies**: Accuracy measurement with ground truth
- **Real-World Usage**: Long-term usability assessment  
- **Accessibility Testing**: Testing with target user groups
- **Cross-Platform Testing**: Windows, macOS, Linux compatibility

## Success Criteria

### Technical Goals
- **Accuracy**: <2° angular error after calibration
- **Latency**: <100ms end-to-end processing time
- **Robustness**: Works in 90%+ of lighting conditions
- **Stability**: <5% false click rate

### User Experience Goals
- **Ease of Setup**: <5 minutes to full functionality
- **Learning Curve**: Productive use within 15 minutes
- **Comfort**: Usable for 30+ minutes without fatigue
- **Accessibility**: Usable by motor-impaired individuals

This specification provides everything needed to build a complete gaze-controlled interface system. The modular design allows for incremental development and testing, while the performance requirements ensure practical usability.