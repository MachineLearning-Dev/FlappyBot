// ============================================================
// Headless Flappy Bird Game Engine
// ============================================================
// Pure math/logic — no DOM, no Canvas, no rendering.
// This runs the physics and collision detection only.
// Designed to be called thousands of times per frame for
// fast-forward training.
// ============================================================

let CANVAS_W = 400;
let CANVAS_H = 600;

// Bird constants
const BIRD_W = 34;
const BIRD_H = 24;
const BIRD_X = 80;          // Bird's fixed horizontal position
const GRAVITY = 0.5;
const FLAP_VEL = -8;

// Pipe constants
const PIPE_W = 52;
const PIPE_GAP = 160;       // Vertical gap between top and bottom pipes
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_DIST = 220; // Horizontal distance between pipe spawns

class Bird {
    constructor(id) {
        this.id = id;
        this.reset();
    }

    reset() {
        this.y = CANVAS_H / 2;
        this.vel = 0;
        this.alive = true;
        this.score = 0;
        this.prevState = null;
        this.prevAction = null;
    }

    flap() {
        this.vel = FLAP_VEL;
    }

    update() {
        this.vel += GRAVITY;
        this.y += this.vel;
    }
}

class Pipe {
    constructor(x) {
        this.x = x;
        // gapY = the Y coordinate of the top of the gap
        // Constrain so pipes are always reachable
        this.gapY = 80 + Math.random() * (CANVAS_H - PIPE_GAP - 160);
        this.scored = []; // Track which bird IDs have scored this pipe
    }
}

class GameSim {
    constructor(numBirds) {
        this.birds = [];
        for (let i = 0; i < numBirds; i++) {
            this.birds.push(new Bird(i));
        }
        this.pipes = [];
        this.frameCount = 0;
        this.spawnInitialPipes();
    }

    setPopulation(n) {
        while (this.birds.length < n) {
            let b = new Bird(this.birds.length);
            b.alive = false; // Will be reset on next generation
            this.birds.push(b);
        }
        if (n < this.birds.length) {
            this.birds.length = n;
        }
    }

    spawnInitialPipes() {
        this.pipes = [];
        // Spawn a few pipes ahead
        for (let i = 0; i < 4; i++) {
            this.pipes.push(new Pipe(CANVAS_W + i * PIPE_SPAWN_DIST));
        }
    }

    resetAll() {
        for (let b of this.birds) b.reset();
        this.pipes = [];
        this.frameCount = 0;
        this.spawnInitialPipes();
    }

    // Returns the next pipe that is in front of the bird
    getNextPipe() {
        for (let p of this.pipes) {
            if (p.x + PIPE_W > BIRD_X) return p;
        }
        return this.pipes[0]; // fallback
    }

    // Get the state for a bird relative to the next pipe
    getBirdState(bird) {
        let pipe = this.getNextPipe();
        if (!pipe) return { dx: 200, dy: 0, vel: bird.vel };
        let dx = pipe.x - BIRD_X;
        let gapCenter = pipe.gapY + PIPE_GAP / 2;
        let birdCenter = bird.y + BIRD_H / 2;
        let dy = gapCenter - birdCenter;
        return { dx, dy, vel: bird.vel };
    }

    // Check if a bird collides with a pipe or the ground/ceiling
    checkCollision(bird) {
        // Ceiling / floor
        if (bird.y < 0 || bird.y + BIRD_H > CANVAS_H) return true;

        let bx1 = BIRD_X + 3;  // Slight hitbox padding
        let by1 = bird.y + 3;
        let bx2 = BIRD_X + BIRD_W - 3;
        let by2 = bird.y + BIRD_H - 3;

        for (let p of this.pipes) {
            let px1 = p.x;
            let px2 = p.x + PIPE_W;

            if (bx2 > px1 && bx1 < px2) {
                // Inside pipe's horizontal range — check vertical
                let topPipeBottom = p.gapY;
                let botPipeTop = p.gapY + PIPE_GAP;
                if (by1 < topPipeBottom || by2 > botPipeTop) {
                    return true;
                }
            }
        }
        return false;
    }

    // Run one tick of the simulation.
    // `actions` is an array of 0|1 for each bird.
    // Returns number of birds still alive.
    tick(actions) {
        this.frameCount++;

        // Move pipes
        for (let p of this.pipes) {
            p.x -= PIPE_SPEED;
        }

        // Remove offscreen pipes, spawn new ones
        if (this.pipes.length > 0 && this.pipes[0].x + PIPE_W < 0) {
            this.pipes.shift();
            let lastPipe = this.pipes[this.pipes.length - 1];
            this.pipes.push(new Pipe(lastPipe.x + PIPE_SPAWN_DIST));
        }

        let alive = 0;
        for (let i = 0; i < this.birds.length; i++) {
            let bird = this.birds[i];
            if (!bird.alive) continue;

            // Apply action
            if (actions[i] === 1) {
                bird.flap();
            }

            // Physics
            bird.update();

            // Collision
            if (this.checkCollision(bird)) {
                bird.alive = false;
                continue;
            }

            // Scoring
            for (let p of this.pipes) {
                if (p.x + PIPE_W < BIRD_X && !p.scored.includes(bird.id)) {
                    p.scored.push(bird.id);
                    bird.score++;
                }
            }

            alive++;
        }

        return alive;
    }

    get anyAlive() {
        return this.birds.some(b => b.alive);
    }
}
