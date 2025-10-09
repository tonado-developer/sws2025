// Slider Animation Control - Refactored
class SliderController {
    constructor(container) {
        this.container = container;
        this.sliderContainer = this.container.querySelector('.sliderContainer');
        this.slides = this.container.querySelectorAll('.slidePane');
        this.navigation = this.container.querySelectorAll('.sliderNavigation a');
        this.progressBar = this.container.querySelector('.progressBar');
        this.slideWrap = this.container.querySelector('.slideWrap');

        // Parse config
        const timeoutValue = container.dataset.timeout;
        this.durationValue = container.dataset.duration;
        this.itemCount = container.dataset.itemCount;
        this.hasAutoplay = timeoutValue && timeoutValue !== 'none';
        this.timeout = this.hasAutoplay ? parseInt(timeoutValue) : null;
        this.resumeAwait = timeoutValue;
        this.itemPuffer = 1; // Extra items to load ahead

        console.log('Slider Config:', this.itemCount, this.hasAutoplay, this.timeout, this.durationValue);

        // Dimensions
        this.containerWidth = this.container.offsetWidth;
        console.log("container width:", this.containerWidth);

        // Single slide width
        this.slideWidth = this.slides[0] ? this.slides[0].offsetWidth : 0;
        console.log("slide width:", this.slideWidth);
        // Gap between slides
        this.slideGap = this.slideWrap ? parseInt(window.getComputedStyle(this.slideWrap).gap) : 0;
        console.log("slidewrap gap:", this.slideGap);

        // Width of one slide including gap
        this.slideWidthWithGap = this.slideWidth + this.slideGap;
        this.totalWidth = (this.slideWidthWithGap * this.itemCount) - this.slideGap; // No gap after last item
        console.log("total width:", this.totalWidth);

        // CSS Variable auslesen
        const contentSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--wp--style--global--content-size').trim());
        console.log("contentSize:", contentSize);

        // CSS Variable auslesen
        const wideSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--wp--style--global--wide-size').trim());
        console.log("wideSize:", wideSize);

        // Calculate padding for centering
        const padding = (wideSize - contentSize) / 2;
        console.log("padding:", padding);

        // Calculate max visible items
        this.maxVisibleItems = Math.floor((this.containerWidth - padding) / this.slideWidthWithGap);
        console.log("max visible items:", this.maxVisibleItems);

        // Calculate needed pre items for centering
        this.neededPreItems = Math.ceil(padding / this.slideWidthWithGap) + this.itemPuffer;
        console.log("needed pre items:", this.neededPreItems);

        this.preItemsCount = 0;
        this.postItemsCount = 0;

        // State
        this.state = {
            currentSlide: 0,
            currentTransform: 0,
            isPlaying: this.hasAutoplay,
            interval: null,
            wasManuallyPaused: false,
            resumeTimeout: null,
        };

        // Init
        this.init();
    }



    init() {

        this.initPreItems();
        console.log("pre items:", this.preItemsCount);

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

    initPreItems() {
        for (let i = 1; i <= this.neededPreItems; i++) {
            const clonedNode = this.slides[this.itemCount - i].cloneNode(true);
            // add transform to node
            this.state.currentTransform = this.slideWidthWithGap * (this.preItemsCount + 1) * -1;
            this.slideWrap.style.transform = `translateX(${this.state.currentTransform}px)`;
            this.slideWrap.prepend(clonedNode);
            this.preItemsCount++;
        }
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

    goToSlide() {
        this.allSlides = this.container.querySelectorAll('.slidePane');
        const index = this.state.currentTransform / this.slideWidthWithGap * -1;

        // Stop autoplay on manual interaction
        this.pauseAutoplay(true);
        this.slideWrap.style.transform = `translateX(${this.state.currentTransform}px)`;
        // Update slide
        this.showSlide(index);

        const slidesAheadNeeded = (this.state.currentSlide + 1) + this.maxVisibleItems + this.itemPuffer - this.allSlides.length;
        const slidesBeforeNeeded = this.state.currentTransform / this.slideWidthWithGap * -1 - this.neededPreItems < 0;

        if(slidesAheadNeeded) {
            for(let i = 0; i < slidesAheadNeeded; i++) {
                console.log("Needed",this.slides[this.postItemsCount / this.itemCount])
                const clonedNode = this.slides[Math.ceil(this.postItemsCount / this.itemCount)].cloneNode(true);
                // add transform to node
                this.slideWrap.append(clonedNode);
                this.postItemsCount++;
            }
        }

        if(slidesBeforeNeeded) {
            this.state.currentTransform -= this.slideWidthWithGap;
            this.slideWrap.style.transform = `translateX(${this.state.currentTransform}px)`;
            
            const clonedNode = this.slides[Math.ceil(this.preItemsCount / this.itemCount)].cloneNode(true);
            // add transform to node
            this.slideWrap.prepend(clonedNode);
            this.preItemsCount++;
        }
        
    }

    nextSlide() {
        this.state.currentTransform -= this.slideWidthWithGap;
        this.goToSlide();
    }

    prevSlide() {
        this.state.currentTransform += this.slideWidthWithGap;
        this.goToSlide();
        
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