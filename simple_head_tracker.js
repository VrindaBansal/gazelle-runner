/**
 * Simple and Reliable Head Tracker
 * Uses only MediaPipe with automatic calibration - no TensorFlow.js complications
 */

class SimpleHeadTracker {
    constructor() {
        this.isInitialized = false;
        this.faceMesh = null;
        this.camera = null;

        // Video elements
        this.video = document.getElementById('video');
        this.previewVideo = document.getElementById('previewVideo');
        this.videoPreview = document.getElementById('videoPreview');
        this.gazeIndicator = document.getElementById('gazeIndicator');
        this.debugInfo = document.getElementById('debugInfo');
        this.togglePreview = document.getElementById('togglePreview');
        this.stopTracking = document.getElementById('stopTracking');

        // Tracking state
        this.currentHeadPose = 'neutral';
        this.poseHistory = [];
        this.previewVisible = true;
        this.maxHistoryLength = 3;

        // Calibration system
        this.isCalibrated = false;
        this.neutralPosition = null;
        this.calibrationSamples = [];
        this.calibrationFrames = 60; // 2 seconds at 30fps

        // Thresholds (will be set after calibration) - more sensitive
        this.upThreshold = -5;
        this.downThreshold = 5;
        this.minConfidenceFrames = 2;

        this.init();
    }

    async init() {
        try {
            console.log('Initializing Simple Head Tracker...');

            // Initialize camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, frameRate: 30 }
            });

            this.video.srcObject = stream;
            this.previewVideo.srcObject = stream;

            // Show preview window
            this.videoPreview.classList.add('active');
            this.togglePreview.classList.add('active');
            this.stopTracking.classList.add('active');
            this.togglePreview.addEventListener('click', () => this.togglePreviewWindow());
            this.stopTracking.addEventListener('click', () => this.stopHeadTracking());

            // Initialize MediaPipe
            await this.initializeMediaPipe();

            document.getElementById('calibrateButton').textContent = 'Calibrating... Keep head neutral!';
            document.getElementById('calibrateButton').style.background = '#FF8C00';

            // Start calibration
            setTimeout(() => this.startCalibration(), 2000);

