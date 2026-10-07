import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

gsap.config({ nullTargetWarn: false });

function prefersReduce() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasTarget(t) {
  if (t == null) return false;
  if (typeof t.length === 'number') return t.length > 0;
  return true;
}

function qAll(root, sel) {
  if (!root) return [];
  return [...root.querySelectorAll(sel)];
}

const SLIDE_ANIM_SEL =
  '.hb-copy > *, .hb-dish, .hb-brush, .hb-bubble, .hb-ing, .hb-glow, .hb-stripes, .hb-title .w > span, .hb-script, .hb-sub, .hb-price, .hb-cta';

/** Remet un slide à l’état visible (évite textes invisibles après leave / retour page). */
function resetSlideVisual(slideEl) {
  if (!slideEl) return;
  const nodes = qAll(slideEl, SLIDE_ANIM_SEL);
  if (!nodes.length) return;
  gsap.killTweensOf(nodes);
  gsap.set(nodes, { clearProps: 'all' });
}

/**
 * Animations GSAP (hero, mobile, reveal, header).
 */
export function useRepasRefonteMotion({
  rootRef,
  heroIdx,
  leavingIdx,
  onLeaveDone,
  mIdx,
  slideCount,
  pausedRef,
  autoplayMs = 6500,
}) {
  const prevHero = useRef(-1);
  const prevMobile = useRef(-1);
  const progTween = useRef(null);
  const floatTweens = useRef([]);
  const firstHero = useRef(true);
  const leaveCb = useRef(onLeaveDone);
  leaveCb.current = onLeaveDone;

  /* Header + floats + reveal + parallax */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReduce()) return undefined;

    const tweens = [];
    const headWrap = root.querySelector('.head .wrap');
    if (headWrap) {
      tweens.push(
        gsap.from(headWrap, {
          y: -40,
          opacity: 0,
          scale: 0.96,
          duration: 0.9,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        })
      );
    }
    const navBits = qAll(root, '.head .wrap > *, .nav button');
    if (navBits.length) {
      tweens.push(
        gsap.from(navBits, {
          y: -14,
          opacity: 0,
          duration: 0.7,
          stagger: 0.05,
          delay: 0.25,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        })
      );
    }

    const killFloats = () => {
      floatTweens.current.forEach((t) => t.kill());
      floatTweens.current = [];
    };

    const startFloats = () => {
      killFloats();
      qAll(root, '.hb-dish').forEach((d) => {
        floatTweens.current.push(
          gsap.to(d, { rotate: 4, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        );
      });
      qAll(root, '.hb-ing').forEach((d, k) => {
        floatTweens.current.push(
          gsap.to(d, {
            y: -12 - (k % 3) * 4,
            rotate: k % 2 ? 14 : -12,
            duration: 3 + (k % 4) * 0.6,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: k * 0.2,
          })
        );
      });
      qAll(root, '.hb-stripes').forEach((d, k) => {
        floatTweens.current.push(
          gsap.to(d, {
            rotate: k % 2 ? 360 : -360,
            duration: 60,
            ease: 'none',
            repeat: -1,
          })
        );
      });
      qAll(root, '.m-hero-img img').forEach((d) => {
        floatTweens.current.push(
          gsap.to(d, { y: -10, rotate: 3, duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1 })
        );
      });
    };

    const floatTimer = setTimeout(startFloats, 200);

    let io;
    const observe = () => {
      const els = qAll(root, '.reveal:not(.in)');
      if (!('IntersectionObserver' in window)) {
        els.forEach((e) => e.classList.add('in'));
        return;
      }
      io =
        io ||
        new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.classList.add('in');
                io.unobserve(e.target);
              }
            });
          },
          { rootMargin: '0px 0px -8% 0px' }
        );
      els.forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.top < window.innerHeight) e.classList.add('in');
        else io.observe(e);
      });
    };
    observe();
    const mo = new MutationObserver(() => observe());
    mo.observe(root, { childList: true, subtree: true });

    const heroEl = root.querySelector('.hero');
    const parEls = () => qAll(root, '[data-par]');
    let ticking = false;
    const onScroll = () => {
      const y = window.scrollY;
      if (!prefersReduce()) {
        const st = root.querySelector('.hb-stage');
        if (st && window.innerWidth > 900) st.style.translate = `0 ${y * 0.18}px`;
        parEls().forEach((el) => {
          const r = el.getBoundingClientRect();
          const c = r.top + r.height / 2 - window.innerHeight / 2;
          el.style.translate = `0 ${c * +el.dataset.par}px`;
        });
      }
      // Remontée vers le haut : s’assurer que le slide actif est lisible
      if (y < 80) {
        const active = root.querySelector('.hb-slide.on');
        if (active) {
          const hidden = qAll(active, '.hb-copy > *').some((n) => {
            const op = window.getComputedStyle(n).opacity;
            return Number(op) < 0.05;
          });
          if (hidden) resetSlideVisual(active);
        }
      }
      ticking = false;
    };
    const onScrollRaf = () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScrollRaf, { passive: true });

    let onMove;
    if (heroEl && window.matchMedia('(pointer:fine)').matches) {
      onMove = (e) => {
        const r = heroEl.getBoundingClientRect();
        heroEl.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        heroEl.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      };
      heroEl.addEventListener('mousemove', onMove);
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const active = root.querySelector('.hb-slide.on');
      resetSlideVisual(active);
      const mImg = root.querySelector('.m-hero-img img');
      if (mImg) gsap.set(mImg, { clearProps: 'all' });
      qAll(root, '.m-script, .m-price, .m-hero-cta, .m-hero-copy h2 .w > span').forEach((n) => {
        gsap.set(n, { clearProps: 'all' });
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);

    return () => {
      clearTimeout(floatTimer);
      tweens.forEach((t) => t.kill());
      killFloats();
      mo.disconnect();
      io?.disconnect();
      window.removeEventListener('scroll', onScrollRaf);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      if (heroEl && onMove) heroEl.removeEventListener('mousemove', onMove);
      if (progTween.current) progTween.current.kill();
      qAll(root, '.hb-slide').forEach(resetSlideVisual);
    };
  }, [rootRef, slideCount]);

  /* Transition hero desktop */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || slideCount < 1) return undefined;

    const slides = qAll(root, '.hb-slide');
    const next = slides[heroIdx];
    if (!next) return undefined;

    const prevIdx = prevHero.current;
    const prevEl = leavingIdx != null ? slides[leavingIdx] : prevIdx >= 0 ? slides[prevIdx] : null;
    const dir =
      prevIdx < 0 ? 1 : heroIdx > prevIdx || (prevIdx === slideCount - 1 && heroIdx === 0) ? 1 : -1;
    prevHero.current = heroIdx;

    const heroEl = root.querySelector('.hero');
    if (heroEl) heroEl.classList.toggle('alt-on', next.classList.contains('alt'));

    const q = (sel) => qAll(next, sel);
    const reduce = prefersReduce();

    if (progTween.current) progTween.current.kill();
    const prog = root.querySelector('.hb-prog i');
    if (prog && !reduce) {
      progTween.current = gsap.fromTo(
        prog,
        { width: '0%' },
        {
          width: '100%',
          duration: autoplayMs / 1000,
          ease: 'none',
          paused: !!pausedRef?.current,
        }
      );
    }

    const finishLeave = () => {
      if (prevEl && prevEl !== next) resetSlideVisual(prevEl);
      leaveCb.current?.();
    };

    // Toujours repartir d’un état propre avant l’entrée
    resetSlideVisual(next);

    if (reduce || firstHero.current) {
      firstHero.current = false;
      finishLeave();
      return undefined;
    }

    const timelines = [];
    const addTo = (tl, targets, vars, pos) => {
      if (!hasTarget(targets)) return;
      tl.to(targets, vars, pos);
    };
    const addFromTo = (tl, targets, from, to, pos) => {
      if (!hasTarget(targets)) return;
      tl.fromTo(targets, from, { ...to, clearProps: to.clearProps || 'filter' }, pos);
    };

    if (prevEl && prevEl !== next) {
      const out = gsap.timeline({ onComplete: finishLeave });
      addTo(
        out,
        qAll(prevEl, '.hb-copy > *'),
        { y: -24, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.in' },
        0
      );
      const prevDish = prevEl.querySelector('.hb-dish');
      if (prevDish) {
        out.to(
          prevDish,
          {
            xPercent: -30 * dir,
            scale: 0.7,
            opacity: 0,
            filter: 'blur(10px)',
            duration: 0.6,
            ease: 'power3.in',
          },
          0
        );
      }
      addTo(
        out,
        qAll(prevEl, '.hb-brush, .hb-bubble, .hb-ing, .hb-glow, .hb-stripes'),
        { opacity: 0, duration: 0.45 },
        0
      );
      timelines.push(out);
    } else {
      finishLeave();
    }

    const d0 = prevEl && prevEl !== next ? 0.45 : 0.1;
    const tl = gsap.timeline({
      delay: d0,
      defaults: { ease: 'power4.out' },
      onComplete: () => {
        // Texte / plat bien visibles même si l’anim a été coupée
        resetSlideVisual(next);
        // Relancer un float léger sur le plat actif
        const dish = next.querySelector('.hb-dish');
        if (dish && !prefersReduce()) {
          floatTweens.current.push(
            gsap.to(dish, { rotate: 4, duration: 4.5, ease: 'sine.inOut', yoyo: true, repeat: -1 })
          );
        }
      },
    });
    timelines.push(tl);
    const brush = next.querySelector('.hb-brush');
    if (brush) {
      if (next.classList.contains('alt')) {
        tl.fromTo(
          brush,
          { opacity: 0, scale: 0.4, rotate: -140 },
          { opacity: 1, scale: 1, rotate: 0, duration: 1.1 },
          0
        );
      } else {
        tl.fromTo(
          brush,
          { opacity: 1, clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power2.inOut' },
          0
        );
      }
    }
    addFromTo(tl, q('.hb-glow, .hb-stripes'), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.1);
    addFromTo(
      tl,
      q('.hb-dish'),
      { xPercent: 26 * dir, scale: 0.55, opacity: 0, filter: 'blur(14px)' },
      { xPercent: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.3 },
      0.2
    );
    addFromTo(tl, q('.hb-script'), { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 0.25);
    addFromTo(
      tl,
      q('.hb-title .w > span'),
      { yPercent: 115 },
      { yPercent: 0, duration: 0.9, stagger: 0.08 },
      0.3
    );
    addFromTo(
      tl,
      q('.hb-sub, .hb-price, .hb-cta'),
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 },
      0.55
    );
    addFromTo(
      tl,
      q('.hb-ing'),
      { scale: 0, opacity: 0 },
      {
        scale: 1,
        opacity: (k, el) => (el.classList.contains('far') ? 0.8 : 1),
        duration: 0.8,
        stagger: 0.07,
        ease: 'back.out(2)',
      },
      0.7
    );
    addFromTo(
      tl,
      q('.hb-bubble'),
      { scale: 0, rotate: -25, opacity: 0 },
      { scale: 1, rotate: 0, opacity: 1, duration: 0.8, ease: 'back.out(2.4)' },
      0.95
    );

    return () => {
      timelines.forEach((t) => t.kill());
      // Si l’anim est interrompue (changement rapide / scroll), forcer le visible
      resetSlideVisual(next);
    };
  }, [heroIdx, leavingIdx, slideCount, rootRef, autoplayMs, pausedRef]);

  /* Transition hero mobile */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReduce()) {
      prevMobile.current = mIdx;
      return;
    }
    const box = root.querySelector('.m-hero-img');
    const img = box?.querySelector('img');
    if (!img) {
      prevMobile.current = mIdx;
      return;
    }

    const prev = prevMobile.current;
    const dir = prev < 0 ? 1 : mIdx > prev || (prev === slideCount - 1 && mIdx === 0) ? 1 : -1;
    if (prev === mIdx) return;
    prevMobile.current = mIdx;

    if (prev < 0) return;

    const brushes = qAll(root, '.m-brush');
    if (brushes.length) {
      gsap.fromTo(
        brushes,
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power2.inOut', clearProps: 'clipPath' }
      );
    }
    gsap.fromTo(
      img,
      { xPercent: 40 * dir, scale: 0.55, opacity: 0, filter: 'blur(10px)' },
      {
        xPercent: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 1.1,
        ease: 'power4.out',
        clearProps: 'filter,transform,opacity',
      }
    );
    const words = qAll(root, '.m-hero-copy h2 .w > span');
    if (words.length) {
      gsap.fromTo(
        words,
        { yPercent: 115 },
        { yPercent: 0, duration: 0.7, stagger: 0.07, ease: 'power4.out', clearProps: 'transform' }
      );
    }
    const copyBits = qAll(root, '.m-script, .m-price, .m-hero-cta');
    if (copyBits.length) {
      gsap.fromTo(
        copyBits,
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, delay: 0.15, clearProps: 'transform,opacity' }
      );
    }
    const bubble = root.querySelector('.m-bubble');
    if (bubble) {
      gsap.fromTo(
        bubble,
        { scale: 0, rotate: -20 },
        { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.4)', delay: 0.4, clearProps: 'transform' }
      );
    }
  }, [mIdx, slideCount, rootRef]);
}

export function animateGridCards(root) {
  if (!root || prefersReduce()) return;
  const cards = qAll(root, '#menu .grid .card');
  if (!cards.length) return;
  cards.forEach((c) => c.classList.add('in'));
  gsap.fromTo(
    cards,
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' }
  );
}

export function bounceCartBadges(root) {
  if (prefersReduce() || !root) return;
  const badges = qAll(root, '.pill-order em, .m-cartbtn em');
  if (!badges.length) return;
  gsap.fromTo(badges, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
}
