// NEURAL REACTOR V2 - Enhanced Interactive Particle System
let scene, camera, renderer, particleSystem;
let isStabilizing = false;
let stabilizeProgress = 0;
let startTime = 0;
let currentTime = 0;
let PARTICLE_COUNT = 2000;
let HOLD_DURATION = 3000; // Default: 3 seconds
let currentDifficulty = 'easy';
let currentShape = 'points'; // points, cubes, stars
const shapes = ['points', 'cubes', 'stars'];
let shapeIndex = 0;

// Particle System Data
let particles = {
    geometry: null,
    positions: null,
    velocities: null,
    colors: null,
    trails: []
};

// Audio Context (for sound effects)
let audioContext;
let successSound;

// Initialize Three.js Scene
function init() {
    // Audio Setup
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSuccessSound();
    } catch (e) {
        console.log('Web Audio API not supported');
    }

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

    // Ambient Light for glow effect
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
}

// Create Success Sound (Web Audio API)
function createSuccessSound() {
    // We'll play this on completion
    successSound = function () {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };
}

// Create Particle System with Selected Shape
function createParticles() {
    if (particleSystem) {
        scene.remove(particleSystem);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Initialize particle positions and velocities
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        const radius = Math.random() * 40 + 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = radius * Math.cos(phi);

        velocities[i] = (Math.random() - 0.5) * 0.2;
        velocities[i + 1] = (Math.random() - 0.5) * 0.2;
        velocities[i + 2] = (Math.random() - 0.5) * 0.2;

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

    // Shape cycling on button click
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
    currentDifficulty = level;

    // Update durations
    const durations = { 'easy': 3000, 'medium': 5000, 'hard': 10000 };
    HOLD_DURATION = durations[level];

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

    // Reset if currently stabilizing
    if (isStabilizing) {
        stopStabilizing();
    }
};

// Start Stabilizing
function startStabilizing() {
    isStabilizing = true;
    startTime = Date.now();
    document.getElementById('status-text').textContent = 'SYSTEM STATUS: STABILIZING...';
}

// Stop Stabilizing
function stopStabilizing() {
    if (isStabilizing && stabilizeProgress < 100) {
        isStabilizing = false;
        stabilizeProgress = 0;
        document.getElementById('status-text').textContent = 'SYSTEM STATUS: UNSTABLE';
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('timer-text').textContent = 'TIME: 0.00s';

        // Explosion effect
        for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
            particles.velocities[i] = (Math.random() - 0.5) * 2;
            particles.velocities[i + 1] = (Math.random() - 0.5) * 2;
            particles.velocities[i + 2] = (Math.random() - 0.5) * 2;
        }
    }
}

// Animation Loop
let time = 0;
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;

    // Update Timer
    if (isStabilizing) {
        currentTime = (Date.now() - startTime) / 1000;
        document.getElementById('timer-text').textContent = `TIME: ${currentTime.toFixed(2)}s`;

        stabilizeProgress = (currentTime * 1000 / HOLD_DURATION) * 100;
        if (stabilizeProgress >= 100) {
            stabilizeProgress = 100;
            completeStabilization();
        }
        document.getElementById('progress-bar').style.width = stabilizeProgress + '%';
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

            velocities[i] += (Math.random() - 0.5) * 0.05;
            velocities[i + 1] += (Math.random() - 0.5) * 0.05;
            velocities[i + 2] += (Math.random() - 0.5) * 0.05;

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

    // Update instanced meshes
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

    // Play Success Sound
    if (successSound) {
        successSound();
    }

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
        difficulty: currentDifficulty,
        shape: currentShape,
        date: new Date().toISOString()
    });

    // Sort by time (fastest first)
    scores.sort((a, b) => a.time - b.time);

    // Keep top 5
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

// Show Success Modal
function showModal() {
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
