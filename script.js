// ============================================================
//  Missionaries & Cannibals – Educational AI Simulator
//  Algorithms: DFS (with backtracking), BFS, A*
// ============================================================

// --- State & Problem definition ---------------------------
// State: { m: missionaries on LEFT, c: cannibals on LEFT, b: 1=boat on left, 0=boat on right }
const INITIAL = { m: 3, c: 3, b: 1 };
const GOAL = { m: 0, c: 0, b: 0 };

// All moves the boat can carry (at least 1 person, at most 2)
const ALL_MOVES = [
    { dm: 1, dc: 0, label: '1 Missionary' },
    { dm: 2, dc: 0, label: '2 Missionaries' },
    { dm: 0, dc: 1, label: '1 Cannibal' },
    { dm: 0, dc: 2, label: '2 Cannibals' },
    { dm: 1, dc: 1, label: '1 Missionary and 1 Cannibal' },
];

function toKey(s) { return `${s.m}-${s.c}-${s.b}`; }

function isGoal(s) { return s.m === 0 && s.c === 0 && s.b === 0; }

// Returns true if state is safe (missionaries never outnumbered)
function isValid(m, c) {
    if (m < 0 || c < 0 || m > 3 || c > 3) return false;
    if (m > 0 && c > m) return false;       // left side
    const mr = 3 - m, cr = 3 - c;
    if (mr > 0 && cr > mr) return false;    // right side
    return true;
}

// Get successors with move labels
function successors(s) {
    const sign = s.b === 1 ? -1 : 1;      // boat leaving left: subtract; leaving right: add
    const results = [];
    for (const mv of ALL_MOVES) {
        const nm = s.m + sign * mv.dm;
        const nc = s.c + sign * mv.dc;
        const nb = s.b === 1 ? 0 : 1;
        if (isValid(nm, nc)) {
            results.push({ state: { m: nm, c: nc, b: nb }, move: mv });
        }
    }
    return results;
}

// A* heuristic: estimate moves remaining
function heuristic(s) {
    return Math.ceil((s.m + s.c) / 2);
}

// ============================================================
//  Build algorithm-specific FRAME sequences for animation
//  Each frame = { state, prevState, type, move, reason, logic, algInfo, explored }
//  type: 'explore' | 'backtrack' | 'solution'
// ============================================================

// ---------- DFS FRAME BUILDER ----------
function buildDFSFrames() {
    const frames = [];
    const visited = new Set();
    let exploredCount = 0;

    // Recursive DFS; returns true if goal reached
    function dfs(s, path, moveLabel) {
        const key = toKey(s);
        visited.add(key);
        exploredCount++;
        const prev = path.length > 0 ? path[path.length - 1] : null;
        const isSol = isGoal(s);

        frames.push({
            state: { ...s },
            prevState: prev ? { ...prev } : null,
            type: 'explore',
            move: moveLabel || 'Start',
            reason: isSol
                ? 'Goal reached! All people safely on right bank.'
                : 'DFS dives deeper into this path before trying others.',
            logic: `DFS explores one path as deep as possible. It placed this state on its stack and will continue from here.\n\nStates Explored So Far: ${exploredCount}`,
            algInfo: 'DFS uses a Stack (LIFO). It always expands the most recently discovered state.',
            explored: exploredCount,
        });

        if (isSol) return [...path, s]; // full path including goal

        const nexts = successors(s);
        for (const { state: ns, move: mv } of nexts) {
            if (!visited.has(toKey(ns))) {
                const result = dfs(ns, [...path, s], mv.label + (s.b === 1 ? ' → Right' : ' → Left'));
                if (result) return result;
            }
        }

        // Backtrack
        frames.push({
            state: { ...s },
            prevState: prev ? { ...prev } : null,
            type: 'backtrack',
            move: 'BACKTRACK',
            reason: 'Dead end or all paths from here explored. DFS backtracks to try another branch.',
            logic: `No more valid states to explore from here.\nDFS backtracks to the previous state and tries the next alternative.\n\nStates Explored So Far: ${exploredCount}`,
            algInfo: 'DFS uses a Stack (LIFO). It always expands the most recently discovered state.',
            explored: exploredCount,
        });

        return null;
    }

    const solutionPath = dfs(INITIAL, [], null);
    return { frames, path: solutionPath || null };
}

