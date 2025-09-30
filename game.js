class GazelleRunner {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Enhanced graphics settings
        this.ctx.imageSmoothingEnabled = true; // Enable smoothing for better visuals
        this.ctx.imageSmoothingQuality = 'high';

        // High DPI support
        this.setupHighDPI();

        this.gameState = 'menu'; // menu, playing, gameOver
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('gazelleHighScore')) || 0;

        // Game objects
        this.gazelle = new Gazelle();
        this.obstacles = [];
        this.background = new ScrollingBackground();
        this.particleSystem = new ParticleSystem();

        // Game settings - more balanced
        this.gameSpeed = 2.5;
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnInterval = 140; // More time between obstacles
        this.difficultyTimer = 0;

        // Input system
        this.inputManager = new InputManager();
        this.gazeTracker = new GazeTracker();

        // Make game reference available for obstacle checking
        window.game = this;

        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }

    setupHighDPI() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.ctx.scale(dpr, dpr);

        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }

    setupEventListeners() {
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        // Advanced tracker initialization is handled in advanced_tracker.js

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.inputManager.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.inputManager.handleKeyUp(e));
    }

    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.gameSpeed = 2;
        this.obstacles = [];
        this.gazelle = new Gazelle();
        this.obstacleSpawnTimer = 0;
        this.difficultyTimer = 0;
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Get input from keyboard, simple head tracker, or basic gaze tracker
        const input = this.inputManager.getInput() ||
                     (window.simpleHeadTracker && window.simpleHeadTracker.getCurrentInput()) ||
                     this.gazeTracker.getCurrentGaze();

        // Update game objects
        this.gazelle.update(input);
        this.background.update(this.gameSpeed);
        this.particleSystem.update();

        // Spawn obstacles
        this.obstacleSpawnTimer++;
        if (this.obstacleSpawnTimer >= this.obstacleSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }

        // Update obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.update(this.gameSpeed);
        });

        // Remove off-screen obstacles
        this.obstacles = this.obstacles.filter(obstacle => obstacle.x > -100);

        // Check collisions
        this.checkCollisions();

        // Update score and difficulty - more like dinosaur game
        this.score += Math.floor(this.gameSpeed / 2);
        this.difficultyTimer++;
        
        // Gradual speed increase like dinosaur game - slower progression
        if (this.difficultyTimer % 400 === 0) { // Every 6.6 seconds at 60fps
            this.gameSpeed += 0.2;
            this.obstacleSpawnInterval = Math.max(80, this.obstacleSpawnInterval - 2);
        }

        // Cap maximum speed for playability
        this.gameSpeed = Math.min(this.gameSpeed, 6);

        this.updateUI();
    }

    spawnObstacle() {
        const types = ['rock', 'largeRock', 'bar'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.obstacles.push(new Obstacle(type));

        // Reduced multiple obstacle spawning for better balance
        if (Math.random() < 0.15 && this.score > 200) {
            setTimeout(() => {
                if (this.gameState === 'playing') {
                    // Only spawn small rocks after larger obstacles for manageable patterns
                    this.obstacles.push(new Obstacle('rock'));
                }
            }, 300 + Math.random() * 200);
        }
    }

    checkCollisions() {
        const gazelleRect = this.gazelle.getBoundingRect();

        for (let obstacle of this.obstacles) {
            const obstacleRect = obstacle.getBoundingRect();

            if (this.rectIntersect(gazelleRect, obstacleRect)) {
                this.gameOver();
                break;
            }
        }
    }

    rectIntersect(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    gameOver() {
        this.gameState = 'gameOver';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('gazelleHighScore', this.highScore);
        }
        this.updateUI();

        // Auto restart after 3 seconds
        setTimeout(() => {
            if (this.gameState === 'gameOver') {
                this.gameState = 'menu';
            }
        }, 3000);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background
        this.background.draw(this.ctx);

        // Draw particles
        this.particleSystem.draw(this.ctx);

        if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            // Draw obstacles
            this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));

            // Draw gazelle
            this.gazelle.draw(this.ctx);
        }

        // Draw game over screen
        if (this.gameState === 'gameOver') {
            this.drawGameOverScreen();
        }
    }

    drawGameOverScreen() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Game Over text with shadow
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = '24px Courier New';
        this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        // High score indicator
        if (this.score === this.highScore && this.score > 0) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 20px Courier New';
            this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.font = '18px Courier New';
        this.ctx.fillText('Restarting in 3 seconds...', this.canvas.width / 2, this.canvas.height / 2 + 80);
        
        this.ctx.restore();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Gazelle {
    constructor() {
        this.x = 100;
        this.y = 300; // Ground level
        this.width = 48;
        this.height = 48;
        this.velocityY = 0;
        this.velocityX = 0; // Add horizontal velocity
        this.onGround = true;
        this.state = 'running'; // running, jumping, ducking
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.lane = 1; // 0 = left, 1 = center, 2 = right
        this.targetY = 300;
        this.baseX = 100; // Base X position

        // Physics constants - improved for better gameplay
        this.gravity = 0.7;
        this.jumpPower = -16;
        this.bigJumpPower = -22; // For large rocks
        this.groundY = 300;
        this.duckY = 320;

        // Sprite properties
        this.sprite = new Image();
        this.sprite.src = 'llama/llama.png';
        this.spriteLoaded = false;
        this.sprite.onload = () => {
            this.spriteLoaded = true;
        };

        // Ducking sprite
        this.duckSprite = new Image();
        this.duckSprite.src = 'llamaduck.png';
        this.duckSpriteLoaded = false;
        this.duckSprite.onload = () => {
            this.duckSpriteLoaded = true;
        };

        // Sprite sheet data from JSON
        this.frames = [
            {x: 0, y: 0, w: 48, h: 48},     // llama0
            {x: 48, y: 0, w: 48, h: 48},    // llama1
            {x: 0, y: 48, w: 48, h: 48},    // llama2
            {x: 48, y: 48, w: 48, h: 48},   // llama3
            {x: 0, y: 96, w: 48, h: 48},    // llama4
            {x: 48, y: 96, w: 48, h: 48}    // llama5
        ];
    }

    update(input) {
        this.handleInput(input);
        this.updatePhysics();
        this.updateAnimation();
    }

    handleInput(input) {
        // Always keep gazelle in center for head tracking mode
        this.lane = 1;
        this.x = 100; // Fixed center position

        if (!input) {
            // No head movement detected - stay in running state
            if (this.state === 'ducking' && this.onGround) {
                this.state = 'running';
                this.targetY = this.groundY;
            }
            return;
        }

        if (input.up && this.onGround && this.state !== 'ducking') {
            // Check for large rocks nearby to determine jump type
            const nearbyLargeRock = this.checkForNearbyLargeRock();
            this.jump(nearbyLargeRock);
        }

        if (input.down) {
            console.log('Down input detected, calling duck()');
            this.duck();
        } else if (this.state === 'ducking' && this.onGround) {
            console.log('Exiting duck state back to running');
            this.state = 'running';
            this.targetY = this.groundY;
        }
    }

    jump(isBigJump = false) {
        if (this.onGround) {
            this.velocityY = isBigJump ? this.bigJumpPower : this.jumpPower;
            this.velocityX = 2; // Reduced forward momentum for better control
            this.onGround = false;
            this.state = 'jumping';
        }
    }

    checkForNearbyLargeRock() {
        // Check if there's a large rock coming up that requires a big jump
        const obstacles = window.game?.obstacles || [];
        for (let obstacle of obstacles) {
            if (obstacle.type === 'largeRock' &&
                obstacle.x > this.x &&
                obstacle.x < this.x + 200) { // Within jump decision range
                return true;
            }
        }
        return false;
    }

    duck() {
        if (this.onGround) {
            this.state = 'ducking';
            this.targetY = this.duckY;
            console.log('Duck action triggered! State:', this.state, 'TargetY:', this.targetY);
        }
    }

    updatePhysics() {
        // Dinosaur game style physics - more precise and responsive
        if (!this.onGround) {
            this.velocityY += this.gravity;
            this.y += this.velocityY;

            // Apply horizontal movement during jump (reduced for better control)
            this.x += this.velocityX;

            // Gradually reduce horizontal velocity
            this.velocityX *= 0.95;

            // Ground collision detection - more precise like dinosaur game
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.velocityY = 0;
                this.velocityX = 0;
                this.onGround = true;
                if (this.state === 'jumping') {
                    this.state = 'running';
                }
            }
        } else {
            // Keep gazelle on ground level - no floating
            this.y = this.groundY;

            // Return to base X position when on ground
            this.x += (this.baseX - this.x) * 0.2;
        }
    }

    updateAnimation() {
        this.animationTimer++;
        if (this.animationTimer % 8 === 0) { // Original timing
            this.animationFrame = (this.animationFrame + 1) % 6;
        }
    }

    draw(ctx) {
        // Enhanced graphics with shadows and smoother rendering
        const scale = 1.3;

        // Add shadow effect
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        if (this.state === 'ducking' && this.duckSpriteLoaded) {
            // Reasonable ducking sprite positioning
            const drawWidth = 48 * scale;
            const drawHeight = 48 * scale * 0.8; // Slightly shorter
            const drawX = this.x;
            const drawY = this.y + 10; // Reasonable duck position

            ctx.drawImage(
                this.duckSprite,
                0, 0, 48, 48, // Source: full duck sprite
                drawX, drawY, drawWidth, drawHeight
            );
        } else if (this.spriteLoaded) {
            // Enhanced normal running sprite
            const frame = this.frames[this.animationFrame];
            const drawWidth = frame.w * scale;
            const drawHeight = frame.h * scale;

            // Subtle bouncing animation while running
            const bounceOffset = this.state === 'running' ? Math.sin(this.animationTimer * 0.2) * 0.5 : 0;

            ctx.drawImage(
                this.sprite,
                frame.x, frame.y, frame.w, frame.h, // Source rectangle
                this.x, this.y + bounceOffset, drawWidth, drawHeight  // Destination with bounce
            );
        } else {
            // Enhanced fallback with gradient
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#CD853F');
            gradient.addColorStop(1, '#8B4513');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        ctx.restore();
    }

    getBoundingRect() {
        const scale = 1.3;

        if (this.state === 'ducking') {
            const actualWidth = this.width * scale;
            const actualHeight = this.height * scale * 0.6; // More compact when ducking
            return {
                x: this.x + 8,
                y: this.y + 20, // Better ducking collision
                width: actualWidth - 16,
                height: actualHeight - 8
            };
        } else {
            const actualWidth = this.width * scale;
            const actualHeight = this.height * scale;
            return {
                x: this.x + 8,
                y: this.y + 8,
                width: actualWidth - 16,
                height: actualHeight - 16
            };
        }
    }
}

