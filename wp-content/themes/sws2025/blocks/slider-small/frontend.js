// Slider Animation Control - Refactored
class SliderController {
    constructor(container) {
        this.container = container;
        this.sliderContainer = container.querySelector('.sliderContainer');
        this.slides = container.querySelectorAll('.slidePane');
        this.navigation = container.querySelectorAll('.sliderNavigation a');
        this.progressBar = container.querySelector('.progressBar');
        this.slideWrap = container.querySelector('.slideWrap');
        
        // Parse config
        const timeoutValue = container.dataset.timeout;
        this.durationValue = container.dataset.duration;
        this.itemCount = container.dataset.itemCount;
        this.hasAutoplay = timeoutValue && timeoutValue !== 'none';
        this.timeout = this.hasAutoplay ? parseInt(timeoutValue) : null;
        this.resumeAwait = timeoutValue;

        console.log('Slider Config:', this.itemCount, this.hasAutoplay, this.timeout, this.durationValue);

        this.containerWidth = this.container.offsetWidth;
        console.log("container width:", this.containerWidth);
        this.slideWidth = this.slides[0] ? this.slides[0].offsetWidth : 0;
        console.log("slide width:", this.slideWidth);
        this.slideGap = this.slideWrap ? parseInt(window.getComputedStyle(this.slideWrap).gap) : 0;
        console.log("slidewrap gap:", this.slideGap);
        this.slideWidthWithGap = this.slideWidth + this.slideGap;
        this.totalWidth = (this.slideWidthWithGap * this.itemCount) - this.slideGap; // No gap after last item
        console.log("total width:", this.totalWidth);
        // CSS Variable auslesen
        // const contentSize = getComputedStyle(document.documentElement).getPropertyValue('--wp--style--global--content-size').trim();
        // console.log("contentSize:", contentSize);

        // const wideSize = getComputedStyle(document.documentElement).getPropertyValue('--wp--style--global--wide-size').trim();
        // console.log("wideSize:", wideSize);

        const padding = getComputedStyle(this.container).getPropertyValue('padding').trim();
        console.log("padding:", padding);

        // State
        this.state = {
            currentSlide: 0,
            isPlaying: this.hasAutoplay,
            interval: null,
            wasManuallyPaused: false,
            resumeTimeout: null,
        };
        
        // Init
        this.init();
    }
    
    init() {
        // Set first slide active
        if (this.slides[0]) {
            this.slides[0].classList.add('open');
        }
        if (this.navigation[0]) {
            this.navigation[0].classList.add('current');
        }
        
        // Setup CSS for progress animation
        if (this.hasAutoplay) {
            this.container.style.setProperty('--slide-timeout', `${this.timeout}ms`);
            this.container.style.setProperty('--slide-duration', `${this.durationValue}ms`);
            this.startAutoplay();
        }
        
        // Bind events
        this.bindEvents();

        
    }
    
