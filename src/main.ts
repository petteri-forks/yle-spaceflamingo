import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import RAPIER from "@dimforge/rapier3d-compat";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App container missing");
}

const useMobilePerformanceProfile = window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;

// Overlay removed for cleaner UI

const scoreDiv = document.createElement("div");
scoreDiv.id = "score";
scoreDiv.style.cssText = "position: fixed; top: 20px; right: 20px; color: white; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px black;";
scoreDiv.textContent = "Score: 0";
app.appendChild(scoreDiv);

const ammoDiv = document.createElement("div");
ammoDiv.id = "ammo";
ammoDiv.style.cssText = "position: fixed; top: 20px; left: 20px; color: white; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px black;";
ammoDiv.textContent = "Ammo: 40";
app.appendChild(ammoDiv);

const ammoCrateInventoryDiv = document.createElement("div");
ammoCrateInventoryDiv.id = "ammo-crate-inventory";
ammoCrateInventoryDiv.style.cssText =
  "position: fixed; top: 56px; left: 20px; z-index: 20; display: none; gap: 6px; flex-wrap: wrap; max-width: 180px; pointer-events: auto;";
app.appendChild(ammoCrateInventoryDiv);

const difficultyDiv = document.createElement("div");
difficultyDiv.id = "difficulty";
difficultyDiv.style.cssText =
  "position: fixed; top: 56px; right: 20px; color: #fde68a; font-size: 16px; font-weight: bold; text-shadow: 2px 2px 4px black;";
difficultyDiv.textContent = "Difficulty: 1.00x";
app.appendChild(difficultyDiv);

const helpButton = document.createElement("button");
helpButton.type = "button";
helpButton.textContent = "Ohjeet / Help (H)";
helpButton.style.cssText =
  "position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 20; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.35); background: rgba(8, 12, 20, 0.72); color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 0.3px; cursor: pointer; backdrop-filter: blur(3px); transition: opacity 220ms ease;";
app.appendChild(helpButton);

const compactHud = window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;
if (compactHud) {
  ammoDiv.style.top = "12px";
  ammoDiv.style.left = "12px";
  ammoDiv.style.fontSize = "20px";

  ammoCrateInventoryDiv.style.top = "42px";
  ammoCrateInventoryDiv.style.left = "12px";
  ammoCrateInventoryDiv.style.maxWidth = "150px";

  difficultyDiv.style.top = "42px";
  difficultyDiv.style.right = "12px";
  difficultyDiv.style.left = "auto";
  difficultyDiv.style.fontSize = "14px";

  helpButton.style.top = "74px";
  helpButton.style.fontSize = "12px";
  helpButton.style.padding = "7px 12px";
}

const helpModal = document.createElement("div");
helpModal.style.cssText =
  "position: fixed; inset: 0; z-index: 30; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.58);";

const helpControlsList = compactHud
  ? `
      <li>Liikuta vasenta tattia siihen suuntaan mihin haluat kävellä (ylös = eteen, alas = taakse, vasen/oikea = sivulle).</li>
      <li>Käännä kameraa vetämällä sormea ruudun oikealla puolella.</li>
      <li>Ammu napauttamalla ruudun oikeaa puolta.</li>
      <li>Pidä Aim-nappi pohjassa, kun haluat tarkemman tähtäyksen.</li>
      <li>Hyppää painamalla Jump-nappia.</li>
      <li>Pudota kannettu ammuslaatikko napauttamalla laatikkoikonia Ammo-tekstin alla.</li>
    `
  : `
      <li>Liiku: W = eteen, S = taakse, A = vasemmalle, D = oikealle.</li>
      <li>Katso ympärille: liikuta hiirtä.</li>
      <li>Ammu: paina hiiren vasenta nappia.</li>
      <li>Tähtää tarkemmin: pidä hiiren oikea nappi pohjassa.</li>
      <li>Juokse: pidä Shift pohjassa liikkuessa.</li>
      <li>Hyppää: paina Space (välilyönti).</li>
      <li>Pudota kannettu ammuslaatikko: paina Q.</li>
      <li>Avaa tai sulje ohjeet: paina H.</li>
      <li>Sulje ohjeikkuna: paina Esc.</li>
    `;

helpModal.innerHTML = `
  <div style="width: min(460px, calc(100vw - 32px)); border-radius: 14px; padding: 16px 18px; background: linear-gradient(180deg, rgba(24,33,52,0.97) 0%, rgba(14,20,34,0.97) 100%); border: 1px solid rgba(255,255,255,0.15); color: #eaf0ff; box-shadow: 0 16px 45px rgba(0,0,0,0.35);">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
      <h2 style="margin: 0; font-size: 20px;">Ohjeet / Help</h2>
      <button id="help-close" type="button" style="border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); color: #fff; border-radius: 8px; padding: 4px 8px; cursor: pointer;">Sulje / Close</button>
    </div>
    <p style="margin: 0 0 10px 0; opacity: 0.85; font-size: 14px;">Näppäinkomennot / Controls:</p>
    <ul style="margin: 0; padding-left: 18px; line-height: 1.75; font-size: 14px;">
      ${helpControlsList}
    </ul>
  </div>
`;
app.appendChild(helpModal);

const helpCloseButton = helpModal.querySelector<HTMLButtonElement>("#help-close");

function closeHelpModal() {
  helpModal.style.display = "none";
}

function openHelpModal() {
  if (document.pointerLockElement === renderer.domElement) {
    document.exitPointerLock();
  }
  helpModal.style.display = "flex";
}

helpButton.addEventListener("click", () => {
  if (helpModal.style.display === "flex") {
    closeHelpModal();
    return;
  }
  openHelpModal();
});

helpCloseButton?.addEventListener("click", closeHelpModal);

helpModal.addEventListener("click", (event: MouseEvent) => {
  if (event.target === helpModal) {
    closeHelpModal();
  }
});

window.setTimeout(() => {
  helpButton.style.opacity = "0";
  helpButton.style.pointerEvents = "none";
}, 10000);

// Tähtäin
const crosshairScreenY = 0.40;
const crosshair = document.createElement("div");
crosshair.style.cssText = `position: fixed; top: ${crosshairScreenY * 100}%; left: 50%; transform: translate(-50%, -50%); pointer-events: none;`;
crosshair.innerHTML = `
  <svg width="30" height="30" style="display: block;">
    <line x1="15" y1="5" x2="15" y2="12" stroke="white" stroke-width="2" opacity="0.8"/>
    <line x1="15" y1="18" x2="15" y2="25" stroke="white" stroke-width="2" opacity="0.8"/>
    <line x1="5" y1="15" x2="12" y2="15" stroke="white" stroke-width="2" opacity="0.8"/>
    <line x1="18" y1="15" x2="25" y2="15" stroke="white" stroke-width="2" opacity="0.8"/>
    <circle cx="15" cy="15" r="3" stroke="white" stroke-width="2" fill="none" opacity="0.6"/>
  </svg>
`;
app.appendChild(crosshair);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f2e);

// Ääniefektit (Web Audio API)
const audioContext = new AudioContext();

function playShootSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
}

function playExplosionSound() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.3);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, audioContext.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.35);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.35);
}

function playDeathSound() {
  // Luodaan dramaattinen kuolemaääni usealla oskillaattorilla
  const duration = 1.5;
  
  // Matala drone
  const drone = audioContext.createOscillator();
  const droneGain = audioContext.createGain();
  drone.connect(droneGain);
  droneGain.connect(audioContext.destination);
  drone.type = 'sawtooth';
  drone.frequency.setValueAtTime(80, audioContext.currentTime);
  drone.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + duration);
  droneGain.gain.setValueAtTime(0.3, audioContext.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  drone.start(audioContext.currentTime);
  drone.stop(audioContext.currentTime + duration);
  
  // Korkeampi "scream"
  const scream = audioContext.createOscillator();
  const screamGain = audioContext.createGain();
  const screamFilter = audioContext.createBiquadFilter();
  scream.connect(screamFilter);
  screamFilter.connect(screamGain);
  screamGain.connect(audioContext.destination);
  scream.type = 'sine';
  scream.frequency.setValueAtTime(800, audioContext.currentTime);
  scream.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
  screamFilter.type = 'lowpass';
  screamFilter.frequency.setValueAtTime(1200, audioContext.currentTime);
  screamFilter.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.5);
  screamGain.gain.setValueAtTime(0.2, audioContext.currentTime);
  screamGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  scream.start(audioContext.currentTime);
  scream.stop(audioContext.currentTime + 0.5);
}

function playSupplyDropSound() {
  if (audioContext.state !== "running") {
    return;
  }

  const now = audioContext.currentTime;
  const toneA = audioContext.createOscillator();
  const toneB = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  toneA.type = "triangle";
  toneB.type = "sine";
  toneA.frequency.setValueAtTime(740, now);
  toneA.frequency.exponentialRampToValueAtTime(410, now + 0.45);
  toneB.frequency.setValueAtTime(520, now);
  toneB.frequency.exponentialRampToValueAtTime(260, now + 0.55);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  filter.frequency.exponentialRampToValueAtTime(600, now + 0.55);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

  toneA.connect(filter);
  toneB.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);

  toneA.start(now);
  toneB.start(now);
  toneA.stop(now + 0.6);
  toneB.stop(now + 0.6);
}

function createBloodSplatter(x: number, y: number, z: number) {
  const particleCount = 15;
  const particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  const splatterColor = 0x14532d;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 4, 4),
      new THREE.MeshBasicMaterial({ color: splatterColor })
    );
    particle.position.set(x, y, z);
    scene.add(particle);
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 6,
      Math.random() * 4 + 2,
      (Math.random() - 0.5) * 6
    );
    
    particles.push({ mesh: particle, velocity, life: 0 });
  }
  
  // Animoi partikkelit
  const animateParticles = () => {
    let allDead = true;
    particles.forEach(p => {
      p.life += 0.016;
      if (p.life < 1.0) {
        allDead = false;
        p.velocity.y -= 9.8 * 0.016;
        p.mesh.position.add(p.velocity.clone().multiplyScalar(0.016));
        
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 1 - p.life;
        mat.transparent = true;
      } else if (p.mesh.parent) {
        scene.remove(p.mesh);
      }
    });
    
    if (!allDead) {
      requestAnimationFrame(animateParticles);
    }
  };
  
  animateParticles();
}

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(useMobilePerformanceProfile ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = !useMobilePerformanceProfile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.16;
app.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 1.92);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xcad7ff, 0xffffff, 1.32);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(6, 12, 4);
sun.castShadow = !useMobilePerformanceProfile;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -25;
sun.shadow.camera.right = 25;
sun.shadow.camera.top = 25;
sun.shadow.camera.bottom = -25;
scene.add(sun);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(48, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0xf8fafc,
    emissiveIntensity: 1.2,
    roughness: 0.9,
  })
);
moon.position.set(-320, 220, -700);
scene.add(moon);

const moonOccluder = new THREE.Mesh(
  new THREE.SphereGeometry(48.2, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0x0b0f1a,
    emissive: 0x0b0f1a,
    emissiveIntensity: 0.0,
    roughness: 1.0,
  })
);
moonOccluder.position.copy(moon.position).add(new THREE.Vector3(19.2, 8.0, 6.0));
scene.add(moonOccluder);

const moonLight = new THREE.DirectionalLight(0xc7d2fe, 1.1);
moonLight.position.copy(moon.position);
moonLight.castShadow = !useMobilePerformanceProfile;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 800;
moonLight.shadow.camera.left = -160;
moonLight.shadow.camera.right = 160;
moonLight.shadow.camera.top = 160;
moonLight.shadow.camera.bottom = -160;
moonLight.shadow.bias = -0.0004;
moonLight.shadow.normalBias = 0.02;
moonLight.target.position.set(0, 0, 0);
scene.add(moonLight);
scene.add(moonLight.target);


const groundGeo = new THREE.PlaneGeometry(140, 140);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x8a7559, roughness: 0.95, metalness: 0.0 });
const groundTextureLoader = new THREE.TextureLoader();
const groundColorMap = groundTextureLoader.load(
  `${import.meta.env.BASE_URL}textures/Ground039/Ground039_1K-JPG_Color.jpg`
);
groundColorMap.wrapS = THREE.RepeatWrapping;
groundColorMap.wrapT = THREE.RepeatWrapping;
groundColorMap.repeat.set(6, 6);
groundColorMap.colorSpace = THREE.SRGBColorSpace;
groundMat.map = groundColorMap;

const groundNormalMap = groundTextureLoader.load(
  `${import.meta.env.BASE_URL}textures/Ground039/Ground039_1K-JPG_NormalGL.jpg`
);
groundNormalMap.wrapS = THREE.RepeatWrapping;
groundNormalMap.wrapT = THREE.RepeatWrapping;
groundNormalMap.repeat.set(6, 6);
groundMat.normalMap = groundNormalMap;
groundMat.normalScale = new THREE.Vector2(0.9, 0.9);

const groundRoughnessMap = groundTextureLoader.load(
  `${import.meta.env.BASE_URL}textures/Ground039/Ground039_1K-JPG_Roughness.jpg`
);
groundRoughnessMap.wrapS = THREE.RepeatWrapping;
groundRoughnessMap.wrapT = THREE.RepeatWrapping;
groundRoughnessMap.repeat.set(6, 6);
groundMat.roughnessMap = groundRoughnessMap;
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.6;
ground.receiveShadow = !useMobilePerformanceProfile;
scene.add(ground);

const playerVisual = new THREE.Group();
const visualRoot = new THREE.Group();
playerVisual.add(visualRoot);
scene.add(playerVisual);