class Obstacle {
    constructor(type) {
        this.type = type;
        this.x = 850; // Start further right so they're visible
        this.lane = 1; // Always center lane for head tracking mode
        this.y = this.getYPosition();
        this.width = this.getWidth();
        this.height = this.getHeight();
        this.passed = false;

        // Load tree sprite for better visual quality
        if (type === 'tree') {
            this.sprite = new Image();
            this.sprite.src = 'tree-sprite.png';
            this.spriteLoaded = false;
            this.sprite.onload = () => {
                this.spriteLoaded = true;
            };
        }
    }

    getYPosition() {
        switch (this.type) {
            case 'rock': return 315; // Small rock on ground
            case 'largeRock': return 280; // Large rock - taller
            case 'bar': return 250; // High bar to duck under
            default: return 315;
        }
    }

    getWidth() {
        switch (this.type) {
            case 'rock': return 25; // Small rock
            case 'largeRock': return 40; // Large rock
            case 'bar': return 80; // Long bar
            default: return 25;
        }
    }

    getHeight() {
        switch (this.type) {
            case 'rock': return 30; // Small rock
            case 'largeRock': return 65; // Large rock - requires higher jump
            case 'bar': return 15; // Thin bar
            default: return 30;
        }
    }

    update(gameSpeed) {
        this.x -= gameSpeed;
        // Simple horizontal movement - obstacles appear from right side of screen
    }

