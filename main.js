// ============================================================
// Main Orchestrator — Rendering + Training Loop
// ============================================================

(function () {
    // ---- Canvas Setup ----
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const chartCanvas = document.getElementById('chartCanvas');
    const chartCtx = chartCanvas.getContext('2d');

    // ---- Fullscreen Canvas (proper aspect ratio) ----
    // The game world height is fixed at 600. The width is dynamically
    // set to match the screen's aspect ratio so the game fills the
    // entire screen with zero stretching, cropping, or letterboxing.
    let gameScale = 1;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Set game world width to match screen aspect ratio
        CANVAS_H = 600;
        gameScale = canvas.height / CANVAS_H;
        CANVAS_W = Math.ceil(canvas.width / gameScale);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // ---- Panel Drag ----
    const panel = document.getElementById('panel');
    const panelHeader = document.getElementById('panelHeader');
    let isDragging = false;
    let dragOffX = 0, dragOffY = 0;

    panelHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('.panel-btn')) return;
        isDragging = true;
        let rect = panel.getBoundingClientRect();
        dragOffX = e.clientX - rect.left;
        dragOffY = e.clientY - rect.top;
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let x = e.clientX - dragOffX;
        let y = e.clientY - dragOffY;
        x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, x));
        y = Math.max(0, Math.min(window.innerHeight - 40, y));
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        panel.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // ---- Minimize / Maximize ----
    const minimizeBtn = document.getElementById('minimizeBtn');
    const panelBody = document.getElementById('panelBody');
    let panelMinimized = false;

    minimizeBtn.addEventListener('click', () => {
        panelMinimized = !panelMinimized;
        panelBody.classList.toggle('collapsed', panelMinimized);
        panel.classList.toggle('minimized', panelMinimized);
        minimizeBtn.textContent = panelMinimized ? '+' : '\u2014';
        minimizeBtn.title = panelMinimized ? 'Maximize' : 'Minimize';
    });

    // ---- UI Elements ----
    const genCountEl = document.getElementById('genCount');
    const bestScoreEl = document.getElementById('bestScore');
    const alphaScoreEl = document.getElementById('alphaScore');
    const aliveCountEl = document.getElementById('aliveCount');
    const epsilonValEl = document.getElementById('epsilonVal');
    const qStatesEl = document.getElementById('qStates');
    const showGhostsEl = document.getElementById('showGhosts');
    const resetBtn = document.getElementById('resetBtn');
    const saveBtn = document.getElementById('saveBtn');

    // ---- Settings ----
    let speed = 1;
    let population = 50;
    let scoreHistory = [];

    // ---- Agent & Game ----
    const agent = new QAgent();
    let sim = new GameSim(population);

    // ---- Sprite Loading ----
    const sprites = {};
    const spriteUrls = {
        bg: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/background-day.png',
        bird1: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/yellowbird-downflap.png',
        bird2: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/yellowbird-midflap.png',
        bird3: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/yellowbird-upflap.png',
        pipeTop: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/pipe-green.png',
        pipeBot: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/pipe-green.png',
        ground: 'https://raw.githubusercontent.com/samuelcust/flappy-bird-assets/master/sprites/base.png'
    };

    for (let key in spriteUrls) {
        sprites[key] = new Image();
        sprites[key].crossOrigin = 'anonymous';
        sprites[key].src = spriteUrls[key];
    }

    // ---- Speed Buttons ----
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            speed = parseInt(btn.dataset.speed);
        });
    });

    // ---- Population Buttons ----
    document.querySelectorAll('.pop-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pop-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            population = parseInt(btn.dataset.pop);
            sim.setPopulation(population);
        });
    });

    // ---- Reset / Save / Import / Export ----
    resetBtn.addEventListener('click', () => {
        agent.reset();
        scoreHistory = [];
        sim = new GameSim(population);
        updateUI();
    });
    
    saveBtn.addEventListener('click', () => {
        agent.save();
        let oldText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        setTimeout(() => saveBtn.textContent = oldText, 1000);
    });

    const exportBtn = document.getElementById('exportBtn');
    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            qTable: agent.qTable,
            gamesPlayed: agent.gamesPlayed,
            bestScore: agent.bestScore,
            epsilon: agent.epsilon
        }));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "flappy_brain.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    importBtn.addEventListener('click', () => {
        importFile.click();
    });
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.qTable) {
                    agent.qTable = data.qTable;
                    agent.gamesPlayed = data.gamesPlayed || 0;
                    agent.bestScore = data.bestScore || 0;
                    agent.epsilon = data.epsilon !== undefined ? data.epsilon : 0.0;
                    agent.save();
                    sim.resetAll();
                    updateUI();
                    alert("Brain imported successfully!");
                }
            } catch (err) {
                alert("Invalid brain file.");
            }
        };
        reader.readAsText(file);
    });

    // ---- Streamer Mode ----
    const streamerBtn = document.getElementById('streamerBtn');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Press ESC to exit Streamer Mode';
    document.body.appendChild(toast);

    streamerBtn.addEventListener('click', () => {
        document.body.classList.add('streamer-mode');
        
        population = 1;
        sim.setPopulation(population);
        speed = 1;
        
        document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.speed-btn[data-speed="1"]').classList.add('active');
        document.querySelectorAll('.pop-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.pop-btn[data-pop="1"]').classList.add('active');
        
        agent.epsilon = 0.0;
        
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('streamer-mode')) {
            document.body.classList.remove('streamer-mode');
            
            // Revert back to training defaults
            population = 50;
            sim.setPopulation(population);
            document.querySelectorAll('.pop-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.pop-btn[data-pop="50"]').classList.add('active');
        }
    });

    // ============================================================
    // CORE TRAINING STEP
    // ============================================================
    function trainStep() {
        // Track each bird's previous score so we can detect pipe passes
        let prevScores = sim.birds.map(b => b.score);

        let actions = [];
        for (let i = 0; i < sim.birds.length; i++) {
            let bird = sim.birds[i];
            if (!bird.alive) {
                actions.push(0);
                continue;
            }

            // 1. Get current state
            let s = sim.getBirdState(bird);
            let stateStr = agent.getState(s.dx, s.dy, s.vel);

            // 2. Learn from the previous transition
            if (bird.prevState !== null) {
                // Reward = survival bonus + closeness to gap center + pipe pass bonus
                let closeness = 1.0 - Math.min(Math.abs(s.dy) / (PIPE_GAP / 2), 1.0);
                let reward = 1 + closeness * 2;

                // Big bonus if the bird scored since last step
                if (bird.score > bird._prevScore) {
                    reward += 25;
                }

                agent.learn(bird.prevState, bird.prevAction, reward, stateStr);
            }
            bird._prevScore = bird.score;

            // 3. Choose action
            let action = agent.chooseAction(stateStr);

            // 4. Store for next step
            bird.prevState = stateStr;
            bird.prevAction = action;
            actions.push(action);
        }

        // Run physics
        let alive = sim.tick(actions);

        // Apply terminal learning for birds that just died
        for (let bird of sim.birds) {
            if (!bird.alive && bird.prevState !== null) {
                agent.learnTerminal(bird.prevState, bird.prevAction, -100);
                bird.prevState = null;
                bird.prevAction = null;
            }
        }

        return alive;
    }

    // ============================================================
    // GENERATION MANAGEMENT
    // ============================================================
    function endGeneration() {
        let genBest = 0;
        for (let b of sim.birds) {
            if (b.score > genBest) genBest = b.score;
        }

        if (genBest > agent.bestScore) {
            agent.bestScore = genBest;
        }

        scoreHistory.push(genBest);
        if (scoreHistory.length > 50) scoreHistory.shift();

        agent.onGenerationEnd();

        if (agent.gamesPlayed % 20 === 0) {
            agent.save();
        }

        sim.resetAll();
        sim.setPopulation(population);
    }

    // ============================================================
    // RENDERING — with proper aspect-ratio scaling
    // ============================================================
    function render() {
        let cw = canvas.width;
        let ch = canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        // Scale game world to fill the screen
        ctx.save();
        ctx.scale(gameScale, gameScale);

        // Background
        if (sprites.bg.complete) {
            let bgW = sprites.bg.width * (CANVAS_H / sprites.bg.height);
            for (let x = 0; x < CANVAS_W; x += bgW) {
                ctx.drawImage(sprites.bg, x, 0, bgW, CANVAS_H);
            }
        } else {
            let grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            grad.addColorStop(0, '#4dc9f6');
            grad.addColorStop(0.7, '#87ceeb');
            grad.addColorStop(1, '#ded895');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Pipes
        for (let p of sim.pipes) {
            drawPipe(p);
        }

        // Find the alpha bird (best alive bird by score, or first alive)
        let alphaBird = null;
        let bestAliveScore = -1;
        for (let b of sim.birds) {
            if (b.alive && b.score > bestAliveScore) {
                bestAliveScore = b.score;
                alphaBird = b;
            }
        }

        // Draw ghost birds
        if (showGhostsEl.checked) {
            for (let b of sim.birds) {
                if (!b.alive || b === alphaBird) continue;
                drawBird(b, 0.15);
            }
        }

        // Draw alpha bird on top
        if (alphaBird) {
            drawBird(alphaBird, 1.0);
        }

        // Score display
        let currentBest = 0;
        for (let b of sim.birds) {
            if (b.score > currentBest) currentBest = b.score;
        }
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = '900 48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(currentBest.toString(), CANVAS_W / 2, 60);
        ctx.fillText(currentBest.toString(), CANVAS_W / 2, 60);

        ctx.restore(); // undo translate + scale + clip
    }

    function drawPipe(pipe) {
        if (sprites.pipeTop.complete) {
            let imgW = PIPE_W;
            let imgH = sprites.pipeTop.height * (PIPE_W / sprites.pipeTop.width);

            const drawExtendedPipe = (x, y, height, isTop) => {
                ctx.save();
                if (isTop) {
                    ctx.translate(x, y);
                    ctx.scale(1, -1);
                } else {
                    ctx.translate(x, y);
                }
                
                // Draw stem extension if the pipe needs to be taller than the image
                if (height > imgH) {
                    ctx.drawImage(sprites.pipeTop, 0, sprites.pipeTop.height - 2, sprites.pipeTop.width, 1, 0, imgH - 1, imgW, height - imgH + 2);
                }
                
                ctx.drawImage(sprites.pipeTop, 0, 0, imgW, imgH);
                ctx.restore();
            };

            // Top pipe
            drawExtendedPipe(pipe.x, pipe.gapY, pipe.gapY, true);

            // Bottom pipe
            drawExtendedPipe(pipe.x, pipe.gapY + PIPE_GAP, CANVAS_H - (pipe.gapY + PIPE_GAP), false);
        } else {
            // Fallback green rectangles
            ctx.fillStyle = '#73bf2e';
            ctx.fillRect(pipe.x, 0, PIPE_W, pipe.gapY);
            ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_W, CANVAS_H - pipe.gapY - PIPE_GAP);
            ctx.strokeStyle = '#5a9e1e';
            ctx.lineWidth = 2;
            ctx.strokeRect(pipe.x, 0, PIPE_W, pipe.gapY);
            ctx.strokeRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_W, CANVAS_H - pipe.gapY - PIPE_GAP);
        }
    }

    let birdFrame = 0;
    function drawBird(bird, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;

        let birdSprites = [sprites.bird1, sprites.bird2, sprites.bird3];
        let spriteIdx = Math.floor(birdFrame / 8) % 3;
        let sprite = birdSprites[spriteIdx];

        // Rotate bird based on velocity
        let angle = Math.max(-0.5, Math.min(bird.vel / 15, 1.0));
        ctx.translate(BIRD_X + BIRD_W / 2, bird.y + BIRD_H / 2);
        ctx.rotate(angle);

        if (sprite && sprite.complete) {
            ctx.drawImage(sprite, -BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);
        } else {
            ctx.fillStyle = '#f5d63d';
            ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);
        }

        ctx.restore();
    }

    // ---- Score Chart ----
    function drawChart() {
        let w = chartCanvas.width;
        let h = chartCanvas.height;
        chartCtx.clearRect(0, 0, w, h);
        if (scoreHistory.length < 2) return;

        let maxVal = Math.max(...scoreHistory, 1);

        chartCtx.strokeStyle = '#4ecdc4';
        chartCtx.lineWidth = 2;
        chartCtx.beginPath();
        for (let i = 0; i < scoreHistory.length; i++) {
            let x = (i / (scoreHistory.length - 1)) * w;
            let y = h - (scoreHistory[i] / maxVal) * (h - 10) - 5;
            if (i === 0) chartCtx.moveTo(x, y);
            else chartCtx.lineTo(x, y);
        }
        chartCtx.stroke();

        chartCtx.lineTo(w, h);
        chartCtx.lineTo(0, h);
        chartCtx.closePath();
        chartCtx.fillStyle = 'rgba(78, 205, 196, 0.1)';
        chartCtx.fill();
    }

    // ---- UI Update ----
    function updateUI() {
        genCountEl.textContent = agent.gamesPlayed;
        bestScoreEl.textContent = agent.bestScore;
        epsilonValEl.textContent = (agent.epsilon * 100).toFixed(1) + '%';
        qStatesEl.textContent = agent.stateCount;

        let alive = sim.birds.filter(b => b.alive).length;
        aliveCountEl.textContent = alive + '/' + sim.birds.length;

        let currentBest = 0;
        for (let b of sim.birds) {
            if (b.alive && b.score > currentBest) currentBest = b.score;
        }
        alphaScoreEl.textContent = currentBest;

        drawChart();
    }

    // ============================================================
    // MAIN LOOP
    // ============================================================
    function mainLoop() {
        if (speed === 0) {
            // MAX speed: run as many ticks as possible per frame
            let startTime = performance.now();
            while (performance.now() - startTime < 50) {
                let alive = trainStep();
                birdFrame++;
                if (alive === 0) endGeneration();
            }
            render();
            updateUI();
        } else if (speed > 1) {
            for (let i = 0; i < speed; i++) {
                let alive = trainStep();
                birdFrame++;
                if (alive === 0) endGeneration();
            }
            render();
            updateUI();
        } else {
            let alive = trainStep();
            birdFrame++;
            if (alive === 0) endGeneration();
            render();
            updateUI();
        }

        requestAnimationFrame(mainLoop);
    }

    // ---- Start ----
    setTimeout(() => {
        updateUI();
        requestAnimationFrame(mainLoop);
    }, 300);
})();