const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xf97316 });
const obstacles: { mesh: THREE.Mesh; body: RAPIER.RigidBody }[] = [];
const cameraCollisionMeshes: THREE.Object3D[] = [];
const bulletMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
const bulletGeometry = new THREE.SphereGeometry(0.08, 8, 8);
const bulletShadowGeometry = new THREE.CircleGeometry(0.18, 16);
const bulletShadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 });
const bullets: { mesh: THREE.Mesh; body: RAPIER.RigidBody; life: number; shadow: THREE.Mesh | null }[] = [];
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xef4444 });
const enemies: {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  health: number;
  phaseMode: "solid" | "phasing";
  phaseState: "solid" | "ghost";
  nextPhaseSwitch: number;
  moveDir: THREE.Vector3;
}[] = [];

type AmmoPickup = {
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  exploding: boolean;
  collectAvailableAt: number;
  landY: number;
  fallSpeed: number;
};

type AmmoDropBeacon = {
  light: THREE.PointLight;
  ring: THREE.Mesh;
  beam: THREE.Mesh;
  startTime: number;
  durationMs: number;
  pulseOffset: number;
};

const ammoPickups: AmmoPickup[] = [];
const ammoDropBeacons: AmmoDropBeacon[] = [];
const ammoPerPickup = 20;
let ammo = ammoPerPickup * 2;
const droppedAmmoCratePickupDelayMs = 5000;
const ammoCrateSkySpawnHeight = 42;
const ammoCrateFallAcceleration = 8;
const ammoCrateMaxFallSpeed = 8.5;
const ammoCrateClusterMin = 2;
const ammoCrateClusterMax = 20;
const ammoDropBeaconDurationMs = 6500;
let lastAmmoDropTime = 0;
const ammoDropInterval = 15;
const playAreaHalfSize = 64;

let score = 0;
let lastSpawnTime = 0;
const baseEnemySpeed = 2.5;
const baseSpawnInterval = 3;
const baseMaxEnemies = 100;
let gameOver = false;
let lastDebugTime = 0;
let groundLevel = -0.6;
let currentLevel = 1;
// let doorMesh: THREE.Mesh | null = null;
// const doorPosition = new THREE.Vector3(0, groundLevel, 12);
// const doorTriggerRadius = 2.2;
// let doorCooldownUntil = 0;

const gameOverDiv = document.createElement("div");
gameOverDiv.style.cssText = "position: fixed; inset: 0; z-index: 40; display: none; align-items: center; justify-content: center; padding: 24px; background: rgba(0,0,0,0.52); text-align: center; pointer-events: auto; touch-action: manipulation;";
gameOverDiv.innerHTML = `GAME OVER<br><div style="font-size: 14px; color: white; margin-top: 20px; line-height: 1.6;">Credits:<br>Astronaut by Quaternius<br>Wide City by Danni Litman</div>`;
app.appendChild(gameOverDiv);

const localBestScoreKey = "spaceflamingo.bestScore.v1";

type LocalBestScoreRecord = {
  score: number;
  name: string;
};

function loadLocalBestScore(): LocalBestScoreRecord {
  try {
    const raw = localStorage.getItem(localBestScoreKey);
    if (!raw) {
      return { score: 0, name: "" };
    }
    const parsed = JSON.parse(raw) as Partial<LocalBestScoreRecord>;
    const parsedScore = typeof parsed.score === "number" && Number.isFinite(parsed.score) ? Math.max(0, Math.floor(parsed.score)) : 0;
    const parsedName = typeof parsed.name === "string" ? parsed.name.trim() : "";
    return { score: parsedScore, name: parsedName };
  } catch {
    return { score: 0, name: "" };
  }
}

function saveLocalBestScore(record: LocalBestScoreRecord) {
  localStorage.setItem(localBestScoreKey, JSON.stringify(record));
}

function restartToStartFromGameOver() {
  sessionStorage.setItem("skipSplash", "1");
  window.location.reload();
}

function prepareGameOverOverlay() {
  mobileMoveX = 0;
  mobileMoveY = 0;
  mobileJumpHeld = false;
  mobileLookX = 0;
  mobileLookY = 0;
  mobileLookTargetX = 0;
  mobileLookTargetY = 0;
  mobileLookTouchActive = false;
  if (mobileControlsLayer) {
    mobileControlsLayer.style.display = "none";
  }
}

function renderStandardGameOver(scoreValue: number, bestRecord: LocalBestScoreRecord) {
  prepareGameOverOverlay();
  const bestLine = bestRecord.name
    ? `Best score on this device: ${bestRecord.score} (${bestRecord.name})`
    : `Best score on this device: ${bestRecord.score}`;

  gameOverDiv.innerHTML = `
    <div style="width: min(420px, calc(100vw - 32px)); border-radius: 16px; padding: 24px 20px; background: linear-gradient(180deg, rgba(31,41,55,0.96) 0%, rgba(17,24,39,0.96) 100%); border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 18px 42px rgba(0,0,0,0.42);">
      <div style="font-size: 52px; color: #ef4444; font-weight: 900; margin-bottom: 10px; text-shadow: 3px 3px 6px rgba(0,0,0,0.45);">GAME OVER</div>
      <div style="font-size: 24px; color: #fff; line-height: 1.5; margin-bottom: 14px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        Score: ${scoreValue}<br>
        ${bestLine}
      </div>
      <button id="restart-after-gameover" type="button" style="padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; touch-action: manipulation;">Back to start</button>
      <div style="font-size: 13px; color: white; margin-top: 16px; line-height: 1.6; opacity: 0.9;">Credits:<br>Astronaut by Quaternius<br>Wide City by Danni Litman</div>
    </div>
  `;
  gameOverDiv.style.display = "flex";

  const restartButton = gameOverDiv.querySelector<HTMLButtonElement>("#restart-after-gameover");
  restartButton?.addEventListener("click", () => {
    restartToStartFromGameOver();
  }, { once: true });
}

function renderHighScoreGameOver(scoreValue: number) {
  prepareGameOverOverlay();
  gameOverDiv.innerHTML = `
    <div style="width: min(420px, calc(100vw - 32px)); border-radius: 16px; padding: 24px 20px; background: linear-gradient(180deg, rgba(31,41,55,0.96) 0%, rgba(17,24,39,0.96) 100%); border: 1px solid rgba(255,255,255,0.16); box-shadow: 0 18px 42px rgba(0,0,0,0.42);">
      <div style="font-size: 52px; color: #ef4444; font-weight: 900; margin-bottom: 10px; text-shadow: 3px 3px 6px rgba(0,0,0,0.45);">GAME OVER</div>
      <div style="font-size: 24px; color: #fff; line-height: 1.5; margin-bottom: 12px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
        You made a high score on this device!<br>
        Score: ${scoreValue}
      </div>
      <div style="font-size: 14px; color: #fde68a; margin-bottom: 10px;">Type your name:</div>
      <input id="highscore-name" type="text" maxlength="24" placeholder="Player" style="width: min(260px, 80vw); padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); color: #fff; font-size: 14px; text-align: center; outline: none;" />
      <div style="margin-top: 10px; display: flex; justify-content: center; gap: 8px;">
        <button id="save-highscore" type="button" style="padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.35); background: rgba(16,185,129,0.28); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; touch-action: manipulation;">Save and continue</button>
      </div>
      <div style="font-size: 13px; color: white; margin-top: 16px; line-height: 1.6; opacity: 0.9;">Credits:<br>Astronaut by Quaternius<br>Wide City by Danni Litman</div>
    </div>
  `;
  gameOverDiv.style.display = "flex";

  const nameInput = gameOverDiv.querySelector<HTMLInputElement>("#highscore-name");
  const saveButton = gameOverDiv.querySelector<HTMLButtonElement>("#save-highscore");
  nameInput?.focus();

  const saveAndRestart = () => {
    const typedName = nameInput?.value?.trim() ?? "";
    const safeName = typedName.length > 0 ? typedName : "Player";
    saveLocalBestScore({ score: scoreValue, name: safeName });
    restartToStartFromGameOver();
  };

  saveButton?.addEventListener("click", saveAndRestart, { once: true });
  nameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveAndRestart();
    }
  });
}

function showGameOverWithLocalScore(scoreValue: number) {
  const best = loadLocalBestScore();
  const isHighScore = scoreValue > best.score;
  if (isHighScore) {
    renderHighScoreGameOver(scoreValue);
    return;
  }
  renderStandardGameOver(scoreValue, best);
}

const keys = new Set<string>();
window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

function isTypingIntoField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "h" && !isTypingIntoField(event.target)) {
    if (helpModal.style.display === "flex") {
      closeHelpModal();
    } else {
      openHelpModal();
    }
  }
  if (event.key === "Escape" && helpModal.style.display === "flex") {
    closeHelpModal();
  }
  if (key === "q" && !isTouchDevice && !event.repeat && helpModal.style.display !== "flex") {
    event.preventDefault();
    dropCarriedAmmoCrate();
  }
});

let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.0025;
let isAiming = false;
let aimTransition = 0;
// Ampumisrotaatio
let isShooting = false;
let shootRotation = 0;
let shootRotationEnd = 0;
let shootHoldTimeout: number | null = null;
let shootReleaseTimeout: number | null = null;
const isTouchDevice =
  window.matchMedia("(pointer: coarse)").matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;
const desktopPitchLimit = 1.2;
const mobilePitchUpLimit = desktopPitchLimit * 0.3;
const mobilePitchDownLimit = -desktopPitchLimit * 0.45;

function clampPitch(value: number) {
  if (isTouchDevice) {
    return Math.max(mobilePitchDownLimit, Math.min(mobilePitchUpLimit, value));
  }
  return Math.max(-desktopPitchLimit, Math.min(desktopPitchLimit, value));
}

let mobileMoveX = 0;
let mobileMoveY = 0;
let mobileJumpHeld = false;
let mobileDropBtn: HTMLButtonElement | null = null;
let mobileControlsLayer: HTMLDivElement | null = null;
let mobileLookX = 0;
let mobileLookY = 0;
let mobileLookTargetX = 0;
let mobileLookTargetY = 0;
let mobileLookTouchActive = false;
let mobileLookReleasedAt = -1;
let mobileSwipeSuppressUntil = 0;
const mobileLookReturnDelayMs = 1500;
const mobileLookRetouchSuppressMs = 120;
let mobileLeftStickReleasedAt = -1;

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }
  yaw -= event.movementX * mouseSensitivity;
  pitch -= event.movementY * mouseSensitivity;
  pitch = clampPitch(pitch);
});

renderer.domElement.addEventListener("click", () => {
  // Aktivoi äänet ensimmäisellä klikkauksella
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  if (isTouchDevice) {
    return;
  }
  renderer.domElement.requestPointerLock();
});

renderer.domElement.addEventListener("mouseup", (event) => {
  if (event.button === 2) {
    isAiming = false;
  }
});

// Estetään context menu oikealla napilla
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