    draw(ctx) {
        switch (this.type) {
            case 'rock':
                this.drawSmallRock(ctx);
                break;
            case 'largeRock':
                this.drawLargeRock(ctx);
                break;
            case 'bar':
                this.drawBar(ctx);
                break;
        }
    }

    drawSmallRock(ctx) {
        ctx.save();

        // Simple shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Simple retro rock - like Chrome dinosaur game
        ctx.fillStyle = '#696969';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Simple highlight
        ctx.fillStyle = '#A9A9A9';
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 6, this.height - 8);

        // Dark edge for depth
        ctx.fillStyle = '#2F2F2F';
        ctx.fillRect(this.x + this.width - 3, this.y + 3, 3, this.height - 3);
        ctx.fillRect(this.x + 3, this.y + this.height - 3, this.width - 3, 3);

        ctx.restore();
    }

    drawLargeRock(ctx) {
        ctx.save();

        // Simple shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Large retro rock
        ctx.fillStyle = '#555555';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Highlight sections for retro 3D effect
        ctx.fillStyle = '#888888';
        ctx.fillRect(this.x + 3, this.y + 3, this.width - 8, this.height - 12);

        ctx.fillStyle = '#AAAAAA';
        ctx.fillRect(this.x + 6, this.y + 6, this.width - 14, this.height - 20);

        // Dark edges
        ctx.fillStyle = '#222222';
        ctx.fillRect(this.x + this.width - 4, this.y + 4, 4, this.height - 4);
        ctx.fillRect(this.x + 4, this.y + this.height - 4, this.width - 4, 4);

        // Add some pixel detail
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x + 8, this.y + 8, 4, 4);
        ctx.fillRect(this.x + this.width - 12, this.y + 12, 4, 4);

        ctx.restore();
    }

    drawBar(ctx) {
        ctx.save();

        // Simple shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Simple retro horizontal bar
        ctx.fillStyle = '#8B4513'; // Brown
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Highlight on top
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(this.x, this.y, this.width, 4);

        // Dark bottom edge
        ctx.fillStyle = '#654321';
        ctx.fillRect(this.x, this.y + this.height - 3, this.width, 3);

        // Support posts on the ends
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x - 2, this.y, 4, 30);
        ctx.fillRect(this.x + this.width - 2, this.y, 4, 30);

        // Post highlights
        ctx.fillStyle = '#CD853F';
        ctx.fillRect(this.x - 1, this.y, 2, 30);
        ctx.fillRect(this.x + this.width - 1, this.y, 2, 30);

        ctx.restore();
    }


    getBoundingRect() {
        // Precise collision detection for each obstacle type
        switch (this.type) {
            case 'rock':
                return {
                    x: this.x + 3,
                    y: this.y + 3,
                    width: this.width - 6,
                    height: this.height - 6
                };
            case 'largeRock':
                return {
                    x: this.x + 5,
                    y: this.y + 5,
                    width: this.width - 10,
                    height: this.height - 10
                };
            case 'bar':
                return {
                    x: this.x + 5,
                    y: this.y + 2,
                    width: this.width - 10,
                    height: this.height - 4
                };
            default:
                return {
                    x: this.x + 2,
                    y: this.y + 2,
                    width: this.width - 4,
                    height: this.height - 4
                };
        }
    }
}

