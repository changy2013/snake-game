const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let gameLoop = null;
let speed = 220;
let running = false;
let paused = false;

highScoreEl.textContent = highScore;

function init() {
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    speed = 150;
    scoreEl.textContent = score;
    placeFood();
}

function placeFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
    } while (snake.some(seg => seg.x === newFood.x && seg.y === newFood.y));
    food = newFood;
}

function update() {
    direction = { ...nextDirection };

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        placeFood();
        // Speed up slightly
        if (speed > 60) {
            speed -= 3;
            clearInterval(gameLoop);
            gameLoop = setInterval(update, speed);
        }
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    // Background
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines (subtle)
    ctx.strokeStyle = '#1a2744';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Snake
    snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#4ecca3' : '#38b28a';
        ctx.fillRect(
            seg.x * GRID_SIZE + 1,
            seg.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(
            seg.x * GRID_SIZE + 2,
            seg.y * GRID_SIZE + 2,
            GRID_SIZE / 2 - 2,
            GRID_SIZE / 2 - 2
        );
    });

    // Food
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

async function submitScore(playerName, finalScore) {
    try {
        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_name: playerName, score: finalScore })
        });
    } catch (e) {
        console.error('提交分数失败', e);
    }
}

async function loadLeaderboard() {
    try {
        const res = await fetch('/api/scores');
        return await res.json();
    } catch (e) {
        console.error('加载排行榜失败', e);
        return [];
    }
}

function showLeaderboard(rows) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    if (!rows.length) {
        list.innerHTML = '<li>暂无记录</li>';
        return;
    }
    rows.forEach((row, i) => {
        const li = document.createElement('li');
        const date = new Date(row.created_at).toLocaleDateString('zh-CN');
        li.textContent = `${i + 1}. ${row.player_name} — ${row.score} 分  (${date})`;
        if (i === 0) li.style.color = '#ffd700';
        else if (i === 1) li.style.color = '#c0c0c0';
        else if (i === 2) li.style.color = '#cd7f32';
        list.appendChild(li);
    });
    document.getElementById('leaderboard').style.display = 'block';
}

async function gameOver() {
    running = false;
    clearInterval(gameLoop);
    gameLoop = null;
    startBtn.textContent = '重新开始';
    startBtn.disabled = false;
    pauseBtn.disabled = true;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillStyle = '#eee';
    ctx.font = '18px sans-serif';
    ctx.fillText('得分: ' + score, canvas.width / 2, canvas.height / 2 + 25);

    if (score > 0) {
        const playerName = prompt(`得分: ${score}\n输入你的名字（留空则显示"匿名"）:`) || '匿名';
        await submitScore(playerName.trim() || '匿名', score);
    }

    const rows = await loadLeaderboard();
    showLeaderboard(rows);
}

function startGame() {
    init();
    draw();
    running = true;
    paused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = '暂停';
    gameLoop = setInterval(update, speed);
}

function togglePause() {
    if (!running) return;
    if (paused) {
        gameLoop = setInterval(update, speed);
        pauseBtn.textContent = '暂停';
        paused = false;
    } else {
        clearInterval(gameLoop);
        gameLoop = null;
        pauseBtn.textContent = '继续';
        paused = true;
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
            if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown': case 's': case 'S':
            if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft': case 'a': case 'A':
            if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight': case 'd': case 'D':
            if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
            break;
        case ' ':
            e.preventDefault();
            if (running) togglePause();
            break;
    }
});

// Button controls
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);

// Mobile controls
document.getElementById('up-btn').addEventListener('click', () => {
    if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
});
document.getElementById('down-btn').addEventListener('click', () => {
    if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
});
document.getElementById('left-btn').addEventListener('click', () => {
    if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
});
document.getElementById('right-btn').addEventListener('click', () => {
    if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
});

// Initial draw
init();
draw();
