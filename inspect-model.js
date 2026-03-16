import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

loader.load('/models/Astronaut.glb', (gltf) => {
  console.log('=== MODEL LOADED ===');
  console.log('Animations:', gltf.animations.map(a => a.name));
  console.log('\n=== OBJECT HIERARCHY ===');
  
  function printHierarchy(obj, indent = '') {
    console.log(`${indent}${obj.name || '(unnamed)'} [${obj.type}]`);
    obj.children.forEach(child => printHierarchy(child, indent + '  '));
  }
  
  printHierarchy(gltf.scene);
  
  console.log('\n=== SEARCHING FOR PISTOL ===');
  const pistol = gltf.scene.getObjectByName('Pistol');
  if (pistol) {
    console.log('✓ Found Pistol:', pistol.type);
  } else {
    console.log('✗ No object named "Pistol" found');
  }
}, undefined, (error) => {
  console.error('Error loading model:', error);
});