function tryShoot() {
  if (gameOver) {
    return;
  }

  if (ammo <= 0) {
    return; // Ei ammuksia!
  }

  if (!pistolMesh) {
    return;
  }

  const now = clock.getElapsedTime();
  if (now - lastShotTime < shootCooldown) {
    return;
  }
  lastShotTime = now;

  // Kuluta ammus
  ammo -= 1;
  ammoDiv.textContent = `Ammo: ${ammo}`;
  renderCarriedAmmoCrates();

  // Soita laukausääni
  playShootSound();

  // Käännä hahmo tähtäyksen suuntaan punch-animaation ajaksi
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  aimRay.setFromCamera(aimNdc, camera);
  const aimDir = aimRay.ray.direction.clone();
  pistolMesh.getWorldDirection(pistolForward);
  shootRotation = Math.atan2(aimDir.x, aimDir.z);
  isShooting = true;
  const punchDuration = punchAction ? punchAction.getClip().duration : 0.5;
  shootRotationEnd = now + punchDuration;

  playForcedAction(punchAction, false, true);

  if (punchAction) {
    punchAction.reset().play();
    punchAction.paused = false;
    if (shootHoldTimeout !== null) window.clearTimeout(shootHoldTimeout);
    if (shootReleaseTimeout !== null) window.clearTimeout(shootReleaseTimeout);
    const holdTime = punchAction.getClip().duration * 0.5;
    shootHoldTimeout = window.setTimeout(() => {
      punchAction.paused = true;
    }, holdTime * 1000);
  }

  // Laukaise ammus vasta kun punch-animaatiossa käsi on ojennettuna
  const shootDelay = punchAction ? punchAction.getClip().duration * 0.35 : 0.25;
  setTimeout(() => {
    while (bullets.length >= maxActiveBullets) {
      removeBullet(0);
    }

    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bulletMesh.castShadow = !useMobilePerformanceProfile;
    bulletMesh.receiveShadow = !useMobilePerformanceProfile;
    scene.add(bulletMesh);

    let bulletShadow: THREE.Mesh | null = null;
    if (!useMobilePerformanceProfile) {
      bulletShadow = new THREE.Mesh(bulletShadowGeometry, bulletShadowMaterial);
      bulletShadow.rotation.x = -Math.PI / 2;
      bulletShadow.position.set(shootOrigin.x, groundLevel + 0.02, shootOrigin.z);
      bulletShadow.renderOrder = 1;
      scene.add(bulletShadow);
    }

    aimRay.setFromCamera(aimNdc, camera);
    const aimTargets: THREE.Object3D[] = [
      ...cameraCollisionMeshes,
      ...enemies.map((enemy) => enemy.mesh),
      ...ammoPickups.map((pickup) => pickup.mesh),
    ];
    const aimHits = aimRay.intersectObjects(aimTargets, true);
    const aimTarget =
      aimHits.length > 0
        ? aimHits[0].point.clone()
        : aimRay.ray.origin.clone().add(aimRay.ray.direction.clone().multiplyScalar(120));

    // Bullet magnetism (vain mobiili): jos vihollinen on ≤7° crosshairista, ammus ohjataan sinne
    if (isTouchDevice && enemies.length > 0) {
      const magnetThresholdCos = Math.cos(THREE.MathUtils.degToRad(3.5));
      const rayOrigin = aimRay.ray.origin;
      const rayDir = aimRay.ray.direction;
      let bestCos = magnetThresholdCos;
      let bestEnemy: (typeof enemies)[0] | null = null;
      for (const enemy of enemies) {
        const ePos = enemy.body.translation();
        const toEnemy = new THREE.Vector3(ePos.x, ePos.y, ePos.z).sub(rayOrigin).normalize();
        const cosAngle = toEnemy.dot(rayDir);
        if (cosAngle > bestCos) {
          bestCos = cosAngle;
          bestEnemy = enemy;
        }
      }
      if (bestEnemy) {
        const ePos = bestEnemy.body.translation();
        aimTarget.set(ePos.x, ePos.y, ePos.z);
      }
    }

    if (pistolMesh) {
      pistolMesh.getWorldPosition(shootOrigin);
    } else {
      shootOrigin.copy(playerCenter).add(new THREE.Vector3(0, 1.2, 0));
    }
    shootDirection.copy(aimTarget).sub(shootOrigin);
    if (shootDirection.lengthSq() < 1e-6) {
      shootDirection.copy(aimRay.ray.direction);
    }
    shootDirection.normalize();

    if (punchAction) {
      punchAction.paused = false;
      shootReleaseTimeout = window.setTimeout(() => {
        if (punchAction) {
          punchAction.paused = false;
        }
      }, 0);
    }
    const bulletSpawn = shootOrigin.clone().addScaledVector(shootDirection, 0.22);

    const bulletBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(bulletSpawn.x, bulletSpawn.y, bulletSpawn.z)
        .setGravityScale(0.10)
        .setLinearDamping(0.2)
        .setCcdEnabled(true)
    );
    const collider = RAPIER.ColliderDesc.ball(0.08)
      .setRestitution(0.85)
      .setFriction(0.15)
      .setCollisionGroups(collisionGroups(GROUP_BULLET, GROUP_WORLD | GROUP_ENEMY))
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(collider, bulletBody);
    bulletBody.setLinvel(
      {
        x: shootDirection.x * bulletSpeed,
        y: shootDirection.y * bulletSpeed,
        z: shootDirection.z * bulletSpeed,
      },
      true
    );

    bullets.push({ mesh: bulletMesh, body: bulletBody, life: 0, shadow: bulletShadow });
  }, shootDelay * 1000);
}

renderer.domElement.addEventListener("mousedown", (event) => {
  if (document.pointerLockElement !== renderer.domElement || gameOver) {
    return;
  }
  
  // Oikea nappi = tähtäys
  if (event.button === 2) {
    isAiming = true;
    return;
  }

  // Vasen nappi = ammu
  if (event.button === 0) {
    tryShoot();
  }
});

function setupMobileControls() {
  if (!isTouchDevice) {
    return;
  }

  const mobileLayer = document.createElement("div");
  mobileLayer.style.cssText =
    "position: fixed; inset: 0; z-index: 25; pointer-events: none; touch-action: none; user-select: none;";
  mobileControlsLayer = mobileLayer;
  app.appendChild(mobileLayer);

  const leftBase = document.createElement("div");
  leftBase.style.cssText =
    "position: absolute; left: calc(env(safe-area-inset-left) + 18px); bottom: calc(env(safe-area-inset-bottom) + 22px); width: 128px; height: 128px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.08); pointer-events: auto; touch-action: none;";
  const leftThumb = document.createElement("div");
  leftThumb.style.cssText =
    "position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; border-radius: 999px; transform: translate(-50%, -50%); border: 2px solid rgba(255,255,255,0.5); background: rgba(255,255,255,0.2);";
  leftBase.appendChild(leftThumb);
  mobileLayer.appendChild(leftBase);

  const lookPad = document.createElement("div");
  lookPad.style.cssText =
    "position: absolute; left: max(42%, 180px); right: 0; top: 0; bottom: 0; pointer-events: auto; touch-action: none;";
  mobileLayer.appendChild(lookPad);

  const lookHint = document.createElement("div");
  lookHint.style.cssText =
    "position: absolute; right: calc(env(safe-area-inset-right) - 34px); bottom: calc(env(safe-area-inset-bottom) + 104px); width: 180px; height: 180px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.14); background: radial-gradient(circle at 38% 38%, rgba(255,255,255,0.18), rgba(255,255,255,0.08) 34%, rgba(255,255,255,0.03) 58%, rgba(255,255,255,0.01) 72%, rgba(255,255,255,0) 100%); box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset; opacity: 0.75; pointer-events: none; transition: opacity 180ms ease;";
  lookHint.innerHTML = `
    <div style="position:absolute; left:34px; top:34px; width:64px; height:64px; border-radius:999px; border:2px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.04); display:flex; align-items:center; justify-content:center;">
      <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true" style="opacity:0.78; filter:drop-shadow(0 0 2px rgba(0,0,0,0.35));">
        <circle cx="10" cy="10" r="3.6" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="1.5"/>
        <line x1="10" y1="1.8" x2="10" y2="4.8" stroke="rgba(255,255,255,0.92)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="10" y1="15.2" x2="10" y2="18.2" stroke="rgba(255,255,255,0.92)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="1.8" y1="10" x2="4.8" y2="10" stroke="rgba(255,255,255,0.92)" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="15.2" y1="10" x2="18.2" y2="10" stroke="rgba(255,255,255,0.92)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>`;
  mobileLayer.appendChild(lookHint);

  const btnJump = document.createElement("button");
  btnJump.type = "button";
  btnJump.textContent = "Jump";
  btnJump.style.cssText =
    "position: absolute; right: calc(env(safe-area-inset-right) + 24px); bottom: calc(env(safe-area-inset-bottom) + 24px); width: 70px; height: 70px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.45); background: rgba(59,130,246,0.35); color: #fff; font-weight: 700; pointer-events: auto; touch-action: none;";
  mobileLayer.appendChild(btnJump);

  const btnDrop = document.createElement("button");
  btnDrop.type = "button";
  btnDrop.innerHTML = '<span style="font-size:22px;line-height:1;">📦</span><br><span style="font-size:11px;font-weight:700;">Drop</span>';
  btnDrop.style.cssText =
    "position: absolute; right: calc(env(safe-area-inset-right) + 104px); bottom: calc(env(safe-area-inset-bottom) + 24px); width: 70px; height: 70px; border-radius: 999px; border: 2px solid rgba(251,191,36,0.6); background: rgba(217,119,6,0.35); color: #fff; font-weight: 700; pointer-events: auto; touch-action: none; display: none; flex-direction: column; align-items: center; justify-content: center;";
  mobileLayer.appendChild(btnDrop);
  mobileDropBtn = btnDrop;

  const btnAim = document.createElement("button");
  btnAim.type = "button";
  btnAim.textContent = "Aim";
  btnAim.style.cssText =
    "position: absolute; left: calc(env(safe-area-inset-left) + 46px); bottom: calc(env(safe-area-inset-bottom) + 164px); width: 70px; height: 70px; border-radius: 999px; border: 2px solid rgba(255,255,255,0.45); background: rgba(16,185,129,0.35); color: #fff; font-weight: 700; pointer-events: auto; touch-action: none;";
  mobileLayer.appendChild(btnAim);

  const ensureAudioRunning = () => {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
  };

  let leftPointerId: number | null = null;
  const leftCenter = { x: 0, y: 0 };
  const leftRadius = 52;
  const leftMoveDeadzone = 0.12;
  const eightWayStep = Math.PI / 4;

  const updateLeftStick = (clientX: number, clientY: number) => {
    const dx = clientX - leftCenter.x;
    const dy = clientY - leftCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, leftRadius);
    const dirX = dist > 0.001 ? dx / dist : 0;
    const dirY = dist > 0.001 ? dy / dist : 0;
    const knobX = dirX * clampedDist;
    const knobY = dirY * clampedDist;
    leftThumb.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    const rawX = knobX / leftRadius;
    const rawY = -knobY / leftRadius;
    const magnitude = Math.sqrt(rawX * rawX + rawY * rawY);

    if (magnitude < leftMoveDeadzone) {
      mobileMoveX = 0;
      mobileMoveY = 0;
    } else {
      const snapAngle = Math.round(Math.atan2(rawY, rawX) / eightWayStep) * eightWayStep;
      mobileMoveX = Math.cos(snapAngle) * magnitude;
      mobileMoveY = Math.sin(snapAngle) * magnitude;
    }

    mobileLeftStickReleasedAt = -1;
  };

  const resetLeftStick = () => {
    leftThumb.style.transform = "translate(-50%, -50%)";
    mobileMoveX = 0;
    mobileMoveY = 0;
    mobileLeftStickReleasedAt = performance.now();
  };

  leftBase.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    ensureAudioRunning();
    leftPointerId = event.pointerId;
    const rect = leftBase.getBoundingClientRect();
    leftCenter.x = rect.left + rect.width / 2;
    leftCenter.y = rect.top + rect.height / 2;
    leftBase.setPointerCapture(event.pointerId);
    updateLeftStick(event.clientX, event.clientY);
  });

  leftBase.addEventListener("pointermove", (event: PointerEvent) => {
    if (leftPointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    updateLeftStick(event.clientX, event.clientY);
  });

  const endLeftStick = (event: PointerEvent) => {
    if (leftPointerId !== event.pointerId) {
      return;
    }
    leftPointerId = null;
    resetLeftStick();
  };

  leftBase.addEventListener("pointerup", endLeftStick);
  leftBase.addEventListener("pointercancel", endLeftStick);

  let lookPointerId: number | null = null;
  const lookDown = { x: 0, y: 0, t: 0 };
  const lookAnchor = { x: 0, y: 0 };
  const lookLast = { x: 0, y: 0 };
  let lookHintDismissed = false;
  const shootTapMaxMs = 220;
  const shootTapMaxMove = 14;
  const lookDeadzone = 0.16;
  const lookRadius = 84;
  const swipePixelDeadzone = 0.8;
  const swipeMaxStep = 16;
  const swipeYawSensitivity = 0.0024;
  const swipePitchSensitivity = 0.0019;
  const aimSwipePrecisionMultiplier = 0.52;
  const aimContinuousPrecisionMultiplier = 0.4;

  const dismissLookHint = () => {
    if (lookHintDismissed) {
      return;
    }
    lookHintDismissed = true;
    lookHint.style.opacity = "0";
  };

  const updateLookTarget = (clientX: number, clientY: number) => {
    const dx = clientX - lookAnchor.x;
    const dy = clientY - lookAnchor.y;
    let nx = THREE.MathUtils.clamp(dx / lookRadius, -1, 1);
    let ny = THREE.MathUtils.clamp(dy / lookRadius, -1, 1);
    const mag = Math.sqrt(nx * nx + ny * ny);

    if (mag < lookDeadzone) {
      mobileLookTargetX = 0;
      mobileLookTargetY = 0;
      return;
    }

    const scaledMag = THREE.MathUtils.clamp((mag - lookDeadzone) / (1 - lookDeadzone), 0, 1);
    const targetMagnitude = scaledMag * (isAiming ? aimContinuousPrecisionMultiplier : 1);
    nx = (nx / mag) * scaledMag;
    ny = (ny / mag) * scaledMag;
    mobileLookTargetX = (nx / Math.max(0.0001, scaledMag)) * targetMagnitude;
    mobileLookTargetY = (ny / Math.max(0.0001, scaledMag)) * targetMagnitude;
  };

  const resetLookDrag = () => {
    mobileLookTargetX = 0;
    mobileLookTargetY = 0;
  };

  const applySwipeLook = (deltaX: number, deltaY: number) => {
    const limitedX = THREE.MathUtils.clamp(deltaX, -swipeMaxStep, swipeMaxStep);
    const limitedY = THREE.MathUtils.clamp(deltaY, -swipeMaxStep, swipeMaxStep);

    const stepX = Math.abs(limitedX) < swipePixelDeadzone ? 0 : limitedX;
    const stepY = Math.abs(limitedY) < swipePixelDeadzone ? 0 : limitedY;

    if (stepX === 0 && stepY === 0) {
      return;
    }

    const precision = isAiming ? aimSwipePrecisionMultiplier : 1;
    yaw -= stepX * swipeYawSensitivity * precision;
    pitch = clampPitch(pitch - stepY * swipePitchSensitivity * precision);
  };

  lookPad.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    ensureAudioRunning();
    dismissLookHint();
    const now = performance.now();
    const releasedForMs = mobileLookReleasedAt < 0 ? 0 : now - mobileLookReleasedAt;
    if (releasedForMs >= mobileLookReturnDelayMs) {
      mobileSwipeSuppressUntil = now + mobileLookRetouchSuppressMs;
    }
    mobileLookTouchActive = true;
    mobileLookReleasedAt = -1;
    lookPointerId = event.pointerId;
    lookDown.x = event.clientX;
    lookDown.y = event.clientY;
    lookDown.t = performance.now();
    lookAnchor.x = event.clientX;
    lookAnchor.y = event.clientY;
    lookLast.x = event.clientX;
    lookLast.y = event.clientY;
    resetLookDrag();
    lookPad.setPointerCapture(event.pointerId);
  });

  lookPad.addEventListener("pointermove", (event: PointerEvent) => {
    if (lookPointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    if (performance.now() < mobileSwipeSuppressUntil) {
      lookAnchor.x = event.clientX;
      lookAnchor.y = event.clientY;
      lookLast.x = event.clientX;
      lookLast.y = event.clientY;
      resetLookDrag();
      return;
    }
    const deltaX = event.clientX - lookLast.x;
    const deltaY = event.clientY - lookLast.y;
    lookLast.x = event.clientX;
    lookLast.y = event.clientY;
    applySwipeLook(deltaX, deltaY);
    updateLookTarget(event.clientX, event.clientY);
  });

  const endLook = (event: PointerEvent) => {
    if (lookPointerId !== event.pointerId) {
      return;
    }
    const dt = performance.now() - lookDown.t;
    const dxTap = event.clientX - lookDown.x;
    const dyTap = event.clientY - lookDown.y;
    const moved = Math.sqrt(dxTap * dxTap + dyTap * dyTap);
    if (dt <= shootTapMaxMs && moved <= shootTapMaxMove) {
      tryShoot();
    }
    mobileLookTouchActive = false;
    mobileLookReleasedAt = performance.now();
    lookPointerId = null;
    resetLookDrag();
  };

  lookPad.addEventListener("pointerup", endLook);
  lookPad.addEventListener("pointercancel", endLook);

  const bindHoldButton = (
    button: HTMLButtonElement,
    onDown: () => void,
    onUp: () => void
  ) => {
    button.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      ensureAudioRunning();
      button.setPointerCapture(event.pointerId);
      onDown();
    });
    const end = (event: PointerEvent) => {
      event.preventDefault();
      onUp();
    };
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("pointerleave", end);
  };

  bindHoldButton(btnJump, () => {
    mobileJumpHeld = true;
  }, () => {
    mobileJumpHeld = false;
  });

  btnDrop.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    dropCarriedAmmoCrate();
  });

  bindHoldButton(btnAim, () => {
    isAiming = true;
  }, () => {
    isAiming = false;
  });
}

