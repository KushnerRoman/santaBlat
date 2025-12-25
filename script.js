/**
 * Secret Santa App
 * Uses URL-based state to share game configuration between devices.
 * 
 * State encoded in URL param 'g':
 * JSON -> Base64 encoded string containing:
 * {
 *   names: ["Adam", ...],
 *   seed: 12345 (Random integer)
 * }
 */

// --- DOM Elements ---
const views = {
    setup: document.getElementById('view-setup'),
    share: document.getElementById('view-share'),
    selection: document.getElementById('view-selection'),
    pass: document.getElementById('view-pass'),
    reveal: document.getElementById('view-reveal')
};

const participantsList = document.getElementById('participants-list');
// Removed: const btnAddParticipant = document.getElementById('add-participant-btn');
const btnCreateGame = document.getElementById('create-game-btn');
const btnEnterGame = document.getElementById('enter-game-btn');
const inputShareLink = document.getElementById('share-link-input');
const btnCopyLink = document.getElementById('copy-link-btn');
const namesGrid = document.getElementById('names-grid');
// Removed: const btnReset = document.getElementById('reset-game-btn');

// Pass/Reveal Elements
const spanPassTarget = document.getElementById('pass-target-name');
const btnReadyReveal = document.getElementById('ready-reveal-btn');
const spanConfirmName = document.getElementById('confirm-name');
const btnCancelPass = document.getElementById('cancel-pass-btn');
const spanSantaName = document.getElementById('santa-name');
const divGiftBox = document.getElementById('gift-box');
const divRevealContent = document.getElementById('reveal-content');
const h1GifteeName = document.getElementById('giftee-name');
const btnFinishReveal = document.getElementById('finish-reveal-btn');

// --- State ---
let gameState = {
    names: ['Adam', 'Dima', 'Roma', 'Alisa', 'Maria', 'Anastasia'], // Pre-filled + 1 empty
    seed: null
};

// --- Initialization ---
function init() {
    // Check for game in URL
    const urlParams = new URLSearchParams(window.location.search);
    const gameData = urlParams.get('game');

    if (gameData) {
        try {
            const decoded = JSON.parse(atob(gameData));
            if (decoded.names && decoded.seed) {
                gameState = decoded;
                startGame(true); // Start in "Client" mode
                return;
            }
        } catch (e) {
            console.error("Invalid game data", e);
            alert("Invalid game link!");
        }
    }

    // No game? Show setup
    renderSetupInputs();
    showView('setup');
}

// --- Setup Logic ---
function renderSetupInputs() {
    participantsList.innerHTML = '';
    gameState.names.forEach((name, index) => {
        addInput(name, index);
    });
}

function addInput(value = '', index = null) {
    const div = document.createElement('div');
    div.className = 'input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Friend #${participantsList.children.length + 1}`;
    input.value = value;
    input.onchange = (e) => updateName(e, index);

    // Simple remove button if needed, but keeping it simple for now (clearing name = delete)

    div.appendChild(input);
    participantsList.appendChild(div);
}

// Removed: btnAddParticipant.onclick


function updateName(e, index) {
    // If index is null (newly added), find it
    // Actually simpler to just read all inputs when creating game
}

btnCreateGame.onclick = () => {
    // 1. Read Valid Names
    const inputs = participantsList.querySelectorAll('input');
    const validNames = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(name => name.length > 0);

    if (validNames.length < 3) {
        alert("You need at least 3 people for Secret Santa!");
        return;
    }

    // 2. Generate Seed
    const seed = Math.floor(Math.random() * 1000000);
    gameState = { names: validNames, seed: seed };

    // 3. Create Link
    const b64Data = btoa(JSON.stringify(gameState));
    const url = `${window.location.origin}${window.location.pathname}?game=${b64Data}`;

    inputShareLink.value = url;
    showView('share');
};

btnCopyLink.onclick = () => {
    inputShareLink.select();
    document.execCommand('copy');
    btnCopyLink.innerText = "Copied! ✅";
    setTimeout(() => btnCopyLink.innerText = "Copy", 2000);
};

btnEnterGame.onclick = () => {
    startGame();
};

// --- Game Logic ---

