let magneticEnergy = 0.2;

async function fetchKpIndex() {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
    );

    const data = await response.json();

    const latest = data[data.length - 1];
    const kp = parseFloat(latest[1]);

    // Normalize 0–9 scale
    magneticEnergy = THREE.MathUtils.clamp(kp / 9, 0, 1);

    console.log("Kp Index:", kp, "Normalized:", magneticEnergy);

  } catch (error) {
    console.log("Kp fetch failed, using fallback.");
  }
}

fetchKpIndex();
setInterval(fetchKpIndex, 600000);

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
uniform float u_energy; // Kp index normalized
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

vec3 magneticPalette(float t) {

  vec3 abyss   = vec3(0.02, 0.05, 0.12);  // deep ultramarine
  vec3 mineral = vec3(0.0, 0.25, 0.35);   // teal
  vec3 oxide   = vec3(0.4, 0.1, 0.08);    // restrained iron
  vec3 filament= vec3(0.1, 0.6, 0.7);     // faint electric

  vec3 col = mix(abyss, mineral, smoothstep(0.1, 0.6, t));
  col = mix(col, oxide, smoothstep(0.65, 0.85, t) * 0.3);
  col = mix(col, filament, smoothstep(0.85, 1.0, t) * 0.4);

  return col;
}

void main() {

  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= 0.5;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.006; // very slow tectonic time

  // Ultra subtle rotation for structural evolution
  float angle = sin(u_time * 0.002) * 0.2;
  mat2 rot = mat2(
    cos(angle), -sin(angle),
    sin(angle),  cos(angle)
  );
  uv = rot * uv;

  // Strong anisotropic stretch
  vec2 stretched = vec2(uv.x * 3.5, uv.y * 0.4);

  // Slow horizontal drift
  stretched.x += t * 0.8;

  // Curvature shaping
  stretched.x += uv.y * uv.y * 1.2;

  // Deep compression wave (tectonic pulse)
  float compression = sin(uv.y * 4.0 + u_time * 0.15) * 0.1;
  stretched.y += compression;

  // Geomagnetic tension
  float tension = u_energy;

  // Controlled distortion along horizontal axis
  stretched.x += noise(stretched + t) * 0.25 * tension;

  // Evolving strata phase
  float strata = sin((uv.y + u_time * 0.02) * 18.0);

  float field = noise(stretched * 1.5) * 0.65
              + strata * 0.18;

  field = clamp(field, 0.0, 1.0);

  vec3 color = magneticPalette(field);

  gl_FragColor = vec4(color, 1.0);
}
  `
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function animate() {
  requestAnimationFrame(animate);
  material.uniforms.u_time.value = performance.now() / 1000;
  material.uniforms.u_energy.value = magneticEnergy;
  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
});
