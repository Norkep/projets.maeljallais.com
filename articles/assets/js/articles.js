document.addEventListener('DOMContentLoaded', () => {
// A local display preference; native galleries still work when storage is unavailable.
const topbar = document.querySelector('.portfolio-topbar');
const readingHeader = document.querySelector('.reading-header');
const galleries = [...document.querySelectorAll('[data-article-carousel]')];
const socialLinks = readingHeader?.querySelector('.portfolio-links');
if (readingHeader && socialLinks) {
  const updateHeader = () => {
    const hideLinks = window.scrollY > 24 && !socialLinks.contains(document.activeElement);
    readingHeader.classList.toggle('is-scrolled', hideLinks);
  };
  window.addEventListener('scroll', updateHeader, { passive: true });
  socialLinks.addEventListener('focusout', () => requestAnimationFrame(updateHeader));
  updateHeader();
}
if (topbar && galleries.length) {
  const storageKey = 'portfolio-contained-galleries';
  let contained = false;
  try { contained = localStorage.getItem(storageKey) === 'true'; } catch { /* Storage can be blocked in private or file browsing. */ }
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'gallery-toggle';
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-controls', galleries.map(gallery => gallery.querySelector('.article-carousel-track').id).join(' '));
  const label = document.createElement('span');
  label.textContent = 'Estomper les images';
  const indicator = document.createElement('span');
  indicator.className = 'gallery-toggle-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  toggle.append(label, indicator);
  const preference = document.createElement('div');
  preference.className = 'gallery-preference';
  const hint = document.createElement('span');
  hint.className = 'gallery-toggle-hint';
  hint.id = 'gallery-toggle-hint';
  hint.setAttribute('role', 'tooltip');
  hint.hidden = true;
  const hintText = document.createElement('span');
  hintText.textContent = "Dans les carrousels, les images sur les côtés s'estompent pour laisser l'image centrale bien visible.";
  hint.append(hintText);
  toggle.setAttribute('aria-describedby', hint.id);
  preference.append(toggle, hint);
  let hovered = false;
  let focused = false;
  let hintDismissed = false;
  let galleryInView = false;
  const updateHint = () => {
    if (!hovered && !focused) hintDismissed = false;
    hint.hidden = !preference.classList.contains('is-visible') || hintDismissed || (!hovered && !focused);
  };
  const updateVisibility = () => {
    // Keep a keyboard user's focus until they leave the switch.
    const visible = galleryInView || (focused && toggle.matches(':focus-visible'));
    preference.classList.toggle('is-visible', visible);
    if (!visible) hovered = false;
    updateHint();
  };
  preference.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true;
    updateHint();
  });
  preference.addEventListener('pointerleave', () => { hovered = false; updateHint(); });
  preference.addEventListener('focusin', () => { focused = true; updateVisibility(); });
  preference.addEventListener('focusout', event => {
    focused = preference.contains(event.relatedTarget);
    updateVisibility();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !hint.hidden) {
      hintDismissed = true;
      updateHint();
    }
  });
  const apply = () => {
    document.body.classList.toggle('galleries-contained', contained);
    toggle.setAttribute('aria-checked', String(contained));
  };
  toggle.addEventListener('click', () => {
    contained = !contained;
    apply();
    try { localStorage.setItem(storageKey, String(contained)); } catch { /* Keep the current view usable without persistence. */ }
  });
  apply();
  topbar.append(preference);

  // Only show the setting while a scrolling gallery is below the sticky header.
  const visibleGalleries = new Set();
  let galleryObserver;
  const observeGalleries = () => {
    galleryObserver?.disconnect();
    visibleGalleries.clear();
    const headerHeight = Math.ceil(readingHeader?.getBoundingClientRect().height || 0);
    galleryObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRect.height > 0) visibleGalleries.add(entry.target);
        else visibleGalleries.delete(entry.target);
      });
      galleryInView = visibleGalleries.size > 0;
      updateVisibility();
    }, { rootMargin: `-${headerHeight}px 0px 0px 0px` });
    galleries.forEach(gallery => galleryObserver.observe(gallery));
  };
  new ResizeObserver(observeGalleries).observe(readingHeader || topbar);
}

// Keep anchor targets below the sticky header, including enlarged or wrapped text.
if (readingHeader) {
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--reading-header-height', `${readingHeader.getBoundingClientRect().height}px`);
  }).observe(readingHeader);
}