setupMobileControls();

const clock = new THREE.Clock();
const walkSpeed = 4.5;
const runSpeed = 7.5;
const jumpSpeed = 13.2;
const jumpHorizontalMultiplier = 0.75;
const gravity = -14;
const bulletSpeed = 52;
const bulletLifetime = useMobilePerformanceProfile ? 1.6 : 2.2;
const maxActiveBullets = useMobilePerformanceProfile ? 24 : 48;
const ammoCrateHitRadius = 0.3;
const ammoCrateFlashRadius = 4.6;
const ammoCrateExplosionRadius = ammoCrateFlashRadius * 5;
const ammoCrateChainRadius = ammoCrateFlashRadius * 1.6;
const shootCooldown = 0.2;
let lastShotTime = 0;

const capsuleRadius = 0.35;
const capsuleHalfHeight = 0.4;
const characterHalfHeight = capsuleRadius + capsuleHalfHeight;

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveDir = new THREE.Vector3();
const airLockedDirection = new THREE.Vector3();
const airLockedMoveDir = new THREE.Vector3();
const turnSpeed = 12;
const visualLerp = 18;
const visualPosition = new THREE.Vector3();
const shootDirection = new THREE.Vector3();
const shootOrigin = new THREE.Vector3();
const shootQuat = new THREE.Quaternion();
const aimRay = new THREE.Raycaster();
const aimNdc = new THREE.Vector2(0, 1 - 2 * crosshairScreenY);
const pistolForward = new THREE.Vector3();
const enemySightRay = new THREE.Raycaster();
const enemySightFrom = new THREE.Vector3();
const enemySightTo = new THREE.Vector3();
const enemySightDir = new THREE.Vector3();
const enemySightTargetOffset = new THREE.Vector3(0, 1.0, 0);

function removeBullet(index: number) {
  const bullet = bullets[index];
  world.removeRigidBody(bullet.body);
  scene.remove(bullet.mesh);
  if (bullet.shadow) {
    scene.remove(bullet.shadow);
  }
  bullets.splice(index, 1);
}

const GROUP_PLAYER = 0b0001;
const GROUP_WORLD = 0b0010;
const GROUP_ENEMY = 0b0100;
const GROUP_BULLET = 0b1000;

const collisionGroups = (membership: number, filter: number) => (membership << 16) | filter;

function setColliderGroups(collider: RAPIER.Collider, membership: number, filter: number) {
  collider.setCollisionGroups(collisionGroups(membership, filter));
}

let world: RAPIER.World;
let controller: RAPIER.KinematicCharacterController;
let groundBody: RAPIER.RigidBody;
let groundCollider: RAPIER.Collider;
let playerBody: RAPIER.RigidBody;
let playerCollider: RAPIER.Collider;

async function initPhysics() {
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: gravity, z: 0 });
  controller = world.createCharacterController(0.1);
  controller.setSlideEnabled(true);
  controller.enableAutostep(0.28, 0.18, true);

  groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(70, 0.1, 70)
    .setTranslation(0, groundLevel - 0.05, 0)
    .setCollisionGroups(collisionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_ENEMY));
  groundCollider = world.createCollider(groundColliderDesc, groundBody);

  playerBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, groundLevel + characterHalfHeight, 0)
  );
  playerCollider = world.createCollider(
    RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius)
      .setCollisionGroups(collisionGroups(GROUP_PLAYER, GROUP_WORLD)),
    playerBody
  );

  try {
    await loadWideCity();
  } catch (error) {
    console.warn("Wide City model failed to load.", error);
  }

  const obstacleCount = 0;
  for (let i = 0; i < obstacleCount; i += 1) {
    const x = (Math.random() - 0.5) * 90;
    const z = (Math.random() - 0.5) * 90;
    const sx = 1.5 + Math.random() * 3.5;
    const sy = 2.5 + Math.random() * 4;  // Korkeampia laatikoita (2.5-6.5m)
    const sz = 1.5 + Math.random() * 3.5;
    addObstacle(x, groundLevel + sy / 2, z, sx, sy, sz);
  }

  let ammoBoxesCreated = 0;
  while (ammoBoxesCreated < 20) {
    const x = (Math.random() - 0.5) * 55;
    const z = (Math.random() - 0.5) * 55;

    if (isPositionClear(x, z, 3)) {
      createAmmoPickup(x, z);
      ammoBoxesCreated++;
    }
  }

  // Spawnaa alkuvihollisia eri puolille kaupunkia
  const citySize = 200;
  for (let i = 0; i < 8; i += 1) {
    const x = (Math.random() - 0.5) * citySize;
    const z = (Math.random() - 0.5) * citySize;
    spawnEnemy(x, z);
  }
}

function addObstacle(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const variant = Math.floor(Math.random() * 3);
  let geometry: THREE.BufferGeometry;

  if (variant === 0) {
    geometry = new THREE.IcosahedronGeometry(0.6, 1);
  } else if (variant === 1) {
    geometry = new THREE.CylinderGeometry(0.5, 0.8, 1.2, 8);
  } else {
    geometry = new THREE.ConeGeometry(0.6, 1.4, 8);
  }

  const mesh = new THREE.Mesh(geometry, obstacleMaterial);
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  cameraCollisionMeshes.push(mesh);

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  const size = new THREE.Vector3();
  if (bbox) {
    bbox.getSize(size);
    size.multiply(mesh.scale);
  } else {
    size.set(sx, sy, sz);
  }

  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
    .setCollisionGroups(collisionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_ENEMY));
  world.createCollider(colliderDesc, body);
  obstacles.push({ mesh, body });
}


// Luo ammuslaatikot (lippaat) satunnaisiin paikkoihin
function isPositionClear(x: number, z: number, minDist: number): boolean {
  // Tarkista etteivät esteet ole liian lähellä
  for (const obs of obstacles) {
    const dx = obs.mesh.position.x - x;
    const dz = obs.mesh.position.z - z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) return false;
  }
  return true;
}

function renderCarriedAmmoCrates() {
  const carriedAmmoCrates = Math.max(0, Math.ceil(ammo / ammoPerPickup));
  ammoCrateInventoryDiv.innerHTML = "";
  if (carriedAmmoCrates <= 0) {
    ammoCrateInventoryDiv.style.display = "none";
    if (mobileDropBtn) mobileDropBtn.style.display = "none";
    return;
  }

  ammoCrateInventoryDiv.style.display = "flex";
  if (mobileDropBtn) {
    mobileDropBtn.style.display = carriedAmmoCrates > 0 ? "flex" : "none";
  }
  for (let i = 0; i < carriedAmmoCrates; i += 1) {
    const crateButton = document.createElement("button");
    crateButton.type = "button";
    crateButton.title = "Drop ammo crate";
    crateButton.style.cssText =
      "width: 24px; height: 24px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.35); background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%); box-shadow: 0 2px 6px rgba(0,0,0,0.28); cursor: pointer; position: relative; padding: 0;";
    crateButton.innerHTML = '<span style="position:absolute; inset:7px 3px auto 3px; height:4px; background:#111827; border-radius:2px;"></span>';
    crateButton.addEventListener("click", () => {
      dropCarriedAmmoCrate();
    });
    ammoCrateInventoryDiv.appendChild(crateButton);
  }
}

function dropCarriedAmmoCrate() {
  if (ammo < ammoPerPickup) {
    return;
  }

  const dropDir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  if (dropDir.lengthSq() <= 0.0001) {
    dropDir.set(0, 0, -1);
  } else {
    dropDir.normalize();
  }

  const dropDistance = 1.15;
  const dropX = playerCenter.x + dropDir.x * dropDistance;
  const dropZ = playerCenter.z + dropDir.z * dropDistance;
  createAmmoPickup(dropX, dropZ, performance.now() + droppedAmmoCratePickupDelayMs);
  ammo -= ammoPerPickup;
  ammoDiv.textContent = `Ammo: ${ammo}`;
  renderCarriedAmmoCrates();
}

renderCarriedAmmoCrates();

function createAmmoPickup(x: number, z: number, collectAvailableAt = 0, spawnFromSky = false, skyHeightOffset = 0) {
  const group = new THREE.Group();
  const landY = groundLevel + 0.3;
  const spawnY = spawnFromSky ? landY + ammoCrateSkySpawnHeight + skyHeightOffset : landY;
  
  // Kullanvärinen laatikko (ammo crate)
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ 
      color: 0xfbbf24,
      metalness: 0.6,
      roughness: 0.3
    })
  );
  box.castShadow = true;
  group.add(box);
  
  // Musta "AMMO" merkki
  const label = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  label.position.y = 0.1;
  group.add(label);
  
  group.position.set(x, spawnY, z);
  scene.add(group);
  
  ammoPickups.push({
    mesh: group,
    position: new THREE.Vector3(x, spawnY, z),
    exploding: false,
    collectAvailableAt,
    landY,
    fallSpeed: 0,
  });
}

function createAmmoDropBeacon(x: number, z: number, radius: number) {
  const light = new THREE.PointLight(0xfde68a, 0, Math.max(14, radius * 3), 2);
  light.position.set(x, groundLevel + 5.5, z);
  scene.add(light);

  const beamHeight = 44;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(0.28, radius * 0.07), Math.max(0.55, radius * 0.13), beamHeight, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beam.position.set(x, groundLevel + beamHeight * 0.5 + 0.1, z);
  scene.add(beam);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(1.8, radius * 0.55), Math.max(2.8, radius * 0.95), 40),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, groundLevel + 0.04, z);
  scene.add(ring);

  ammoDropBeacons.push({
    light,
    ring,
    beam,
    startTime: performance.now(),
    durationMs: ammoDropBeaconDurationMs,
    pulseOffset: Math.random() * Math.PI * 2,
  });
}

function scheduleAmmoCrateExplosion(pickup: AmmoPickup, delayMs: number) {
  if (pickup.exploding) {
    return;
  }
  pickup.exploding = true;
  window.setTimeout(() => {
    explodeAmmoCrate(pickup);
  }, delayMs);
}

function getDifficultySettings(elapsedSeconds: number) {
  // 0..1 skaala, jossa vaikeus nousee ensimmäisen noin 3 minuutin ajan.
  const ramp = Math.min(1, Math.max(0, elapsedSeconds / 180));
  return {
    speedMultiplier: 1 + 0.55 * ramp,
    spawnInterval: Math.max(1.2, baseSpawnInterval - 1.6 * ramp),
    maxEnemies: Math.floor(baseMaxEnemies + 60 * ramp),
    phasingChance: 0.5 + 0.35 * ramp,
    phaseSwitchMin: 1.2,
    phaseSwitchMax: 2.4,
    ramp,
  };
}

