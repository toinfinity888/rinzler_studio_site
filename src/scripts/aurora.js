/**
 * Premium Aurora WebGL Effect
 * Inspired by Apple's fluid gradient animations
 */

import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  varying vec2 vUv;

  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // Fractal Brownian Motion
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }

    return value;
  }

  void main() {
    vec2 uv = vUv;

    // Create vertical gradient (stronger at bottom)
    float verticalGradient = pow(1.0 - uv.y, 2.0);

    // Slow time for smooth movement
    float slowTime = uTime * 0.15;

    // Create flowing noise layers
    float noise1 = fbm(vec3(uv.x * 2.0, uv.y * 1.5 + slowTime * 0.3, slowTime * 0.2));
    float noise2 = fbm(vec3(uv.x * 1.5 - slowTime * 0.2, uv.y * 2.0, slowTime * 0.15 + 100.0));
    float noise3 = fbm(vec3(uv.x * 2.5 + slowTime * 0.1, uv.y * 1.8 - slowTime * 0.25, slowTime * 0.1 + 200.0));

    // Blend colors based on noise
    vec3 color = vec3(0.0);

    // Color 1 - Cyan
    float blend1 = smoothstep(-0.3, 0.5, noise1) * verticalGradient;
    blend1 *= smoothstep(0.0, 0.4, uv.x) * smoothstep(1.0, 0.6, uv.x);
    color += uColor1 * blend1 * 0.8;

    // Color 2 - Purple
    float blend2 = smoothstep(-0.2, 0.6, noise2) * verticalGradient;
    blend2 *= smoothstep(0.2, 0.5, uv.x) * smoothstep(0.8, 0.5, uv.x);
    color += uColor2 * blend2 * 0.7;

    // Color 3 - Green
    float blend3 = smoothstep(-0.4, 0.4, noise3) * verticalGradient;
    blend3 *= smoothstep(0.4, 0.7, uv.x) * smoothstep(1.0, 0.7, uv.x);
    color += uColor3 * blend3 * 0.6;

    // Add subtle overall glow
    float overallGlow = verticalGradient * 0.15;
    color += mix(uColor1, uColor2, noise1 * 0.5 + 0.5) * overallGlow;

    // Smooth edges
    float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
    color *= edgeFade;

    // Final alpha based on color intensity and vertical position
    float alpha = (color.r + color.g + color.b) / 3.0;
    alpha *= verticalGradient;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

export class AuroraEffect {
  constructor(container) {
    this.container = container;
    this.width = container.offsetWidth;
    this.height = container.offsetHeight;
    this.clock = new THREE.Clock();

    this.init();
    this.animate();
    this.handleResize();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Shader material
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uColor1: { value: new THREE.Color(0x21c2fd) }, // Cyan
        uColor2: { value: new THREE.Color(0x8a50ff) }, // Purple
        uColor3: { value: new THREE.Color(0x00e676) }, // Green
      }
    });

    // Full-screen quad
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    window.addEventListener('resize', () => {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;

      this.renderer.setSize(this.width, this.height);
      this.material.uniforms.uResolution.value.set(this.width, this.height);
    });
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

// Auto-initialize when DOM is ready
export function initAurora() {
  const container = document.getElementById('aurora-canvas');
  if (container) {
    return new AuroraEffect(container);
  }
  return null;
}