class ScrollingBackground {
    constructor() {
        this.groundOffset = 0;
        this.cloudOffset = 0;
        this.floatingClouds = this.generateFloatingClouds();
    }

    generateFloatingClouds() {
        const clouds = [];
        for (let i = 0; i < 8; i++) {
            clouds.push({
                x: Math.random() * 1200,
                y: Math.random() * 200 + 20,
                size: Math.random() * 20 + 15,
                speed: Math.random() * 0.3 + 0.1
            });
        }
        return clouds;
    }

    update(gameSpeed) {
        this.groundOffset -= gameSpeed;
        this.cloudOffset -= gameSpeed * 0.2;

        if (this.groundOffset <= -24) this.groundOffset = 0;
        if (this.cloudOffset <= -200) this.cloudOffset = 0;

        // Update floating clouds
        this.floatingClouds.forEach(cloud => {
            cloud.x -= gameSpeed * cloud.speed;
            if (cloud.x < -100) {
                cloud.x = 900 + Math.random() * 200;
                cloud.y = Math.random() * 200 + 20;
            }
        });
    }

    draw(ctx) {
        // Sky gradient - more like dinosaur game
        const gradient = ctx.createLinearGradient(0, 0, 0, 340);
        gradient.addColorStop(0, '#F7F7F7');
        gradient.addColorStop(0.7, '#E8F4F8');
        gradient.addColorStop(1, '#F0F0F0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 800, 340);

        // Simple static clouds like T-Rex game
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 4; i++) {
            const x = (i * 200 + this.cloudOffset) % 1000;
            this.drawSimpleCloud(ctx, x, 50 + i * 30);
        }

        // Ground line - more prominent like dinosaur game
        ctx.fillStyle = '#535353';
        ctx.fillRect(0, 340, 800, 3);

        // Ground texture - dinosaur game style dashed pattern
        ctx.fillStyle = '#ABABAB';
        for (let i = 0; i < 40; i++) {
            const x = (i * 20 + this.groundOffset) % 820;
            if (i % 2 === 0) {
                ctx.fillRect(x, 345, 10, 2);
            }
        }

        // Additional ground detail for depth
        ctx.fillStyle = '#C0C0C0';
        for (let i = 0; i < 20; i++) {
            const x = (i * 40 + this.groundOffset * 0.5) % 800;
            ctx.fillRect(x, 347, 15, 1);
        }
    }

