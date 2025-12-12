// NEURAL REACTOR V3 - Tiered Rewards + Procedural Audio + Haptics
let scene, camera, renderer, particleSystem;
let isStabilizing = false;
let stabilizeProgress = 0;
let startTime = 0;
let currentTime = 0;
let PARTICLE_COUNT = 2000;
let currentShape = 'points';
const shapes = ['points', 'cubes', 'stars'];
let shapeIndex = 0;

// DIFFICULTY CONFIGURATION
const DIFFICULTIES = {
    'easy': { duration: 3000, code: 'AGENT_10', percent: '10%', level: 'EASY' },
    'medium': { duration: 6000, code: 'AGENT_15', percent: '15%', level: 'MEDIUM' },
    'hard': { duration: 10000, code: 'AGENT_20', percent: '20%', level: 'HARD' }
};
let currentDifficulty = DIFFICULTIES.easy;

// Particle System Data
let particles = {
    geometry: null,
    positions: null,
    velocities: null,
    colors: null
};

// Sound Manager Class
class SoundManager {
    constructor() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.revOscillator = null;
            this.revGainNode = null;
            this.supported = true;
        } catch (e) {
            console.log('Web Audio API not supported');
            this.supported = false;
        }
    }

    startRevSound() {
        if (!this.supported || this.revOscillator) return;

        this.revOscillator = this.audioContext.createOscillator();
        this.revGainNode = this.audioContext.createGain();

        this.revOscillator.type = 'sawtooth';
        this.revOscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        this.revOscillator.connect(this.revGainNode);
        this.revGainNode.connect(this.audioContext.destination);

        this.revGainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);

        this.revOscillator.start();
    }

    updateRevSound(progress) {
        if (!this.supported || !this.revOscillator) return;

        const currentFreq = 100 + (progress * 5); // 100Hz to 600Hz
        const currentGain = 0.05 + (progress * 0.35); // 0.05 to 0.4

        this.revOscillator.frequency.setValueAtTime(currentFreq, this.audioContext.currentTime);
        this.revGainNode.gain.setValueAtTime(currentGain, this.audioContext.currentTime);
    }

    stopRevSound() {
        if (!this.supported || !this.revOscillator) return;

        try {
            this.revOscillator.stop();
            this.revOscillator.disconnect();
            this.revGainNode.disconnect();
        } catch (e) {
            // Already stopped
        }
        this.revOscillator = null;
        this.revGainNode = null;
    }

    playDropSound() {
        if (!this.supported) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(40, this.audioContext.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 1);
    }

    playSuccessChime() {
        if (!this.supported) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(523.25, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659.25, this.audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(783.99, this.audioContext.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }
}

let soundManager;
let vibrateInterval;

// Initialize Three.js Scene
function init() {
    // Sound Manager Setup
    soundManager = new SoundManager();

    // Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 100);

    // Camera Setup
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 50;

    // Renderer Setup
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x00FF00, 0.3);
    scene.add(ambientLight);

    // Create Particle System
    createParticles();

    // Event Listeners
    setupEventListeners();

    // Load Leaderboard
    loadLeaderboard();

    // Start Animation Loop
    animate();

    // Hide Preloader with Cinematic Fade
    setTimeout(() => {
        const preloader = document.getElementById('reactor-preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            preloader.style.transition = 'opacity 0.8s ease-out';
            setTimeout(() => preloader.remove(), 800);
        }
    }, 1500); // 1.5s minimum "boot" time
}