// ---------- BFS FRAME BUILDER ----------
function buildBFSFrames() {
    const frames = [];
    const visited = new Set();
    visited.add(toKey(INITIAL));
    let exploredCount = 0;
    let level = 0;

    // Queue entries: { state, path, moveLabel, prevState }
    let queue = [{ state: INITIAL, path: [INITIAL], moveLabel: 'Start', prevState: null }];

    while (queue.length > 0) {
        level++;
        const nextQueue = [];
        const levelSize = queue.length;
        frames.push({
            state: null, // level marker
            prevState: null,
            type: 'level',
            move: `BFS exploring Level ${level} — checking ${levelSize} state${levelSize > 1 ? 's' : ''} simultaneously`,
            reason: `BFS examines all states at depth ${level - 1} before moving deeper.`,
            logic: `BFS uses a Queue (FIFO). Before going deeper, it fully explores every state at the current level.\n\nCurrent Level: ${level}\nStates in queue this round: ${levelSize}`,
            algInfo: 'BFS uses a Queue (FIFO). Guarantees the SHORTEST path.',
            explored: exploredCount,
        });

        for (const current of queue) {
            exploredCount++;
            frames.push({
                state: { ...current.state },
                prevState: current.prevState ? { ...current.prevState } : null,
                type: 'explore',
                move: current.moveLabel,
                reason: isGoal(current.state)
                    ? 'Goal state reached! BFS guarantees this is the shortest path.'
                    : `BFS examines this state as part of Level ${level} breadth exploration.`,
                logic: `BFS dequeues the front of the queue and examines it.\n\nLevel: ${level} | States Explored: ${exploredCount}`,
                algInfo: 'BFS uses a Queue (FIFO). Guarantees the SHORTEST path.',
                explored: exploredCount,
            });

            if (isGoal(current.state)) {
                return { frames, path: current.path };
            }

            for (const { state: ns, move: mv } of successors(current.state)) {
                const nk = toKey(ns);
                if (!visited.has(nk)) {
                    visited.add(nk);
                    const dir = current.state.b === 1 ? '→ Right' : '← Left';
                    nextQueue.push({
                        state: ns,
                        path: [...current.path, ns],
                        moveLabel: `${mv.label} ${dir}`,
                        prevState: current.state,
                    });
                }
            }
        }
        queue = nextQueue;
    }
    return { frames, path: null };
}

// ---------- A* FRAME BUILDER ----------
function buildAStarFrames() {
    const frames = [];
    let exploredCount = 0;
    const gScore = new Map();
    const visited = new Set();
    gScore.set(toKey(INITIAL), 0);

    // open list sorted by f = g + h
    let openList = [{
        state: INITIAL,
        path: [INITIAL],
        g: 0,
        f: heuristic(INITIAL),
        moveLabel: 'Start',
        prevState: null,
    }];

    while (openList.length > 0) {
        // Pick node with lowest f
        openList.sort((a, b) => a.f - b.f);
        const current = openList.shift();
        const ck = toKey(current.state);

        if (visited.has(ck)) continue;
        visited.add(ck);
        exploredCount++;

        const h = heuristic(current.state);
        const g = current.g;
        const f = g + h;

        frames.push({
            state: { ...current.state },
            prevState: current.prevState ? { ...current.prevState } : null,
            type: isGoal(current.state) ? 'solution' : 'explore',
            move: current.moveLabel,
            reason: isGoal(current.state)
                ? 'Goal reached! A* found the optimal path using heuristics.'
                : `A* chose this state because it has the lowest f(n) = ${f}.`,
            logic: `A* selected this state because it has the best f(n) score.\n\n  g(n) = ${g}  (steps taken so far)\n  h(n) = ${h}  (estimated steps to goal)\n  f(n) = ${f}  (priority score)\n\nLower f(n) = higher priority.\nStates Explored: ${exploredCount}`,
            algInfo: 'A* uses a Priority Queue sorted by f(n) = g(n) + h(n). Finds optimal path intelligently.',
            explored: exploredCount,
        });

        if (isGoal(current.state)) return { frames, path: current.path };

        for (const { state: ns, move: mv } of successors(current.state)) {
            const nk = toKey(ns);
            if (visited.has(nk)) continue;
            const ng = g + 1;
            const nh = heuristic(ns);
            const nf = ng + nh;
            const existing = gScore.get(nk);
            if (existing === undefined || ng < existing) {
                gScore.set(nk, ng);
                const dir = current.state.b === 1 ? '→ Right' : '← Left';
                openList.push({
                    state: ns,
                    path: [...current.path, ns],
                    g: ng,
                    f: nf,
                    moveLabel: `${mv.label} ${dir}`,
                    prevState: current.state,
                });
            }
        }
    }
    return { frames, path: null };
}

