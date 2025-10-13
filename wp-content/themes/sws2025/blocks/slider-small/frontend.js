// Infinite Slider Controller
class SliderController {
    constructor(container) {
        this.container = container;
        this.sliderContainer = this.container.querySelector('.sliderContainer');
        this.slideWrap = this.container.querySelector('.slideWrap');
        this.originalSlides = Array.from(this.container.querySelectorAll('.slidePane'));
        this.navigation = this.container.querySelectorAll('.sliderNavigation a');
        this.progressBar = this.container.querySelector('.progressBar');
        this.leftArrow = this.container.querySelector('.sliderArrow.left');
        this.rightArrow = this.container.querySelector('.sliderArrow.right');

        // Config
        const timeoutValue = container.dataset.timeout;
        this.durationValue = parseInt(container.dataset.duration) || 300;
        this.itemCount = parseInt(container.dataset.itemCount);
        this.hasAutoplay = timeoutValue && timeoutValue !== 'none';
        this.timeout = this.hasAutoplay ? parseInt(timeoutValue) : null;

        // Dimensions
        this.containerWidth = this.container.offsetWidth;
        this.slideWidth = this.originalSlides[0]?.offsetWidth || 0;
        this.slideGap = parseInt(window.getComputedStyle(this.slideWrap).gap) || 0;
        this.slideWidthWithGap = this.slideWidth + this.slideGap;

        // Calculate visible items
        const contentSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--wp--style--global--content-size').trim());
        const wideSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--wp--style--global--wide-size').trim());
        const padding = (wideSize - contentSize) / 2;
        this.visibleItems = Math.ceil((this.containerWidth - padding) / this.slideWidthWithGap);
        
        // Calculate offset for left padding (slides visible on the left)
        this.leftOffset = Math.ceil(padding / this.slideWidthWithGap);
        
        // Calculate clones needed (need enough for smooth infinite scroll)
        this.clonesNeeded = Math.max(this.visibleItems + this.leftOffset + 2, this.itemCount);

        // console.log('Slider Setup:', {
        //     containerWidth: this.containerWidth,
        //     slideWidth: this.slideWidth,
        //     slideGap: this.slideGap,
        //     visibleItems: this.visibleItems,
        //     leftOffset: this.leftOffset,
        //     clonesNeeded: this.clonesNeeded,
        //     totalSlides: this.itemCount
        // });

        // State
        this.currentIndex = 0;
        this.isAnimating = false;
        this.autoplayInterval = null;
        this.pauseTimeout = null;
        this.isPlaying = false;

        this.init();
    }

    init() {
        // Validate slides exist
        if (!this.originalSlides.length) {
            console.error('No slides found');
            return;
        }

        // Clone slides for infinite scroll
        this.setupInfiniteScroll();
        
        // Set initial position (offset left so clones are visible)
        this.currentIndex = this.clonesNeeded - this.leftOffset;
        this.updatePosition(false);

        // Set first slide active
        this.updateActiveStates();

        // Setup CSS
        if (this.hasAutoplay) {
            this.container.style.setProperty('--slide-timeout', `${this.timeout}ms`);
            this.container.style.setProperty('--slide-duration', `${this.durationValue}ms`);
        }

        // Bind events
        this.bindEvents();

        // Start autoplay
        if (this.hasAutoplay) {
            this.startAutoplay();
        }
    }

    setupInfiniteScroll() {
        // Validate original slides
        if (!this.originalSlides || this.originalSlides.length === 0) {
            console.error('No original slides found');
            return;
        }

        // Clone slides at the end
        for (let i = 0; i < this.clonesNeeded; i++) {
            const sourceIndex = i % this.itemCount;
            const sourceSlide = this.originalSlides[sourceIndex];
            
            if (!sourceSlide) {
                console.error(`Source slide at index ${sourceIndex} not found`);
                continue;
            }
            
            const clone = sourceSlide.cloneNode(true);
            clone.classList.add('clone');
            clone.classList.remove('open');
            this.slideWrap.appendChild(clone);
        }

        // Clone slides at the beginning
        for (let i = 0; i < this.clonesNeeded; i++) {
            const sourceIndex = (this.itemCount - 1 - i + this.itemCount) % this.itemCount;
            const sourceSlide = this.originalSlides[sourceIndex];
            
            if (!sourceSlide) {
                console.error(`Source slide at index ${sourceIndex} not found`);
                continue;
            }
            
            const clone = sourceSlide.cloneNode(true);
            clone.classList.add('clone');
            clone.classList.remove('open');
            this.slideWrap.insertBefore(clone, this.slideWrap.firstChild);
        }

        // Update slides array
        this.allSlides = Array.from(this.slideWrap.querySelectorAll('.slidePane'));
    }