// Enhance the existing figures; the native details remain usable without JavaScript.
document.querySelectorAll('.project-static-showcase').forEach(showcase => {
  const figures = [...showcase.querySelectorAll('.project-static-figure')];
  if (figures.length < 2) return;
  // Keep native figure semantics inside each tab panel.
  const panels = figures.map(figure => {
    const panel = document.createElement('div');
    panel.className = 'project-showcase-panel';
    panel.append(figure);
    return panel;
  });
  const tabs = document.createElement('div');
  tabs.className = 'project-showcase-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', showcase.getAttribute('aria-label'));
  const positionIndicator = () => {
    const selected = tabs.querySelector('[aria-selected="true"]');
    if (!selected) return;
    const bounds = selected.getBoundingClientRect();
    const viewport = tabs.getBoundingClientRect();
    tabs.style.setProperty('--tab-left', `${bounds.left - viewport.left + tabs.scrollLeft - tabs.clientLeft}px`);
    tabs.style.setProperty('--tab-top', `${selected.offsetTop}px`);
    tabs.style.setProperty('--tab-width', `${bounds.width}px`);
    tabs.style.setProperty('--tab-height', `${bounds.height}px`);
    // Create the pill at its final initial position, without an entrance animation.
    tabs.classList.add('has-active-tab');
  };
  const select = index => {
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      if (panel.hidden) panel.querySelectorAll('video').forEach(video => video.pause());
      const tab = tabs.children[i];
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    positionIndicator();
  };
  figures.forEach((figure, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `project-tab-${index}`;
    tab.textContent = figure.querySelector('h2').textContent;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `project-panel-${index}`);
    const panel = panels[index];
    panel.id = `project-panel-${index}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => select(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? figures.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + figures.length) % figures.length;
      select(next);
      const target = tabs.children[next];
      target.focus({ preventScroll: true });
      const bounds = target.getBoundingClientRect();
      const viewport = tabs.getBoundingClientRect();
      if (bounds.left < viewport.left) tabs.scrollLeft -= viewport.left - bounds.left;
      if (bounds.right > viewport.right) tabs.scrollLeft += bounds.right - viewport.right;
    });
    tabs.append(tab);
  });
  showcase.replaceChildren(tabs, ...panels);
  select(0);
  // Fonts, zoom and responsive padding can change the variable-width labels.
  const tabLayoutObserver = new ResizeObserver(positionIndicator);
  tabLayoutObserver.observe(tabs);
  [...tabs.children].forEach(tab => tabLayoutObserver.observe(tab));
});

// Enhance the static figures: native scrolling and captions also work without JS.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('[data-article-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.article-carousel-track');
  const slides = [...track.querySelectorAll('.article-carousel-slide')];
  const controls = carousel.querySelector('.article-carousel-controls');
  const [previous, next] = controls.querySelectorAll('button');
  const status = carousel.querySelector('[role="status"]');
  if (slides.length < 2) return;
  let current = 0;
  let settleTimer;
  let animationFrame = 0;
  let position = 0;
  let velocity = 0;
  let lastFrameTime = 0;
  const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const target = index => Math.min(slides[index].offsetLeft - slides[0].offsetLeft, maxScroll());
  function update(index, announce = false) {
    current = index;
    carousel.dataset.active = String(index);
    const noOverflow = maxScroll() <= 2;
    previous.disabled = noOverflow || index === 0;
    next.disabled = noOverflow || index === slides.length - 1;
    if (announce) status.textContent = `${index + 1} sur ${slides.length} · ${slides[index].querySelector('h3').textContent}`;
    const bounds = track.getBoundingClientRect();
    slides.forEach(slide => {
      const rect = slide.getBoundingClientRect();
      if (rect.right <= bounds.left || rect.left >= bounds.right) slide.querySelector('video')?.pause();
    });
  }
  function stopAnimation() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    velocity = 0;
  }
  function animateFrame(time) {
    const destination = target(current);
    const seconds = Math.max(0, Math.min((time - lastFrameTime) / 1000, .05));
    lastFrameTime = time;
    // Critically damped spring: a gentle start and long deceleration, without bounce.
    const speed = 8;
    const delta = position - destination;
    const impulse = velocity + speed * delta;
    const decay = Math.exp(-speed * seconds);
    position = destination + (delta + impulse * seconds) * decay;
    velocity = (velocity - speed * impulse * seconds) * decay;
    track.scrollTo({ left: position, behavior: 'instant' });
    if (Math.abs(position - destination) < .5 && Math.abs(velocity) < 5) {
      stopAnimation();
      track.scrollTo({ left: destination, behavior: 'instant' });
      settle();
    } else {
      animationFrame = requestAnimationFrame(animateFrame);
    }
  }
  function move(index, announce = true, animate = false) {
    index = maxScroll() <= 2 ? 0 : Math.max(0, Math.min(index, slides.length - 1));
    update(index, announce);
    if (!animate || reducedMotion.matches) {
      stopAnimation();
      track.scrollTo({ left: target(index), behavior: 'instant' });
    } else if (!animationFrame) {
      position = track.scrollLeft;
      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(animateFrame);
    }
  }
  function settle() {
    clearTimeout(settleTimer);
    if (animationFrame) return;
    const index = maxScroll() <= 2 ? 0 : track.scrollLeft >= maxScroll() - 2 ? slides.length - 1 : slides.reduce((best, _, i) =>
      Math.abs(track.scrollLeft - target(i)) < Math.abs(track.scrollLeft - target(best)) ? i : best, 0);
    update(index, index !== current);
  }
  previous.addEventListener('click', () => move(current - 1, true, true));
  next.addEventListener('click', () => move(current + 1, true, true));
  track.addEventListener('keydown', event => {
    // Leave native video controls and links their own keyboard behavior.
    if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  track.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 160);
  }, { passive: true });
  track.addEventListener('scrollend', settle);
  // Give native touch/trackpad scrolling control immediately on direct interaction.
  const interrupt = () => { stopAnimation(); settle(); };
  track.addEventListener('pointerdown', interrupt, { passive: true });
  track.addEventListener('wheel', interrupt, { passive: true });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && animationFrame) move(current, false);
  });
  track.addEventListener('focusin', event => {
    if (event.target === track) return;
    const index = slides.indexOf(event.target.closest('.article-carousel-slide'));
    if (index >= 0) move(index, false);
  });
  const layoutObserver = new ResizeObserver(() => move(current, false));
  layoutObserver.observe(track);
  // The switch can change slide widths without resizing the full-width track.
  layoutObserver.observe(slides[0]);
  controls.hidden = false;
  carousel.setAttribute('aria-roledescription', 'carrousel');
  update(0);
});

});
