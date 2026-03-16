import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.getElementById("splash-canvas") as HTMLCanvasElement;
const loadingProgress = document.getElementById("loading-progress") as HTMLDivElement;
const loadingText = document.getElementById("loading-text") as HTMLParagraphElement;
const splashScreen = document.getElementById("splash-screen") as HTMLDivElement;

if (!canvas) throw new Error("Splash canvas not found");
const skipSplash = sessionStorage.getItem("skipSplash") === "1";

if (skipSplash) {
  sessionStorage.removeItem("skipSplash");
  if (splashScreen) {
    splashScreen.style.display = "none";
  }
  void import("./main");
} else {
  startSplash();
}

function startSplash() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 1.8, 5.5);
  camera.lookAt(0, 1.3, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  function resizeSplashCanvas() {
    const maxByWidth = window.innerWidth * 0.78;
    const maxByHeight = window.innerHeight * 0.54;
    const size = Math.max(220, Math.min(600, maxByWidth, maxByHeight));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  resizeSplashCanvas();
  window.addEventListener("resize", resizeSplashCanvas);

  // Valaistus
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xff1493, 1, 10);
  pointLight.position.set(0, 2, 2);
  scene.add(pointLight);

  let model: THREE.Group;
  let mixer: THREE.AnimationMixer;
  let animations: THREE.AnimationClip[] = [];

  const loader = new GLTFLoader();

  // Simuloi latauksen etenemistä
  let loadingPercentage = 0;
  const loadingInterval = setInterval(() => {
    if (loadingPercentage < 90) {
      loadingPercentage += Math.random() * 3;
      if (loadingProgress) {
        loadingProgress.style.width = `${Math.min(loadingPercentage, 90)}%`;
      }
    }
  }, 100);

  loader.load(
    `${import.meta.env.BASE_URL}models/Astronaut.glb`,
    (gltf) => {
      model = gltf.scene;
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      scene.add(model);

      animations = gltf.animations;
      mixer = new THREE.AnimationMixer(model);

      if (animations.length > 0) {
        playWalkAnimation();
      }

      // ViiWalktele lataus
      clearInterval(loadingInterval);
      loadingPercentage = 100;
      if (loadingProgress) {
        loadingProgress.style.width = "100%";
      }
      if (loadingText) {
        loadingText.textContent = "Ready!";
      }

      // Odota animaatiot ja lataa sitten pääpeli
      setTimeout(() => {
        if (splashScreen) {
          splashScreen.classList.add("fade-out");
          setTimeout(() => {
            splashScreen.style.display = "none";
            // Lataa pääpeli vasta nyt
            void import("./main");
          }, 500);
        }
      }, 8000); // 8 sekuntia kokonaiskesto animaatioille
    },
    (progress) => {
      const percent = (progress.loaded / progress.total) * 30; // 30% mallin latauksesta
      loadingPercentage = Math.max(loadingPercentage, percent);
      if (loadingProgress) {
        loadingProgress.style.width = `${loadingPercentage}%`;
      }
    },
    (error) => {
      console.error("Error loading model:", error);
      if (loadingText) {
        loadingText.textContent = "Error loading. Click to continue.";
        splashScreen?.addEventListener("click", () => {
          splashScreen.classList.add("fade-out");
          setTimeout(() => {
            splashScreen.style.display = "none";
          }, 500);
        });
      }
    }
  );

  function playWalkAnimation() {
    if (!mixer || animations.length === 0) return;

    // Etsi walk-animaatio
    let animation = animations.find((clip) =>
      clip.name.toLowerCase().includes("walk")
    );

    // Jos ei löydy, käytä ensimmäistä
    if (!animation) {
      animation = animations[0];
    }

    const action = mixer.clipAction(animation);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    }

    // Pyöritä mallia hitaasti
    if (model) {
      model.rotation.y += 0.005;
    }

    renderer.render(scene, camera);
  }

  animate();

  // Globaali funktio pelin käyttöön
  (window as any).hideSplash = () => {
    if (splashScreen) {
      splashScreen.classList.add("fade-out");
      setTimeout(() => {
        splashScreen.style.display = "none";
      }, 500);
    }
  };
}
