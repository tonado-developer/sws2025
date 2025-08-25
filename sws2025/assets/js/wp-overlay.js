/**
 * WordPress Content Overlay System
 * @description Dynamic overlay system for loading WordPress content with GSAP animations
 * @version 1.0.0
 */
class WPOverlay {
    constructor(options = {}) {
        this.config = {
            // API Settings
            apiBase: '/wp-json/wp/v2',
            ajaxUrl: typeof wp !== 'undefined' ? wp.ajax_url : '/wp-admin/admin-ajax.php',
            
            // Animation
            animation: {
                openDuration: 0.6,
                closeDuration: 0.5,
                ease: 'power3.inOut',
                scaleOrigin: 20, // Origin point size
                background: "#FF6920",
                width: "1200"
            },
            
            // Classes
            classes: {
                container: 'wp-overlay-container',
                backdrop: 'wp-overlay-backdrop',
                wrap: 'wp-overlay-content-wrap',
                content: 'wp-overlay-content',
                body: 'wp-overlay-body',
                close: 'wp-overlay-close',
                loading: 'wp-overlay-loading',
                error: 'wp-overlay-error',
                active: 'active',
                bodyLock: 'wp-overlay-open',
                origin: 'wp-overlay-origin',
            },
            
            // Debug
            debug: false,
            
            ...options
        };
        
        this.state = {
            isOpen: false,
            isAnimating: false,
            currentContent: null,
            currentTarget: null,
            originPoint: { x: 0, y: 0 },
            originElement: null,
            container: null,
            timeline: null,
            originalUrl: null,
            originalTitle: null,
        };
        
        this.init();
    }
    
    init() {
        this.createContainer();
        if (document.querySelector(`a[onclick^="Overlay.open"]`)) {
            this.setupGlobalAPI();
            this.bindEvents();
            this.debug('WPOverlay initialized ' + this.state.container);
        }
    }
    
    /**
     * Create overlay container structure
     */
    createContainer() {
        // Check if container already exists
        if (document.querySelector(`.${this.config.classes.container}`)) {
            this.state.container = document.querySelector(`.${this.config.classes.container}`);
            return;
        }
        
        const container = document.createElement('div');
        container.className = this.config.classes.container;
        container.innerHTML = `
            <div class="${this.config.classes.backdrop}"></div>
            <div class="${this.config.classes.wrap}">
                <button class="${this.config.classes.close}" aria-label="Close">Zur Übersicht</button>
                <div class="${this.config.classes.content}">
                    <div class="${this.config.classes.body}">
                        <div class="${this.config.classes.loading}">
                            <div class="wp-overlay-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="${this.config.classes.origin}"></div>
        `;
        
        document.body.appendChild(container);
        this.state.container = container;
        
        // Cache elements
        this.elements = {
            container,
            wrap: container.querySelector(`.${this.config.classes.wrap}`),
            backdrop: container.querySelector(`.${this.config.classes.backdrop}`),
            content: container.querySelector(`.${this.config.classes.content}`),
            body: container.querySelector(`.${this.config.classes.body}`),
            title: container.querySelector('.wp-overlay-title'),
            close: container.querySelector(`.${this.config.classes.close}`),
            origin: container.querySelector(`.${this.config.classes.origin}`),
        };
        
        // Set initial state
        gsap.set(this.elements.content, {
            opacity: 0,
            scale: 0,
            visibility: 'hidden'
        });
    }
    
