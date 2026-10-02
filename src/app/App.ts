import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { AscentScene } from '../scenes/AscentScene';

gsap.registerPlugin(ScrollTrigger);

/** Composition root: accessible document first, then scroll and a lazy 3D layer. */
export class App {
  private scene?: AscentScene;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private paused = this.reduced.matches;
  private button = document.querySelector<HTMLButtonElement>('.motion-toggle')!;
  private sections = [...document.querySelectorAll<HTMLElement>('.chapter')];
  private progress = document.querySelector<HTMLElement>('.reading-progress span')!;
  private positions: number[] = [];
  private scrollRange = 1;
  private currentChapter = -1;
  private refreshFrame = 0;
  private scrollFrame = 0;
  private booting = false;

  constructor() {
    document.querySelector('#year')!.textContent = String(new Date().getFullYear());
    this.measure();
    this.syncMotionButton();
    this.button.addEventListener('click', () => {
      this.paused = !this.paused;
      this.syncMotionButton();
      this.scene?.setPaused(this.paused);
      if (!this.paused) void this.bootScene();
    });
    this.reduced.addEventListener('change', () => {
      this.paused = this.reduced.matches;
      this.syncMotionButton();
      this.scene?.setPaused(this.paused);
      if (!this.paused) void this.bootScene();
      this.measure();
    });
    this.initReveals();
    window.addEventListener('scroll', () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(() => { this.scrollFrame = 0; this.updateScroll(); });
    }, { passive: true });
    window.addEventListener('resize', () => {
      cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = requestAnimationFrame(() => this.measure());
    });
    document.fonts.ready.then(() => { this.measure(); ScrollTrigger.refresh(); });
    this.updateScroll();
    if (!this.reduced.matches) void this.bootScene();
  }

  private syncMotionButton() {
    this.button.setAttribute('aria-pressed', String(this.paused));
    this.button.setAttribute('aria-label', this.paused ? 'Play ambient animation' : 'Pause ambient animation');
    this.button.querySelector('.motion-label')!.textContent = this.paused ? 'MOTION OFF' : 'MOTION ON';
    this.button.querySelector('.motion-icon')!.textContent = this.paused ? '▷' : 'Ⅱ';
    document.body.classList.toggle('motion-paused', this.paused);
  }

  private measure() {
    this.positions = this.sections.map(section => section.offsetTop);
    this.scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    this.updateScroll();
  }

  private updateScroll() {
    const y = window.scrollY;
    this.progress.style.transform = `scaleX(${Math.min(1, y / this.scrollRange)})`;
    let active = 0;
    for (let i = 1; i < this.positions.length; i++) {
      if (y + innerHeight * .45 >= this.positions[i]) active = i;
    }
    if (active !== this.currentChapter) {
      this.currentChapter = active;
      document.querySelectorAll('.chapter-nav a, .main-nav a').forEach(link => {
        if (link.getAttribute('href') === `#${this.sections[active].id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    // Transition during each chapter's entry; stay in that world while its copy is pinned.
    let chapter = 0;
    for (let i = 1; i < this.positions.length; i++) {
      const start = this.positions[i] - innerHeight * .7;
      const t = Math.max(0, Math.min(1, (y - start) / (innerHeight * .8)));
      chapter += t * t * (3 - 2 * t);
    }
    this.scene?.setChapter(chapter);
  }

  private initReveals() {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.title-line', { y: 34, opacity: 0, duration: 1.25, stagger: .12, ease: 'power3.out', clearProps: 'all' });
      gsap.from('.intro', { y: 12, opacity: 0, delay: .3, duration: 1, stagger: .1, clearProps: 'all' });
      this.sections.slice(1).forEach(section => {
        gsap.from(section.querySelectorAll('[data-reveal]'), {
          scrollTrigger: { trigger: section, start: 'top 65%', once: true },
          y: 26, opacity: 0, duration: .9, stagger: .1, ease: 'power2.out', clearProps: 'all',
        });
      });
    });
  }

  private async bootScene() {
    if (this.scene || this.booting) return;
    this.booting = true;
    try {
      const { AscentScene } = await import('../scenes/AscentScene');
      this.scene = new AscentScene(document.querySelector<HTMLCanvasElement>('#world-canvas')!);
      this.scene.setPaused(this.paused);
      this.updateScroll();
    } catch (error) {
      // The static illustration and complete document remain available.
      console.warn('The 3D scene is unavailable; using the static artwork.', error);
      this.button.hidden = true;
    } finally { this.booting = false; }
  }
}
