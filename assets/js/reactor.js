// NEURAL REACTOR - Interactive Particle System
let scene, camera, renderer, particles, particleSystem;
let isStabilizing = false;
let stabilizeProgress = 0;
const PARTICLE_COUNT = 2000;
const HOLD_DURATION = 3000; // 3 seconds

// Initialize Three.js Scene
function init() {
    // Scene Setup
    scene = new THREE.Scene();

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

    // Create Particle System
    createParticles();

    // Event Listeners
    setupEventListeners();

    // Start Animation Loop
    animate();
}

// Create Particle System with BufferGeometry
function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    // Initialize particle positions and velocities
    for (let i = 0; i < PARTICLE_COUNT * 3; i += 3) {
        // Random positions in a sphere
        const radius = Math.random() * 40 + 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i + 2] = radius * Math.cos(phi);

        // Random velocities for chaos
        velocities[i] = (Math.random() - 0.5) * 0.2;
        velocities[i + 1] = (Math.random() - 0.5) * 0.2;
        velocities[i + 2] = (Math.random() - 0.5) * 0.2;

        // Initial color: Neon Green
        colors[i] = 0;     // R
        colors[i + 1] = 1; // G
        colors[i + 2] = 0; // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material
    const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    particles = {
        geometry: geometry,
        positions: positions,
        velocities: velocities,
        colors: colors
    };
}

// Setup Event Listeners
function setupEventListeners() {
    const btn = document.getElementById('stabilize-btn');

    // Mouse Events
    btn.addEventListener('mousedown', startStabilizing);
    btn.addEventListener('mouseup', stopStabilizing);
    btn.addEventListener('mouseleave', stopStabilizing);

    // Touch Events (Mobile)
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startStabilizing();
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopStabilizing();
    });
    btn.addEventListener('touchcancel', stopStabilizing);

    // Window Resize
    window.addEventListener('resize', onWindowResize);

    // Form Submit
    const form = document.getElementById('unlock-form');
    form.addEventListener('submit', handleFormSubmit);
}

// Start Stabilizing
function startStabilizing() {
    isStabilizing = true;
    document.getElementById('status-text').textContent = 'SYSTEM STATUS: STABILIZING...';
}

// Stop Stabilizing
function stopStabilizing() {
    if (isStabilizing && stabilizeProgress < 100) {
        isStabilizing = false;
        stabilizeProgress = 0;
        document.getElementById('status-text').textContent = 'SYSTEM STATUS: UNSTABLE';
        document.getElementById('progress-bar').style.width = '0%';

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

    // Update Stabilize Progress
    if (isStabilizing) {
        stabilizeProgress += 100 / (HOLD_DURATION / 16.67); // ~60fps
        if (stabilizeProgress >= 100) {
            stabilizeProgress = 100;
            completeStabilization();
        }
        document.getElementById('progress-bar').style.width = stabilizeProgress + '%';
    }

    // Update Particles
    updateParticles();

    // Rotate Camera
    const rotationSpeed = isStabilizing ? 0.01 : 0.002;
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
            // Lerp toward center (0, 0, 0)
            const lerpFactor = 0.05;
            positions[i] += (0 - positions[i]) * lerpFactor;
            positions[i + 1] += (0 - positions[i + 1]) * lerpFactor;
            positions[i + 2] += (0 - positions[i + 2]) * lerpFactor;

            // Shift color to white
            const colorLerp = 0.02;
            colors[i] += (1 - colors[i]) * colorLerp;     // R -> 1
            colors[i + 1] += (1 - colors[i + 1]) * colorLerp; // G stays 1
            colors[i + 2] += (1 - colors[i + 2]) * colorLerp; // B -> 1
        } else {
            // Chaos: Brownian motion
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];

            // Random walk
            velocities[i] += (Math.random() - 0.5) * 0.05;
            velocities[i + 1] += (Math.random() - 0.5) * 0.05;
            velocities[i + 2] += (Math.random() - 0.5) * 0.05;

            // Damping
            velocities[i] *= 0.99;
            velocities[i + 1] *= 0.99;
            velocities[i + 2] *= 0.99;

            // Boundary check
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

            // Reset color to green
            const colorLerp = 0.05;
            colors[i] += (0 - colors[i]) * colorLerp;
            colors[i + 1] += (1 - colors[i + 1]) * colorLerp;
            colors[i + 2] += (0 - colors[i + 2]) * colorLerp;
        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
}

// Complete Stabilization
function completeStabilization() {
    isStabilizing = false;
    document.getElementById('status-text').textContent = 'SYSTEM STATUS: STABLE';

    // Flash white
    document.body.style.backgroundColor = '#FFFFFF';
    setTimeout(() => {
        document.body.style.backgroundColor = '#000000';
        showModal();
    }, 200);
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

    // Submit to Web3Forms
    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            // Hide form, show code
            document.getElementById('unlock-form').classList.add('hidden');
            document.getElementById('code-reveal').classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error:', error);
            // Show code anyway for demo
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