function startGame() {
    // Calculate Pairings Deterministically
    const matches = generateDerangement(gameState.names, gameState.seed);

    // Check LocalStorage for 'revealed' state
    const revealedName = localStorage.getItem(`santa_${gameState.seed}`);

    renderSelectionGrid(gameState.names, matches, revealedName);
    showView('selection');
}

function renderSelectionGrid(names, matches, revealedName) {
    namesGrid.innerHTML = '';

    // Sort names alphabetically for the grid so finding yourself is easy
    const sortedNames = [...names].sort();

    sortedNames.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'name-btn';
        btn.innerText = name;

        // If this user already saw their result
        if (revealedName && name === revealedName) {
            btn.classList.add('disabled');
            btn.innerText = `✅ ${name} (Done)`;
            btn.disabled = true;
        } else if (revealedName) {
            // Disable everyone else if I'm already done? 
            // Optional: Multi-user on same device support?
            // "remote" requirement suggests personal device.
            // Let's allow strictly 1 reveal per device for safety.
            btn.classList.add('disabled');
            btn.disabled = true;
        }

        btn.onclick = () => onSelectIdentity(name, matches[name]);
        namesGrid.appendChild(btn);
    });
}

function onSelectIdentity(name, target) {
    // Security Prompt
    spanPassTarget.innerText = name;
    spanConfirmName.innerText = name;

    // Setup Pass View
    btnReadyReveal.onclick = () => onConfirmIdentity(name, target);

    showView('pass');
}

function onConfirmIdentity(name, target) {
    spanSantaName.innerText = name;
    h1GifteeName.innerText = target;

    // Reset Gift Animation
    divGiftBox.classList.remove('open');
    divRevealContent.classList.add('hidden');
    divGiftBox.style.display = 'block';

    divGiftBox.onclick = () => {
        divGiftBox.classList.add('open');
        setTimeout(() => {
            divGiftBox.style.display = 'none';
            divRevealContent.classList.remove('hidden');

            // Mark as done
            localStorage.setItem(`santa_${gameState.seed}`, name);
        }, 800);
    };

    btnFinishReveal.onclick = () => {
        startGame(); // Re-render grid with 'Done' state
    };

    showView('reveal');
}

btnCancelPass.onclick = () => {
    showView('selection');
};

// Removed: btnReset.onclick


// --- Helper Functions ---

function showView(viewId) {
    Object.values(views).forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    views[viewId].classList.remove('hidden');
    views[viewId].classList.add('active');
}

/**
 * Derangement Logic (Seeded)
 * A derangement is a permutation where no element appears in its original position.
 * i.e., santa[i] != i
 */
function generateDerangement(names, seed) {
    const rng = mulberry32(seed);
    let pool = [...names];
    let map = {};

    // Simple Shuffle and check
    // Since N=6 is small, we can brute force a valid derangement easily
    // But to be deterministic across devices, we must use the SEEDED RNG exactly same amount of times if possible.
    // Better strategy: Fisher-Yates with check?
    // Deterministic Strategy:
    // 1. Sort pool to ensure base order is identical
    pool.sort();

    let isValid = false;
    let shuffled = [];

    // We try to shuffle. If we get a self-match, we reshuffle. 
    // IMPORTANT: To ensure all devices get the SAME result, the number of "retries" must be deterministic.
    // However, a retry loop depends on the random values. If the seed produces a valid shuffle first try on device A, it will do so on Device B.
    // So a retry loop is safe as long as the seed is same.

    // Safety break
    let attempts = 0;
    while (!isValid && attempts < 1000) {
        attempts++;
        shuffled = [...pool];

        // Fisher-Yates Shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Check for self-matches
        isValid = true;
        for (let i = 0; i < pool.length; i++) {
            if (pool[i] === shuffled[i]) {
                isValid = false;
                break;
            }
        }
    }

    if (!isValid) {
        console.error("Failed to generate derangement");
        // Fallback: Just rotate by 1 (Deterministic fallback)
        shuffled = [...pool.slice(1), pool[0]];
    }

    // Create Map
    names.forEach(name => {
        // Find where this name is in the sorted pool
        const index = pool.indexOf(name);
        map[name] = shuffled[index];
    });

    return map;
}

/**
 * Mulberry32 Seeded RNG
 * Returns a function that returns numbers between 0 and 1
 */
function mulberry32(a) {
    return function () {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Start
init();
