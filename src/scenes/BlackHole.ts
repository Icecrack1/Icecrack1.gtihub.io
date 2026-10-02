import * as THREE from 'three';

/** Pixel-art accretion disk. All motion uses the scene clock, including pause. */
export class BlackHole extends THREE.Group {
  private clock = { value: 0 };

  constructor() {
    super();
    // The opaque center hides stars and the far side of the accretion disk.
    const core = new THREE.Mesh(
      new THREE.CircleGeometry(1.16, 96),
      new THREE.MeshBasicMaterial({ color: 0x08020f }),
    );
    core.position.z = .02;
    this.add(core);

    const corona = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 4.1), new THREE.ShaderMaterial({
      uniforms: { time: this.clock },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
            mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
        }
        void main() {
          // Quantize the art itself so pixels remain visible at desktop resolutions.
          vec2 p = (floor(vUv * vec2(228., 164.)) + .5) / vec2(228., 164.);
          p = (p - .5) * vec2(5.7, 4.1);
          float r = length(p);
          float a = atan(p.y, p.x) - time * .055;
          vec2 orbit = vec2(cos(a), sin(a));
          float grain = noise(orbit * 19. + r * 17.);
          float fine = hash(floor(orbit * 83. + r * 59.));
          float rimRadius = 1.205 + (noise(orbit * 8.) - .5) * .025;
          float rim = exp(-pow((r - rimRadius) * 33., 2.));
          float outer = exp(-pow((r - 1.39) * 52., 2.)) * .32;
          float aura = exp(-pow((r - 1.31) * 4.5, 2.)) * (.16 + grain * .28);
          float mask = smoothstep(1.155, 1.2, r);
          // A flattened, gently tilted disk surrounds the event horizon.
          vec2 q = mat2(.976, .218, -.218, .976) * p;
          float diskRadius = length(vec2(q.x, q.y / .26));
          float diskAngle = atan(q.y / .26, q.x) - time * .065;
          vec2 diskOrbit = vec2(cos(diskAngle), sin(diskAngle));
          float cloud = noise(diskOrbit * 13. + diskRadius * 12.);
          float flecks = hash(floor(diskOrbit * 91. + diskRadius * 72.));
          float disk = smoothstep(1.17, 1.36, diskRadius) * (1. - smoothstep(1.65, 2.85, diskRadius));
          // The near arc crosses below the center; the far arc disappears behind it.
          disk *= (q.y < 0. ? 1. : smoothstep(1.16, 1.23, r));
          disk *= .16 + cloud * .38 + pow(flecks, 9.) * .65;
          vec3 violet = vec3(.36, .025, .85);
          vec3 pink = vec3(.85, .19, 1.);
          vec3 color = (violet * aura + pink * rim * (.65 + grain * .5) + vec3(.7, .4, 1.) * outer) * mask;
          color += mix(violet, pink, cloud) * disk;
          color += vec3(1., .7, 1.) * rim * pow(fine, 5.) * .65;
          float fade = 1. - smoothstep(2.55, 2.85, abs(p.x));
          gl_FragColor = vec4(color * fade, 1.);
        }`,
    }));
    corona.position.z = .04;
    this.add(corona);

    const count = 1700;
    const positions = new Float32Array(count * 3);
    const attributes = new Float32Array(count * 4);
    let seed = 1447;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < count; i++) {
      // Inner dust is dense; the outer edge breaks into scattered square particles.
      attributes[i * 4] = 1.23 + Math.pow(random(), 1.7) * 1.45;
      attributes[i * 4 + 1] = random() * Math.PI * 2;
      attributes[i * 4 + 2] = (random() - .5) * .14;
      attributes[i * 4 + 3] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('orbit', new THREE.BufferAttribute(attributes, 4));
    // Positions are produced by the vertex shader, so use an explicit culling bound.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    const dust = new THREE.Points(geometry, new THREE.ShaderMaterial({
      uniforms: { time: this.clock },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec4 orbit;
        uniform float time;
        varying float brightness;
        void main() {
          float a = orbit.y + time * .085 / pow(orbit.x, 1.5);
          vec3 p = vec3(cos(a) * orbit.x, sin(a) * orbit.x * .26 + orbit.z, sin(a) * orbit.x * -.32);
          p.xy = mat2(.976, -.218, .218, .976) * p.xy;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mvPosition;
          float worldScale = length(modelViewMatrix[0].xyz);
          gl_PointSize = clamp((1.3 + orbit.w * 2.7) * worldScale * 13. / -mvPosition.z, 1., 4.);
          brightness = .18 + pow(orbit.w, 2.) * .82;
        }`,
      fragmentShader: `varying float brightness;
        void main() { gl_FragColor = vec4(mix(vec3(.42, .045, .85), vec3(1., .65, 1.), brightness), brightness * .8); }`,
    }));
    this.add(dust);
  }

  update(time: number) { this.clock.value = time; }
}
