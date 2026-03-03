const TRACK_LENGTH = 20;
const TOTAL_ROUNDS = 10;
const LEADERBOARD_KEY = "colorSprintLeaderboard";

const players = [
  { id: 1, name: "Player 1", position: 0, score: 0, className: "player-one", avatar: "🦖" },
  { id: 2, name: "Player 2", position: 0, score: 0, className: "player-two", avatar: "🦕" },
];

const state = {
  currentPlayerIndex: 0,
  round: 1,
  currentRoll: 0,
  gameActive: false,
  obstacleMap: new Map(),
};

const turnIndicator = document.getElementById("turn-indicator");
const roundIndicator = document.getElementById("round-indicator");
const currentRoll = document.getElementById("current-roll");
const laneOne = document.getElementById("lane-1");
const laneTwo = document.getElementById("lane-2");
const message = document.getElementById("message");
const scoreList = document.getElementById("score-list");
const leaderboardList = document.getElementById("leaderboard-list");
const startGameBtn = document.getElementById("start-game");
const rollBtn = document.getElementById("roll-btn");
const jumpBtn = document.getElementById("jump-btn");
const playerOneNameInput = document.getElementById("player-one-name");
const playerTwoNameInput = document.getElementById("player-two-name");
const bestScoreNode = document.getElementById("best-score");
const liveScoreNode = document.getElementById("live-score");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toScore(value) {
  return String(value).padStart(5, "0");
}

function configureObstacles() {
  state.obstacleMap.clear();
  players.forEach((player) => {
    const positions = new Set();
    while (positions.size < 4) {
      positions.add(randomInt(4, TRACK_LENGTH - 2));
    }
    state.obstacleMap.set(player.id, [...positions].sort((a, b) => a - b));
  });
}

function syncNames() {
  players[0].name = playerOneNameInput.value.trim() || "Player 1";
  players[1].name = playerTwoNameInput.value.trim() || "Player 2";
}

function getCurrentPlayer() {
  return players[state.currentPlayerIndex];
}

function resetGame() {
  players.forEach((player) => {
    player.position = 0;
    player.score = 0;
  });

  state.currentPlayerIndex = 0;
  state.round = 1;
  state.currentRoll = 0;
  state.gameActive = true;
  configureObstacles();
  syncNames();

  rollBtn.disabled = false;
  jumpBtn.disabled = true;
  message.textContent = "Game started! Roll to move.";
  updateUI();
}

function createEmojiNode(className, text, leftPercent) {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  node.style.left = `${leftPercent}%`;
  return node;
}

function renderLane(laneNode, player) {
  laneNode.innerHTML = "";
  laneNode.appendChild(createEmojiNode("cloud", "☁️", 16));
  laneNode.appendChild(createEmojiNode("cloud", "☁️", 72));

  const runnerPercent = (player.position / TRACK_LENGTH) * 92;
  const runner = createEmojiNode(`runner ${player.className}`, player.avatar, runnerPercent);
  laneNode.appendChild(runner);

  const obstacles = state.obstacleMap.get(player.id) || [];
  obstacles.forEach((position) => {
    const obstaclePercent = (position / TRACK_LENGTH) * 92;
    laneNode.appendChild(createEmojiNode("obstacle", "🌵", obstaclePercent));
  });
}

function renderTrack() {
  renderLane(laneOne, players[0]);
  renderLane(laneTwo, players[1]);
}

function renderScores() {
  scoreList.innerHTML = players
    .map((player) => `<li><strong>${player.name}</strong>: ${player.score} pts</li>`)
    .join("");
}

function loadLeaderboard() {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function renderLeaderboard() {
  const entries = loadLeaderboard();
  leaderboardList.innerHTML = entries.length
    ? entries.map((entry) => `<li>${entry.name} — ${entry.score} pts</li>`).join("")
    : "<li>No records yet. Play a game!</li>";

  const best = entries[0]?.score || 0;
  bestScoreNode.textContent = toScore(best);
}

function updateUI() {
  const current = getCurrentPlayer();
  turnIndicator.textContent = current.name;
  roundIndicator.textContent = state.round;
  currentRoll.textContent = state.currentRoll;
  liveScoreNode.textContent = toScore(players[0].score + players[1].score);

  renderTrack();
  renderScores();
  renderLeaderboard();
}

function finishGame() {
  state.gameActive = false;
  rollBtn.disabled = true;
  jumpBtn.disabled = true;

  const winner = [...players].sort((a, b) => b.score - a.score)[0];
  message.textContent = `Game over! Winner: ${winner.name} (${winner.score} pts).`;

  const entries = loadLeaderboard();
  entries.push(...players.map((player) => ({ name: player.name, score: player.score })));
  entries.sort((a, b) => b.score - a.score);
  saveLeaderboard(entries.slice(0, 5));

  updateUI();
}

function endTurn() {
  if (state.currentPlayerIndex === players.length - 1) {
    state.round += 1;
  }

  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
  state.currentRoll = 0;
  rollBtn.disabled = false;
  jumpBtn.disabled = true;

  if (state.round > TOTAL_ROUNDS) {
    finishGame();
    return;
  }

  message.textContent = `${getCurrentPlayer().name}'s turn. Roll to move.`;
  updateUI();
}

function handleRoll() {
  if (!state.gameActive) {
    return;
  }

  const player = getCurrentPlayer();
  const roll = randomInt(1, 4);
  state.currentRoll = roll;

  const nextPosition = Math.min(TRACK_LENGTH, player.position + roll);
  const obstacles = state.obstacleMap.get(player.id) || [];
  const hitObstacle = obstacles.some((position) => position > player.position && position <= nextPosition);

  if (hitObstacle) {
    message.textContent = `${player.name} rolled ${roll} and hit a cactus. Jump now!`;
    rollBtn.disabled = true;
    jumpBtn.disabled = false;
    updateUI();
    return;
  }

  player.position = nextPosition;
  player.score += roll * 10;
  message.textContent = `${player.name} dashed forward ${roll} steps.`;
  endTurn();
}

function handleJump() {
  if (!state.gameActive) {
    return;
  }

  const player = getCurrentPlayer();
  const success = Math.random() > 0.35;

  if (success) {
    player.position = Math.min(TRACK_LENGTH, player.position + state.currentRoll);
    player.score += state.currentRoll * 12;
    message.textContent = `${player.name} cleared the cactus!`;
  } else {
    player.score = Math.max(0, player.score - 8);
    message.textContent = `${player.name} tripped. -8 points.`;
  }

  endTurn();
}

startGameBtn.addEventListener("click", resetGame);
rollBtn.addEventListener("click", handleRoll);
jumpBtn.addEventListener("click", handleJump);

renderTrack();
renderScores();
renderLeaderboard();
