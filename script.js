const TRACK_LENGTH = 20;
const TOTAL_ROUNDS = 10;
const LEADERBOARD_KEY = "colorSprintLeaderboard";

const players = [
  { id: 1, name: "Player 1", position: 0, score: 0, className: "player-one" },
  { id: 2, name: "Player 2", position: 0, score: 0, className: "player-two" },
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
const track = document.getElementById("track");
const message = document.getElementById("message");
const scoreList = document.getElementById("score-list");
const leaderboardList = document.getElementById("leaderboard-list");
const startGameBtn = document.getElementById("start-game");
const rollBtn = document.getElementById("roll-btn");
const jumpBtn = document.getElementById("jump-btn");
const playerOneNameInput = document.getElementById("player-one-name");
const playerTwoNameInput = document.getElementById("player-two-name");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function configureObstacles() {
  state.obstacleMap.clear();
  players.forEach((player) => {
    const positions = new Set();
    while (positions.size < 4) {
      positions.add(randomInt(4, TRACK_LENGTH - 2));
    }
    state.obstacleMap.set(player.id, positions);
  });
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

  rollBtn.disabled = false;
  jumpBtn.disabled = true;
  message.textContent = "Game started! Roll to move.";

  syncNames();
  updateUI();
}

function syncNames() {
  players[0].name = playerOneNameInput.value.trim() || "Player 1";
  players[1].name = playerTwoNameInput.value.trim() || "Player 2";
}

function getCurrentPlayer() {
  return players[state.currentPlayerIndex];
}

function renderTrack() {
  track.innerHTML = "";
  players.forEach((player) => {
    const lane = document.createElement("div");
    lane.className = "lane";

    const obstacle = document.createElement("span");
    obstacle.className = "obstacle";
    obstacle.textContent = "🪨";
    const nextObstacle = [...state.obstacleMap.get(player.id)].find(
      (position) => position >= player.position
    );
    obstacle.style.left = `${((nextObstacle ?? TRACK_LENGTH) / TRACK_LENGTH) * 100}%`;

    const runner = document.createElement("span");
    runner.className = `runner ${player.className}`;
    runner.textContent = player.id === 1 ? "🦖" : "🦕";
    runner.style.left = `${(player.position / TRACK_LENGTH) * 100}%`;

    lane.append(runner, obstacle);
    track.appendChild(lane);
  });
}

function renderScores() {
  scoreList.innerHTML = players
    .map(
      (player) =>
        `<li><strong>${player.name}</strong>: ${player.score} pts (position ${player.position})</li>`
    )
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
    ? entries
        .map(
          (entry) =>
            `<li>${entry.name} — ${entry.score} pts <small>(${entry.when})</small></li>`
        )
        .join("")
    : "<li>No records yet. Play a game!</li>";
}

function updateUI() {
  const current = getCurrentPlayer();
  turnIndicator.textContent = current.name;
  roundIndicator.textContent = state.round;
  currentRoll.textContent = state.currentRoll;

  renderTrack();
  renderScores();
  renderLeaderboard();
}

function endTurn() {
  if (state.currentPlayerIndex === 1) {
    state.round += 1;
  }
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % players.length;
  state.currentRoll = 0;
  rollBtn.disabled = false;
  jumpBtn.disabled = true;

  if (state.round > TOTAL_ROUNDS) {
    finishGame();
  } else {
    message.textContent = `${getCurrentPlayer().name}'s turn. Roll to move.`;
    updateUI();
  }
}

function finishGame() {
  state.gameActive = false;
  rollBtn.disabled = true;
  jumpBtn.disabled = true;

  const winner = [...players].sort((a, b) => b.score - a.score)[0];
  message.textContent = `Game over! Winner: ${winner.name} with ${winner.score} points.`;

  const entries = loadLeaderboard();
  const stamp = new Date().toLocaleDateString();
  entries.push(...players.map((player) => ({ name: player.name, score: player.score, when: stamp })));
  entries.sort((a, b) => b.score - a.score);
  saveLeaderboard(entries.slice(0, 5));

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
  const obstacles = state.obstacleMap.get(player.id);
  const hitObstacle = [...obstacles].some(
    (position) => position > player.position && position <= nextPosition
  );

  if (hitObstacle) {
    message.textContent = `${player.name} rolled ${roll} but hit an obstacle. Press Jump!`;
    jumpBtn.disabled = false;
    rollBtn.disabled = true;
  } else {
    player.position = nextPosition;
    player.score += roll * 10;
    message.textContent = `${player.name} rolled ${roll} and moved forward!`;
    endTurn();
  }

  updateUI();
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
    message.textContent = `Nice jump! ${player.name} cleared the obstacle.`;
  } else {
    player.score = Math.max(0, player.score - 8);
    message.textContent = `${player.name} failed the jump and lost 8 points.`;
  }

  endTurn();
  updateUI();
}

startGameBtn.addEventListener("click", resetGame);
rollBtn.addEventListener("click", handleRoll);
jumpBtn.addEventListener("click", handleJump);

renderLeaderboard();
renderScores();
renderTrack();