// Create Particle System
function createParticles() {
    if (particleSystem) {
        scene.remove(particleSystem);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Chaos factor scales with difficulty
    const chaosMultiplier = currentDifficulty === DIFFICULTIES.hard ? 1.5 :
        currentDifficulty === DIFFICULTIES.medium ? 1.2 : 1.0;

    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        const radius = Math.random() * 40 + 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = radius * Math.cos(phi);

        velocities[i] = (Math.random() - 0.5) * 0.2 * chaosMultiplier;
        velocities[i + 1] = (Math.random() - 0.5) * 0.2 * chaosMultiplier;
        velocities[i + 2] = (Math.random() - 0.5) * 0.2 * chaosMultiplier;

        colors[i] = 0;
        colors[i + 1] = 1;
        colors[i + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    let material;

    if (currentShape === 'points') {
        material = new THREE.PointsMaterial({
            size: 0.8,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        particleSystem = new THREE.Points(geometry, material);
    } else if (currentShape === 'cubes') {
        const cubeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const instancedMesh = new THREE.InstancedMesh(
            cubeGeometry,
            new THREE.MeshBasicMaterial({
                color: 0x00FF00,
                transparent: true,
                opacity: 0.8,
                wireframe: true
            }),
            PARTICLE_COUNT
        );

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            matrix.setPosition(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
            );
            instancedMesh.setMatrixAt(i, matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        particleSystem = instancedMesh;
        particleSystem.userData.isInstanced = true;
    } else if (currentShape === 'stars') {
        const starGeometry = new THREE.OctahedronGeometry(0.2);
        const instancedMesh = new THREE.InstancedMesh(
            starGeometry,
            new THREE.MeshBasicMaterial({
                color: 0x00FF00,
                transparent: true,
                opacity: 0.8
            }),
            PARTICLE_COUNT
        );

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            matrix.setPosition(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
            );
            instancedMesh.setMatrixAt(i, matrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        particleSystem = instancedMesh;
        particleSystem.userData.isInstanced = true;
    }

    scene.add(particleSystem);

    particles.geometry = geometry;
    particles.positions = positions;
    particles.velocities = velocities;
    particles.colors = colors;
}

// Setup Event Listeners
function setupEventListeners() {
    const btn = document.getElementById('stabilize-btn');

    btn.addEventListener('mousedown', startStabilizing);
    btn.addEventListener('mouseup', stopStabilizing);
    btn.addEventListener('mouseleave', stopStabilizing);

    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startStabilizing();
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopStabilizing();
    });
    btn.addEventListener('touchcancel', stopStabilizing);

    window.addEventListener('resize', onWindowResize);

    const form = document.getElementById('unlock-form');
    form.addEventListener('submit', handleFormSubmit);

    btn.addEventListener('dblclick', cycleShape);
}

// Cycle through shapes
function cycleShape() {
    shapeIndex = (shapeIndex + 1) % shapes.length;
    currentShape = shapes[shapeIndex];
    createParticles();

    const shapeNames = { 'points': '● POINTS', 'cubes': '■ CUBES', 'stars': '★ STARS' };
    document.getElementById('shape-indicator').textContent = shapeNames[currentShape];
}

// Set Difficulty
window.setDifficulty = function (level) {
    currentDifficulty = DIFFICULTIES[level];

    // Update reward text
    document.getElementById('reward-text').textContent = `REWARD: ${currentDifficulty.percent} OFF`;

    // Update UI
    ['easy', 'medium', 'hard'].forEach(lvl => {
        const btn = document.getElementById(`diff-${lvl}`);
        if (lvl === level) {
            btn.classList.add('bg-[#00FF00]/10', 'border-[#00FF00]', 'text-[#00FF00]');
            btn.classList.remove('border-white/20', 'text-white/50');
        } else {
            btn.classList.remove('bg-[#00FF00]/10', 'border-[#00FF00]', 'text-[#00FF00]');
            btn.classList.add('border-white/20', 'text-white/50');
        }
    });

    // Recreate particles with new chaos level
    createParticles();

    // Reset if currently stabilizing
    if (isStabilizing) {
        stopStabilizing();
    }
};

// Haptics Functions
function startVibration() {
    if (navigator.vibrate) {
        vibrateInterval = setInterval(() => {
            navigator.vibrate([50, 50]);
        }, 100);
    }
}

function stopVibration() {
    if (vibrateInterval) {
        clearInterval(vibrateInterval);
        vibrateInterval = null;
    }
    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
}

function successVibration() {
    if (navigator.vibrate) {
        navigator.vibrate(500);
    }
}

// Start Stabilizing
function startStabilizing() {
    isStabilizing = true;
    startTime = Date.now();
    document.getElementById('status-text').textContent = 'SYSTEM STATUS: STABILIZING...';

    // Start Audio Engine
    soundManager.startRevSound();

    // Start Haptics
    startVibration();
}

// Stop Stabilizing
function stopStabilizing() {
    if (isStabilizing && stabilizeProgress < 100) {
        isStabilizing = false;
        stabilizeProgress = 0;
        currentTime = 0;
        document.getElementById('status-text').textContent = 'SYSTEM STATUS: UNSTABLE';
        document.getElementById('timer-text').textContent = 'TIME: 0.00s';
        updateCircularProgress(0);

        // Stop Audio
        soundManager.stopRevSound();

        // Stop Haptics
        stopVibration();

        // Explosion effect
        const chaosMultiplier = currentDifficulty === DIFFICULTIES.hard ? 2 :
            currentDifficulty === DIFFICULTIES.medium ? 1.5 : 1.0;
        for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
            particles.velocities[i] = (Math.random() - 0.5) * 2 * chaosMultiplier;
            particles.velocities[i + 1] = (Math.random() - 0.5) * 2 * chaosMultiplier;
            particles.velocities[i + 2] = (Math.random() - 0.5) * 2 * chaosMultiplier;
        }
    }
}

// Update Circular Progress SVG
function updateCircularProgress(percent) {
    const circle = document.getElementById('progress-circle');
    const circumference = 283; // 2 * π * r (r=45)
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Animation Loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Update Timer & Progress
    if (isStabilizing) {
        currentTime = (Date.now() - startTime) / 1000;
        document.getElementById('timer-text').textContent = `TIME: ${currentTime.toFixed(2)}s`;

        stabilizeProgress = (currentTime * 1000 / currentDifficulty.duration) * 100;

        // Update Rev Sound
        soundManager.updateRevSound(stabilizeProgress);

        if (stabilizeProgress >= 100) {
            stabilizeProgress = 100;
            completeStabilization();
        }

        updateCircularProgress(stabilizeProgress);
    }

    // Update Particles
    updateParticles();

    // Rotate Camera
    const rotationSpeed = isStabilizing ? 0.015 : 0.002;
    camera.position.x = Math.sin(time * rotationSpeed) * 50;
    camera.position.z = Math.cos(time * rotationSpeed) * 50;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

// Update Particle Positions
function updateParticles() {
    const positions = particles.positions;
    const velocities = particles.velocities;
    const colors = particles.colors;

    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        if (isStabilizing) {
            const lerpFactor = 0.05;
            positions[i] += (0 - positions[i]) * lerpFactor;
            positions[i + 1] += (0 - positions[i + 1]) * lerpFactor;
            positions[i + 2] += (0 - positions[i + 2]) * lerpFactor;

            const colorLerp = 0.02;
            colors[i] += (1 - colors[i]) * colorLerp;
            colors[i + 1] += (1 - colors[i + 1]) * colorLerp;
            colors[i + 2] += (1 - colors[i + 2]) * colorLerp;
        } else {
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            const chaosMultiplier = currentDifficulty === DIFFICULTIES.hard ? 0.08 :
                currentDifficulty === DIFFICULTIES.medium ? 0.06 : 0.05;

            velocities[i] += (Math.random() - 0.5) * chaosMultiplier;
            velocities[i + 1] += (Math.random() - 0.5) * chaosMultiplier;
            velocities[i + 2] += (Math.random() - 0.5) * chaosMultiplier;

            velocities[i] *= 0.99;
            velocities[i + 1] *= 0.99;
            velocities[i + 2] *= 0.99;

            const maxDist = 60;
            const dist = Math.sqrt(
                positions[i] ** 2 +
                positions[i + 1] ** 2 +
                positions[i + 2] ** 2
            );
            if (dist > maxDist) {
                velocities[i] *= -0.5;
                velocities[i + 1] *= -0.5;
                velocities[i + 2] *= -0.5;
            }

            const colorLerp = 0.05;
            colors[i] += (0 - colors[i]) * colorLerp;
            colors[i + 1] += (1 - colors[i + 1]) * colorLerp;
            colors[i + 2] += (0 - colors[i + 2]) * colorLerp;
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;

    if (particleSystem.userData.isInstanced) {
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            matrix.setPosition(
                positions[i * 3],
                positions[i * 3 + 1],
                positions[i * 3 + 2]
            );
            particleSystem.setMatrixAt(i, matrix);
        }
        particleSystem.instanceMatrix.needsUpdate = true;
    }
}

// Complete Stabilization
function completeStabilization() {
    isStabilizing = false;
    document.getElementById('status-text').textContent = 'SYSTEM STATUS: STABLE';

    // Stop Rev Sound
    soundManager.stopRevSound();

    // Play Success Sounds
    soundManager.playSuccessChime();
    setTimeout(() => soundManager.playDropSound(), 300);

    // Stop Vibrate Loop, Trigger Success Vibration
    stopVibration();
    successVibration();

    // Save to Leaderboard
    saveScore(currentTime);

    // Flash white
    document.body.style.backgroundColor = '#FFFFFF';
    setTimeout(() => {
        document.body.style.backgroundColor = '#000000';
        showModal();
    }, 200);
}

// Save Score to Leaderboard
function saveScore(time) {
    const scores = JSON.parse(localStorage.getItem('reactorScores') || '[]');
    scores.push({
        time: time,
        difficulty: currentDifficulty.level.toLowerCase(),
        shape: currentShape,
        date: new Date().toISOString()
    });

    scores.sort((a, b) => a.time - b.time);
    const topScores = scores.slice(0, 5);
    localStorage.setItem('reactorScores', JSON.stringify(topScores));

    loadLeaderboard();
}

// Load Leaderboard
function loadLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('reactorScores') || '[]');
    const leaderboardEl = document.getElementById('leaderboard');

    if (scores.length === 0) {
        leaderboardEl.innerHTML = '<div class="text-white/30">No records yet...</div>';
        return;
    }

    const difficultyEmoji = { 'easy': '●', 'medium': '●●', 'hard': '●●●' };

    leaderboardEl.innerHTML = scores.map((score, index) => `
        <div class="flex justify-between items-center">
            <span class="text-[#00FF00]">#${index + 1}</span>
            <span>${score.time.toFixed(2)}s</span>
            <span class="text-xs">${difficultyEmoji[score.difficulty]}</span>
        </div>
    `).join('');
}

// Show Success Modal with Dynamic Content
function showModal() {
    // Update modal with current difficulty reward
    document.getElementById('difficulty-conquered').textContent =
        `DIFFICULTY CONQUERED: ${currentDifficulty.level}`;
    document.getElementById('reward-unlocked').textContent =
        `REWARD UNLOCKED: ${currentDifficulty.percent} OFF`;
    document.getElementById('discount-code').textContent = currentDifficulty.code;
    document.getElementById('discount-description').textContent =
        `${currentDifficulty.percent} off all AI architecture services`;

    document.getElementById('success-modal').classList.remove('hidden');
}

// Handle Form Submit
function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            document.getElementById('unlock-form').classList.add('hidden');
            document.getElementById('code-reveal').classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('unlock-form').classList.add('hidden');
            document.getElementById('code-reveal').classList.remove('hidden');
        });
}

// Handle Window Resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', init);
