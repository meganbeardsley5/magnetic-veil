let solarEnergy = 0.5; // default fallback

async function fetchSolarData() {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json"
    );
    const data = await response.json();

    // Last row = latest measurement
    const latest = data[data.length - 1];

    const windSpeed = parseFloat(latest[2]); // km/s

    // Normalize wind speed range (typically 250–800 km/s)
    solarEnergy = THREE.MathUtils.clamp(
      (windSpeed - 250) / (800 - 250),
      0,
      1
    );

    console.log("Solar wind speed:", windSpeed, "Normalized:", solarEnergy);

  } catch (error) {
    console.log("Solar data fetch failed, using fallback.");
  }
}

// Fetch immediately and every 5 minutes
fetchSolarData();
setInterval(fetchSolarData, 300000);

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.Camera();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(2, 2);

const uniforms = {
  u_time: { value: 0.0 },
  u_energy: { value: 0.5 },
  u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

const material = new THREE.ShaderMaterial({
  uniforms,
  fragmentShader: `
    uniform float u_time;
uniform float u_energy;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

vec3 solarPalette(float t) {

  // grounded warm solar spectrum
  vec3 deep   = vec3(0.16, 0.05, 0.06);   // warm rose shadow
  vec3 ember  = vec3(0.85, 0.38, 0.15);   // coral core
  vec3 gold   = vec3(1.0, 0.72, 0.28);    // radiant gold
  vec3 peach  = vec3(1.0, 0.78, 0.55);    // warm bloom (not pink)
  vec3 flare  = vec3(1.0, 0.95, 0.82);    // incandescent light

  vec3 col = mix(deep, ember, smoothstep(0.0, 0.3, t));
  col = mix(col, gold, smoothstep(0.25, 0.6, t));
  col = mix(col, peach, smoothstep(0.55, 0.85, t));
  col = mix(col, flare, smoothstep(0.8, 1.0, t));

  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= 0.5;
  uv.x *= u_resolution.x / u_resolution.y;
  
  float dist = length(uv);
  float core = smoothstep(0.8, 0.0, dist);

  float t = u_time * 0.03;

  float n = noise(uv * 2.5 + t);
  float breath = sin(u_time * 0.1) * 0.5 + 0.5;

  float energyInfluence = mix(n, breath, u_energy);

  // Slight density increase toward center
  energyInfluence += core * 0.15;

  // slow hue drift for subtle color shifting
  float drift = sin(u_time * 0.02) * 0.5 + 0.5;
  float micro = sin(u_time * 0.07) * 0.03;

  vec3 color = solarPalette(energyInfluence + drift * 0.28 + micro);
  // Soft atmospheric fade toward edges
  color *= 0.9 + core * 0.1;

  gl_FragColor = vec4(color, 1.0);
}
  `
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function animate() {
  requestAnimationFrame(animate);
  material.uniforms.u_time.value = performance.now() / 1000;
  material.uniforms.u_energy.value = solarEnergy;
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
});
