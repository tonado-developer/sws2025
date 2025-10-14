/**
 * Scroll Appear Animation - Mit Dynamic Content Support
 * Animiert Elemente mit der Klasse 'appear' beim Scrollen in den Viewport
 * Unterstützt dynamisch geladene Inhalte (AJAX, Popups, etc.)
 */

class ScrollAppear {
  constructor(options = {}) {
    this.options = {
      className: 'appear',
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
      once: true,
      duration: 800,
      easing: 'ease-out',
      animationType: 'fadeUp',
      observeDOM: true, // Neue Option für DOM-Überwachung
      debounceDelay: 100, // Debounce für DOM-Änderungen
      ...options
    };
    
    this.elements = new Set(); // Set statt Array für bessere Performance
    this.observer = null;
    this.mutationObserver = null;
    this.animations = new Map();
    this.debounceTimer = null;
    
    this.init();
  }
  
  init() {
    this.collectElements();
    this.setupObserver();
    this.checkInitiallyVisible();
    
    // DOM-Überwachung für dynamische Inhalte
    if (this.options.observeDOM) {
      this.setupMutationObserver();
    }
    
    // Global event für manuelle Initialisierung
    this.setupGlobalEvents();
  }
  
  collectElements(root = document) {
    const newElements = root.querySelectorAll(`.${this.options.className}`);
    let addedCount = 0;
    
    newElements.forEach(el => {
      if (!this.elements.has(el)) {
        this.elements.add(el);
        this.setInitialStyle(el);
        
        // Direkt zum Observer hinzufügen wenn vorhanden
        if (this.observer) {
          this.observer.observe(el);
        }
        
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      // console.log(`ScrollAppear: Added ${addedCount} new elements`);
      
      // Neue Elemente sofort auf Sichtbarkeit prüfen
      if (root !== document) {
        this.checkElementsInContainer(root);
      }
    }
    
    return addedCount;
  }
  
  setupMutationObserver() {
    if (!('MutationObserver' in window)) return;
    
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Prüfen ob neue Nodes relevant sind
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) { // Element node
              if (this.hasAppearElements(node)) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
      }
      
      if (shouldProcess) {
        this.debouncedProcessNewElements();
      }
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  hasAppearElements(element) {
    if (element.classList && element.classList.contains(this.options.className)) {
      return true;
    }
    if (element.querySelector && element.querySelector(`.${this.options.className}`)) {
      return true;
    }
    return false;
  }
  
  debouncedProcessNewElements() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processNewElements();
    }, this.options.debounceDelay);
  }
  
  processNewElements() {
    const currentSize = this.elements.size;
    this.collectElements();
    
    if (this.elements.size > currentSize) {
      // Neue Elemente gefunden - sofort prüfen
      this.checkNewlyAddedElements();
    }
  }
  
  checkNewlyAddedElements() {
    this.elements.forEach(el => {
      if (!el.dataset.appeared && this.isElementInViewport(el)) {
        this.animateElement(el);
      }
    });
  }
  
  checkElementsInContainer(container) {
    // Spezielle Prüfung für Container (z.B. Popups)
    setTimeout(() => {
      const elements = container.querySelectorAll(`.${this.options.className}`);
      elements.forEach(el => {
        // Bei Popups/Modals sind Elemente oft sofort "sichtbar"
        if (this.isElementVisibleInContainer(el, container)) {
          this.animateElement(el);
        }
      });
    }, 50);
  }
  
  isElementVisibleInContainer(el, container) {
    // Prüfung ob Element in seinem Container sichtbar ist
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    
    // Element ist sichtbar wenn es innerhalb des Containers ist
    return (
      elRect.top >= containerRect.top &&
      elRect.bottom <= containerRect.bottom &&
      el.offsetParent !== null // Element ist nicht hidden
    );
  }
  
  setupGlobalEvents() {
    // Custom Event für manuelle Initialisierung
    document.addEventListener('scrollAppear:refresh', () => {
      this.refresh();
    });
    
    // Event für spezifische Container
    document.addEventListener('scrollAppear:processContainer', (e) => {
      if (e.detail && e.detail.container) {
        this.processContainer(e.detail.container);
      }
    });
    
    // Automatische Verarbeitung bei bekannten Events
    document.addEventListener('ajax:complete', () => {
      this.debouncedProcessNewElements();
    });
    
    // WordPress spezifische Events
    if (window.jQuery) {
      jQuery(document).on('ajaxComplete', () => {
        this.debouncedProcessNewElements();
      });
    }
  }
  
  processContainer(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (!container) return;
    
    const addedCount = this.collectElements(container);
    if (addedCount > 0) {
      this.checkElementsInContainer(container);
    }
  }
  
  setInitialStyle(element) {
    if (element.dataset.appearInitialized) return;
    
    // WICHTIG: Original-Werte VOR dem Ändern speichern
    const computedStyle = window.getComputedStyle(element);
    const originalTransform = computedStyle.transform;
    const originalOpacity = computedStyle.opacity;
    
    element.dataset.originalTransform = originalTransform !== 'none' ? originalTransform : '';
    element.dataset.originalOpacity = (!originalOpacity || originalOpacity === '0') ? '1' : originalOpacity;
    
    const animationType = element.dataset.animation || 
                         this.getAnimationTypeFromClass(element) || 
                         this.options.animationType;
    
    // ERST NACH dem Speichern die opacity auf 0 setzen
    element.style.opacity = '0';
    
    this.applyInitialTransform(element, animationType);
    element.dataset.appearInitialized = 'true';
  }
  
  getAnimationTypeFromClass(element) {
    const classList = Array.from(element.classList);
    const animationTypes = ['fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in', 'fade'];
    
    for (const type of animationTypes) {
      if (classList.includes(type)) {
        return type.replace('-', '');
      }
    }
    return null;
  }
  
  applyInitialTransform(element, animationType) {
    const originalTransform = element.dataset.originalTransform || '';
    let initialTransform = '';
    
    switch (animationType) {
      case 'fadeUp':
      case 'fade-up':
        initialTransform = 'translateY(30px)';
        break;
      case 'fadeDown':
      case 'fade-down':
        initialTransform = 'translateY(-30px)';
        break;
      case 'fadeLeft':
      case 'fade-left':
        initialTransform = 'translateX(-30px)';
        break;
      case 'fadeRight':
      case 'fade-right':
        initialTransform = 'translateX(30px)';
        break;
      case 'zoomIn':
      case 'zoom-in':
        initialTransform = 'scale(0.8)';
        break;
      case 'fade':
      default:
        initialTransform = '';
    }
    
    const combinedTransform = originalTransform + (originalTransform && initialTransform ? ' ' : '') + initialTransform;
    
    if (combinedTransform) {
      element.style.transform = combinedTransform;
    }
    
    if (!element.style.transition) {
      element.style.transition = `opacity ${this.options.duration}ms ${this.options.easing}${initialTransform ? ', transform ' + this.options.duration + 'ms ' + this.options.easing : ''}`;
    }
  }
  
  setupObserver() {
    if (!('IntersectionObserver' in window)) {
      this.fallbackAnimation();
      return;
    }
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateElement(entry.target);
        } else if (!this.options.once) {
          this.hideElement(entry.target);
        }
      });
    }, {
      threshold: this.options.threshold,
      rootMargin: this.options.rootMargin
    });
    
    this.elements.forEach(el => this.observer.observe(el));
  }
  
  checkInitiallyVisible() {
    setTimeout(() => {
      this.elements.forEach(el => {
        if (this.isElementInViewport(el)) {
          this.animateElement(el);
        }
      });
    }, 100);
  }
  
  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    return (
      rect.top >= 0 &&
      rect.top <= windowHeight * (1 - this.options.threshold) &&
      el.offsetParent !== null // Element ist nicht hidden
    );
  }
  
  animateElement(element) {
    if (element.dataset.appeared === 'true') return;
    
    const delay = this.getDelay(element);
    
    const animate = () => {
      const originalTransform = element.dataset.originalTransform || '';
      const originalOpacity = element.dataset.originalOpacity || '1';
      
      element.style.opacity = originalOpacity;
      element.style.transform = originalTransform;
      
      element.dataset.appeared = 'true';
      
      if (this.options.once && this.observer) {
        this.observer.unobserve(element);
      }
      
      element.dispatchEvent(new CustomEvent('appear', {
        detail: { element }
      }));
    };
    
    if (delay > 0) {
      setTimeout(animate, delay);
    } else {
      animate();
    }
  }
  
  getDelay(element) {
    if (element.dataset.delay) {
      return parseInt(element.dataset.delay);
    }
    
    const classList = Array.from(element.classList);
    for (const className of classList) {
      if (className.startsWith('delay-')) {
        const delayValue = className.replace('delay-', '');
        return parseInt(delayValue);
      }
    }
    
    return 0;
  }
  
  hideElement(element) {
    if (element.dataset.appeared !== 'true') return;
    
    element.style.opacity = '0';
    
    const animationType = element.dataset.animation || 
                         this.getAnimationTypeFromClass(element) || 
                         this.options.animationType;
    
    this.applyInitialTransform(element, animationType);
    element.dataset.appeared = 'false';
  }
  
  fallbackAnimation() {
    let ticking = false;
    
    const checkElements = () => {
      this.elements.forEach(el => {
        if (el.dataset.appeared !== 'true' && this.isElementInViewport(el)) {
          this.animateElement(el);
        }
      });
      ticking = false;
    };
    
    const scrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(checkElements);
        ticking = true;
      }
    };
    
    this.scrollHandler = scrollHandler;
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', scrollHandler, { passive: true });
    
    checkElements();
  }
  
  refresh() {
    // Kompletter Refresh mit neuen Elementen
    this.processNewElements();
  }
  
  show(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (element) {
      this.animateElement(element);
    }
  }
  
  hide(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    if (element) {
      this.hideElement(element);
    }
  }
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('resize', this.scrollHandler);
    }
    
    clearTimeout(this.debounceTimer);
    
    this.elements.forEach(el => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.transition = '';
      delete el.dataset.appearInitialized;
      delete el.dataset.appeared;
      delete el.dataset.originalTransform;
      delete el.dataset.originalOpacity;
    });
    
    this.elements.clear();
  }
}