    bindEvents() {
        // Navigation clicks
        this.navigation.forEach((navItem, index) => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToSlide(index);
            });
        });
        
        // Arrow navigation
        const leftArrow = this.container.querySelector('.sliderArrow.left');
        const rightArrow = this.container.querySelector('.sliderArrow.right');
        
        if (leftArrow) {
            leftArrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.prevSlide();
            });
        }
        
        if (rightArrow) {
            rightArrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.nextSlide();
            });
        }
        
        // Resume autoplay on mouseleave
        this.sliderContainer.addEventListener('mouseleave', (e) => {
            if (!this.sliderContainer.contains(e.relatedTarget)) {
                this.state.resumeTimeout = setTimeout(() => {
                    this.resumeAutoplay();
                }, this.resumeAwait);
                
            }
        });
    }
    
    goToSlide(index) {
        // Stop autoplay on manual interaction
        this.pauseAutoplay(true);
        
        // Update slide
        this.showSlide(index);
    }
    
    nextSlide() {
        const next = (this.state.currentSlide + 1) % this.slides.length;
        this.goToSlide(next);
    }
    
    prevSlide() {
        const prev = this.state.currentSlide === 0 
            ? this.slides.length - 1 
            : this.state.currentSlide - 1;
        this.goToSlide(prev);
    }
    
    showSlide(index) {
        if (!this.slides[index]) return;
        
        // Get current height for smooth transition
        const currentHeight = this.slideWrap.offsetHeight;
        
        // Update slides
        this.slides.forEach((slide, i) => {
            slide.classList.toggle('open', i === index);
        });
        
        // Update navigation
        this.navigation.forEach((nav, i) => {
            nav.classList.toggle('current', i === index);
        });
        
        // Animate height
        const newHeight = this.slides[index].scrollHeight;
        if (currentHeight !== newHeight) {
            this.slideWrap.style.height = `${currentHeight}px`;
            this.slideWrap.offsetHeight; // Force reflow
            this.slideWrap.style.height = `${newHeight}px`;
        }
        
        // Update state
        this.state.currentSlide = index;
        
        // Reset progress bar animation
        if (this.state.isPlaying) {
            this.resetProgressAnimation();
        }
    }
    
    startAutoplay() {
        if (!this.hasAutoplay || !this.timeout) return;
        
        // Clear any existing interval
        this.stopInterval();
        
        // Start new interval
        this.state.interval = setInterval(() => {
            if (this.state.isPlaying) {
                const next = (this.state.currentSlide + 1) % this.slides.length;
                this.showSlide(next);
                this.resetProgressAnimation();
            }
        }, this.timeout);
        
        // Start progress animation
        this.resetProgressAnimation();
        this.state.isPlaying = true;
    }
    
    pauseAutoplay(manual = false) {
        if (!this.hasAutoplay) return;
        
        this.stopInterval();
        this.state.isPlaying = false;
        
        if (manual) {
            this.state.wasManuallyPaused = true;
        }
        
        // Stop progress animation
        this.stopProgressAnimation();
    }
    
    resumeAutoplay() {
        if (!this.hasAutoplay || !this.state.wasManuallyPaused) return;
        
        this.state.wasManuallyPaused = false;
        this.startAutoplay();
    }
    
    stopInterval() {
        if (this.state.interval) {
            clearInterval(this.state.interval);
            this.state.interval = null;
        }
        if (this.state.resumeTimeout) {
            clearInterval(this.state.resumeTimeout);
            this.state.resumeTimeout = null;
        }
    }
    
    resetProgressAnimation() {
        if (!this.progressBar) return;
        
        // Remove animation completely
        this.progressBar.classList.remove('active');
        this.progressBar.style.animation = 'none';
        this.progressBar.style.strokeDashoffset = '164';
        
        // Force reflow to ensure reset is applied
        void this.progressBar.offsetHeight;
        
        // Re-apply animation
        this.progressBar.style.animation = '';
        this.progressBar.classList.add('active');
    }
    
    stopProgressAnimation() {
        if (!this.progressBar) return;
        
        this.progressBar.classList.remove('active');
        this.progressBar.style.animation = 'none';
        this.progressBar.style.strokeDashoffset = '164';
    }
    
    destroy() {
        this.stopInterval();
        this.stopProgressAnimation();
    }
}

// Debug utilities (optional)
const SliderDebug = {
    active: new URLSearchParams(window.location.search).has('debug'),
    instances: new Map(),
    
    log(...args) {
        if (this.active) {
            console.log('[SLIDER]', ...args);
        }
    },
    
    enable() {
        this.active = true;
        console.log('🔧 Slider Debug aktiviert');
    },
    
    disable() {
        this.active = false;
        console.log('🔧 Slider Debug deaktiviert');
    },
    
    stopAll() {
        this.instances.forEach(instance => instance.destroy());
        console.log('⏹️ Alle Slider gestoppt');
    },
    
    status() {
        this.instances.forEach((instance, container) => {
            console.log('Slider:', {
                element: container,
                slides: instance.slides.length,
                currentSlide: instance.state.currentSlide,
                isPlaying: instance.state.isPlaying,
                hasAutoplay: instance.hasAutoplay
            });
        });
    }
};

// Initialize sliders - works for both initial load and dynamic content
function initSliders() {
    const sliders = document.querySelectorAll('.wp-block-sws2025-slider-small');
    
    sliders.forEach(container => {
        // Skip if already initialized
        if (container._sliderInitialized) return;
        
        const instance = new SliderController(container);
        container._sliderInitialized = true;
        
        // Store for debug access
        if (SliderDebug.active) {
            SliderDebug.instances.set(container, instance);
        }
    });
    
    // Expose debug utilities
    if (SliderDebug.active && !window.sliderDebug) {
        window.sliderDebug = SliderDebug;
        console.log('🎮 Debug Commands:');
        console.log('  sliderDebug.disable() - Debug ausschalten');
        console.log('  sliderDebug.enable() - Debug einschalten');
        console.log('  sliderDebug.stopAll() - Alle Slider stoppen');
        console.log('  sliderDebug.status() - Status aller Slider');
    }
}

// Initialize on DOM ready OR immediately if DOM already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSliders);
} else {
    initSliders();
}

// Also initialize when overlay content is loaded
document.addEventListener('wpOverlayContentReady', initSliders);