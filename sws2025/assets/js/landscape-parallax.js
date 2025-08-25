/**
 * WordPress Parallax Hover Effect
 * 
 * @description Lightweight parallax effect for image mapper components
 * @version 1.0.0
 * @requires GSAP 3.x
 * 
 * Features:
 * - Multi-layer parallax on mouse movement
 * - Depth perception between background and foreground elements
 * - Compatible with existing transform animations
 * - Configurable effect strength and behavior
 * - Performance optimized with requestAnimationFrame
 */
class ParallaxHoverEffect {
    constructor(options = {}) {
        // Configuration
        this.config = {
            // Selectors (matching image mapper)
            selectors: {
                container: '.image-mapper-container',
                preview: '.position-preview',
                background: '.parent_img',
                foreground: ['.person-image', '.illustration-image'],
                // Can add more layers here
            },
            
            // Parallax settings
            parallax: {
                // Movement strength in pixels
                backgroundStrength: 15,    // Background moves WITH mouse
                foregroundStrength: 25,     // Foreground moves AGAINST mouse
                middleStrength: 10,         // Middle layer strength
                
                // Rotation effect
                rotationStrength: 3,        // Max rotation in degrees
                
                // Smoothing
                smoothing: 0.12,            // Lower = smoother, higher = more responsive
                
                // Boundaries
                maxMovement: 50,            // Maximum movement in pixels
                boundaryPadding: 0.1,       // 10% padding from edges
                
                // Performance
                useRAF: true,               // Use requestAnimationFrame
                throttleMs: 0,              // Additional throttling (0 = disabled)
            },
            
            // Behavior
            behavior: {
                enabled: true,
                pauseOnZoom: true,          // Disable during zoom animations
                mobileEnabled: false,       // Enable on touch devices
                resetOnLeave: true,         // Reset position when mouse leaves
                resetDuration: 0.6,         // Reset animation duration
                invertX: false,             // Invert X-axis movement
                invertY: false,             // Invert Y-axis movement
            },
            
            // CSS approach (for compatibility)
            cssMethod: 'transform',        // 'transform' or 'css-variables'
            transformProperty: 'translate', // Use translate instead of x/y to avoid conflicts
            
            // Debug
            debug: false,
            
            ...options
        };
        
        // State
        this.state = {
            initialized: false,
            enabled: true,
            isHovering: false,
            isPaused: false,
            
            // Mouse tracking
            mouse: { x: 0, y: 0 },
            normalized: { x: 0, y: 0 },
            smoothed: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            
            // Container info
            container: null,
            containerRect: null,
            
            // Elements cache
            elements: {
                background: [],
                foreground: [],
                middle: []
            },
            
            // Animation
            rafId: null,
            lastTime: 0,
            isAnimating: false
        };
        
        // Bind methods
        this.boundHandlers = {
            mouseMove: this.handleMouseMove.bind(this),
            mouseEnter: this.handleMouseEnter.bind(this),
            mouseLeave: this.handleMouseLeave.bind(this),
            resize: this.debounce(this.handleResize.bind(this), 250),
            update: this.update.bind(this)
        };
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize parallax effect
     */
    init() {
        // Wait for GSAP
        if (typeof gsap === 'undefined') {
            this.debug('Waiting for GSAP...');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        // Find container
        this.state.container = document.querySelector(this.config.selectors.container);
        if (!this.state.container) {
            this.debug('Container not found');
            return;
        }
        
        // Cache elements
        this.cacheElements();
        
        // Setup
        this.setupElements();
        this.attachListeners();
        this.updateContainerRect();
        
        // Start animation loop
        if (this.config.parallax.useRAF) {
            this.startAnimationLoop();
        }
        
        this.state.initialized = true;
        this.debug('Parallax effect initialized');
    }
    
    /**
     * Cache all parallax elements
     */
    cacheElements() {
        const container = this.state.container;
        
        // Background elements
        const bgSelector = this.config.selectors.background;
        if (bgSelector) {
            this.state.elements.background = container.querySelectorAll(bgSelector);
        }
        
        // Foreground elements
        const fgSelectors = this.config.selectors.foreground;
        if (Array.isArray(fgSelectors)) {
            fgSelectors.forEach(selector => {
                const elements = container.querySelectorAll(selector);
                this.state.elements.foreground.push(...elements);
            });
        } else if (fgSelectors) {
            this.state.elements.foreground = container.querySelectorAll(fgSelectors);
        }
        
        this.debug(`Cached ${this.state.elements.background.length} background, ${this.state.elements.foreground.length} foreground elements`);
    }
    
    /**
     * Setup initial element states
     */
    setupElements() {
        // Store original transforms
        [...this.state.elements.background, ...this.state.elements.foreground].forEach(el => {
            // Store current transform if exists
            const currentTransform = el.style.transform || '';
            el.dataset.originalTransform = currentTransform;
            
            // Initialize parallax transform
            if (this.config.cssMethod === 'css-variables') {
                el.style.setProperty('--parallax-x', '0px');
                el.style.setProperty('--parallax-y', '0px');
                el.style.setProperty('--parallax-rotate', '0deg');
            }
        });
    }
    
    /**
     * Attach event listeners
     */
    attachListeners() {
        const container = this.state.container;
        
        // Mouse events
        container.addEventListener('mousemove', this.boundHandlers.mouseMove, { passive: true });
        container.addEventListener('mouseenter', this.boundHandlers.mouseEnter, { passive: true });
        container.addEventListener('mouseleave', this.boundHandlers.mouseLeave, { passive: true });
        
        // Window events
        window.addEventListener('resize', this.boundHandlers.resize, { passive: true });
        
        // Listen for zoom events from image mapper
        document.addEventListener('imagemapper:zoomstart', () => this.pause());
        document.addEventListener('imagemapper:zoomend', () => this.resume());
    }
    
    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (!this.state.enabled || this.state.isPaused) return;
        
        // Update mouse position
        this.state.mouse.x = e.clientX;
        this.state.mouse.y = e.clientY;
        
        // Calculate normalized position (-1 to 1)
        const rect = this.state.containerRect;
        this.state.normalized.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        this.state.normalized.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        
        // Apply inversion if configured
        if (this.config.behavior.invertX) this.state.normalized.x *= -1;
        if (this.config.behavior.invertY) this.state.normalized.y *= -1;
        
        // Apply boundary padding
        const padding = this.config.parallax.boundaryPadding;
        this.state.normalized.x = Math.max(-1 + padding, Math.min(1 - padding, this.state.normalized.x));
        this.state.normalized.y = Math.max(-1 + padding, Math.min(1 - padding, this.state.normalized.y));
        
        // Update debug
        this.updateDebug();
        
        // If not using RAF, update immediately
        if (!this.config.parallax.useRAF) {
            this.updateParallax();
        }
    }
    
    /**
     * Handle mouse enter
     */
    handleMouseEnter(e) {
        this.state.isHovering = true;
        this.state.container.style.willChange = 'transform';
        
        // Initialize mouse position
        this.handleMouseMove(e);
        
        // Animate in
        this.animateIn();
    }
    
    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        this.state.isHovering = false;
        this.state.container.style.willChange = '';
        
        if (this.config.behavior.resetOnLeave) {
            this.reset();
        }
    }
    
