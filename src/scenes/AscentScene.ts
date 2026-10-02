import * as THREE from 'three';
import { BlackHole } from './BlackHole';

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;

/** One procedural scene, four scroll poses. No model, texture, or network dependencies. */
export class AscentScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  private hero = new THREE.Group();
  private spark = new THREE.Group();
  private ascent = new THREE.Group();
  private finale = new THREE.Group();
  private stars!: THREE.Points;
  private dust!: THREE.Points;
  private portal!: THREE.Group;
  private blackHole!: BlackHole;
  private crystal!: THREE.Group;
  private chapter = 0;
  private paused = false;
  private hidden = document.hidden;
  private lost = false;
  private raf = 0;
  private time = 0;
  private lastTime = 0;
  private mobile = innerWidth <= 700;
  private pointer = new THREE.Vector2();
  private smoothPointer = new THREE.Vector2();
  private randomSeed = 817;
  private solid = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: .94, flatShading: true });
  private light = new THREE.MeshStandardMaterial({ color: 0xcacaca, roughness: .7, metalness: .15, flatShading: true });
  private white = new THREE.MeshBasicMaterial({ color: 0xf0f0ea });

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x050505, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.fog = new THREE.FogExp2(0x050505, .028);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 3.4);
    key.position.set(-3, 8, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 2.2);
    rim.position.set(4, 2, -5);
    this.scene.add(rim);
    this.buildStars();
    this.buildHero();
    this.buildSpark();
    this.buildAscent();
    this.buildFinale();
    this.scene.add(this.hero, this.spark, this.ascent, this.finale);
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || this.paused) return;
      this.pointer.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.hidden;
      if (this.hidden) this.stop(); else this.start();
    });
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); this.lost = true; this.stop(); document.body.classList.remove('webgl-ready');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false; this.draw(); document.body.classList.add('webgl-ready'); this.start();
    });
    this.draw();
    document.body.classList.add('webgl-ready');
    this.start();
  }

  private random() {
    this.randomSeed = (this.randomSeed * 16807) % 2147483647;
    return (this.randomSeed - 1) / 2147483646;
  }

  private buildStars() {
    const positions: number[] = [];
    for (let i = 0; i < 390; i++) positions.push((this.random() - .5) * 55, (this.random() - .5) * 34, -8 - this.random() * 24);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x9c9c9c, size: .034, transparent: true, opacity: .65, sizeAttenuation: true }));
    this.scene.add(this.stars);
    const dust: number[] = [];
    for (let i = 0; i < 95; i++) dust.push((this.random() - .5) * 8, (this.random() - .5) * 8, (this.random() - .5) * 5);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dust, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xcccccc, size: .027, transparent: true, opacity: .65 }));
    this.scene.add(this.dust);
  }

  private island(radius: number, depth: number): THREE.Group {
    const group = new THREE.Group();
    const segments = 9;
    const top: THREE.Vector3[] = [], middle: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = i / segments * Math.PI * 2;
      const r = radius * (.8 + this.random() * .23);
      top.push(new THREE.Vector3(Math.cos(angle) * r, (this.random() - .5) * .12, Math.sin(angle) * r));
      middle.push(new THREE.Vector3(Math.cos(angle + .18) * r * .72, -depth * (.3 + this.random() * .24), Math.sin(angle + .18) * r * .72));
    }
    const vertices: number[] = [];
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    const center = new THREE.Vector3(0, .08, 0), tip = new THREE.Vector3(radius * .15, -depth, -.15);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      tri(center, top[next], top[i]);
      tri(top[i], top[next], middle[i]);
      tri(top[next], middle[next], middle[i]);
      tri(middle[i], middle[next], tip);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    group.add(new THREE.Mesh(geometry, this.solid));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 22), new THREE.LineBasicMaterial({ color: 0xcccccc, transparent: true, opacity: .12 }));
    group.add(edges);
    return group;
  }

  private halo(radius: number, opacity = .3): THREE.Mesh {
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { strength: { value: opacity } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float strength;
        void main(){ float d=length(vUv-.5)*2.; float ring=exp(-pow((d-.53)*15.,2.));
        float aura=exp(-pow((d-.53)*4.,2.))*.15; float a=(ring*.5+aura)*strength;
        float noise=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
        a=floor(a*22.+noise)/22.; gl_FragColor=vec4(vec3(.92),a); }`,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(radius * 3.8, radius * 3.8), material);
  }

  private buildHero() {
    const island = this.island(2.3, 2.6);
    island.position.set(0, -1.6, 0);
    this.hero.add(island);
    this.portal = new THREE.Group();
    this.portal.position.set(0, .95, -.9);
    this.blackHole = new BlackHole();
    this.portal.add(this.blackHole);
    this.hero.add(this.portal);
    for (let i = 0; i < 16; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(.78, .095, .27), this.light);
      step.position.set(0, -1.5 + i * .098, 2.8 - i * .235);
      this.hero.add(step);
    }
    // Tiny polygonal pillars give the silhouette a quiet, forgotten-world feel.
    for (const [x, z, h] of [[-1.55, -.5, .7], [1.3, -.7, 1.1], [-1.5, .8, .28], [.9, .4, .3]]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, h, 5), this.solid);
      pillar.position.set(x, -1.55 + h / 2, z);
      this.hero.add(pillar);
    }
    for (let i = 0; i < 9; i++) {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(.1 + this.random() * .15, 0), this.solid);
      const angle = this.random() * Math.PI * 2;
      rock.position.set(Math.cos(angle) * (2.6 + this.random()), -1.5 - this.random() * 2, Math.sin(angle) * 2);
      rock.rotation.set(this.random(), this.random(), this.random());
      this.hero.add(rock);
    }
  }

  private makeStar(size: number): THREE.Group {
    const star = new THREE.Group();
    const vertical = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), this.white);
    vertical.scale.set(.27, 1.7, .27);
    const horizontal = vertical.clone(); horizontal.rotation.z = Math.PI / 2; horizontal.scale.multiplyScalar(.7);
    star.add(vertical, horizontal);
    return star;
  }

  private buildSpark() {
    this.crystal = new THREE.Group();
    const geometry = new THREE.OctahedronGeometry(1.45, 0);
    const core = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x999999, metalness: .8, roughness: .24, flatShading: true }));
    core.scale.set(.7, 1.2, .7);
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: .65 }));
    wire.scale.set(.95, 1.65, .95);
    this.crystal.add(core, wire);
    this.spark.add(this.crystal);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2 + i * .22, .008, 3, 90), new THREE.MeshBasicMaterial({ color: i === 1 ? 0x999999 : 0x444444 }));
      ring.rotation.set(.8 + i * .5, .4 + i * .7, .2 * i);
      this.spark.add(ring);
    }
    this.spark.add(this.makeStar(.24));
    const glow = this.halo(1.2, .17);
    this.spark.add(glow);
  }

  private buildAscent() {
    for (let i = 0; i < 6; i++) {
      const angle = i * .83;
      const island = this.island(.8 - i * .075, .9 - i * .06);
      island.position.set(Math.sin(angle) * 1.25, -2.5 + i * .9, Math.cos(angle) * .7);
      this.ascent.add(island);
      for (let j = 0; j < 4 && i < 5; j++) {
        const t = (j + 1) / 5, nextAngle = (i + 1) * .83;
        const step = new THREE.Mesh(new THREE.BoxGeometry(.24, .065, .24), this.light);
        step.position.set(lerp(Math.sin(angle), Math.sin(nextAngle), t) * 1.25, -2.5 + (i + t) * .9, lerp(Math.cos(angle), Math.cos(nextAngle), t) * .7);
        this.ascent.add(step);
      }
    }
    const summit = this.makeStar(.3);
    summit.position.set(Math.sin(5 * .83) * 1.25, 2.7, Math.cos(5 * .83) * .7);
    this.ascent.add(summit);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, .007, 3, 100, Math.PI * 1.7), new THREE.MeshBasicMaterial({ color: 0x484848 }));
    ring.rotation.set(.25, .15, -.2);
    this.ascent.add(ring);
  }

  private buildFinale() {
    this.finale.add(this.makeStar(.5));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, .01, 3, 96), new THREE.MeshBasicMaterial({ color: 0xaaaaaa }));
    ring.rotation.x = .35;
    this.finale.add(ring, this.halo(1.1, .3));
  }

  setChapter(value: number) { this.chapter = value; if (this.paused) this.draw(); }
  setPaused(value: boolean) { this.paused = value; if (value) { this.stop(); this.draw(); } else this.start(); }

  private resize = () => {
    this.mobile = innerWidth <= 700;
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = this.mobile ? 46 : 38;
    this.camera.updateProjectionMatrix();
    // Deliberately low resolution: crisp pixels, lower GPU cost, early-console atmosphere.
    this.renderer.setPixelRatio(this.mobile ? .85 : .8);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.draw();
  };

  private stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  private start() {
    if (this.raf || this.paused || this.hidden || this.lost) return;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    this.raf = 0;
    if (this.paused || this.hidden || this.lost) return;
    const dt = Math.min((now - this.lastTime) / 1000, .05);
    this.lastTime = now;
    this.time += dt;
    this.smoothPointer.lerp(this.pointer, 1 - Math.exp(-dt * 2));
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    if (this.lost || this.hidden) return;
    const t = this.time;
    this.camera.position.set(this.smoothPointer.x * .12, 1.5 + this.smoothPointer.y * .1, 15);
    this.camera.lookAt(0, 0, 0);
    const x = this.mobile ? .35 : this.camera.aspect * 2.13;
    const y = this.mobile ? -3 : -.1;
    const size = this.mobile ? (innerHeight < 740 ? .47 : .59) : .94;
    const groups = [this.hero, this.spark, this.ascent, this.finale];
    groups.forEach((group, i) => {
      const distance = Math.abs(this.chapter - i);
      const visibility = clamp(1 - distance, 0, 1);
      group.visible = visibility > .002;
      group.scale.setScalar(Math.max(.001, size * visibility));
      group.position.set(i === 3 ? 0 : x, i === 3 ? (this.mobile ? 3.2 : 3.1) : y + Math.sin(t * .4 + i) * .07 + (i - this.chapter) * 1.7, 0);
    });
    this.hero.rotation.y = -.3 + Math.sin(t * .12) * .045;
    this.portal.rotation.z = Math.sin(t * .15) * .025;
    this.blackHole.update(t);
    this.crystal.rotation.y = t * .17;
    this.crystal.rotation.z = Math.sin(t * .24) * .1;
    this.spark.rotation.z = Math.sin(t * .13) * .08;
    this.ascent.rotation.y = -.25 + Math.sin(t * .15) * .12;
    this.finale.rotation.z = Math.sin(t * .17) * .1;
    this.stars.rotation.z = t * .0015;
    this.dust.position.set(x, y, 0);
    this.dust.rotation.y = t * .015;
    this.dust.rotation.z = t * .01;
    (this.dust.material as THREE.PointsMaterial).opacity = lerp(.6, .15, clamp(this.chapter - 2, 0, 1));
    this.renderer.render(this.scene, this.camera);
  }
}