// ============================================================
//  DOM Helpers
// ============================================================
const leftCharsEl = document.getElementById('left-characters');
const rightCharsEl = document.getElementById('right-characters');
const boatAreaEl = document.querySelector('.boat-area');
const dispAlgo = document.getElementById('disp-algo');
const dispStep = document.getElementById('disp-step');
const dispState = document.getElementById('disp-state');
const dispExplored = document.getElementById('disp-explored');
const messageDisplay = document.getElementById('message-display');
const panelMove = document.getElementById('panel-move');
const panelReason = document.getElementById('panel-reason');
const panelLogic = document.getElementById('panel-logic');
const algInfoBadge = document.getElementById('alg-info-badge');
const buttons = document.querySelectorAll('.simple-btn');

let animationTimeout = null;
let isPaused = false;
let currentFrames = [];
let currentFrameIdx = 0;

function toKey2(s) { return `${s.m}-${s.c}-${s.b}`; }

function stateToString(s) {
    if (!s) return '---';
    return `Left: ${s.m}M ${s.c}C | Right: ${3 - s.m}M ${3 - s.c}C | Boat: ${s.b === 1 ? 'Left' : 'Right'}`;
}

function renderBank(el, m, c) {
    let html = '';
    for (let i = 0; i < m; i++) html += '<span class="char">👨</span>';
    for (let i = 0; i < c; i++) html += '<span class="char">😈</span>';
    el.innerHTML = html || '<span class="empty-bank">—</span>';
}

function getMoveDiff(prev, curr) {
    if (!prev || !curr) return null;
    if (prev.b === curr.b) return null;
    const dm = prev.m - curr.m;
    const dc = prev.c - curr.c;
    const absDm = Math.abs(dm);
    const absDc = Math.abs(dc);
    
    if (absDm + absDc >= 1 && absDm + absDc <= 2) {
        if (prev.b === 1 && (dm < 0 || dc < 0)) return null;
        if (prev.b === 0 && (dm > 0 || dc > 0)) return null;
        return { dm: absDm, dc: absDc };
    }
    return null;
}