function spawnRandomAmmoPickupCluster() {
  const maxCenterAttempts = 20;
  const edgeMargin = 8;
  const minSpacingSq = 1.25 * 1.25;
  const clusterCount = Math.floor(Math.random() * (ammoCrateClusterMax - ammoCrateClusterMin + 1)) + ammoCrateClusterMin;

  for (let i = 0; i < maxCenterAttempts; i += 1) {
    const centerX = (Math.random() * 2 - 1) * (playAreaHalfSize - edgeMargin);
    const centerZ = (Math.random() * 2 - 1) * (playAreaHalfSize - edgeMargin);
    const clusterRadius = 3 + Math.random() * 8;
    const spawnPositions: Array<{ x: number; z: number; skyHeightOffset: number }> = [];
    const candidateAttempts = clusterCount * 8;

    for (let attempt = 0; attempt < candidateAttempts && spawnPositions.length < clusterCount; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * clusterRadius;
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;

      if (Math.abs(x) > playAreaHalfSize - 2 || Math.abs(z) > playAreaHalfSize - 2) {
        continue;
      }

      if (!isPositionClear(x, z, 2.2)) {
        continue;
      }

      const tooCloseToOtherPickup = ammoPickups.some((pickup) => {
        const dx = pickup.position.x - x;
        const dz = pickup.position.z - z;
        return dx * dx + dz * dz < minSpacingSq;
      });

      if (tooCloseToOtherPickup) {
        continue;
      }

      const tooCloseToClusterPickup = spawnPositions.some((pickup) => {
        const dx = pickup.x - x;
        const dz = pickup.z - z;
        return dx * dx + dz * dz < minSpacingSq;
      });

      if (tooCloseToClusterPickup) {
        continue;
      }

      spawnPositions.push({
        x,
        z,
        skyHeightOffset: Math.random() * 18,
      });
    }

    if (spawnPositions.length < ammoCrateClusterMin) {
      continue;
    }

    const averageX = spawnPositions.reduce((sum, pickup) => sum + pickup.x, 0) / spawnPositions.length;
    const averageZ = spawnPositions.reduce((sum, pickup) => sum + pickup.z, 0) / spawnPositions.length;
    spawnPositions.forEach((pickup) => {
      createAmmoPickup(pickup.x, pickup.z, 0, true, pickup.skyHeightOffset);
    });
    playSupplyDropSound();
    createAmmoDropBeacon(averageX, averageZ, clusterRadius + 2);
    return;
  }
}

function explodeAmmoCrate(pickup: AmmoPickup) {
  const pickupIndex = ammoPickups.indexOf(pickup);
  if (pickupIndex === -1) {
    return;
  }
  const center = pickup.position.clone();
  const blastOrigin = center.clone().add(new THREE.Vector3(0, 0.2, 0));

  playExplosionSound();
  createBloodSplatter(center.x, center.y + 0.25, center.z);

  // Kevyt räjähdysvälähdys
  const blast = new THREE.Mesh(
    new THREE.SphereGeometry(ammoCrateFlashRadius, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.85 })
  );
  blast.position.copy(center);
  scene.add(blast);
  setTimeout(() => {
    scene.remove(blast);
    blast.geometry.dispose();
    (blast.material as THREE.Material).dispose();
  }, 120);

  scene.remove(pickup.mesh);
  ammoPickups.splice(pickupIndex, 1);

  const blastDistSq = ammoCrateExplosionRadius * ammoCrateExplosionRadius;
  const chainDistSq = ammoCrateChainRadius * ammoCrateChainRadius;
  const chainedPickups = ammoPickups
    .filter((otherPickup) => {
      if (otherPickup.exploding) {
        return false;
      }
      const dx = otherPickup.position.x - center.x;
      const dy = otherPickup.position.y - center.y;
      const dz = otherPickup.position.z - center.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > chainDistSq) {
        return false;
      }
      return hasExplosionLineOfSight(blastOrigin, otherPickup.position, 0.2);
    })
    .sort((a, b) => center.distanceToSquared(a.position) - center.distanceToSquared(b.position));

  chainedPickups.forEach((otherPickup, index) => {
    scheduleAmmoCrateExplosion(otherPickup, (index + 1) * 100);
  });

  for (let j = enemies.length - 1; j >= 0; j -= 1) {
    const enemy = enemies[j];
    const epos = enemy.body.translation();
    const dx = epos.x - center.x;
    const dy = epos.y - center.y;
    const dz = epos.z - center.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > blastDistSq) {
      continue;
    }

    if (!hasExplosionLineOfSight(blastOrigin, epos)) {
      continue;
    }

    createBloodSplatter(epos.x, epos.y + 0.5, epos.z);
    world.removeRigidBody(enemy.body);
    scene.remove(enemy.mesh);
    enemies.splice(j, 1);
    score += 1;
  }
  scoreDiv.textContent = `Score: ${score}`;
}


function createSlimeEnemy() {
  const group = new THREE.Group();
  
  // Slimen päärunko (vihreä kiiltävä kapseli)
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 0.8, 8, 16),
    new THREE.MeshStandardMaterial({ 
      color: 0x22c55e,
      emissive: 0x0b3d1a,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95
    })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  
  // Vasen silmä
  const leftEyeWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  leftEyeWhite.position.set(-0.2, 0.6, 0.35);
  leftEyeWhite.castShadow = true;
  group.add(leftEyeWhite);
  
  const leftPupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  leftPupil.position.set(-0.2, 0.6, 0.43);
  group.add(leftPupil);
  
  // Oikea silmä
  const rightEyeWhite = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  rightEyeWhite.position.set(0.2, 0.6, 0.35);
  rightEyeWhite.castShadow = true;
  group.add(rightEyeWhite);
  
  const rightPupil = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  rightPupil.position.set(0.2, 0.6, 0.43);
  group.add(rightPupil);
  
  // Lisää pienet kuhmut slimen päälle
  for (let i = 0; i < 3; i++) {
    const bump = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x16a34a,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 0.8
      })
    );
    const angle = (i / 3) * Math.PI * 2;
    bump.position.set(
      Math.cos(angle) * 0.35,
      0.2 + Math.random() * 0.4,
      Math.sin(angle) * 0.35
    );
    group.add(bump);
  }
  
  return group;
}

function spawnEnemy(x: number, z: number) {
  const enemyHeight = 1.8;
  const enemyRadius = 0.5;
  const difficulty = getDifficultySettings(clock.getElapsedTime());
  
  const mesh = createSlimeEnemy();
  mesh.position.set(x, groundLevel + enemyHeight / 2, z);
  mesh.scale.setScalar(1.5);
  scene.add(mesh);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(x, groundLevel + enemyHeight / 2, z)
  );
  const colliderDesc = RAPIER.ColliderDesc.capsule(enemyHeight / 2 - enemyRadius, enemyRadius);
  const collider = world.createCollider(colliderDesc, body);

  const phaseMode: "solid" | "phasing" = Math.random() < difficulty.phasingChance ? "phasing" : "solid";
  const phaseState: "solid" | "ghost" = "solid";
  const phaseMin = THREE.MathUtils.lerp(2.0, difficulty.phaseSwitchMin, difficulty.ramp);
  const phaseMax = THREE.MathUtils.lerp(4.0, difficulty.phaseSwitchMax, difficulty.ramp);
  const nextPhaseSwitch =
    phaseMode === "phasing"
      ? clock.getElapsedTime() + phaseMin + Math.random() * Math.max(0.2, phaseMax - phaseMin)
      : Infinity;
  setColliderGroups(collider, GROUP_ENEMY, GROUP_WORLD);
  
  const moveDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
  enemies.push({ mesh, body, collider, health: 2, phaseMode, phaseState, nextPhaseSwitch, moveDir });
  console.log("[Slime] spawn", { x, z, phaseMode });
}


let verticalVelocity = 0;
let lastVerticalVelocity = 0;
const playerCenter = new THREE.Vector3();
let mixer: THREE.AnimationMixer | null = null;
let activeAction: THREE.AnimationAction | null = null;
let idleAction: THREE.AnimationAction | null = null;
let runAction: THREE.AnimationAction | null = null;
let jumpAction: THREE.AnimationAction | null = null;
let fallAction: THREE.AnimationAction | null = null;
let duckAction: THREE.AnimationAction | null = null;
let punchAction: THREE.AnimationAction | null = null;
let waveAction: THREE.AnimationAction | null = null;
let deathAction: THREE.AnimationAction | null = null;
let walkAction: THREE.AnimationAction | null = null;
let groundedTime = 0;
let airTime = 0;
let useProceduralWalk = true;
let walkTime = 0;
let groundedVisual = true;
let animationMode: "auto" | "manual" = "auto";
const allActions = new Map<string, THREE.AnimationAction>();
const clipOrder: string[] = [];
let currentClipIndex = 0;
let forcedAction: THREE.AnimationAction | null = null;
let forcedHold = false;
let duckHeld = false;
let running = false;
let pistolMesh: THREE.Object3D | null = null;

function createPlaceholderCharacter() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.7, 12), bodyMat);
  torso.position.set(0, 0.65, 0);
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), headMat);
  head.position.set(0, 1.1, 0);
  head.castShadow = true;
  group.add(head);

  const legMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9 });
  const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.18);
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.15, 0.25, 0);
  rightLeg.position.set(0.15, 0.25, 0);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  return group;
}

async function loadWideCity() {
  console.log("[WideCity] loading start");
  const basePath = `${import.meta.env.BASE_URL}models/wide-city/`;
  const mtlLoader = new MTLLoader();
  const materials = await mtlLoader.setPath(basePath).loadAsync("materials.mtl");
  materials.preload();
  console.log("[WideCity] materials loaded");

  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  const city = await objLoader.setPath(basePath).loadAsync("model.obj");
  console.log("[WideCity] model loaded");
  city.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          if (mat && "color" in mat) {
            mat.color.setHex(0x2d4a2d);
          }
          if (mat && "emissive" in mat) {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0.0;
          }
          mat.needsUpdate = true;
        });
    }
  });

  const targetSize = 260;
  const preBox = new THREE.Box3().setFromObject(city);
  const preSize = new THREE.Vector3();
  preBox.getSize(preSize);
  console.log("[WideCity] preSize", preSize);
  const scale = targetSize / Math.max(preSize.x, preSize.z);
  city.scale.setScalar(scale);
  city.updateMatrixWorld(true);

  const bbox = new THREE.Box3().setFromObject(city);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  console.log("[WideCity] scaledSize", size, "center", center, "minY", bbox.min.y);

  const cityGroundOffset = 1.5;
  city.position.set(-center.x, groundLevel, -center.z);
  city.updateMatrixWorld(true);
  const floorY = computeCityFloorY(city);
  city.position.y += -floorY - cityGroundOffset;
  city.updateMatrixWorld(true);
  const alignedBox = new THREE.Box3().setFromObject(city);
  const alignedSize = new THREE.Vector3();
  const alignedCenter = new THREE.Vector3();
  alignedBox.getSize(alignedSize);
  alignedBox.getCenter(alignedCenter);
  console.log("[WideCity] final position", city.position, "finalMinY", alignedBox.min.y, "floorY", floorY);
  scene.add(city);
  city.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      cameraCollisionMeshes.push(child);
    }
  });

  moonLight.target.position.copy(alignedCenter);
  moonLight.target.updateMatrixWorld();

  spawnGroundDetails(city, alignedCenter, alignedSize);

  buildWideCityCollider(city);

  groundLevel = -0.6;
  ground.position.set(alignedCenter.x, groundLevel, alignedCenter.z);
  const groundWidth = groundGeo.parameters.width;
  const groundHeight = groundGeo.parameters.height;
  ground.scale.set(alignedSize.x / groundWidth, alignedSize.z / groundHeight, 1);
  // doorPosition.set(0, groundLevel, 12);
  if (playerBody) {
    playerBody.setNextKinematicTranslation({ x: 0, y: groundLevel + characterHalfHeight, z: 0 });
  }
  if (groundCollider) {
    const halfX = alignedSize.x / 2;
    const halfZ = alignedSize.z / 2;
    groundCollider.setTranslation({ x: alignedCenter.x, y: groundLevel - 0.05, z: alignedCenter.z });
    groundCollider.setShape(new RAPIER.Cuboid(halfX, 0.1, halfZ));
  }

  // placeLevelDoor();
}

function computeCityFloorY(city: THREE.Object3D) {
  const ys: number[] = [];
  city.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      ys.push(position.getY(i));
    }
    geometry.dispose();
  });

  if (ys.length === 0) {
    return 0;
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (const y of ys) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const range = Math.max(0.0001, maxY - minY);
  const binSize = range / 200;
  const bins = new Map<number, number>();

  for (const y of ys) {
    const bin = Math.round((y - minY) / binSize);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }

  let bestBin = 0;
  let bestCount = -1;
  for (const [bin, count] of bins) {
    if (count > bestCount) {
      bestCount = count;
      bestBin = bin;
    }
  }

  return minY + bestBin * binSize;
}

type BuildingFootprint = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
};

function collectBuildingFootprints(city: THREE.Object3D) {
  const footprints: BuildingFootprint[] = [];
  city.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const box = new THREE.Box3().setFromObject(child);
    const height = box.max.y - box.min.y;
    if (height < 2) return;
    footprints.push({
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
      minY: box.min.y,
      maxY: box.max.y,
    });
  });
  return footprints;
}

function distanceToFootprint2D(x: number, z: number, fp: BuildingFootprint) {
  const dx = Math.max(fp.minX - x, 0, x - fp.maxX);
  const dz = Math.max(fp.minZ - z, 0, z - fp.maxZ);
  return Math.sqrt(dx * dx + dz * dz);
}