    /**
     * Setup global API for inline onclick usage
     */
    setupGlobalAPI() {
        // Create global Overlay object
        window.Overlay = {
            open: (target, event) => this.open(target, event, false),
            close: () => this.close(false),
            instance: this
        };
        
        // Also support data attributes
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-overlay]');
            if (trigger) {
                e.preventDefault();
                const target = trigger.dataset.overlay || trigger.href;
                this.open(target, e, false);
            }
        });
    }
    
    /**
     * Bind internal events
     */
    bindEvents() {
        // Close button
        this.elements.close.addEventListener('click', () => this.close());
        
        // wrap click (only when clicking the wrap itself, not children)
        this.elements.wrap.addEventListener('click', (e) => {
            if (e.target === this.elements.wrap) {
                this.close();
            }
        });

        // Backdrop click
        this.elements.backdrop.addEventListener('click', () => this.close());
        
        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.state.isOpen) {
                this.close();
            }
        });
        
        // Browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.wpOverlay) {
                // Open overlay from history
                this.open(e.state.target, null, true);
            } else if (this.state.isOpen) {
                this.debug('prevent and go back');
                // Close overlay when going back
                this.close(true);
            }
        });
    }
    
    /**
     * Open overlay with content
     * @param {string|number} target - Page ID, slug, or URL
     * @param {Event} event - Click event for origin point
     * @param {boolean} skipHistory - Skip history push (for popstate)
     */
    async open(target, event, skipHistory = false) {
        if (this.state.isAnimating || this.state.isOpen) return;
        
        this.state.isAnimating = true;
        this.state.currentTarget = target;
        
        // Store origin point
        if (event) {
            this.state.originPoint = {
                x: event.clientX || event.pageX,
                y: (event.clientY || event.pageY) - 160
            };
            this.state.originElement = event.target;
        } else {
            // Default to center
            this.state.originPoint = {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            };
        }
        
        // Show origin marker
        gsap.set(this.elements.origin, {
            x: this.state.originPoint.x,
            y: this.state.originPoint.y,
            opacity: 1
        });
        
        // Lock body scroll
        document.body.classList.add(this.config.classes.bodyLock);
        
        // Show container
        this.state.container.classList.add(this.config.classes.active);
        
        // Show loading state
        this.showLoading();
        
        // Calculate target dimensions
        const targetBounds = this.calculateBounds();
        
        // Animate open
        this.animateOpen(targetBounds);
        
        // Load content
        try {
            const content = await this.loadContent(target);
            this.setContent(content);
            
            // Update browser history
            if (!skipHistory) {
                this.pushHistory(content);
            }
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    /**
     * Calculate overlay bounds
     */
    calculateBounds() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        const width = Math.min(vw * 0.9, this.config.animation.width);
        const height = "auto";
        
        return {
            width,
            height,
            x: (vw - width) / 2,
            y: 0
        };
    }
    
    /**
     * Animate overlay opening
     */
    animateOpen(bounds) {
        // Kill existing timeline
        if (this.state.timeline) {
            this.state.timeline.kill();
        }
        
        // Set initial position at click point
        gsap.set(this.elements.content, {
            width: this.config.animation.scaleOrigin,
            height: this.config.animation.scaleOrigin,
            x: this.state.originPoint.x - this.config.animation.scaleOrigin / 2,
            y: this.state.originPoint.y - this.config.animation.scaleOrigin / 2,
            opacity: 1,
            scale: 1,
            visibility: 'visible'
        });
        
        // Create timeline
        const tl = gsap.timeline({
            onComplete: () => {
                this.state.isAnimating = false;
                this.state.isOpen = true;
            }
        });
        
        // Animate backdrop
        tl.to(this.elements.backdrop, {
            opacity: 1,
            duration: this.config.animation.openDuration * 0.6,
            ease: 'power2.out'
        }, 0);

        // Animate close
        tl.to(this.elements.close, {
            opacity: 1,
            duration: this.config.animation.openDuration * 0.6,
            ease: 'power2.out'
        }, 0);
        
        // Animate content expansion
        tl.to(this.elements.content, {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            duration: this.config.animation.openDuration,
            ease: this.config.animation.ease,
            background: "white"
        }, 0);
        
        // Hide origin marker
        tl.to(this.elements.origin, {
            opacity: 0,
            scale: 2,
            duration: this.config.animation.openDuration * 0.5
        }, 0.1);
        
        this.state.timeline = tl;
    }
    
    /**
     * Close overlay
     * @param {boolean} skipHistory - Skip history update (for popstate)
     */
    close(skipHistory = false) {
        if (this.state.isAnimating || !this.state.isOpen) return;
        
        this.state.isAnimating = true;
        
        // Kill existing timeline
        if (this.state.timeline) {
            this.state.timeline.kill();
        }
        
        // Show origin marker for animation
        gsap.set(this.elements.origin, {
            opacity: 1,
            scale: 1
        });
        
        // Create timeline
        const tl = gsap.timeline({
            onComplete: () => {
                this.state.isAnimating = false;
                this.state.isOpen = false;
                this.state.container.classList.remove(this.config.classes.active);
                document.body.classList.remove(this.config.classes.bodyLock);
                this.resetContent();
                
                // Hide origin marker after animation complete
                gsap.set(this.elements.origin, {
                    opacity: 0
                });
                
                // Restore original URL if not from popstate
                if (!skipHistory && this.state.originalUrl) {
                    history.pushState(null, '', this.state.originalUrl);
                    this.state.originalUrl = null;
                }
            }
        });
        
        // Animate content back to origin
        tl.to(this.elements.content, {
            width: this.config.animation.scaleOrigin,
            height: this.config.animation.scaleOrigin,
            x: this.state.originPoint.x - this.config.animation.scaleOrigin / 2,
            y: this.state.originPoint.y - this.config.animation.scaleOrigin / 2,
            duration: this.config.animation.closeDuration,
            ease: this.config.animation.ease,
            background: this.config.animation.background
        }, 0);
        
        // Fade out backdrop
        tl.to(this.elements.backdrop, {
            opacity: 0,
            duration: this.config.animation.closeDuration * 0.8,
            ease: 'power2.in'
        }, 0);

        // Fade out close
        tl.to(this.elements.close, {
            opacity: 0,
            duration: this.config.animation.closeDuration * 0.8,
            ease: 'power2.in'
        }, 0);
        
        // Fade out origin marker during animation
        tl.to(this.elements.origin, {
            opacity: 0,
            scale: 0.5,
            duration: this.config.animation.closeDuration * 0.5
        }, 0.2);
        
        // Final hide
        tl.set(this.elements.content, {
            opacity: 0,
            visibility: 'hidden'
        });
        
        this.state.timeline = tl;
    }
    
    /**
     * Load content via WordPress API
     */
    async loadContent(target) {
        // Determine target type
        const targetInfo = this.parseTarget(target);
        
        let response;
        
        if (targetInfo.type === 'ajax') {
            // Use WordPress AJAX
            response = await this.loadViaAjax(targetInfo.id);
        } else if (targetInfo.type === 'rest') {
            // Use REST API
            response = await this.loadViaRest(targetInfo.id);
        } else if (targetInfo.type === 'url') {
            // Load external URL
            response = await this.loadViaFetch(targetInfo.url);
        }
        
        // Add URL info to response
        response.url = targetInfo.url || this.generateUrl(targetInfo, response);
        
        return response;
    }
    
    /**
     * Push state to browser history
     */
    pushHistory(content) {
        // Store original URL and title
        if (!this.state.originalUrl) {
            this.state.originalUrl = window.location.href;
            this.state.originalTitle = document.title;
        }
        
        // Update browser state
        const newUrl = content.url || window.location.href;
        const newTitle = content.title || document.title;
        
        // Push new state
        history.pushState(
            { 
                wpOverlay: true, 
                target: this.state.currentTarget,
                title: this.state.originalTitle 
            },
            this.state.originalTitle,
            newUrl
        );
        
        // Update document title
        document.title = this.state.originalTitle;
    }
    
    /**
     * Generate URL for content
     */
    generateUrl(targetInfo, content) {
        if (targetInfo.type === 'ajax' && content.slug) {
            return `/${content.slug}/`;
        } else if (targetInfo.type === 'rest' && targetInfo.id) {
            return `/${targetInfo.id}/`;
        }
        return window.location.href;
    }
    
    /**
     * Parse target to determine load method
     */
    parseTarget(target) {
        // Check if numeric ID
        if (!isNaN(target)) {
            return { type: 'ajax', id: parseInt(target) };
        }
        
        // Check if URL
        if (target.startsWith('http') || target.startsWith('/')) {
            return { type: 'url', url: target };
        }
        
        // Check if page slug with prefix
        if (target.startsWith('page-')) {
            const id = target.replace('page-', '');
            return { type: 'ajax', id: parseInt(id) };
        }
        
        // Default to slug
        return { type: 'rest', id: target };
    }
    
    /**
     * Load via WordPress AJAX
     */
    async loadViaAjax(pageId) {
        const formData = new FormData();
        formData.append('action', 'load_page_content');
        formData.append('page_id', pageId);
        formData.append('nonce', typeof wpOverlay !== 'undefined' ? wpOverlay.nonce : '');
        
        const response = await fetch(this.config.ajaxUrl, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.data.message || 'Failed to load content');
        }
        
        return {
            title: data.data.title,
            content: data.data.content,
            slug: data.data.slug,
            url: data.data.url
        };
    }
    
    /**
     * Load via REST API
     */
    async loadViaRest(identifier) {
        let endpoint = `${this.config.apiBase}/pages`;
        
        // Try to load by slug or ID
        if (!isNaN(identifier)) {
            endpoint += `/${identifier}`;
        } else {
            endpoint += `?slug=${identifier}`;
        }
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        // Handle array response (slug query)
        const page = Array.isArray(data) ? data[0] : data;
        
        if (!page) {
            throw new Error('Page not found');
        }
        
        return {
            title: page.title.rendered,
            content: page.content.rendered
        };
    }
    
    /**
     * Load via direct fetch
     */
    async loadViaFetch(url) {
        const response = await fetch(url);
        const html = await response.text();
        
        // Parse HTML to extract content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Try to find main content
        const content = doc.querySelector('.entry-content, .post-content, main, article, #content');
        const title = doc.querySelector('h1, .entry-title, .post-title');
        
        return {
            title: title ? title.textContent : 'Content',
            content: content ? content.innerHTML : html
        };
    }
    
    /**
     * Set overlay content
     */
    setContent(data) {
        this.elements.body.innerHTML = data.content || '';

        // Trigger WordPress content filters
        if (typeof wp !== 'undefined' && wp.hooks) {
            wp.hooks.doAction('wpOverlay.contentLoaded', this.elements.body);
        }
        
        // Re-init any WordPress blocks
        this.initBlocks();
    }
    
    /**
     * Initialize WordPress blocks
     */
    initBlocks() {
        // Re-init Gutenberg blocks if needed
        if (window.wp && window.wp.blocks) {
            // Handle dynamic blocks
        }
        new ScrollAppear().processContainer(this.elements.body);
        // Re-init any sliders, galleries, etc.
        this.elements.body.querySelectorAll('.wp-block-gallery').forEach(gallery => {
            // Re-init gallery
        });
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        this.elements.body.innerHTML = `
            <div class="${this.config.classes.loading}">
                <div class="wp-overlay-spinner"></div>
            </div>
        `;
    }
    
    /**
     * Show error state
     */
    showError(message) {
        this.elements.body.innerHTML = `
            <div class="${this.config.classes.error}">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }
    
    /**
     * Reset content
     */
    resetContent() {
        this.elements.body.innerHTML = '';
        this.state.currentContent = null;
    }
    
    /**
     * Debug helper
     */
    debug(...args) {
        if (this.config.debug) {
            console.log('[WPOverlay]', ...args);
        }
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.wpOverlay = new WPOverlay({
        debug: true
    });
});