            this.isInitialized = true;
            console.log('Simple head tracker initialized!');

        } catch (error) {
            console.error('Failed to initialize head tracking:', error);
            alert('Failed to access camera. Please ensure camera permissions are granted.');
        }
    }

    async initializeMediaPipe() {
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.8,
            minTrackingConfidence: 0.7
        });

        this.faceMesh.onResults((results) => this.processResults(results));

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.faceMesh) {
                    await this.faceMesh.send({ image: this.video });
                }
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
    }

    startCalibration() {
        console.log('Starting calibration - please keep your head in neutral position');
        this.calibrationSamples = [];

        // Update UI
        this.updateCalibrationUI(0);
    }

    updateCalibrationUI(progress) {
        const percentage = Math.round((progress / this.calibrationFrames) * 100);
        document.getElementById('calibrateButton').textContent = `Calibrating... ${percentage}%`;

        if (progress >= this.calibrationFrames) {
            this.finishCalibration();
        }
    }

    finishCalibration() {
        if (this.calibrationSamples.length > 10) {
            // Calculate average neutral position
            const avgPitch = this.calibrationSamples.reduce((sum, sample) => sum + sample.pitch, 0) / this.calibrationSamples.length;

            this.neutralPosition = {
                pitch: avgPitch
            };

            // Set adaptive thresholds based on neutral position (CORRECTED)
            // When tilting up from neutral, pitch becomes MORE negative
            // When tilting down from neutral, pitch becomes MORE positive
            this.upThreshold = avgPitch - 5;    // More negative threshold for UP tilt
            this.downThreshold = avgPitch + 5;  // More positive threshold for DOWN tilt

            this.isCalibrated = true;

            console.log(`Calibration complete! Neutral pitch: ${avgPitch.toFixed(1)}°`);
            console.log(`Up threshold: ${this.upThreshold.toFixed(1)}°, Down threshold: ${this.downThreshold.toFixed(1)}°`);

            document.getElementById('calibrateButton').textContent = 'Head Tracking Calibrated!';
            document.getElementById('calibrateButton').style.background = '#00AA00';
        } else {
            console.log('Calibration failed - not enough samples. Using default values.');
            this.setDefaultCalibration();
        }
    }

    setDefaultCalibration() {
        this.neutralPosition = { pitch: 0 };
        this.upThreshold = -5;   // Negative for up (reduced from -8)
        this.downThreshold = 5;  // Positive for down (reduced from 8)
        this.isCalibrated = true;

        document.getElementById('calibrateButton').textContent = 'Head Tracking Active (Default)';
        document.getElementById('calibrateButton').style.background = '#00AA00';
    }

    processResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const headData = this.calculateHeadPose(landmarks);

        if (!this.isCalibrated) {
            // Collect calibration samples
            if (this.calibrationSamples.length < this.calibrationFrames) {
                this.calibrationSamples.push(headData);
                this.updateCalibrationUI(this.calibrationSamples.length);
            }
            return;
        }

        // Process head pose after calibration
        const headPose = this.determineHeadPose(headData);
        this.updateHeadPose(headPose, headData);
    }

    calculateHeadPose(landmarks) {
        // Use multiple landmark approaches for robustness
        const noseTip = landmarks[1];
        const chin = landmarks[175] || landmarks[18];
        const leftEye = landmarks[33];
        const rightEye = landmarks[362];
        const forehead = landmarks[10];

        // Method 1: Eye-to-nose vertical relationship
        const eyeLevel = (leftEye.y + rightEye.y) / 2;
        const faceHeight = Math.abs(chin.y - forehead.y);
        const eyeToNoseRatio = (eyeLevel - noseTip.y) / faceHeight;

        // Method 2: Nose-chin angle
        const noseToChain = {
            x: chin.x - noseTip.x,
            y: chin.y - noseTip.y
        };
        const noseChinAngle = Math.atan2(noseToChain.y, noseToChain.x) * 180 / Math.PI - 90;

        // Combine both methods
        const eyeBasedPitch = eyeToNoseRatio * 60; // Increased sensitivity
        const angleBasedPitch = noseChinAngle;

        // Weighted average (eye-based is more reliable)
        let pitch = (eyeBasedPitch * 0.7 + angleBasedPitch * 0.3);

        // Keep original sign:
        // When you tilt head up, pitch should be negative
        // When you tilt head down, pitch should be positive

        return {
            pitch: pitch,
            eyeToNose: eyeToNoseRatio,
            chinAngle: noseChinAngle,
            confidence: 0.9
        };
    }

    determineHeadPose(headData) {
        if (!this.isCalibrated) return 'neutral';

        const pitch = headData.pitch;

        // FINAL CORRECTED MAPPING:
        // When you TILT UP physically: should make llama DUCK (return 'down' for game)
        // When you TILT DOWN physically: should make llama JUMP (return 'up' for game)
        if (pitch < this.upThreshold) {
            console.log(`PHYSICAL TILT UP DETECTED: pitch=${pitch}, upThreshold=${this.upThreshold}, returning 'down' for DUCK`);
            return 'down';   // Physical tilt up → return 'down' → input.down=true → DUCK
        } else if (pitch > this.downThreshold) {
            console.log(`PHYSICAL TILT DOWN DETECTED: pitch=${pitch}, downThreshold=${this.downThreshold}, returning 'up' for JUMP`);
            return 'up'; // Physical tilt down → return 'up' → input.up=true → JUMP
        } else {
            return 'neutral';
        }
    }

    updateHeadPose(newPose, headData) {
        // Add to history for smoothing
        this.poseHistory.push(newPose);
        if (this.poseHistory.length > this.maxHistoryLength) {
            this.poseHistory.shift();
        }

        // Apply smoothing
        const smoothedPose = this.getSmoothedPose();
        this.currentHeadPose = smoothedPose;

        this.updateUI(headData);
    }

    getSmoothedPose() {
        if (this.poseHistory.length === 0) return 'neutral';

        // Count occurrences
        const counts = {};
        this.poseHistory.forEach((pose, index) => {
            // Give more weight to recent poses
            const weight = index === this.poseHistory.length - 1 ? 2 : 1;
            counts[pose] = (counts[pose] || 0) + weight;
        });

        // Return most frequent pose, but require confidence
        const sortedPoses = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const topPose = sortedPoses[0];

        // Only return non-neutral if it has enough confidence
        if (topPose[0] !== 'neutral' && topPose[1] >= this.minConfidenceFrames) {
            return topPose[0];
        }

        return 'neutral';
    }

    updateUI(headData) {
        // Update status display
        const status = this.isCalibrated ?
            `Head: ${this.currentHeadPose}` :
            'Calibrating...';
        document.getElementById('gazeStatus').textContent = status;

        // Update visual indicator
        if (this.gazeIndicator) {
            this.gazeIndicator.classList.remove('up', 'down', 'left', 'right');

            if (this.currentHeadPose !== 'neutral') {
                this.gazeIndicator.classList.add(this.currentHeadPose);
            }

            let displayText = this.currentHeadPose.toUpperCase();
            if (this.currentHeadPose === 'neutral') {
                displayText = 'NEUTRAL';
            } else if (this.currentHeadPose === 'up') {
                displayText = 'TILT UP'; // Game returns 'up' when you physically tilt down → JUMP
            } else if (this.currentHeadPose === 'down') {
                displayText = 'TILT DOWN'; // Game returns 'down' when you physically tilt up → DUCK
            }

            this.gazeIndicator.textContent = displayText;
        }

        // Update debug info
        if (this.debugInfo && this.isCalibrated && headData) {
            const neutralPitch = this.neutralPosition ? this.neutralPosition.pitch : 0;
            const relativePitch = headData.pitch - neutralPitch;

            this.debugInfo.innerHTML = `
                Pitch: ${headData.pitch.toFixed(1)}°<br>
                Relative: ${relativePitch.toFixed(1)}°<br>
                Thresholds: ${this.upThreshold.toFixed(1)}° / ${this.downThreshold.toFixed(1)}°<br>
                History: [${this.poseHistory.join(', ')}]
            `;
        } else if (this.debugInfo && !this.isCalibrated) {
            this.debugInfo.innerHTML = `
                Calibrating...<br>
                Samples: ${this.calibrationSamples.length}/${this.calibrationFrames}<br>
                Keep head neutral!
            `;
        }
    }

    getCurrentInput() {
        if (!this.isInitialized || !this.isCalibrated) return null;

        if (this.currentHeadPose !== 'neutral') {
            const input = {
                up: this.currentHeadPose === 'up',
                down: this.currentHeadPose === 'down',
                left: false,
                right: false
            };

            console.log(`HEAD INPUT: pose=${this.currentHeadPose}, input.up=${input.up}, input.down=${input.down}`);
            return input;
        }

        return null;
    }

    togglePreviewWindow() {
        this.previewVisible = !this.previewVisible;

        if (this.previewVisible) {
            this.videoPreview.classList.add('active');
            this.togglePreview.textContent = 'Hide Preview';
        } else {
            this.videoPreview.classList.remove('active');
            this.togglePreview.textContent = 'Show Preview';
        }
    }

    // Method to recalibrate if needed
    recalibrate() {
        this.isCalibrated = false;
        this.calibrationSamples = [];
        this.currentHeadPose = 'neutral';
        this.poseHistory = [];

        document.getElementById('calibrateButton').textContent = 'Recalibrating...';
        document.getElementById('calibrateButton').style.background = '#FF8C00';

        setTimeout(() => this.startCalibration(), 1000);
    }

    stopHeadTracking() {
        // Stop all tracking and clean up
        this.isInitialized = false;
        this.isCalibrated = false;

        if (this.camera) {
            this.camera.stop();
        }

        if (this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }

        // Hide UI elements
        this.videoPreview.classList.remove('active');
        this.togglePreview.classList.remove('active');
        this.stopTracking.classList.remove('active');

        // Reset button
        document.getElementById('calibrateButton').textContent = 'Enable Head Tracking';
        document.getElementById('calibrateButton').style.background = '#8B4513';

        // Update status
        document.getElementById('gazeStatus').textContent = 'Head: Disabled';

        console.log('Head tracking stopped');
    }
}

// Replace the advanced tracker with the simple one
window.simpleHeadTracker = null;

document.addEventListener('DOMContentLoaded', () => {
    // Replace the advanced tracker initialization
    document.getElementById('calibrateButton').addEventListener('click', async () => {
        if (!window.simpleHeadTracker) {
            window.simpleHeadTracker = new SimpleHeadTracker();
        } else {
            // Recalibrate if already exists
            window.simpleHeadTracker.recalibrate();
        }
    });
});