function spawnGroundDetails(city: THREE.Object3D, center: THREE.Vector3, size: THREE.Vector3) {
  const footprints = collectBuildingFootprints(city);
  const area = size.x * size.z;
  const rockCount = Math.max(120, Math.floor(area * 0.004));
  const bigRockCount = Math.max(30, Math.floor(area * 0.0012));
  const twigCount = Math.max(220, Math.floor(area * 0.008));
  const mossCount = Math.max(160, Math.floor(area * 0.004));
  const plantCount = Math.max(200, Math.floor(area * 0.005));

  const rockGeometry = new THREE.DodecahedronGeometry(0.35, 0);
  const bigRockGeometry = new THREE.IcosahedronGeometry(0.8, 0);
  const twigGeometry = new THREE.CylinderGeometry(0.03, 0.06, 0.8, 6);
  const mossGeometry = new THREE.SphereGeometry(0.25, 8, 8);
  const plantGeometry = new THREE.ConeGeometry(0.08, 0.5, 6);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.95 });
  const bigRockMaterial = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.98 });
  const twigMaterial = new THREE.MeshStandardMaterial({ color: 0x3a2f23, roughness: 1.0 });
  const mossMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5a35, roughness: 1.0 });
  const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x2b6a3b, roughness: 1.0 });

  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
  const bigRocks = new THREE.InstancedMesh(bigRockGeometry, bigRockMaterial, bigRockCount);
  const twigs = new THREE.InstancedMesh(twigGeometry, twigMaterial, twigCount);
  const mosses = new THREE.InstancedMesh(mossGeometry, mossMaterial, mossCount);
  const plants = new THREE.InstancedMesh(plantGeometry, plantMaterial, plantCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  bigRocks.castShadow = true;
  bigRocks.receiveShadow = true;
  twigs.castShadow = true;
  twigs.receiveShadow = true;
  mosses.castShadow = true;
  mosses.receiveShadow = true;
  plants.castShadow = true;
  plants.receiveShadow = true;

  const rockMatrix = new THREE.Matrix4();
  const bigRockMatrix = new THREE.Matrix4();
  const twigMatrix = new THREE.Matrix4();
  const mossMatrix = new THREE.Matrix4();
  const plantMatrix = new THREE.Matrix4();
  const rockQuat = new THREE.Quaternion();
  const bigRockQuat = new THREE.Quaternion();
  const twigQuat = new THREE.Quaternion();
  const mossQuat = new THREE.Quaternion();
  const plantQuat = new THREE.Quaternion();
  const rockPos = new THREE.Vector3();
  const bigRockPos = new THREE.Vector3();
  const twigPos = new THREE.Vector3();
  const mossPos = new THREE.Vector3();
  const plantPos = new THREE.Vector3();
  const rockScale = new THREE.Vector3();
  const bigRockScale = new THREE.Vector3();
  const twigScale = new THREE.Vector3();
  const mossScale = new THREE.Vector3();
  const plantScale = new THREE.Vector3();

  let rockIndex = 0;
  let bigRockIndex = 0;
  let twigIndex = 0;
  let mossIndex = 0;
  let plantIndex = 0;
  let attempts = 0;
  const maxAttempts = (rockCount + bigRockCount + twigCount + mossCount + plantCount) * 18;
  const detailColliderBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());

  while ((rockIndex < rockCount || bigRockIndex < bigRockCount || twigIndex < twigCount || mossIndex < mossCount || plantIndex < plantCount) && attempts < maxAttempts) {
    attempts += 1;
    const x = center.x + (Math.random() - 0.5) * size.x;
    const z = center.z + (Math.random() - 0.5) * size.z;

    let minDist = Infinity;
    let inside = false;
    for (const fp of footprints) {
      if (x >= fp.minX && x <= fp.maxX && z >= fp.minZ && z <= fp.maxZ) {
        inside = true;
        break;
      }
      const dist = distanceToFootprint2D(x, z, fp);
      if (dist < minDist) minDist = dist;
    }
    if (inside) continue;

    const wallWeight = Math.max(0.05, Math.min(1, 1 - minDist / 8));
    const allow = Math.random() < wallWeight;
    if (!allow) continue;

    const y = groundLevel + 0.02;
    const angle = Math.random() * Math.PI * 2;

    if (bigRockIndex < bigRockCount && Math.random() < 0.25) {
      const s = 1.2 + Math.random() * 1.8;
      const height = 1.6 * s;
      const sink = height / 6;
      bigRockPos.set(x, groundLevel - sink, z);
      bigRockQuat.setFromEuler(new THREE.Euler(0, angle, 0));
      bigRockScale.set(s, s * (0.8 + Math.random() * 0.6), s);
      bigRockMatrix.compose(bigRockPos, bigRockQuat, bigRockScale);
      bigRocks.setMatrixAt(bigRockIndex, bigRockMatrix);
      const bigRadius = 0.5 * s;
      const bigColliderDesc = RAPIER.ColliderDesc.ball(bigRadius)
        .setTranslation(x, groundLevel + bigRadius * 0.9, z)
        .setCollisionGroups(collisionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_ENEMY));
      world.createCollider(bigColliderDesc, detailColliderBody);
      bigRockIndex += 1;
    } else if (rockIndex < rockCount && Math.random() < 0.55) {
      rockPos.set(x, y, z);
      rockQuat.setFromEuler(new THREE.Euler(0, angle, 0));
      const s = 0.4 + Math.random() * 0.9;
      rockScale.set(s, s * (0.7 + Math.random() * 0.6), s);
      rockMatrix.compose(rockPos, rockQuat, rockScale);
      rocks.setMatrixAt(rockIndex, rockMatrix);
      // Pienistä kivistä tehdään matalia, jotta niiden yli voi kävellä ilman hyppyä.
      const rockHalfHeight = 0.05 + 0.02 * s;
      const rockHalfWidth = 0.2 + 0.14 * s;
      const rockColliderDesc = RAPIER.ColliderDesc.cuboid(rockHalfWidth, rockHalfHeight, rockHalfWidth)
        .setTranslation(x, groundLevel + rockHalfHeight, z)
        .setCollisionGroups(collisionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_ENEMY));
      world.createCollider(rockColliderDesc, detailColliderBody);
      rockIndex += 1;
    } else if (twigIndex < twigCount && Math.random() < 0.7) {
      twigPos.set(x, y, z);
      twigQuat.setFromEuler(new THREE.Euler(Math.random() * 0.2, angle, Math.random() * 0.2));
      twigScale.set(0.6 + Math.random() * 0.8, 0.6 + Math.random() * 1.2, 0.6 + Math.random() * 0.8);
      twigMatrix.compose(twigPos, twigQuat, twigScale);
      twigs.setMatrixAt(twigIndex, twigMatrix);
      twigIndex += 1;
    } else if (mossIndex < mossCount && Math.random() < wallWeight * 0.6) {
      mossPos.set(x, groundLevel + 0.01, z);
      mossQuat.setFromEuler(new THREE.Euler(0, angle, 0));
      mossScale.set(0.6 + Math.random() * 1.2, 0.2 + Math.random() * 0.4, 0.6 + Math.random() * 1.2);
      mossMatrix.compose(mossPos, mossQuat, mossScale);
      mosses.setMatrixAt(mossIndex, mossMatrix);
      mossIndex += 1;
    } else if (plantIndex < plantCount && Math.random() < wallWeight * 0.5) {
      plantPos.set(x, groundLevel + 0.02, z);
      plantQuat.setFromEuler(new THREE.Euler(Math.random() * 0.1, angle, Math.random() * 0.1));
      plantScale.set(0.7 + Math.random() * 0.6, 0.6 + Math.random() * 1.2, 0.7 + Math.random() * 0.6);
      plantMatrix.compose(plantPos, plantQuat, plantScale);
      plants.setMatrixAt(plantIndex, plantMatrix);
      plantIndex += 1;
    }
  }

  rocks.instanceMatrix.needsUpdate = true;
  bigRocks.instanceMatrix.needsUpdate = true;
  twigs.instanceMatrix.needsUpdate = true;
  mosses.instanceMatrix.needsUpdate = true;
  plants.instanceMatrix.needsUpdate = true;
  scene.add(rocks);
  scene.add(bigRocks);
  scene.add(twigs);
  scene.add(mosses);
  scene.add(plants);

  // Kivet blokkaavat nyt myös näköyhteyden (LoS) sekä kameran linecastin.
  cameraCollisionMeshes.push(rocks, bigRocks);
}

function enemyHasLineOfSight(enemyPos: { x: number; y: number; z: number }) {
  enemySightFrom.set(enemyPos.x, enemyPos.y + 0.65, enemyPos.z);
  enemySightTo.copy(playerCenter).add(enemySightTargetOffset);
  enemySightDir.subVectors(enemySightTo, enemySightFrom);
  const sightDist = enemySightDir.length();
  if (sightDist <= 0.001) {
    return true;
  }
  enemySightDir.multiplyScalar(1 / sightDist);
  enemySightRay.set(enemySightFrom, enemySightDir);
  enemySightRay.far = Math.max(0.05, sightDist - 0.12);
  const hits = enemySightRay.intersectObjects(cameraCollisionMeshes, false);
  return hits.length === 0;
}

function hasExplosionLineOfSight(origin: THREE.Vector3, targetPos: { x: number; y: number; z: number }, targetHeightOffset = 0.65) {
  enemySightFrom.copy(origin);
  enemySightTo.set(targetPos.x, targetPos.y + targetHeightOffset, targetPos.z);
  enemySightDir.subVectors(enemySightTo, enemySightFrom);
  const sightDist = enemySightDir.length();
  if (sightDist <= 0.001) {
    return true;
  }
  enemySightDir.multiplyScalar(1 / sightDist);
  enemySightRay.set(enemySightFrom, enemySightDir);
  enemySightRay.far = Math.max(0.05, sightDist - 0.08);
  const hits = enemySightRay.intersectObjects(cameraCollisionMeshes, false);
  return hits.length === 0;
}

// function placeLevelDoor() {
//   if (doorMesh) {
//     scene.remove(doorMesh);
//   }

//   const door = new THREE.Mesh(
//     new THREE.BoxGeometry(2, 4, 0.4),
//     new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0ea5e9, emissiveIntensity: 0.7 })
//   );
//   door.position.copy(doorPosition).add(new THREE.Vector3(0, 2, 0));
//   door.castShadow = true;
//   door.receiveShadow = true;
//   scene.add(door);
//   doorMesh = door;
// }

function advanceLevel() {
  currentLevel += 1;
  score = 0;
  scoreDiv.textContent = `Score: ${score}`;
  ammo = ammoPerPickup * 2;
  ammoDiv.textContent = `Ammo: ${ammo}`;
  renderCarriedAmmoCrates();
  playerBody.setNextKinematicTranslation({ x: 0, y: groundLevel + characterHalfHeight, z: 0 });
  console.log(`[Level] advanced to ${currentLevel}`);
}

function buildWideCityCollider(city: THREE.Object3D) {
  const vertices: number[] = [];
  const indices: number[] = [];
  let indexOffset = 0;

  city.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);

    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      vertices.push(position.getX(i), position.getY(i), position.getZ(i));
    }

    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 1) {
        indices.push(index.getX(i) + indexOffset);
      }
    } else {
      for (let i = 0; i < position.count; i += 3) {
        indices.push(indexOffset + i, indexOffset + i + 1, indexOffset + i + 2);
      }
    }

    indexOffset += position.count;
    geometry.dispose();
  });

  if (vertices.length === 0 || indices.length === 0) {
    console.warn("[WideCity] collider build skipped (no geometry)");
    return;
  }

  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
    .setCollisionGroups(collisionGroups(GROUP_WORLD, GROUP_PLAYER | GROUP_ENEMY));
  world.createCollider(colliderDesc, body);
  console.log("[WideCity] collider created", { vertices: vertices.length, indices: indices.length });
}