    drawFloatingCloud(ctx, x, y, size) {
        // Soft floating cloud
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x + size * 0.4, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSimpleCloud(ctx, x, y) {
        // Simple cloud - basic rectangles like T-Rex game
        ctx.fillRect(x, y, 30, 12);
        ctx.fillRect(x + 8, y - 6, 20, 12);
        ctx.fillRect(x + 15, y + 6, 15, 8);
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update() {
        // Add dust particles more frequently for better effect
        if (Math.random() < 0.15) {
            this.particles.push({
                x: Math.random() * 800,
                y: 330 + Math.random() * 20,
                velocityX: -1 - Math.random() * 2,
                velocityY: -Math.random() * 2,
                life: 30 + Math.random() * 30,
                maxLife: 30 + Math.random() * 30,
                size: 2 + Math.random() * 2
            });
        }

        // Update existing particles
        this.particles.forEach(particle => {
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            particle.life--;
        });

        // Remove dead particles
        this.particles = this.particles.filter(particle => particle.life > 0);
    }

    draw(ctx) {
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            const size = particle.size || 3;
            
            // Add shadow for depth
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 1;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.fillStyle = `rgba(210, 180, 140, ${alpha * 0.6})`;
            ctx.fillRect(particle.x, particle.y, size, size);
            
            ctx.restore();
        });
    }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.input = { up: false, down: false, left: false, right: false };
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
        e.preventDefault();
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
        e.preventDefault();
    }

    getInput() {
        const input = {
            up: this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'],
            down: this.keys['ArrowDown'] || this.keys['KeyS'],
            left: this.keys['ArrowLeft'] || this.keys['KeyA'],
            right: this.keys['ArrowRight'] || this.keys['KeyD']
        };

        return input.up || input.down || input.left || input.right ? input : null;
    }
}

