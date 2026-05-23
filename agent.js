// ============================================================
// Q-Learning Agent for Flappy Bird
// ============================================================
// Uses a compact state representation and proper TD(0) updates.
// The Q-table is shared across all birds in the population for
// massively parallel Hogwild-style training.
// ============================================================

class QAgent {
    constructor() {
        this.qTable = {};
        this.alpha = 0.7;       // High learning rate for fast convergence
        this.gamma = 0.95;      // Discount factor
        this.epsilon = 0.0;     // Start greedy — reward shaping guides exploration
        this.gamesPlayed = 0;
        this.bestScore = 0;

        this.load();
    }

    // ---- State Discretization ----
    // We discretize into very coarse bins so the agent re-visits
    // each state hundreds of times quickly, enabling fast learning.
    //
    // State = (dx_bin, dy_bin, vel_bin)
    // dx: distance to pipe → 8 bins
    // dy: offset from gap center → 9 bins
    // vel: velocity direction → 3 bins
    // Total: 8 * 9 * 3 = 216 states × 2 actions = 432 Q-values
    // This is TINY and converges in <100 generations.
    getState(dx, dy, vel) {
        // dx: how far is the next pipe? (0-400)
        // Clamp and bin into 8 buckets
        let bx = Math.min(7, Math.max(0, Math.floor(dx / 50)));

        // dy: how far are we from gap center? positive = gap is below
        // Clamp to [-200, 200] and bin into 9 buckets
        let cdy = Math.max(-200, Math.min(200, dy));
        let by = Math.floor((cdy + 200) / 50); // 0..8
        by = Math.min(8, Math.max(0, by));

        // vel: are we going up, flat, or down?
        let bv;
        if (vel < -3) bv = 0;       // going up fast
        else if (vel > 3) bv = 2;   // going down fast
        else bv = 1;                 // roughly flat

        return `${bx},${by},${bv}`;
    }

    getQ(state) {
        if (!this.qTable[state]) {
            // Initialize: slight bias towards NOT flapping.
            // In Flappy Bird, the correct action most frames is "do nothing"
            // and let gravity bring you towards the gap. Initializing flap
            // slightly lower discourages the "flap every frame" death spiral.
            this.qTable[state] = [0, -0.1]; // [no-flap, flap]
        }
        return this.qTable[state];
    }

    // Pick an action: 0 = do nothing, 1 = flap
    chooseAction(state) {
        if (Math.random() < this.epsilon) {
            // Explore: only flap 20% of the time during exploration
            return Math.random() < 0.2 ? 1 : 0;
        }
        let q = this.getQ(state);
        if (q[0] > q[1]) return 0;
        if (q[1] > q[0]) return 1;
        return Math.random() < 0.2 ? 1 : 0; // tie-break
    }

    // TD(0) update: Q(s,a) += alpha * (reward + gamma * max Q(s') - Q(s,a))
    learn(state, action, reward, nextState) {
        let q = this.getQ(state);
        let nextQ = this.getQ(nextState);
        let maxNextQ = Math.max(nextQ[0], nextQ[1]);
        q[action] += this.alpha * (reward + this.gamma * maxNextQ - q[action]);
    }

    // Terminal update: Q(s,a) += alpha * (reward - Q(s,a))
    learnTerminal(state, action, reward) {
        let q = this.getQ(state);
        q[action] += this.alpha * (reward - q[action]);
    }

    onGenerationEnd() {
        this.gamesPlayed++;
    }

    save() {
        try {
            localStorage.setItem('fb_qtable', JSON.stringify(this.qTable));
            localStorage.setItem('fb_eps', this.epsilon.toString());
            localStorage.setItem('fb_games', this.gamesPlayed.toString());
            localStorage.setItem('fb_best', this.bestScore.toString());
        } catch (e) { /* localStorage full */ }
    }

    load() {
        try {
            let saved = localStorage.getItem('fb_qtable');
            if (saved) {
                this.qTable = JSON.parse(saved);
                this.epsilon = parseFloat(localStorage.getItem('fb_eps')) || 0.0;
                this.gamesPlayed = parseInt(localStorage.getItem('fb_games')) || 0;
                this.bestScore = parseInt(localStorage.getItem('fb_best')) || 0;
            }
        } catch (e) {
            this.qTable = {};
        }
    }

    reset() {
        this.qTable = {};
        this.epsilon = 0.0;
        this.gamesPlayed = 0;
        this.bestScore = 0;
        localStorage.removeItem('fb_qtable');
        localStorage.removeItem('fb_eps');
        localStorage.removeItem('fb_games');
        localStorage.removeItem('fb_best');
    }

    get stateCount() {
        return Object.keys(this.qTable).length;
    }
}