    updatePosition(animate = true) {
        const offset = -this.currentIndex * this.slideWidthWithGap;
        
        if (animate) {
            this.slideWrap.style.transition = `transform ${this.durationValue}ms ease-in-out`;
        } else {
            this.slideWrap.style.transition = 'none';
        }
        
        this.slideWrap.style.transform = `translateX(${offset}px)`;
    }

    updateActiveStates() {
        const realIndex = this.getRealIndex();
        
        // Update slides
        this.allSlides.forEach((slide, i) => {
            slide.classList.toggle('open', i === this.currentIndex);
        });

        // Update navigation
        this.navigation.forEach((nav, i) => {
            nav.classList.toggle('current', i === realIndex);
        });
    }

    getRealIndex() {
        let index = (this.currentIndex - (this.clonesNeeded - this.leftOffset)) % this.itemCount;
        if (index < 0) index += this.itemCount;
        return index;
    }

    bindEvents() {
        // Navigation clicks
        this.navigation.forEach((navItem, index) => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToSlide(index);
            });
        });

        // Arrow clicks
        if (this.leftArrow) {
            this.leftArrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.prevSlide();
            });
        }

        if (this.rightArrow) {
            this.rightArrow.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.nextSlide();
            });
        }

        // Handle transition end for infinite scroll reset
        this.slideWrap.addEventListener('transitionend', (e) => {
            if (e.propertyName === 'transform') {
                this.handleInfiniteReset();
            }
        });

        // Resume autoplay on mouseleave
        this.sliderContainer.addEventListener('mouseleave', (e) => {
            if (!this.sliderContainer.contains(e.relatedTarget)) {
                if (this.pauseTimeout) {
                    clearTimeout(this.pauseTimeout);
                }
                this.pauseTimeout = setTimeout(() => {
                    this.resumeAutoplay();
                }, 2000);
            }
        });
    }

    handleInfiniteReset() {
        // Reset to real slide if we're on a clone
        const minIndex = this.leftOffset;
        const maxIndex = this.clonesNeeded + this.itemCount - this.leftOffset;
        
        if (this.currentIndex < minIndex) {
            // We're at the beginning clones, jump to end originals
            this.currentIndex = this.currentIndex + this.itemCount;
            this.updatePosition(false);
        } else if (this.currentIndex >= maxIndex) {
            // We're at the end clones, jump to beginning originals
            this.currentIndex = this.currentIndex - this.itemCount;
            this.updatePosition(false);
        }
        this.isAnimating = false;
    }

    nextSlide() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        this.pauseAutoplay(true);
        this.currentIndex++;
        this.updatePosition(true);
        this.updateActiveStates();
        this.resetProgressAnimation();
    }

    prevSlide() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        this.pauseAutoplay(true);
        this.currentIndex--;
        this.updatePosition(true);
        this.updateActiveStates();
        this.resetProgressAnimation();
    }

    goToSlide(realIndex) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        this.pauseAutoplay(true);
        this.currentIndex = (this.clonesNeeded - this.leftOffset) + realIndex;
        this.updatePosition(true);
        this.updateActiveStates();
        this.resetProgressAnimation();
    }

    startAutoplay() {
        if (!this.hasAutoplay || this.isPlaying) return;

        this.stopAutoplay();
        
        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.timeout);

        this.isPlaying = true;
        this.resetProgressAnimation();
    }

    pauseAutoplay(manual = false) {
        if (!this.hasAutoplay) return;

        this.stopAutoplay();
        this.stopProgressAnimation();

        if (manual) {
            if (this.pauseTimeout) {
                clearTimeout(this.pauseTimeout);
            }
            this.pauseTimeout = setTimeout(() => {
                this.resumeAutoplay();
            }, 2000);
        }
    }

    resumeAutoplay() {
        if (!this.hasAutoplay) return;
        this.startAutoplay();
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
        this.isPlaying = false;
    }

    resetProgressAnimation() {
        if (!this.progressBar || !this.isPlaying) return;

        this.progressBar.classList.remove('active');
        this.progressBar.style.animation = 'none';
        void this.progressBar.offsetHeight;
        this.progressBar.style.animation = '';
        this.progressBar.classList.add('active');
    }

    stopProgressAnimation() {
        if (!this.progressBar) return;
        this.progressBar.classList.remove('active');
        this.progressBar.style.animation = 'none';
    }

    destroy() {
        this.stopAutoplay();
        this.stopProgressAnimation();
        if (this.pauseTimeout) {
            clearTimeout(this.pauseTimeout);
        }
    }
}

// Initialize
function initSliders() {
    const sliders = document.querySelectorAll('.wp-block-sws2025-slider-small');
    
    sliders.forEach(container => {
        if (container._sliderInitialized) return;
        new SliderController(container);
        container._sliderInitialized = true;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSliders);
} else {
    initSliders();
}

document.addEventListener('wpOverlayContentReady', initSliders);