class GazeTracker {
    constructor() {
        this.faceMesh = null;
        this.camera = null;
        this.video = document.getElementById('video');
        this.previewVideo = document.getElementById('previewVideo');
        this.videoPreview = document.getElementById('videoPreview');
        this.gazeIndicator = document.getElementById('gazeIndicator');
        this.debugInfo = document.getElementById('debugInfo');
        this.togglePreview = document.getElementById('togglePreview');
        this.isInitialized = false;
        this.previewVisible = true;
        this.currentGaze = 'center';
        this.gazeHistory = [];
        this.smoothingFactor = 0.3;
        this.maxHistoryLength = 3; // Shorter history for more responsiveness

        // WebSocket connection to Python backend
        this.websocket = null;
        this.useBackend = false;
        this.backendConnected = false;
    }

    async init() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            this.video.srcObject = stream;
            this.previewVideo.srcObject = stream;

            // Show the preview window and toggle button
            this.videoPreview.classList.add('active');
            this.togglePreview.classList.add('active');

            // Set up toggle functionality
            this.togglePreview.addEventListener('click', () => this.togglePreviewWindow());

            // Initialize MediaPipe gaze tracking
            await this.initMediaPipe();

            document.getElementById('calibrateButton').textContent = 'Head Tracking Active';
            document.getElementById('calibrateButton').style.background = '#228B22';
            console.log('Head tracking initialized successfully');