async function loadCharacterModel(target: THREE.Group) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/Astronaut.glb`);
  const model = gltf.scene;
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        if (mat && "color" in mat) {
          mat.color.multiplyScalar(0.6);
        }
        mat.needsUpdate = true;
      });
    }
  });
  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0);

  pistolMesh = model.getObjectByName("Pistol") ?? null;

  target.clear();
  target.add(model);

  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    const skinned = model.getObjectByProperty("type", "SkinnedMesh") as THREE.SkinnedMesh | null;
    const rootBoneName = skinned?.skeleton?.bones?.[0]?.name;
    const rootNames = new Set(
      [rootBoneName, "Hips", "mixamorig:Hips", "hips", "Root", "root"].filter(Boolean) as string[]
    );
    const clips = gltf.animations.map((clip) => {
      const filtered = clip.tracks.filter((track) => {
        if (!track.name.endsWith(".position")) return true;
        for (const name of rootNames) {
          if (track.name.startsWith(`${name}.`)) {
            return false;
          }
        }
        return true;
      });
      if (filtered.length !== clip.tracks.length) {
        clip.tracks = filtered;
        clip.resetDuration();
      }
      return clip;
    });

    const findClip = (names: string[]) =>
      clips.find((clip) => names.some((name) => clip.name.toLowerCase().includes(name)));

    const findExact = (name: string) => clips.find((clip) => clip.name === name) ?? null;
    const idleClip =
      findExact("CharacterArmature|Idle") ?? findClip(["idle", "stand", "rest"]) ?? clips[0];
    const walkClip =
      findExact("CharacterArmature|Walk") ?? findClip(["walk"]) ?? findClip(["run", "move"]) ?? clips[0];
    const runClip =
      findExact("CharacterArmature|Run") ?? findClip(["run", "move"]) ?? walkClip;
    const jumpClip =
      findExact("CharacterArmature|Jump") ?? findClip(["jump", "hop"]) ?? clips[0];
    const fallClip =
      findExact("CharacterArmature|Jump_Idle") ?? findClip(["fall", "air", "drop"]) ?? jumpClip;
    const duckClip =
      findExact("CharacterArmature|Duck") ?? findClip(["duck", "crouch"]) ?? null;
    const punchClip =
      findExact("CharacterArmature|Punch") ?? findClip(["punch", "hit", "attack"]) ?? null;
    const waveClip =
      findExact("CharacterArmature|Wave") ?? findClip(["wave", "win", "victory"]) ?? null;
    const deathClip =
      findExact("CharacterArmature|Death") ?? findClip(["death", "die", "dead"]) ?? null;

    idleAction = mixer.clipAction(idleClip);
    walkAction = mixer.clipAction(walkClip);
    runAction = mixer.clipAction(runClip);
    jumpAction = mixer.clipAction(jumpClip);
    fallAction = mixer.clipAction(fallClip);
    duckAction = duckClip ? mixer.clipAction(duckClip) : null;
    punchAction = punchClip ? mixer.clipAction(punchClip) : null;
    waveAction = waveClip ? mixer.clipAction(waveClip) : null;
    deathAction = deathClip ? mixer.clipAction(deathClip) : null;

    allActions.clear();
    clipOrder.length = 0;
    for (const clip of clips) {
      const action = mixer.clipAction(clip);
      allActions.set(clip.name, action);
      clipOrder.push(clip.name);
    }

    idleAction.setEffectiveTimeScale(0.9);
    walkAction.setEffectiveTimeScale(0.9);
    runAction.setEffectiveTimeScale(0.9);
    jumpAction.setEffectiveTimeScale(0.9);
    fallAction.setEffectiveTimeScale(0.9);

    idleAction.play();
    activeAction = idleAction;
    useProceduralWalk = idleClip === runClip;

    mixer.addEventListener("finished", (event) => {
      if (!forcedHold && event.action === forcedAction) {
        forcedAction = null;
      }
    });
  } else {
    useProceduralWalk = true;
  }
}

visualRoot.add(createPlaceholderCharacter());
loadCharacterModel(visualRoot).catch(() => {
  // Placeholder is already visible.
});

function playClipByName(name: string) {
  const action = allActions.get(name);
  if (!action || action === activeAction) {
    return;
  }
  action.reset().fadeIn(0.15).play();
  activeAction?.fadeOut(0.15);
  activeAction = action;
}

function playForcedAction(action: THREE.AnimationAction | null, hold: boolean, loopOnce = false) {
  if (!action) {
    return;
  }
  forcedAction = action;
  forcedHold = hold;
  if (loopOnce) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = hold;
  } else {
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
  }
  action.reset().fadeIn(0.1).play();
  activeAction?.fadeOut(0.1);
  activeAction = action;
}

function cycleClip(direction: 1 | -1) {
  if (clipOrder.length === 0) {
    return;
  }
  currentClipIndex = (currentClipIndex + direction + clipOrder.length) % clipOrder.length;
  playClipByName(clipOrder[currentClipIndex]);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "m") {
    animationMode = animationMode === "auto" ? "manual" : "auto";
    return;
  }

  if (key === "control" || key === "c") {
    duckHeld = true;
    playForcedAction(duckAction, true, false);
    return;
  }
  if (key === "f") {
    playForcedAction(punchAction, false, true);
    return;
  }
  if (key === "v") {
    playForcedAction(waveAction, false, true);
    return;
  }
  if (key === "k") {
    playForcedAction(deathAction, true, true);
    return;
  }

  if (animationMode !== "manual") {
    return;
  }

  if (key === "[") {
    cycleClip(-1);
  } else if (key === "]") {
    cycleClip(1);
  } else if (key === ",") {
    cycleClip(-1);
  } else if (key === ".") {
    cycleClip(1);
  }

  const directClips: Record<string, string> = {
    "1": "CharacterArmature|Idle",
    "2": "CharacterArmature|Walk",
    "3": "CharacterArmature|Run",
    "4": "CharacterArmature|Jump",
    "5": "CharacterArmature|Jump_Land",
    "6": "CharacterArmature|Duck",
    "7": "CharacterArmature|Punch",
    "8": "CharacterArmature|Wave",
    "9": "CharacterArmature|Death",
    "0": "CharacterArmature|Yes",
  };

  const clip = directClips[key];
  if (clip) {
    playClipByName(clip);
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "control" || key === "c") {
    duckHeld = false;
    if (forcedAction === duckAction) {
      forcedAction = null;
      forcedHold = false;
    }
  }
});

function updatePlayer(delta: number) {
  if (gameOver) return;

  const inputDirection = direction;
  inputDirection.set(0, 0, 0);

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
  right.set(-forward.z, 0, forward.x).normalize();

  if (keys.has("w")) inputDirection.add(forward);
  if (keys.has("s")) inputDirection.sub(forward);
  if (keys.has("a")) inputDirection.sub(right);
  if (keys.has("d")) inputDirection.add(right);
  if (Math.abs(mobileMoveY) > 0.01) inputDirection.addScaledVector(forward, mobileMoveY);
  if (Math.abs(mobileMoveX) > 0.01) inputDirection.addScaledVector(right, mobileMoveX);

  const grounded = controller.computedGrounded();

  if (grounded) {
    if (inputDirection.lengthSq() > 0) {
      inputDirection.normalize();
      const mobileMagnitude = Math.sqrt(mobileMoveX * mobileMoveX + mobileMoveY * mobileMoveY);
      const wantsRun = keys.has("shift") || mobileMagnitude > 0.8;
      running = wantsRun;
      const moveSpeed = wantsRun ? runSpeed : walkSpeed;
      moveDir.copy(inputDirection);
      direction.copy(inputDirection).multiplyScalar(moveSpeed * delta);

      // Lukitse liikesuunta maassa, jotta sitä käytetään koko hypyn ajan.
      airLockedMoveDir.copy(moveDir);
      airLockedDirection.copy(direction);
    } else {
      moveDir.set(0, 0, 0);
      direction.set(0, 0, 0);
      running = false;
      airLockedMoveDir.set(0, 0, 0);
      airLockedDirection.set(0, 0, 0);
    }
  } else {
    // Ilmassa suunta pysyy lukittuna maasta irtoamishetken suuntaan.
    moveDir.copy(airLockedMoveDir);
    direction.copy(airLockedDirection).multiplyScalar(jumpHorizontalMultiplier);
  }

  if (grounded) {
    groundedTime += delta;
    airTime = 0;
  } else {
    airTime += delta;
    groundedTime = 0;
  }
  if (grounded) {
    groundedVisual = true;
  } else if (airTime > 0.15) {
    groundedVisual = false;
  }
  
  if (grounded) {
    verticalVelocity = 0;
    if (keys.has(" ") || mobileJumpHeld) {
      verticalVelocity = jumpSpeed;
    }
  } else {
    lastVerticalVelocity = verticalVelocity;
    verticalVelocity += gravity * delta;
  }

  const desiredMovement = new RAPIER.Vector3(direction.x, verticalVelocity * delta, direction.z);
  controller.computeColliderMovement(playerCollider, desiredMovement);
  const movement = controller.computedMovement();
  const current = playerBody.translation();
  playerBody.setNextKinematicTranslation({
    x: current.x + movement.x,
    y: current.y + movement.y,
    z: current.z + movement.z,
  });

  // Tarkista onko ammuttu loppunut
  if (isShooting && clock.getElapsedTime() > shootRotationEnd) {
    isShooting = false;
  }

  // Jos ammutaan, käännä kohti ampumissuuntaa, muuten liikkumissuuntaa
  if (isShooting) {
    const currentYaw = playerVisual.rotation.y;
    const deltaYaw = ((shootRotation - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
    playerVisual.rotation.y = currentYaw + deltaYaw * Math.min(1, turnSpeed * delta * 3); // Nopea kääntö
  } else if (moveDir.lengthSq() > 0.0001) {
    const targetYaw = Math.atan2(moveDir.x, moveDir.z);
    const currentYaw = playerVisual.rotation.y;
    const deltaYaw = ((targetYaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
    playerVisual.rotation.y = currentYaw + deltaYaw * Math.min(1, turnSpeed * delta);
  } else if (isTouchDevice) {
    const releasedForMs = mobileLeftStickReleasedAt < 0 ? 0 : performance.now() - mobileLeftStickReleasedAt;
    const autoFaceDelayMs = 180;
    const isActivelyLooking = Math.abs(mobileLookX) > 0.12 || Math.abs(mobileLookY) > 0.12;

    if (releasedForMs > autoFaceDelayMs && !isActivelyLooking) {
      const targetYaw = Math.atan2(forward.x, forward.z);
      const currentYaw = playerVisual.rotation.y;
      const deltaYaw = ((targetYaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      playerVisual.rotation.y = currentYaw + deltaYaw * Math.min(1, turnSpeed * delta * 0.8);
    }
  }

  const isMoving = direction.lengthSq() > 0.0001;
  const isRunning = isMoving && running;
  let desiredAction = idleAction;
  if (!groundedVisual) {
    // Käytä hyppyanimaatiota kun nousee, putoamisanimaatiota vasta kun on selkeästi putoamassa
    desiredAction = verticalVelocity > 1.0 ? jumpAction : fallAction;
  } else if (isMoving) {
    desiredAction = isRunning ? runAction : walkAction ?? runAction;
  }

  if (forcedAction) {
    if (!forcedHold && !forcedAction.isRunning()) {
      forcedAction = null;
    }
  }

  if (animationMode === "auto" && !forcedAction) {
    if (desiredAction && desiredAction !== activeAction) {
      desiredAction.reset().fadeIn(0.15).play();
      activeAction?.fadeOut(0.15);
      activeAction = desiredAction;
    }
  }

  if (useProceduralWalk) {
    walkTime += delta * (isMoving ? 10 : 2);
    const bob = isMoving ? Math.sin(walkTime) * 0.05 : 0;
    visualRoot.position.y = bob;
  }
}

function updateCamera(delta: number) {
  // Smooth ADS transition
  const targetAim = isAiming ? 1 : 0;
  aimTransition += (targetAim - aimTransition) * 0.15;

  const isPortrait = window.innerHeight > window.innerWidth;
  const useMobilePortraitCamera = isTouchDevice && isPortrait;
  
  // Over-shoulder offset (lokaali kameran suhteen)
  const normalSide = useMobilePortraitCamera ? 0.25 : 0.8;
  const normalUp = useMobilePortraitCamera ? 2.9 : 2.8;
  const normalBack = useMobilePortraitCamera ? 6.2 : 5.0;

  const adsSide = useMobilePortraitCamera ? 0.05 : 0.15;
  const adsUp = useMobilePortraitCamera ? 2.7 : 2.6;
  const adsBack = useMobilePortraitCamera ? 3.2 : 2.5;
  
  const sideOffset = normalSide + (adsSide - normalSide) * aimTransition;
  const upOffset = normalUp + (adsUp - normalUp) * aimTransition;
  const backOffset = normalBack + (adsBack - normalBack) * aimTransition;
  
  // Laske kameran suuntavektorit
  const rotation = new THREE.Euler(pitch, yaw, 0, "YXZ");
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(rotation);
  const right = new THREE.Vector3(1, 0, 0).applyEuler(rotation);
  const up = new THREE.Vector3(0, 1, 0);
  
  // Rakenna offset lokaaleissa koordinaateissa
  const cameraOffset = new THREE.Vector3();
  cameraOffset.addScaledVector(right, sideOffset);      // Oikealle
  cameraOffset.addScaledVector(up, upOffset);           // Ylös
  cameraOffset.addScaledVector(forward, -backOffset);   // Taakse
  
  // Ideal camera position
  const idealPos = playerCenter.clone().add(cameraOffset);
  
  // Camera collision - raycast from player to camera
  const dirToCamera = cameraOffset.clone().normalize();
  const maxDist = cameraOffset.length();
  
  const raycaster = new THREE.Raycaster(playerCenter, dirToCamera, 0, maxDist);
  const intersects = raycaster.intersectObjects(cameraCollisionMeshes, false);

  const desiredPos = idealPos.clone();
  const minCameraDist = THREE.MathUtils.lerp(
    useMobilePortraitCamera ? 1.9 : 2.2,
    useMobilePortraitCamera ? 1.5 : 1.8,
    aimTransition
  );

  if (intersects.length > 0) {
    // Seinä välissä: pidä minietäisyys ja nosta kameraa hieman ahtaassa tilassa.
    const hitDist = Math.max(0, intersects[0].distance - 0.2);
    const safeDist = Math.max(minCameraDist, hitDist);
    desiredPos.copy(playerCenter).addScaledVector(dirToCamera, safeDist);

    const compression = THREE.MathUtils.clamp(1 - safeDist / maxDist, 0, 1);
    const lift = (useMobilePortraitCamera ? 0.95 : 0.75) * compression;
    desiredPos.addScaledVector(up, lift);
  }

  const camLerpAlpha = 1 - Math.exp(-11 * delta);
  camera.position.lerp(desiredPos, camLerpAlpha);
  
  // FOV zoom when aiming
  const normalFOV = useMobilePortraitCamera ? 65 : 60;
  const adsFOV = useMobilePortraitCamera ? 50 : 45;
  camera.fov = normalFOV + (adsFOV - normalFOV) * aimTransition;
  camera.updateProjectionMatrix();
  
  // Katso OIKEALLE hahmon keskipisteestä → hahmo siirtyy VASEMMALLE ruudulla
  const lookAtSideBase = useMobilePortraitCamera ? 0.55 : 2.0;
  const lookAtSide = lookAtSideBase - (lookAtSideBase * aimTransition);
  const lookAtTarget = playerCenter.clone().add(new THREE.Vector3(0, 2.2, 0));
  lookAtTarget.addScaledVector(right, lookAtSide);
  
  camera.lookAt(lookAtTarget);
}

function updateEnemies(delta: number) {
  if (gameOver) return;
  
  const time = clock.getElapsedTime();
  const difficulty = getDifficultySettings(time);
  const enemySpeed = baseEnemySpeed * difficulty.speedMultiplier;
  const separationRadius = 2.2;
  const separationStrength = 0.9;
  const steeringSmoothness = 8;
  const enemyBaseY = groundLevel + 0.9;
  const climbStartHeight = 0.9;
  const climbSpeed = 2.4;
  const descendSpeed = 2.0;
  const dirToPlayer = new THREE.Vector3();
  const separationDir = new THREE.Vector3();
  const steerDir = new THREE.Vector3();
  
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const enemyPos = enemy.body.translation();

    if (enemy.phaseMode === "phasing" && time >= enemy.nextPhaseSwitch) {
      enemy.phaseState = enemy.phaseState === "solid" ? "ghost" : "solid";
      const phaseMin = THREE.MathUtils.lerp(2.0, difficulty.phaseSwitchMin, difficulty.ramp);
      const phaseMax = THREE.MathUtils.lerp(4.0, difficulty.phaseSwitchMax, difficulty.ramp);
      enemy.nextPhaseSwitch = time + phaseMin + Math.random() * Math.max(0.2, phaseMax - phaseMin);
      if (enemy.phaseState === "solid") {
        setColliderGroups(enemy.collider, GROUP_ENEMY, GROUP_WORLD);
      } else {
        setColliderGroups(enemy.collider, GROUP_ENEMY, 0);
      }
    }
    
    // Lisää wobbly-animaatio (värinä ja heilunta)
    const wobbleSpeed = 3 + i * 0.5; // Eri nopeus jokaiselle
    const wobbleAmount = 0.08;
    enemy.mesh.scale.x = 1 + Math.sin(time * wobbleSpeed) * wobbleAmount;
    enemy.mesh.scale.z = 1 + Math.sin(time * wobbleSpeed + Math.PI / 2) * wobbleAmount;
    enemy.mesh.rotation.z = Math.sin(time * wobbleSpeed * 0.5) * 0.1;
    
    // Tarkista törmäys pelaajaan (vaakasuunnassa)
    const distToPlayer = Math.sqrt(
      (playerCenter.x - enemyPos.x) ** 2 +
      (playerCenter.z - enemyPos.z) ** 2
    );
    
    const heightDiff = playerCenter.y - enemyPos.y;
    
    const canMeleeByHeight = heightDiff > -0.9 && heightDiff < 1.15;
    const hasSight = distToPlayer < 2.5 ? enemyHasLineOfSight(enemyPos) : true;

    if (distToPlayer < 1.0 && canMeleeByHeight && hasSight) {
      gameOver = true;
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }
      showGameOverWithLocalScore(score);
      playDeathSound();
      playForcedAction(deathAction, true, true);

      return;
    }
    
    // Laske suunta pelaajaan
    dirToPlayer.set(
      playerCenter.x - enemyPos.x,
      0,
      playerCenter.z - enemyPos.z
    ).normalize();

    // Kevyt separation, jotta viholliset eivät kasaannu samaan pisteeseen.
    separationDir.set(0, 0, 0);
    let neighbors = 0;
    for (let j = 0; j < enemies.length; j += 1) {
      if (j === i) continue;

      const otherPos = enemies[j].body.translation();
      const dx = enemyPos.x - otherPos.x;
      const dz = enemyPos.z - otherPos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= 0.0001 || distSq > separationRadius * separationRadius) {
        continue;
      }

      const dist = Math.sqrt(distSq);
      const weight = (separationRadius - dist) / separationRadius;
      const smoothWeight = weight * weight;
      separationDir.x += (dx / dist) * smoothWeight;
      separationDir.z += (dz / dist) * smoothWeight;
      neighbors += 1;
    }

    steerDir.copy(dirToPlayer);
    if (neighbors > 0 && separationDir.lengthSq() > 0.0001) {
      separationDir.multiplyScalar(1 / neighbors);
      separationDir.normalize().multiplyScalar(separationStrength);
      steerDir.add(separationDir);
    }
    if (steerDir.lengthSq() > 0.0001) {
      steerDir.normalize();
    }

    const smoothAlpha = 1 - Math.exp(-steeringSmoothness * delta);
    enemy.moveDir.lerp(steerDir, smoothAlpha);
    if (enemy.moveDir.lengthSq() <= 0.0001) {
      enemy.moveDir.copy(steerDir);
    }
    if (enemy.moveDir.lengthSq() > 0.0001) {
      enemy.moveDir.normalize();
    }
    
    // Liiku pelaajaa kohti
    const movement = new RAPIER.Vector3(
      enemy.moveDir.x * enemySpeed * delta,
      0,
      enemy.moveDir.z * enemySpeed * delta
    );

    let targetY = enemyPos.y;
    if (heightDiff > climbStartHeight && distToPlayer < 5.5) {
      const climbFactor = THREE.MathUtils.clamp((heightDiff - climbStartHeight) / 2.4, 0, 1);
      targetY = Math.min(enemyPos.y + climbSpeed * climbFactor * delta, playerCenter.y - 0.85);
    } else if (enemyPos.y > enemyBaseY + 0.05) {
      targetY = Math.max(enemyBaseY, enemyPos.y - descendSpeed * delta);
    }
    
    enemy.body.setNextKinematicTranslation({
      x: enemyPos.x + movement.x,
      y: targetY,
      z: enemyPos.z + movement.z
    });
    
    // Päivitä mesh
    const newPos = enemy.body.translation();
    enemy.mesh.position.set(newPos.x, newPos.y, newPos.z);
    
    // Käännä kohti pelaajaa
    enemy.mesh.rotation.y = Math.atan2(enemy.moveDir.x, enemy.moveDir.z);
    
    // Poista kuolleet
    if (enemy.health <= 0) {
      const epos = enemy.body.translation();
      playExplosionSound();
      createBloodSplatter(epos.x, epos.y + 0.5, epos.z);
      
      world.removeRigidBody(enemy.body);
      scene.remove(enemy.mesh);
      enemies.splice(i, 1);
      score += 1;
      scoreDiv.textContent = `Score: ${score}`;
    }
  }
  
  // Spawnaa uusia vihollisia
  const currentTime = time;
  if (currentTime - lastSpawnTime > difficulty.spawnInterval && enemies.length < difficulty.maxEnemies) {
    lastSpawnTime = currentTime;
    // Spawnaa satunnaiseen paikkaan kaupunkialueella (-100 to +100)
    const citySize = 200;
    const x = (Math.random() - 0.5) * citySize;
    const z = (Math.random() - 0.5) * citySize;
    spawnEnemy(x, z);
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();
  const currentDifficulty = getDifficultySettings(elapsed);
  difficultyDiv.textContent = `Difficulty: ${currentDifficulty.speedMultiplier.toFixed(2)}x`;

  const mobileLookBlend = 1 - Math.exp(-10 * delta);
  mobileLookX += (mobileLookTargetX - mobileLookX) * mobileLookBlend;
  mobileLookY += (mobileLookTargetY - mobileLookY) * mobileLookBlend;

  const mobileLookYawSpeed = 1.85;
  const mobileLookPitchSpeed = 1.45;
  if (Math.abs(mobileLookX) > 0.0001 || Math.abs(mobileLookY) > 0.0001) {
    yaw -= mobileLookX * mobileLookYawSpeed * delta;
    pitch = clampPitch(pitch - mobileLookY * mobileLookPitchSpeed * delta);
  }

  if (isTouchDevice && !mobileLookTouchActive && mobileLookReleasedAt > 0) {
    const releasedForMs = performance.now() - mobileLookReleasedAt;
    if (releasedForMs >= mobileLookReturnDelayMs) {
      const returnBlend = 1 - Math.exp(-2.2 * delta);
      pitch += (0 - pitch) * returnBlend;
      pitch = clampPitch(pitch);
    }
  }

  updatePlayer(delta);
  updateEnemies(delta);
  world.step();

  if (elapsed - lastAmmoDropTime >= ammoDropInterval) {
    lastAmmoDropTime = elapsed;
    spawnRandomAmmoPickupCluster();
  }

  const nowMs = performance.now();
  for (let i = ammoDropBeacons.length - 1; i >= 0; i -= 1) {
    const beacon = ammoDropBeacons[i];
    const progress = (nowMs - beacon.startTime) / beacon.durationMs;
    if (progress >= 1) {
      scene.remove(beacon.light);
      scene.remove(beacon.ring);
      scene.remove(beacon.beam);
      beacon.ring.geometry.dispose();
      (beacon.ring.material as THREE.Material).dispose();
      beacon.beam.geometry.dispose();
      (beacon.beam.material as THREE.Material).dispose();
      ammoDropBeacons.splice(i, 1);
      continue;
    }

    const fade = 1 - progress;
    const pulse = 0.72 + 0.28 * Math.sin(elapsed * 5 + beacon.pulseOffset);
    beacon.light.intensity = 3.6 * fade * pulse;
    const ringMaterial = beacon.ring.material as THREE.MeshBasicMaterial;
    ringMaterial.opacity = 0.34 * fade * pulse;
    const beamMaterial = beacon.beam.material as THREE.MeshBasicMaterial;
    beamMaterial.opacity = 0.2 * fade * pulse;
    const scale = 1 + progress * 0.22;
    beacon.ring.scale.setScalar(scale);
    beacon.beam.scale.set(1 + progress * 0.08, 1, 1 + progress * 0.08);
  }

  mixer?.update(delta);

  const pos = playerBody.translation();
  playerCenter.set(pos.x, pos.y, pos.z);
  visualPosition.set(pos.x, pos.y - characterHalfHeight, pos.z);
  playerVisual.position.lerp(visualPosition, Math.min(1, visualLerp * delta));

  // Tarkista ammuslaatikoiden kerääminen
  for (let i = ammoPickups.length - 1; i >= 0; i -= 1) {
    const pickup = ammoPickups[i];
    if (pickup.position.y > pickup.landY) {
      pickup.fallSpeed = Math.min(ammoCrateMaxFallSpeed, pickup.fallSpeed + ammoCrateFallAcceleration * delta);
      pickup.position.y = Math.max(pickup.landY, pickup.position.y - pickup.fallSpeed * delta);
      pickup.mesh.position.y = pickup.position.y;
      if (pickup.position.y === pickup.landY) {
        pickup.fallSpeed = 0;
      }
    }

    const dx = pos.x - pickup.position.x;
    const dz = pos.z - pickup.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (pickup.exploding) {
      pickup.mesh.rotation.y += delta * 8;
      continue;
    }
    
    if (dist < 1.5 && pickup.position.y <= pickup.landY + 0.02 && performance.now() >= pickup.collectAvailableAt) {
      // Kerää ammuslaatikko
      ammo += ammoPerPickup;
      ammoDiv.textContent = `Ammo: ${ammo}`;
      renderCarriedAmmoCrates();
      scene.remove(pickup.mesh);
      ammoPickups.splice(i, 1);
    } else {
      // Pyöritä ammuslaatikkoa
      pickup.mesh.rotation.y += delta * 2;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.life += delta;
    const bpos = bullet.body.translation();
    bullet.mesh.position.set(bpos.x, bpos.y, bpos.z);
    if (bullet.shadow) {
      bullet.shadow.position.set(bpos.x, groundLevel + 0.02, bpos.z);
    }
    
    // Tarkista osumat vihollisiin
    let hit = false;

    // Suora osuma ammuslaatikkoon laukaisee ison räjähdyksen.
    for (let p = ammoPickups.length - 1; p >= 0; p -= 1) {
      const pickup = ammoPickups[p];
      const dxp = bpos.x - pickup.position.x;
      const dyp = bpos.y - pickup.position.y;
      const dzp = bpos.z - pickup.position.z;
      const distSqPickup = dxp * dxp + dyp * dyp + dzp * dzp;
      if (distSqPickup <= ammoCrateHitRadius * ammoCrateHitRadius) {
        scheduleAmmoCrateExplosion(pickup, 0);
        hit = true;
        break;
      }
    }

    if (hit) {
      removeBullet(i);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const epos = enemy.body.translation();
      const dx = bpos.x - epos.x;
      const dy = bpos.y - epos.y;
      const dz = bpos.z - epos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      
      if (distSq < 1.0) {
        enemy.health -= 1;
        
        // Muuta väriä tummemmaksi kun ottaa osumaa
        if (enemy.health === 1) {
          enemy.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.color.setHex(0x14532d);
                  }
                });
              } else if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.color.setHex(0x14532d);
              }
            }
          });
        }
        
        hit = true;
        break;
      }
    }
    
    if (hit || bullet.life > bulletLifetime || bpos.y < -5) {
      removeBullet(i);
    }
  }

  for (const obstacle of obstacles) {
    const oPos = obstacle.body.translation();
    obstacle.mesh.position.set(oPos.x, oPos.y, oPos.z);
  }

  const now = clock.getElapsedTime();
  if (now - lastDebugTime > 2) {
    lastDebugTime = now;
    const playerY = playerBody.translation().y;
    const bulletY = bullets.length > 0 ? bullets[0].body.translation().y : null;
    const enemyY = enemies.length > 0 ? enemies[0].body.translation().y : null;
    console.log("[Levels] playerY", playerY, "bulletY", bulletY, "enemyY", enemyY);
  }

  // if (doorMesh && now > doorCooldownUntil) {
  //   const dx = playerCenter.x - doorMesh.position.x;
  //   const dz = playerCenter.z - doorMesh.position.z;
  //   const dist = Math.sqrt(dx * dx + dz * dz);
  //   if (dist < doorTriggerRadius) {
  //     doorCooldownUntil = now + 2;
  //     advanceLevel();
  //   }
  // }

  updateCamera(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

initPhysics()
  .then(() => {
    animate();
  })
  .catch((error) => {
    console.error("Physics init failed:", error);
  });

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
