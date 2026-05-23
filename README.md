# Flappy Bird

![GitHub stars](https://img.shields.io/github/stars/MachineLearning-Dev/FlappyBot?style=social)
![GitHub forks](https://img.shields.io/github/forks/MachineLearning-Dev/FlappyBot?style=social)
![GitHub issues](https://img.shields.io/github/issues/MachineLearning-Dev/FlappyBot)
![GitHub license](https://img.shields.io/github/license/MachineLearning-Dev/FlappyBot)

A machine learning clone of Flappy Bird that trains an AI using Q-Learning. The game engine is fully decoupled from rendering for parallel, high-speed training directly in the browser.

## Features

- **Q-Learning Agent:** Temporal Difference learning with reward shaping.
- **Parallel Training:** Trains up to 200 birds simultaneously.
- **Dynamic Fast-Forward:** Training speed control up to MAX headless speed.
- **Widgets and Dashboard:** Real-time chart and statistics to monitor progress.

## How to Run

Since the project uses ES6 modules and imports/exports local JSON files, it is recommended to run it using a local web server to avoid CORS issues.

**Option 1: Python**
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

**Option 2: Node.js (npx serve)**
```bash
npx serve
```

**Option 3: VS Code Live Server**
Right-click `index.html` and select **"Open with Live Server"**.

## Usage & Tasks

Once you have the game running, you can use the statistics panel to control the AI's training tasks:

- **Change Training Speed:** Select 1x, 5x, 20x, or MAX (headless mode for lightning-fast training).
- **Adjust Population:** Train 1, 10, 50, or 200 birds simultaneously per generation.
- **Export/Import Brain:** Save the current Q-Table as a JSON file, or import an existing one to resume training.
- **Streamer Mode:** Switch to a clean, UI-free endless mode where the best AI plays perfectly.

## Credits

- Made by Krshs90
- Bug fixed by Google Antigravity