    /**
     * Update parallax positions
     */
    updateParallax() {
        const { normalized, smoothed } = this.state;
        const { parallax } = this.config;
        
        // Calculate movement
        const bgMoveX = normalized.x * parallax.backgroundStrength;
        const bgMoveY = normalized.y * parallax.backgroundStrength * 0.5; // Less Y movement
        
        const fgMoveX = -normalized.x * parallax.foregroundStrength; // Opposite direction
        const fgMoveY = -normalized.y * parallax.foregroundStrength * 0.5;
        
        const rotation = normalized.x * parallax.rotationStrength;
        
        // Apply to elements
        this.applyTransform(this.state.elements.background, bgMoveX, bgMoveY, rotation * 0.3);
        this.applyTransform(this.state.elements.foreground, fgMoveX, fgMoveY, -rotation * 0.5);
    }
    
    /**
     * Apply transform to elements
     */
    applyTransform(elements, x, y, rotate = 0) {
        elements.forEach(el => {
            if (!el) return;
            
            if (this.config.cssMethod === 'css-variables') {
                // Use CSS variables (safer for compatibility)
                el.style.setProperty('--parallax-x', `${x}px`);
                el.style.setProperty('--parallax-y', `${y}px`);
                el.style.setProperty('--parallax-rotate', `${rotate}deg`);
                
                // Apply via transform
                const original = el.dataset.originalTransform || '';
                el.style.transform = `${original} translate(var(--parallax-x), var(--parallax-y)) rotate(var(--parallax-rotate))`;
                
            } else {
                // Direct transform (be careful with existing transforms)
                const original = el.dataset.originalTransform || '';
                
                // Use translate3d for hardware acceleration
                const parallaxTransform = `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)`;
                
                // Combine with original transform
                if (original && !original.includes('translate3d')) {
                    el.style.transform = `${original} ${parallaxTransform}`;
                } else {
                    el.style.transform = parallaxTransform;
                }
            }
        });
    }
    
    /**
     * Smooth animation loop
     */
    update(timestamp) {
        if (!this.state.isHovering || this.state.isPaused) {
            this.state.rafId = requestAnimationFrame(this.boundHandlers.update);
            return;
        }
        
        const deltaTime = timestamp - this.state.lastTime;
        this.state.lastTime = timestamp;
        
        // Smooth the values
        const smoothing = this.config.parallax.smoothing;
        this.state.smoothed.x += (this.state.normalized.x - this.state.smoothed.x) * smoothing;
        this.state.smoothed.y += (this.state.normalized.y - this.state.smoothed.y) * smoothing;
        
        // Calculate velocity (for advanced effects)
        this.state.velocity.x = this.state.normalized.x - this.state.smoothed.x;
        this.state.velocity.y = this.state.normalized.y - this.state.smoothed.y;
        
        // Update parallax with smoothed values
        this.updateParallaxSmooth();
        
        // Continue loop
        this.state.rafId = requestAnimationFrame(this.boundHandlers.update);
    }
    
