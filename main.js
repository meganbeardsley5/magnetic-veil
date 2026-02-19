void main() {

  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= 0.5;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.01; // heavier

  // Strong horizontal flow
  vec2 flow = uv;
  flow.x += t * 0.4;

  // Create large-scale horizontal bands
  float bands = sin((uv.y + noise(uv * 0.5) * 0.1) * 8.0);

  // Curvature toward poles (magnetosphere arc suggestion)
  float curve = uv.y * uv.y * 0.8;
  flow.x += curve * 0.6;

  // Geomagnetic tension increases distortion
  float tension = u_energy * 0.8;

  flow.y += bands * 0.05 * tension;
  flow += noise(flow * 2.0 + t) * 0.15 * tension;

  float field = noise(flow * 2.5);

  vec3 color = magneticPalette(field);

  gl_FragColor = vec4(color, 1.0);
}