// Auto-Initialisierung
function initScrollAppear(options) {
  if (document.readyState === 'loading') {
    let instance = null;
    document.addEventListener('DOMContentLoaded', () => {
      instance = new ScrollAppear(options);
      window.scrollAppearInstance = instance;
    });
    return instance; // Wird null sein, aber später gesetzt
  } else {
    const instance = new ScrollAppear(options);
    window.scrollAppearInstance = instance;
    return instance;
  }
}

// Globale API sofort verfügbar machen
window.ScrollAppear = ScrollAppear;
window.initScrollAppear = initScrollAppear;

// Standard-Initialisierung
initScrollAppear();

// Helper für manuelle Container-Verarbeitung (mit Fallback)
window.processScrollAppear = (container) => {
  if (window.scrollAppearInstance) {
    window.scrollAppearInstance.processContainer(container);
  } else {
    // Fallback: Warte kurz und versuche es erneut
    setTimeout(() => {
      if (window.scrollAppearInstance) {
        window.scrollAppearInstance.processContainer(container);
      } else {
        // Notfall: Erstelle neue Instanz
        console.warn('ScrollAppear: Creating emergency instance');
        window.scrollAppearInstance = new ScrollAppear();
        window.scrollAppearInstance.processContainer(container);
      }
    }, 100);
  }
};