async function applyFrameAsync(frame, frameIdx, totalFrames) {
    const s = frame.state;
    const prev = frame.prevState;

    // --- STEP 1: Show explanation FIRST ---
    panelMove.textContent = frame.move;
    panelReason.textContent = frame.reason;

    // Algorithm Logic: keep it about the algorithm, not a step counter
    if (frame.isSolutionReplay) {
        panelLogic.innerHTML = 'Replaying the optimal solution path found by the algorithm.';
    } else {
        panelLogic.innerHTML = frame.logic.replace(/\n/g, '<br>');
    }
    if (algInfoBadge) algInfoBadge.textContent = frame.algInfo;

    // Update step counter only for non-solution-replay frames
    if (!frame.isSolutionReplay) {
        dispStep.textContent = frameIdx;
    }
    dispExplored.textContent = frame.explored;

    const typeLabel = { explore: '🔍 Exploring', backtrack: '↩ Backtracking', solution: '✅ Solution Step', level: '📶 New Level' };
    messageDisplay.textContent = typeLabel[frame.type] || '';
    messageDisplay.className = 'message-display msg-' + frame.type;

    const simArea = document.querySelector('.simulation-area');
    simArea.classList.remove('state-backtrack', 'state-explore', 'state-solution', 'state-level');
    if (frame.type === 'backtrack') simArea.classList.add('state-backtrack');
    else if (frame.type === 'solution') simArea.classList.add('state-solution');
    else if (frame.type === 'level') simArea.classList.add('state-level');
    else simArea.classList.add('state-explore');

    if (!s) return;

    // --- STEP 2: Pause 1 second so viewer reads the explanation ---
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (currentFrames.length === 0) return;
    if (isPaused) return;

    // --- STEP 3: Animate boat movement ---
    let passengersEl = document.getElementById('boat-passengers');
    if (!passengersEl) {
        passengersEl = document.createElement('div');
        passengersEl.id = 'boat-passengers';
        passengersEl.style.position = 'absolute';
        passengersEl.style.top = '-10px';
        passengersEl.style.left = '50%';
        passengersEl.style.transform = 'translateX(-50%)';
        passengersEl.style.display = 'flex';
        passengersEl.style.gap = '2px';
        passengersEl.style.fontSize = '1.5rem';
        boatAreaEl.appendChild(passengersEl);
    }

    const diff = getMoveDiff(prev, s);

    if (diff && frame.type !== 'backtrack') {
        boatAreaEl.style.transition = 'none';
        boatAreaEl.style.left = prev.b === 1 ? '5%' : 'calc(100% - 90px)';

        renderBank(leftCharsEl, prev.m - (prev.b === 1 ? diff.dm : 0), prev.c - (prev.b === 1 ? diff.dc : 0));
        renderBank(rightCharsEl, (3 - prev.m) - (prev.b === 0 ? diff.dm : 0), (3 - prev.c) - (prev.b === 0 ? diff.dc : 0));
        renderBank(passengersEl, diff.dm, diff.dc);

        void boatAreaEl.offsetHeight;
        boatAreaEl.style.transition = 'left 1.2s ease-in-out';
        boatAreaEl.style.left = s.b === 1 ? '5%' : 'calc(100% - 90px)';

        await new Promise(resolve => setTimeout(resolve, 1200));
        if (currentFrames.length === 0) return;

        // --- STEP 4: Update state after boat arrives ---
        passengersEl.innerHTML = '';
        renderBank(leftCharsEl, s.m, s.c);
        renderBank(rightCharsEl, 3 - s.m, 3 - s.c);
    } else {
        boatAreaEl.style.transition = 'none';
        boatAreaEl.style.left = s.b === 1 ? '5%' : 'calc(100% - 90px)';
        passengersEl.innerHTML = '';
        renderBank(leftCharsEl, s.m, s.c);
        renderBank(rightCharsEl, 3 - s.m, 3 - s.c);
        void boatAreaEl.offsetHeight;
    }

    // --- STEP 4: Update state display ---
    dispState.textContent = stateToString(s);
}

// ============================================================
//  Animation runner
// ============================================================
function runFrames(frames) {
    currentFrames = frames;
    currentFrameIdx = 0;
    isPaused = false;

    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) pauseBtn.disabled = false;
    updatePauseButton();

    nextFrame();
}

async function nextFrame() {
    if (currentFrameIdx >= currentFrames.length) {
        messageDisplay.textContent = '✅ Simulation Complete!';
        buttons.forEach(b => {
            if (b.id !== 'btn-pause') b.disabled = false;
        });
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) pauseBtn.disabled = true;
        return;
    }

    if (isPaused) {
        return;
    }

    const frame = currentFrames[currentFrameIdx];
    await applyFrameAsync(frame, currentFrameIdx, currentFrames.length);
    
    if (currentFrames.length === 0) return;
    
    currentFrameIdx++;
    
    if (isPaused) {
        return;
    }

    let extraDelay = 0;
    if (frame.state && getMoveDiff(frame.prevState, frame.state) && frame.type !== 'backtrack') {
        extraDelay = 1000 + 1200; // 1s explanation pause + 1.2s boat animation
    } else if (frame.state) {
        extraDelay = 1000; // 1s explanation pause
    }

    const baseDelay = frame.isSolutionReplay ? 3500
        : frame.type === 'backtrack' ? 2000
            : frame.type === 'level' ? 1000
                : 2500;

    const finalDelay = Math.max(0, baseDelay - extraDelay);
    animationTimeout = setTimeout(nextFrame, finalDelay);
}

function togglePause() {
    isPaused = !isPaused;
    updatePauseButton();
    if (!isPaused) {
        // Resuming: disable other buttons again
        buttons.forEach(b => {
            if (b.id !== 'btn-pause') b.disabled = true;
        });
        nextFrame();
    } else {
        // Paused: enable other buttons
        buttons.forEach(b => b.disabled = false);
        if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = null;
        }
    }
}

function updatePauseButton() {
    const btn = document.getElementById('btn-pause');
    if (!btn) return;
    btn.textContent = isPaused ? 'Resume' : 'Pause';
}