    /**
     * Update parallax with smoothed values
     */
    updateParallaxSmooth() {
        const { smoothed } = this.state;
        const { parallax } = this.config;
        
        // Calculate smooth movement
        const bgMoveX = smoothed.x * parallax.backgroundStrength;
        const bgMoveY = smoothed.y * parallax.backgroundStrength * 0.5;
        
        const fgMoveX = -smoothed.x * parallax.foregroundStrength;
        const fgMoveY = -smoothed.y * parallax.foregroundStrength * 0.5;
        
        const rotation = smoothed.x * parallax.rotationStrength;
        
        // Apply transforms
        this.applyTransform(this.state.elements.background, bgMoveX, bgMoveY, rotation * 0.3);
        this.applyTransform(this.state.elements.foreground, fgMoveX, fgMoveY, -rotation * 0.5);
    }
    
    /**
     * Start animation loop
     */
    startAnimationLoop() {
        if (this.state.isAnimating) return;
        this.state.isAnimating = true;
        this.state.rafId = requestAnimationFrame(this.boundHandlers.update);
    }
    
    /**
     * Stop animation loop
     */
    stopAnimationLoop() {
        if (this.state.rafId) {
            cancelAnimationFrame(this.state.rafId);
            this.state.rafId = null;
        }
        this.state.isAnimating = false;
    }
    
    /**
     * Animate elements in
     */
    animateIn() {
        // Could add entrance animation here
    }
    
    /**
     * Reset positions
     */
    reset() {
        const duration = this.config.behavior.resetDuration;
        
        // Reset state
        this.state.normalized.x = 0;
        this.state.normalized.y = 0;
        this.state.smoothed.x = 0;
        this.state.smoothed.y = 0;
        
        // Animate back to center
        const allElements = [...this.state.elements.background, ...this.state.elements.foreground];
        
        allElements.forEach(el => {
            if (!el) return;
            
            gsap.to(el, {
                '--parallax-x': '0px',
                '--parallax-y': '0px',
                '--parallax-rotate': '0deg',
                duration: duration,
                ease: 'power2.out',
                onComplete: () => {
                    // Reset transform to original
                    const original = el.dataset.originalTransform || '';
                    el.style.transform = original;
                }
            });
        });
    }
    
    /**
     * Pause effect
     */
    pause() {
        this.state.isPaused = true;
        this.reset();
        this.debug('Parallax paused');
    }
    
    /**
     * Resume effect
     */
    resume() {
        this.state.isPaused = false;
        this.debug('Parallax resumed');
    }
    
    /**
     * Update container rect
     */
    updateContainerRect() {
        this.state.containerRect = this.state.container.getBoundingClientRect();
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        this.updateContainerRect();
    }
    
    /**
     * Update config dynamically
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.debug('Config updated', this.config);
    }
    
    /**
     * Update debug info
     */
    updateDebug() {
        if (!this.config.debug) return;
        
        // Update debug display if exists
        const mouseX = document.getElementById('mouseX');
        const mouseY = document.getElementById('mouseY');
        const normX = document.getElementById('normX');
        const normY = document.getElementById('normY');
        
        if (mouseX) mouseX.textContent = Math.round(this.state.mouse.x);
        if (mouseY) mouseY.textContent = Math.round(this.state.mouse.y);
        if (normX) normX.textContent = this.state.normalized.x.toFixed(2);
        if (normY) normY.textContent = this.state.normalized.y.toFixed(2);
    }
    
    /**
     * Utility: Debounce
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    /**
     * Debug logging
     */
    debug(message, data) {
        if (!this.config.debug) return;
        console.log(`[ParallaxHover] ${message}`, data || '');
    }
    
    /**
     * Destroy instance
     */
    destroy() {
        // Stop animations
        this.stopAnimationLoop();
        
        // Remove listeners
        if (this.state.container) {
            this.state.container.removeEventListener('mousemove', this.boundHandlers.mouseMove);
            this.state.container.removeEventListener('mouseenter', this.boundHandlers.mouseEnter);
            this.state.container.removeEventListener('mouseleave', this.boundHandlers.mouseLeave);
        }
        
        window.removeEventListener('resize', this.boundHandlers.resize);
        
        // Reset elements
        const allElements = [...this.state.elements.background, ...this.state.elements.foreground];
        allElements.forEach(el => {
            if (!el) return;
            const original = el.dataset.originalTransform || '';
            el.style.transform = original;
            delete el.dataset.originalTransform;
        });
        
        this.debug('Parallax destroyed');
    }
}

// Demo initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize parallax effect
    // const parallax = new ParallaxHoverEffect({
    //     parallax: {
    //         backgroundStrength: 15,
    //         foregroundStrength: 25,
    //         rotationStrength: 3,
    //         smoothing: 0.12
    //     },
    //     cssMethod: 'css-variables', // Safer for compatibility
    //     debug: true
    // });
    
    // Expose for testing
    window.parallaxEffect = parallax;
});