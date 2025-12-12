// SENTIENT CRM - Predictive UX Simulation
// No real AI - just heuristic pattern matching

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const exitBtn = document.getElementById('exit-btn');
const predictionBox = document.getElementById('prediction');
const predictionText = document.getElementById('prediction-text');
const acceptBtn = document.getElementById('accept-prediction');
const intentStatus = document.getElementById('intent-status');

let idleTimer = null;
let hasShownIdleMessage = false;
let hasShownExitMessage = false;

// Add AI message to chat
function addAIMessage(text, delay = 500) {
    setTimeout(() => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-3 message-enter';
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex-shrink-0"></div>
            <div class="glassmorphic rounded-2xl rounded-tl-none px-4 py-3 max-w-md">
                <p class="text-sm">${text}</p>
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, delay);
}

// Add user message to chat
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex gap-3 justify-end message-enter';
    messageDiv.innerHTML = `
        <div class="bg-white/10 rounded-2xl rounded-tr-none px-4 py-3 max-w-md">
            <p class="text-sm">${text}</p>
        </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show prediction suggestion
function showPrediction(text, confidence = 98) {
    predictionText.textContent = `${text} (Confidence: ${confidence}%)`;
    predictionBox.classList.remove('hidden');
    intentStatus.textContent = 'INTENT DETECTED';
    intentStatus.classList.remove('pulse-bar');
    intentStatus.classList.add('text-green-400');
}

// Hide prediction
function hidePrediction() {
    predictionBox.classList.add('hidden');
    intentStatus.textContent = 'ANALYZING INTENT...';
    intentStatus.classList.add('pulse-bar');
    intentStatus.classList.remove('text-green-400');
}

// Reset idle timer
function resetIdleTimer() {
    clearTimeout(idleTimer);
    hasShownIdleMessage = false;

    idleTimer = setTimeout(() => {
        if (!hasShownIdleMessage) {
            addAIMessage("Are you stuck? Here's the <a href='#' class='text-cyan-400 underline'>documentation</a>.");
            hasShownIdleMessage = true;
        }
    }, 5000);
}

// Exit button hover detection
exitBtn.addEventListener('mouseenter', () => {
    if (!hasShownExitMessage) {
        addAIMessage("Wait! Before you go, check this <span class='text-cyan-400 font-bold'>20% discount</span>.");
        hasShownExitMessage = true;
    }
});

// Input detection for "price" keyword
userInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();

    resetIdleTimer();

    if (value.includes('price') || value.includes('pricing') || value.includes('cost')) {
        showPrediction('View Pricing Tier?', 98);
    } else if (value.includes('help') || value.includes('support')) {
        showPrediction('Open Support Documentation?', 95);
    } else if (value.includes('demo') || value.includes('try')) {
        showPrediction('Schedule Live Demo?', 92);
    } else {
        hidePrediction();
    }
});

// Send message
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    addUserMessage(text);
    userInput.value = '';
    hidePrediction();

    // Simulate AI response based on keywords
    if (text.toLowerCase().includes('price') || text.toLowerCase().includes('pricing')) {
        addAIMessage("Our pricing starts at $99/month for the Starter tier. Would you like to see the full breakdown?", 800);
    } else if (text.toLowerCase().includes('help')) {
        addAIMessage("I can help! What specific feature are you looking for?", 800);
    } else if (text.toLowerCase().includes('demo')) {
        addAIMessage("Great! I can schedule a demo for you. What's your preferred time?", 800);
    } else {
        addAIMessage("Interesting! Let me analyze that...", 800);
    }

    resetIdleTimer();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Accept prediction
acceptBtn.addEventListener('click', () => {
    const suggestion = predictionText.textContent.split('(')[0].trim();
    addUserMessage(suggestion);
    hidePrediction();

    if (suggestion.includes('Pricing')) {
        addAIMessage("Perfect! Here's our pricing structure: Starter ($99), Pro ($299), Enterprise (Custom). Which tier interests you?", 800);
    }
});

// Initialize idle timer
resetIdleTimer();

// Welcome sequence
setTimeout(() => {
    addAIMessage("Try typing 'price' or 'help' to see predictive suggestions.", 1500);
}, 2000);