// ============================================================
//  Public API called by HTML buttons
// ============================================================
function resetSimulation() {
    if (animationTimeout) { clearTimeout(animationTimeout); animationTimeout = null; }
    isPaused = false;
    currentFrames = [];
    currentFrameIdx = 0;
    updatePauseButton();

    renderBank(leftCharsEl, 3, 3);
    renderBank(rightCharsEl, 0, 0);
    
    let passengersEl = document.getElementById('boat-passengers');
    if (passengersEl) passengersEl.innerHTML = '';
    
    boatAreaEl.style.transition = 'none';
    boatAreaEl.style.left = '5%';
    void boatAreaEl.offsetHeight; // force reflow
    dispAlgo.textContent = 'None';
    dispStep.textContent = '0';
    dispExplored.textContent = '0';
    dispState.textContent = stateToString(INITIAL);
    panelMove.textContent = 'Waiting to start...';
    panelReason.textContent = 'Waiting to start...';
    panelLogic.textContent = 'Select an algorithm to begin.';
    if (algInfoBadge) algInfoBadge.textContent = '';
    messageDisplay.textContent = 'Ready to solve';
    messageDisplay.className = 'message-display';

    const simArea = document.querySelector('.simulation-area');
    simArea.classList.remove('state-backtrack', 'state-explore', 'state-solution', 'state-level');

    document.querySelectorAll('.algo-card').forEach(c => {
        c.style.border = '1px solid #333';
    });
    buttons.forEach(b => b.disabled = false);
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) pauseBtn.disabled = true;
}

function runAlgorithm(algo) {
    resetSimulation();
    buttons.forEach(b => b.disabled = true);
    dispAlgo.textContent = algo;

    // Highlight matching card
    const cardMap = { DFS: 'card-dfs', BFS: 'card-bfs', 'A*': 'card-ast' };
    if (cardMap[algo]) {
        document.getElementById(cardMap[algo]).style.border = '1px solid #fff';
    }

    messageDisplay.textContent = `Building ${algo} search frames…`;

    setTimeout(() => {
        let result;
        if (algo === 'DFS') result = buildDFSFrames();
        else if (algo === 'BFS') result = buildBFSFrames();
        else result = buildAStarFrames();

        let frames = result.frames;
        let path = result.path;

        if (path) {
            const lastFrame = frames[frames.length - 1];
            frames.push({
                state: null,
                prevState: null,
                type: 'level', 
                move: 'Optimal Path Found!',
                reason: 'Algorithm finished exploring. Now replaying the correct sequence of moves.',
                logic: 'Resetting to the initial state to replay the final solution path step-by-step.',
                algInfo: lastFrame.algInfo,
                explored: lastFrame.explored,
            });

            let prevS = null;
            for (let i = 0; i < path.length; i++) {
                const ps = path[i];
                let moveLabel = i === 0 ? 'Start' : 'Step ' + i;
                if (i > 0) {
                    const diff = getMoveDiff(prevS, ps);
                    if (diff) {
                         const dir = prevS.b === 1 ? '→ Right' : '← Left';
                         const pLabel = [];
                         if (diff.dm > 0) pLabel.push(diff.dm + (diff.dm > 1 ? ' Missionaries' : ' Missionary'));
                         if (diff.dc > 0) pLabel.push(diff.dc + (diff.dc > 1 ? ' Cannibals' : ' Cannibal'));
                         moveLabel = pLabel.join(' and ') + ' ' + dir;
                    }
                }
                
                frames.push({
                    state: { ...ps },
                    prevState: prevS ? { ...prevS } : null,
                    type: 'solution',
                    isSolutionReplay: true,
                    move: moveLabel,
                    reason: i === 0 ? 'Starting state for the final solution replay.' : 'A correct move in the solution path.',
                    logic: `Solution Step ${i} of ${path.length - 1}`,
                    algInfo: lastFrame.algInfo,
                    explored: lastFrame.explored,
                });
                prevS = ps;
            }
        }

        dispExplored.textContent = frames[frames.length - 1].explored;
        messageDisplay.textContent = `${algo} ready — ${frames.length} frames | ${frames[frames.length - 1].explored} states explored`;
        runFrames(frames);
    }, 300);
}

// ============================================================
//  Boot
// ============================================================
window.onload = resetSimulation;