            this.isInitialized = true;

        } catch (error) {
            console.error('Failed to initialize gaze tracking:', error);
            alert('Failed to access camera. Please ensure camera permissions are granted.');
        }
    }

    onResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const headMovement = this.calculateHeadPose(landmarks);

        // Smooth the head movement with shorter history for responsiveness
        this.gazeHistory.push(headMovement);
        if (this.gazeHistory.length > this.maxHistoryLength) {
            this.gazeHistory.shift();
        }

        this.currentGaze = this.getSmoothedGaze();
        this.updateGazeStatus();
    }

    calculateHeadPose(landmarks) {
        // Calculate head pose using key facial landmarks
        // 3D model points for head pose estimation
        const model3DPoints = [
            [0.0, 0.0, 0.0],        // Nose tip
            [0.0, -330.0, -65.0],   // Chin
            [-225.0, 170.0, -135.0], // Left eye left corner
            [225.0, 170.0, -135.0],  // Right eye right corner
            [-150.0, -150.0, -125.0], // Left mouth corner
            [150.0, -150.0, -125.0]   // Right mouth corner
        ];

        // Corresponding 2D image points
        const noseTip = landmarks[1];
        const chin = landmarks[175] || landmarks[18];
        const leftEyeLeft = landmarks[33];
        const rightEyeRight = landmarks[362];
        const leftMouth = landmarks[61];
        const rightMouth = landmarks[291];

        // Calculate head tilt using nose to chin vector
        const noseToChingVector = {
            x: chin.x - noseTip.x,
            y: chin.y - noseTip.y
        };

        // Calculate the angle of head tilt
        const headTiltAngle = Math.atan2(noseToChingVector.y, noseToChingVector.x);

        // Convert to degrees and normalize (FIXED: inverted the calculation)
        let headTiltDegrees = 90 - (headTiltAngle * 180 / Math.PI); // Add 90 to make 0 degrees = neutral

        // Normalize angle to [-180, 180]
        if (headTiltDegrees > 180) headTiltDegrees -= 360;
        if (headTiltDegrees < -180) headTiltDegrees += 360;

        // Calculate vertical head movement using eye-to-nose ratio
        const leftEye = landmarks[33];
        const rightEye = landmarks[362];
        const eyeLevel = (leftEye.y + rightEye.y) / 2;

        // Face height for normalization
        const faceTop = landmarks[10];
        const faceBottom = landmarks[152];
        const faceHeight = Math.abs(faceBottom.y - faceTop.y);

        // Calculate relative vertical position
        const relativeEyeToNose = (eyeLevel - noseTip.y) / faceHeight;

        // Update debug display
        if (this.debugInfo) {
            this.debugInfo.innerHTML = `
                Tilt: ${headTiltDegrees.toFixed(1)}°<br>
                Vertical: ${relativeEyeToNose.toFixed(3)}<br>
                History: [${this.gazeHistory.join(', ')}]
            `;
        }

        // Determine head movement
        const tiltThreshold = 8; // degrees
        const verticalThreshold = 0.02;

        let headMovement = 'center';

        // Primary detection: head tilt up/down (CORRECTED FOR NATURAL FEEL)
        if (headTiltDegrees < -tiltThreshold) {
            headMovement = 'up'; // Negative degrees (tilt up) -> jump action
        } else if (headTiltDegrees > tiltThreshold) {
            headMovement = 'down'; // Positive degrees (tilt down) -> duck action
        }
        // Secondary detection: face moving up/down in frame (CORRECTED FOR NATURAL FEEL)
        else if (relativeEyeToNose > verticalThreshold) {
            headMovement = 'up'; // Face moved up -> jump action
        } else if (relativeEyeToNose < -verticalThreshold) {
            headMovement = 'down'; // Face moved down -> duck action
        }

        return headMovement;
    }

    getSmoothedGaze() {
        if (this.gazeHistory.length === 0) return 'center';

        // Simple majority vote with recent bias
        const counts = {};
        this.gazeHistory.forEach((gaze, index) => {
            const weight = index === this.gazeHistory.length - 1 ? 2 : 1; // Latest gets double weight
            counts[gaze] = (counts[gaze] || 0) + weight;
        });

        // Find the most common gaze direction
        const sortedGazes = Object.entries(counts)
            .sort((a, b) => b[1] - a[1]);

        const topGaze = sortedGazes[0];

        // Return the most common direction if it appears at least twice
        // or if it's the most recent detection
        if (counts[topGaze[0]] >= 2 || this.gazeHistory[this.gazeHistory.length - 1] === topGaze[0]) {
            return topGaze[0];
        }

        return 'center';
    }

    getCurrentGaze() {
        if (!this.isInitialized) return null;

        const headInput = {
            up: this.currentGaze === 'up',
            down: this.currentGaze === 'down',
            left: false,  // Disable left/right for head tracking
            right: false  // Disable left/right for head tracking
        };

        // Only return input if there's a vertical head movement detected
        return headInput.up || headInput.down ? headInput : null;
    }

    updateGazeStatus() {
        document.getElementById('gazeStatus').textContent = `Head: ${this.currentGaze}`;

        // Update the visual indicator in the preview window
        if (this.gazeIndicator) {
            // Remove all direction classes
            this.gazeIndicator.classList.remove('up', 'down', 'left', 'right');

            // Add current direction class for color coding
            if (this.currentGaze !== 'center') {
                this.gazeIndicator.classList.add(this.currentGaze);
            }

            // Update text with head movement status
            let displayText = this.currentGaze.toUpperCase();
            if (this.currentGaze === 'center') {
                displayText = 'NEUTRAL';
            } else if (this.currentGaze === 'up') {
                displayText = 'TILT UP';
            } else if (this.currentGaze === 'down') {
                displayText = 'TILT DOWN';
            }

            this.gazeIndicator.textContent = displayText;
        }
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

    async initMediaPipe() {
        // Initialize MediaPipe Face Mesh for gaze tracking
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this.onResults(results));

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.faceMesh.send({ image: this.video });
            },
            width: 640,
            height: 480
        });

        await this.camera.start();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GazelleRunner();
});