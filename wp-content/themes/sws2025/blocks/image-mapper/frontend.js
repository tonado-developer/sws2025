
/**
 * WordPress Image Mapper Frontend with GSAP - Extended Version
 * 
 * @description Interactive image mapper with global elements support
 * @version 3.0.0
 * @requires GSAP 3.x
 * 
 * Features:
 * - Global elements support (side-content, person-image without data-hotspot-id)
 * - Prepared for marker switching without zoom-out
 * - Pixel-perfect image hover detection using canvas
 * - Multi-level zoom with history tracking
 * - Smooth GSAP animations
 */
class WordPressImageMapper {
    constructor(options = {}) {
        // Configuration with defaults
        this.config = {
            // Selectors
            selectors: {
                container: '.image-mapper-container',
                preview: '.position-preview',
                parentImg: '.parent_img',
                marker: '.position-marker',
                overlay: '.overlay',
                checkpoint: '.checkpoint-marker',
                path: '.svg-path-container',
                sideContent: '.side-content',
                personImage: '.person-image',
                illustrationImage: '.illustration-image',
                markerLabel: '.markerLabel'
            },

            // CSS Classes
            classes: {
                hover: 'hover',
                zoomed: 'zoomed',
                current: 'current',
                open: 'open',
                active: 'image-mapper-active',
                hidden: 'element-hidden' // New class for hiding elements
            },

            // Animation settings
            animation: {
                zoomDuration: 1.5,
                zoomOutDuration: 1.2,
                ease: 'power2.inOut',
                badgeDelay: 1,
                badgeDuration: 5,
                elementFadeOut: 0.3, // Duration for hiding elements
                elementFadeIn: 0.3   // Duration for showing elements
            },

            // Zoom behavior
            zoom: {
                targetViewportHeight: 0.5,
                targetViewportWidth: 0.5,
                pushRight: 1,
                maxScaleBoost: 0.3,
                viewportPadding: 0.05,
                topPadding: 150
            },

            // Detection
            alphaThreshold: 10,

            // Debugging
            debug: false,

            ...options
        };

        // State management
        this.state = {
            initialized: false,
            zooming: false,
            rootContainer: null, // The topmost container that never changes
            currentContainer: null,
            parentContainer: null,
            hoveredMarker: null,
            zoomedMarker: null,
            zoomLevel: 0,
            zoomHistory: [],
            zoomTimeline: null,
            currentlyVisibleElements: new Set(), // Track visible elements
            globalElements: null // Cache global elements
        };

        // Canvas data storage
        this.canvasData = new Map();
        this.markerZIndices = [];

        // Event handlers bound to instance
        this.boundHandlers = {
            containerMouseMove: this.handleContainerMouseMove.bind(this),
            containerMouseLeave: this.handleContainerMouseLeave.bind(this),
            containerClick: this.handleContainerClick.bind(this),
            resize: this.debounce(this.handleResize.bind(this), 250),
            keydown: this.handleKeydown.bind(this)
        };

        this.svgPaths = new Map(); // Cache für SVG-Pfad-Daten
        this.activeCheckpoints = new Set(); // Aktive Checkpoints tracking
        this.svgUpdateTicker = null;

        this.init();
    }

    /**
     * Initialize the image mapper
     */
    init() {
        // Wait for GSAP
        if (typeof gsap === 'undefined') {
            this.debug('GSAP not loaded, retrying in 100ms...');
            setTimeout(() => this.init(), 100);
            return;
        }

        // Initialize containers
        const containers = document.querySelectorAll(this.config.selectors.container);
        if (containers.length === 0) {
            this.debug('No image mapper containers found');
            return;
        }

        // Initialize only the first (root) container
        const rootContainer = containers[0];
        this.initContainer(rootContainer);

        // Setup global event listeners (only for window events)
        this.setupGlobalListeners();

        // Observe DOM changes
        this.observeDOM();

        this.state.initialized = true;
        this.debug('Image Mapper initialized with root container');

        this.startSVGPositioning();

        window.wpScrollExtension = new ScrollExtension(this, {
            mode: 'simple-animation',
            scrollSensitivity: 50,
            virtualScrollHeight: 200,
            enableKeyboardNavigation: true
        });

        // Add debug functions to window
        window.scrollDebug = {
            getCurrentPosition: () => window.wpScrollExtension.getCurrentPosition(),
            goToMarker: (index) => window.wpScrollExtension.navigateToMarkerIndex(index),
            goToOverview: () => window.wpScrollExtension.goToOverview(),
            switchMode: (mode) => window.wpScrollExtension.setMode(mode)
        };
    }

    /**
     * Initialize a single container
     * @param {HTMLElement} container - Container element
     */
    initContainer(container) {
        const preview = container.querySelector(this.config.selectors.preview);
        if (!preview) {
            this.debug('No preview element found in container', container);
            return;
        }

        // Store the root container on first initialization (never changes)
        if (!this.state.rootContainer) {
            // Find the topmost .image-mapper-container
            this.state.rootContainer = container.closest(this.config.selectors.container) || container;
            this.debug('Root container set:', this.state.rootContainer);
        }

        // Enable fullscreen mode only on container
        container.classList.add(this.config.classes.active);

        // Update current state
        this.resetCurrentState();
        preview.classList.add(this.config.classes.current);

        this.state.parentContainer = container;
        this.state.currentContainer = preview;

        // Cache global elements (only from root container)
        if (this.state.zoomLevel === 0) {
            this.state.globalElements = this.getGlobalElements();
        }

        // Track initially visible global elements
        this.updateVisibleElements();

        // Reset transforms
        gsap.set(preview, { clearProps: "all" });

        // Clear previous data
        this.clearCanvasData();

        // Get elements
        const markers = preview.querySelectorAll(this.config.selectors.marker);
        const parent = preview.querySelector(this.config.selectors.parentImg);

        if (!parent) {
            this.debug('No parent image found in preview');
            return;
        }

        this.markers = markers;
        this.parent = parent;

        // Setup container-specific event listeners
        this.setupContainerListeners(container);

        // Initialize markers
        this.initMarkers();

        this.initAllSVGPaths();

        this.debug(`Container initialized with ${markers.length} markers, ${Object.keys(this.state.globalElements || {}).length} global element types`);
    }

    /**
     * Get global elements (without data-hotspot-id)
     * @returns {Object} Global elements grouped by type
     */
    getGlobalElements() {
        if (!this.state.rootContainer) return {};

        const elements = {
            sideContent: [],
            personImage: [],
            illustrationImage: []
        };

        // Find all elements WITHOUT data-hotspot-id from root container
        const sideContents = this.state.rootContainer.querySelectorAll(
            `${this.config.selectors.sideContent}:not([data-hotspot-id])`
        );
        const personImages = this.state.rootContainer.querySelectorAll(
            `${this.config.selectors.personImage}:not([data-hotspot-id])`
        );
        const illustrationImages = this.state.rootContainer.querySelectorAll(
            `${this.config.selectors.illustrationImage}:not([data-hotspot-id])`
        );

        elements.sideContent = Array.from(sideContents);
        elements.personImage = Array.from(personImages);
        elements.illustrationImage = Array.from(illustrationImages);

        return elements;
    }

    /**
     * Get all related elements (with specific data-hotspot-id)
     * @param {string} markerId - Marker ID
     * @returns {Object} Related elements for this marker
     */
    getRelatedElements(markerId) {
        if (!markerId || !this.state.rootContainer) return {};

        const escaped = CSS.escape(markerId.toString());
        const selector = `[data-hotspot-id="${escaped}"]`;

        return {
            side: this.state.rootContainer.querySelector(`${this.config.selectors.sideContent}${selector}`),
            person: this.state.rootContainer.querySelector(`${this.config.selectors.personImage}${selector}`),
            illustration: this.state.rootContainer.querySelector(`${this.config.selectors.illustrationImage}${selector}`),
            svgPath: this.state.rootContainer.querySelector(`${this.config.selectors.path}${selector}`) // NEU
        };
    }

    /**
     * Get all currently visible related elements (any data-hotspot-id)
     * @returns {Array} Array of all visible related elements
     */
    getAllVisibleRelatedElements() {
        if (!this.state.rootContainer) return [];

        const elements = [];

        // Find all elements WITH data-hotspot-id that are currently visible from root container
        const visibleSelectors = [
            `${this.config.selectors.sideContent}[data-hotspot-id].${this.config.classes.open}`,
            `${this.config.selectors.personImage}[data-hotspot-id].${this.config.classes.open}`,
            `${this.config.selectors.illustrationImage}[data-hotspot-id].${this.config.classes.open}`,
            `${this.config.selectors.path}[data-hotspot-id].${this.config.classes.open}`
        ];

        visibleSelectors.forEach(selector => {
            const found = this.state.rootContainer.querySelectorAll(selector);
            elements.push(...Array.from(found));
        });

        return elements;
    }

    /**
     * Hide all elements (global and related)
     * @param {Function} onComplete - Callback when hiding is complete
     */
    hideAllElements(onComplete) {
        const elementsToHide = [];

        // Global elements
        if (this.state.globalElements) {
            Object.values(this.state.globalElements).forEach(elementArray => {
                elementsToHide.push(...elementArray.filter(el =>
                    el && el.classList.contains(this.config.classes.open)
                ));
            });
        }

        // Related elements
        elementsToHide.push(...this.getAllVisibleRelatedElements());

        // SVG Checkpoints und Position Handlers cleanup
        const svgContainers = this.state.rootContainer?.querySelectorAll('.svg-path-container.open');
        if (svgContainers) {
            svgContainers.forEach(container => {
                // Remove position update handler
                if (container._positionUpdateHandler) {
                    gsap.ticker.remove(container._positionUpdateHandler);
                    delete container._positionUpdateHandler;
                }
                this.cleanupSVGCheckpoints(container);
            });
        }

        if (elementsToHide.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        const tl = gsap.timeline({
            onComplete: () => {
                elementsToHide.forEach(el => {
                    el.classList.remove(this.config.classes.open);
                });
                this.state.currentlyVisibleElements.clear();
                if (onComplete) onComplete();
            }
        });

        return tl;
    }

    /**
     * Show specific elements for a marker
     * @param {string} markerId - Marker ID to show elements for
     * @param {Function} onComplete - Callback when showing is complete
     */
    showElementsForMarker(markerId, onComplete, explicitMarker = null) {
        this.hideAllElements(() => {
            const elements = this.getRelatedElements(markerId);
            const elementsToShow = [];

            // KORREKTUR: Verwende explicitMarker falls übergeben
            let targetMarker = explicitMarker;

            // Fallback: aus currentContainer suchen
            if (!targetMarker && this.state.currentContainer) {
                const currentMarkers = this.state.currentContainer.querySelectorAll(this.config.selectors.marker);
                targetMarker = Array.from(currentMarkers).find(m =>
                    m.dataset.hotspotId === markerId
                );
            }

            Object.entries(elements).forEach(([key, el]) => {
                if (el) {
                    if (key === 'svgPath') {
                        this.initSingleSVGPath(el);

                        if (targetMarker) {
                            const updatePosition = () => {
                                const markerRect = targetMarker.getBoundingClientRect();
                                const containerRect = this.state.rootContainer.getBoundingClientRect();

                                el.style.position = 'absolute';
                                el.style.left = `${markerRect.left - containerRect.left}px`;
                                el.style.top = `${markerRect.top - containerRect.top}px`;
                                el.style.width = `${markerRect.width}px`;
                                el.style.height = `${markerRect.height}px`;
                            };

                            updatePosition();

                            if (el._positionUpdateHandler) {
                                gsap.ticker.remove(el._positionUpdateHandler);
                            }

                            el._positionUpdateHandler = updatePosition;
                            gsap.ticker.add(el._positionUpdateHandler);
                        }
                    }

                    elementsToShow.push(el);
                    el.classList.add(this.config.classes.open);
                    this.state.currentlyVisibleElements.add(el);
                }
            });

            if (elementsToShow.length === 0) {
                if (onComplete) onComplete();
                return;
            }

            const tl = gsap.timeline({ onComplete });
            elementsToShow.forEach(el => {
                tl.to(el, {
                    duration: this.config.animation.elementFadeIn,
                    ease: 'power2.inOut'
                }, 0);
            });
        });
    }

    /**
     * Initialize all SVG paths on page load
     */
    initAllSVGPaths() {
        if (!this.state.rootContainer) return;

        const svgContainers = this.state.rootContainer.querySelectorAll('.svg-path-container');

        svgContainers.forEach(container => {
            this.initSingleSVGPath(container);
        });
    }

    /**
     * Initialize a single SVG path container
     */
    async initSingleSVGPath(svgContainer) {
        const svgImg = svgContainer.querySelector('.svg-path');
        const checkpointsWrapper = svgContainer.querySelector('.checkpointsWrapper');
        const checkpoints = svgContainer.querySelectorAll('.checkpoint-marker');
        const hotspotId = svgContainer.dataset.hotspotId;

        if (!svgImg || !checkpointsWrapper || checkpoints.length === 0) {
            return;
        }

        // SVG Pfad-Daten laden und cachen
        const pathData = await this.loadAndCacheSVGPath(svgImg.src, hotspotId);
        if (!pathData) return;


        // Checkpoints registrieren für Live-Updates
        checkpoints.forEach(checkpoint => {
            checkpoint._svgContainer = svgContainer;
            checkpoint._pathData = pathData;
            this.activeCheckpoints.add(checkpoint);
        });

        this.debug(`SVG Path initialized for hotspot ${hotspotId}:`, pathData);
    }

    /**
     * Load and cache SVG path data
     */
    async loadAndCacheSVGPath(svgUrl, hotspotId) {
        if (this.svgPaths.has(svgUrl)) {
            return this.svgPaths.get(svgUrl);
        }

        try {
            const response = await fetch(svgUrl);
            const svgText = await response.text();

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = svgText;
            const svgElement = tempDiv.querySelector('svg');
            const pathElement = svgElement?.querySelector('path');

            if (!pathElement) {
                this.debug('No path found in SVG:', svgUrl);
                return null;
            }

            const pathData = {
                pathElement: pathElement.cloneNode(true),
                viewBox: svgElement.viewBox.baseVal,
                svgWidth: svgElement.viewBox.baseVal.width || svgElement.width.baseVal.value || 100,
                svgHeight: svgElement.viewBox.baseVal.height || svgElement.height.baseVal.value || 100,
                pathLength: pathElement.getTotalLength(),
                svgUrl
            };

            this.svgPaths.set(svgUrl, pathData);
            return pathData;

        } catch (error) {
            this.debug('Error loading SVG path:', error);
            return null;
        }
    }

    /**
     * Update all SVG checkpoint positions (called continuously)
     */
    updateSVGCheckpoints() {
        this.activeCheckpoints.forEach(checkpoint => {
            if (!checkpoint._svgContainer || !checkpoint._pathData) return;

            const container = checkpoint._svgContainer;
            const pathData = checkpoint._pathData;

            // Nur updaten wenn Container sichtbar ist
            if (!container.classList.contains('open')) return;

            this.positionCheckpointOnPath(checkpoint, container, pathData);
        });
    }

    /**
     * Position a single checkpoint on the path
     */
    positionCheckpointOnPath(checkpoint, svgContainer, pathData) {
        const pathPosition = parseFloat(checkpoint.dataset.pathPosition) || 0;

        const containerRect = svgContainer.getBoundingClientRect();
        const scaleX = containerRect.width / pathData.svgWidth;
        const scaleY = containerRect.height / pathData.svgHeight;

        const distanceAlongPath = (pathPosition / 100) * pathData.pathLength;
        const point = pathData.pathElement.getPointAtLength(distanceAlongPath);

        const x = point.x * scaleX;
        const y = point.y * scaleY;

        checkpoint.style.position = 'absolute';
        checkpoint.style.left = `${x}px`;
        checkpoint.style.top = `${y}px`;
    }

    /**
     * Start continuous positioning updates
     */
    startSVGPositioning() {
        if (!this.svgUpdateTicker) {
            this.svgUpdateTicker = () => {
                if (this.activeCheckpoints.size > 0) {
                    this.updateSVGCheckpoints();
                }
            };
            gsap.ticker.add(this.svgUpdateTicker);
        }
    }

    /**
     * Stop continuous positioning updates
     */
    stopSVGPositioning() {
        if (this.svgUpdateTicker) {
            gsap.ticker.remove(this.svgUpdateTicker);
            this.svgUpdateTicker = null;
        }
    }

    /**
     * Clean up checkpoints when elements are hidden
     */
    cleanupSVGCheckpoints(svgContainer) {
        const checkpoints = svgContainer.querySelectorAll('.checkpoint-marker');
        checkpoints.forEach(checkpoint => {
            this.activeCheckpoints.delete(checkpoint);
            delete checkpoint._svgContainer;
            delete checkpoint._pathData;
        });
    }

    /**
     * Update tracking of visible elements
     */
    updateVisibleElements() {
        this.state.currentlyVisibleElements.clear();

        // Check global elements (only in root container)
        if (this.state.globalElements) {
            Object.values(this.state.globalElements).forEach(elementArray => {
                elementArray.forEach(el => {
                    if (el && el.classList.contains(this.config.classes.open)) {
                        this.state.currentlyVisibleElements.add(el);
                    }
                });
            });
        }

        // Check related elements (in root container)
        this.getAllVisibleRelatedElements().forEach(el => {
            this.state.currentlyVisibleElements.add(el);
        });
    }

    /**
     * Setup container-specific event listeners
     * @param {HTMLElement} container - Container element
     */
    setupContainerListeners(container) {
        // Remove existing listeners first
        this.removeContainerListeners(container);

        // Add container-scoped event listeners
        container.addEventListener('mousemove', this.boundHandlers.containerMouseMove, { passive: true });
        container.addEventListener('mouseleave', this.boundHandlers.containerMouseLeave, { passive: true });
        container.addEventListener('click', this.boundHandlers.containerClick, { capture: true });

        // Store reference for cleanup
        container._mapperListeners = true;
    }

    /**
     * Remove container-specific event listeners
     * @param {HTMLElement} container - Container element
     */
    removeContainerListeners(container) {
        if (container._mapperListeners) {
            container.removeEventListener('mousemove', this.boundHandlers.containerMouseMove);
            container.removeEventListener('mouseleave', this.boundHandlers.containerMouseLeave);
            container.removeEventListener('click', this.boundHandlers.containerClick);
            delete container._mapperListeners;
        }
    }

    /**
     * Initialize all markers in current container
     */
    initMarkers() {
        this.markerZIndices = [];

        this.markers.forEach((marker, index) => {
            const overlay = marker.querySelector(this.config.selectors.overlay);
            if (!overlay) {
                this.debug(`No overlay found for marker ${index}`);
                return;
            }

            // Store z-index for proper layering
            const zIndex = parseInt(window.getComputedStyle(marker).zIndex) || 0;
            this.markerZIndices.push({ marker, zIndex, index });

            // Setup canvas for pixel detection
            this.setupMarkerCanvas(marker, overlay, index);

            // Attach events using event delegation
            this.attachMarkerEvents(marker);
        });

        // Sort by z-index (highest first for correct hover detection)
        this.markerZIndices.sort((a, b) => b.zIndex - a.zIndex);
    }

    /**
     * Setup canvas for pixel-perfect detection
     * @param {HTMLElement} marker - Marker element
     * @param {HTMLImageElement} img - Overlay image
     * @param {number} index - Marker index
     */
    setupMarkerCanvas(marker, img, index) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const processImage = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            try {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                this.canvasData.set(index, {
                    canvas,
                    ctx,
                    imageData,
                    width: canvas.width,
                    height: canvas.height
                });

                // Setup markerLabel AFTER canvas data is available
                this.setupmarkerLabel(marker, index);

            } catch (e) {
                this.debug('Canvas CORS issue for marker', index, e.message);
                this.canvasData.set(index, null);
                // Fallback: setup markerLabel without canvas data
                this.setupmarkerLabel(marker, index);
            }
        };

        if (img.complete && img.naturalWidth > 0) {
            processImage();
        } else {
            img.addEventListener('load', processImage, { once: true });
            img.addEventListener('error', () => {
                this.debug('Failed to load overlay:', img.src);
                this.canvasData.set(index, null);
                this.setupmarkerLabel(marker, index);
            }, { once: true });
        }
    }

    /**
     * Setup markerLabel for highest position
     * @param {HTMLElement} marker - Marker element
     * @param {number} index - Marker index
     */
    setupmarkerLabel(marker, index) {
        const markerLabel = marker.querySelector(this.config.selectors.markerLabel);
        if (!markerLabel) return;

        const computedOpacity = window.getComputedStyle(markerLabel).opacity;
        if (parseFloat(computedOpacity) === 1) return;

        const canvasData = this.canvasData.get(index);

        if (!canvasData) {
            // Fallback: use center position and animate
            markerLabel.style.left = '50%';
            this.animateMarkerSequence(markerLabel, index);
            return;
        }

        const { imageData, width, height } = canvasData;
        const data = imageData.data;

        // Scan from top to find first non-transparent pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];

                if (alpha > 0) {
                    markerLabel.style.left = `${(x / width) * 100}%`;
                    this.animateMarkerSequence(markerLabel, index);
                    return;
                }
            }
        }
    }

    /**
     * Animate marker sequence: point -> string -> badge with typewriter
     * @param {HTMLElement} markerLabel - Label element to animate
     * @param {number} index - Marker index
     */
    animateMarkerSequence(markerLabel, index) {
        const badge = markerLabel.querySelector('.badge');
        const string = markerLabel.querySelector('.string');
        const originalText = badge.textContent;

        // Setup initial states
        gsap.set(markerLabel, { opacity: 0 });
        gsap.set(string, { scaleY: 0, transformOrigin: "bottom" });
        gsap.set(badge, { opacity: 0, y: 10 });
        badge.textContent = '';

        // Create timeline
        const tl = gsap.timeline();
        const badgeDuration = this.config.animation.badgeDuration;
        const badgeDelay = this.config.animation.badgeDelay;

        // 1. Point appears instantly
        tl.to(markerLabel, {
            opacity: 1,
            delay: 0.5,
            duration: badgeDuration / 5
        })

            // 2. String rises up
            .to(string, {
                scaleY: 1,
                duration: badgeDuration / 2.25,
                ease: 'power2.in',
                delay: index * badgeDelay
            })

            // 4. Typewriter effect
            .add(() => this.typewriterEffect(badge, originalText))

            // 3. Badge appears
            .to(badge, {
                opacity: 1,
                y: 0,
            });
    }

    /**
     * Typewriter effect for text
     * @param {HTMLElement} element - Element to type into
     * @param {string} text - Text to type
     */
    typewriterEffect(element, text) {
        let i = 0;
        const speed = this.config.animation.badgeDuration * 0.4 * 1000 / text.length;
        element.textContent = text.substring(0, i + 1);
        i++;
        const typeInterval = setInterval(() => {
            element.textContent = text.substring(0, i + 1);
            i++;

            if (i >= text.length) {
                clearInterval(typeInterval);
            }
        }, speed);
    }

    /**
     * Attach events to marker with proper cleanup
     * @param {HTMLElement} marker - Marker element
     */
    attachMarkerEvents(marker) {
        // Remove existing listeners first
        this.detachMarkerEvents(marker);

        // Only mouse enter/leave for hover indication
        marker._handlers = {
            enter: () => this.handleMarkerEnter(marker),
            leave: () => this.handleMarkerLeave(marker)
        };

        marker.addEventListener('mouseenter', marker._handlers.enter, { passive: true });
        marker.addEventListener('mouseleave', marker._handlers.leave, { passive: true });
    }

    /**
     * Detach events from marker
     * @param {HTMLElement} marker - Marker element
     */
    detachMarkerEvents(marker) {
        if (marker._handlers) {
            marker.removeEventListener('mouseenter', marker._handlers.enter);
            marker.removeEventListener('mouseleave', marker._handlers.leave);
            delete marker._handlers;
        }
    }

    /**
     * Handle marker mouse enter
     * @param {HTMLElement} marker - Marker element
     */
    handleMarkerEnter(marker) {
        // Clear previous hover if different marker
        if (this.state.hoveredMarker && this.state.hoveredMarker !== marker) {
            this.setHoverState(this.state.hoveredMarker, false);
        }
        this.state.hoveredMarker = marker;
    }

    /**
     * Handle marker mouse leave
     * @param {HTMLElement} marker - Marker element
     */
    handleMarkerLeave(marker) {
        this.setHoverState(marker, false);
        if (this.state.hoveredMarker === marker) {
            this.state.hoveredMarker = null;
        }
    }

    /**
     * Container mouse move for pixel-perfect detection
     * @param {MouseEvent} e - Mouse event
     */
    handleContainerMouseMove(e) {
        if (!this.markers || this.state.zooming) return;

        // Reset all hover states
        this.markers.forEach(marker => this.setHoverState(marker, false));

        // Track which marker should be hovered (highest z-index with opaque pixel)
        let hoveredMarker = null;

        // Check ALL markers in z-index order
        for (const { marker, index } of this.markerZIndices) {
            const overlay = marker.querySelector(this.config.selectors.overlay);
            if (!overlay) continue;

            const rect = marker.getBoundingClientRect();

            // Check if mouse is within marker bounds
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {

                // Check pixel opacity
                const data = this.canvasData.get(index);
                if (!data || !data.imageData) {
                    // No canvas data, use this marker if no other found yet
                    if (!hoveredMarker) hoveredMarker = marker;
                } else {
                    // Calculate pixel position
                    const scaleX = data.width / overlay.offsetWidth;
                    const scaleY = data.height / overlay.offsetHeight;
                    const x = Math.floor((e.clientX - rect.left) * scaleX);
                    const y = Math.floor((e.clientY - rect.top) * scaleY);

                    // Check if pixel is opaque
                    if (this.isPixelOpaque(data.imageData, x, y)) {
                        hoveredMarker = marker;
                        break; // Found opaque pixel, this is our marker
                    }
                }
            }
        }

        // Apply hover to the found marker
        if (hoveredMarker) {
            this.setHoverState(hoveredMarker, true);
        }
    }

    /**
     * Handle container mouse leave - reset all hover states
     * @param {MouseEvent} e - Mouse event
     */
    handleContainerMouseLeave(e) {
        if (!this.markers) return;

        // Reset all hover states when leaving container
        this.markers.forEach(marker => this.setHoverState(marker, false));
        this.state.hoveredMarker = null;

        // Reset container cursor
        if (this.state.parentContainer) {
            this.state.parentContainer.style.cursor = '';
        }
    }

    /**
     * Check if pixel is opaque
     * @param {ImageData} imageData - Canvas image data
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} Is pixel opaque
     */
    isPixelOpaque(imageData, x, y) {
        // Boundary check
        if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
            return false;
        }

        // Get alpha value
        const alphaIndex = (y * imageData.width + x) * 4 + 3;
        return imageData.data[alphaIndex] > this.config.alphaThreshold;
    }

    /**
     * Set hover state for marker
     * @param {HTMLElement} marker - Marker element
     * @param {boolean} isHovered - Hover state
     */
    setHoverState(marker, isHovered) {
        if (isHovered) {
            marker.classList.add(this.config.classes.hover);
            // Set cursor on container instead of body
            if (this.state.parentContainer) {
                this.state.parentContainer.style.cursor = 'pointer';
            }
        } else {
            marker.classList.remove(this.config.classes.hover);
            // Reset cursor on container
            if (this.state.parentContainer) {
                this.state.parentContainer.style.cursor = '';
            }
        }
    }

    /**
     * Handle container clicks - find correct marker with pixel-perfect detection
     * @param {MouseEvent} e - Click event
     */
    handleContainerClick(e) {
        // Only process clicks within current container
        if (!this.state.currentContainer || this.state.zooming) return;

        const containerRect = this.state.currentContainer.getBoundingClientRect();

        // Check if click is within container
        if (e.clientX < containerRect.left || e.clientX > containerRect.right ||
            e.clientY < containerRect.top || e.clientY > containerRect.bottom) {
            return;
        }

        // Find the topmost marker with opaque pixel at click position
        let clickedMarker = null;

        for (const { marker, index } of this.markerZIndices) {
            const overlay = marker.querySelector(this.config.selectors.overlay);
            if (!overlay) continue;

            const rect = marker.getBoundingClientRect();

            // Check if click is within marker bounds
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {

                // Check pixel opacity
                const data = this.canvasData.get(index);
                if (!data || !data.imageData) {
                    // No canvas data, assume opaque
                    clickedMarker = marker;
                    break;
                } else {
                    // Calculate pixel position
                    const scaleX = data.width / overlay.offsetWidth;
                    const scaleY = data.height / overlay.offsetHeight;
                    const x = Math.floor((e.clientX - rect.left) * scaleX);
                    const y = Math.floor((e.clientY - rect.top) * scaleY);

                    // Check if pixel is opaque
                    if (this.isPixelOpaque(data.imageData, x, y)) {
                        clickedMarker = marker;
                        break;
                    }
                }
            }
        }

        // If we found a marker with opaque pixel, handle the click
        if (clickedMarker) {
            e.preventDefault();
            e.stopPropagation();

            // Check for external link
            const href = clickedMarker.getAttribute('href');
            if (href && href !== '#') {
                window.location.href = href;
                return;
            }

            // Zoom to marker or switch if already zoomed
            if (this.state.zoomLevel > 0 && this.state.zoomedMarker !== clickedMarker) {
                // Future: Switch to different marker
                // this.switchToMarker(clickedMarker);
                // For now, just zoom to the new marker normally
                if (!clickedMarker.classList.contains(this.config.classes.zoomed)) {
                    this.zoomToMarker(clickedMarker);
                }
            } else if (!clickedMarker.classList.contains(this.config.classes.zoomed)) {
                this.zoomToMarker(clickedMarker);
            }
        }
    }

    /**
     * Zoom to specific marker
     * @param {HTMLElement} marker - Target marker
     */
    zoomToMarker(marker) {

        if (this.state.zooming) return;
        this.state.zooming = true;

        // Kill existing animation
        if (this.state.zoomTimeline) {
            this.state.zoomTimeline.kill();
        }

        // Get marker ID
        const markerId = marker.dataset.hotspotId;

        // Store zoom history
        this.state.zoomHistory.push({
            parent: this.state.parentContainer,
            container: this.state.currentContainer,
            marker: marker,
            originalParentSrc: this.parent.src
        });
        this.state.zoomLevel++;
        this.state.zoomedMarker = marker;

        // Calculate zoom
        const zoomData = this.calculateZoomTransform(marker);

        // Apply classes
        this.state.currentContainer.classList.add(this.config.classes.zoomed);
        marker.classList.add(this.config.classes.zoomed);

        // Remove hover
        this.setHoverState(marker, false);

        // Detach events during zoom
        this.markers.forEach(m => this.detachMarkerEvents(m));

        // Create animation timeline
        this.animateZoomIn(zoomData, marker, markerId);
    }

    /**
     * Switch to a different marker (for future implementation)
     * @param {HTMLElement} newMarker - New marker to zoom to
     */
    switchToMarker(newMarker) {
        if (this.state.zooming || !newMarker) return;

        const oldMarkerId = this.state.zoomedMarker?.dataset.hotspotId;
        const newMarkerId = newMarker.dataset.hotspotId;

        if (oldMarkerId === newMarkerId) return;

        this.state.zooming = true;

        if (this.state.zoomTimeline) {
            this.state.zoomTimeline.kill();
        }

        const previousMarker = this.state.zoomedMarker;
        this.state.zoomedMarker = newMarker;

        if (previousMarker) {
            previousMarker.classList.remove(this.config.classes.zoomed);
        }

        newMarker.classList.add(this.config.classes.zoomed);

        const keepData = this.state.zoomHistory[this.state.zoomHistory.length - 1];
        this.state.currentContainer = keepData.container;
        const preview = newMarker.querySelector(this.config.selectors.preview);
        const parent = preview?.querySelector(this.config.selectors.parentImg);
        this.state.parentContainer = keepData.parent;
        this.parent = parent;

        // Marker Collection aktualisieren
        this.markers = this.state.currentContainer.querySelectorAll(this.config.selectors.marker);

        this.state.zoomHistory.push({
            parent: this.state.parentContainer,
            container: this.state.currentContainer,
            marker: newMarker,
            originalParentSrc: this.parent?.src
        });
        this.state.zoomLevel++;
        this.state.zoomedMarker = newMarker;

        const newZoomData = this.calculateZoomTransformReset(newMarker);

        if (previousMarker) {
            this.setHoverState(previousMarker, false);
        }

        if (this.markers) {
            this.markers.forEach(m => this.detachMarkerEvents(m));
        }

        const tl = gsap.timeline({
            onComplete: () => {
                this.state.zooming = false;
                const currentRoot = this.state.rootContainer;
                this.onZoomComplete(newMarker);
                this.state.rootContainer = currentRoot;
            }
        });

        // Elements mit korrektem Timing wechseln
        tl.add(() => {
            this.hideAllElements(() => {
                if (newMarkerId) {
                    // Verzögerung für DOM-Update
                    requestAnimationFrame(() => {
                        this.showElementsForMarker(newMarkerId);
                    });
                }
            });
        }, 0);

        tl.to(this.state.currentContainer, {
            duration: this.config.animation.zoomDuration * 0.8,
            scale: newZoomData.scale,
            x: newZoomData.translateX,
            y: newZoomData.translateY,
            transformOrigin: "center center",
            ease: this.config.animation.ease
        }, 0);

        this.state.zoomTimeline = tl;
    }

    /**
     * Animate zoom in
     * @param {Object} zoomData - Zoom transform data
     * @param {HTMLElement} marker - Target marker
     * @param {string} markerId - Marker ID
     */
    animateZoomIn(zoomData, marker, markerId) {
        const tl = gsap.timeline({
            onComplete: () => {
                this.state.zooming = false;
                this.onZoomComplete(marker);
            }
        });

        // First hide all current elements (global and related)
        this.hideAllElements(() => {
            // Then show elements for this marker
            if (markerId) {
                this.showElementsForMarker(markerId);
            }
        });

        // Main zoom animation
        tl.to(this.state.currentContainer, {
            duration: this.config.animation.zoomDuration,
            scale: zoomData.scale,
            x: zoomData.translateX,
            y: zoomData.translateY,
            transformOrigin: "center center",
            ease: this.config.animation.ease
        }, 0); // Start immediately

        // Add back button
        tl.add(() => this.addBackButton(), 0.5);

        this.state.zoomTimeline = tl;
    }

    /**
     * Handle zoom completion
     * @param {HTMLElement} marker - Zoomed marker
     */
    onZoomComplete(marker) {
        const nestedPreview = marker.querySelector(this.config.selectors.preview);
        if (nestedPreview) {
            // Store current root container to preserve it
            const currentRoot = this.state.rootContainer;
            this.initContainer(marker);
            // Restore root container (initContainer shouldn't override it but just to be safe)
            this.state.rootContainer = currentRoot;
        }
    }

    /**
     * Calculate zoom transform
     * @param {HTMLElement} marker - Target marker
     * @returns {Object} Transform data
     */
    calculateZoomTransform(marker) {
        const container = this.state.currentContainer;
        const containerRect = container.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();
        const parentRect = this.parent.getBoundingClientRect();

        // Calculate centers
        const containerCenter = {
            x: containerRect.left + containerRect.width / 2,
            y: containerRect.top + containerRect.height / 2
        };

        const markerCenter = {
            x: markerRect.left + markerRect.width / 2,
            y: markerRect.top + markerRect.height / 2
        };

        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // Calculate scale
        const targetHeight = window.innerHeight * this.config.zoom.targetViewportHeight;
        const targetWidth = window.innerWidth * this.config.zoom.targetViewportWidth;

        let scale = Math.min(
            targetHeight / markerRect.height,
            targetWidth / markerRect.width
        );

        // Calculate translation
        const scaledMarkerOffset = {
            x: (markerCenter.x - containerCenter.x) * scale,
            y: (markerCenter.y - containerCenter.y) * scale
        };

        let translateX = viewportCenter.x - containerCenter.x - scaledMarkerOffset.x;
        let translateY = viewportCenter.y - containerCenter.y - scaledMarkerOffset.y;

        // Apply boundary constraints
        const bounds = this.calculateBoundaryConstraints(
            parentRect, containerRect, scale, translateX, translateY
        );

        translateX = bounds.x;
        translateY = bounds.y;
        scale = bounds.scale;

        return { scale, translateX, translateY };
    }

    /**
     * Calculate zoom transform
     * @param {HTMLElement} marker - Target marker
     * @returns {Object} Transform data
     */
    calculateZoomTransformReset(marker) {
        const container = this.state.currentContainer;
        const containerRect = container.getBoundingClientRect();
        const parentRect = this.parent.getBoundingClientRect();

        const currentTransform = {
            scale: gsap.getProperty(container, "scale") || 1,
            x: gsap.getProperty(container, "x") || 0,
            y: gsap.getProperty(container, "y") || 0
        };


        // --- Marker "ursprüngliche" Position im Container berechnen ---
        // Wir holen NICHT getBoundingClientRect(), sondern offset + Größe im Container
        const markerWidth = marker.offsetWidth;
        const markerHeight = marker.offsetHeight;

        const markerLeft = marker.offsetLeft;
        const markerTop = marker.offsetTop;

        const markerCenterOriginal = {
            x: markerLeft + markerWidth / 2,
            y: markerTop + markerHeight / 2
        };

        // Rückrechnen: aktuelle Transformation vom Container aufheben
        const markerCenter = {
            x: containerRect.left + markerCenterOriginal.x * currentTransform.scale + currentTransform.x,
            y: containerRect.top + markerCenterOriginal.y * currentTransform.scale + currentTransform.y
        };
        console.log("Elements", { 0: markerCenter, 1: container, 2: this.parent });
        const containerCenter = {
            x: containerRect.left + containerRect.width / 2,
            y: containerRect.top + containerRect.height / 2
        };

        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // --- Scale berechnen ---
        const targetHeight = window.innerHeight * this.config.zoom.targetViewportHeight;
        const targetWidth = window.innerWidth * this.config.zoom.targetViewportWidth;

        let scale = Math.min(
            targetHeight / markerHeight,
            targetWidth / markerWidth
        );

        // --- Translation berechnen ---
        const scaledMarkerOffset = {
            x: (markerCenter.x - containerCenter.x) * scale,
            y: (markerCenter.y - containerCenter.y) * scale
        };

        let translateX = viewportCenter.x - containerCenter.x - scaledMarkerOffset.x;
        let translateY = viewportCenter.y - containerCenter.y - scaledMarkerOffset.y;

        // --- Boundary Constraints anwenden ---
        const bounds = this.calculateBoundaryConstraints(
            parentRect, containerRect, scale, translateX, translateY
        );

        translateX = bounds.x;
        translateY = bounds.y;
        scale = bounds.scale;

        return { scale, translateX, translateY };
    }


    /**
     * Calculate boundary constraints to keep parent image in viewport
     * @param {DOMRect} parentRect - Parent image rect
     * @param {DOMRect} containerRect - Container rect
     * @param {number} scale - Current scale
     * @param {number} translateX - Current X translation
     * @param {number} translateY - Current Y translation
     * @returns {Object} Adjusted transform values
     */
    calculateBoundaryConstraints(parentRect, containerRect, scale, translateX, translateY) {
        const padding = {
            x: window.innerWidth * this.config.zoom.viewportPadding,
            y: window.innerHeight * this.config.zoom.viewportPadding
        };

        // Verwende festes top padding
        const topPadding = this.config.zoom.topPadding || padding.y;

        // Calculate scaled dimensions
        const scaledParentWidth = parentRect.width * scale;
        const scaledParentHeight = parentRect.height * scale;

        // Calculate parent position relative to container (before scaling)
        const parentOffsetInContainer = {
            x: parentRect.left - containerRect.left,
            y: parentRect.top - containerRect.top
        };

        // Calculate viewport center
        const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // Calculate container center in viewport after transformation
        const transformedContainerCenter = {
            x: viewportCenter.x + translateX,
            y: viewportCenter.y + translateY
        };

        // Calculate parent bounds in viewport after transformation
        // Parent position = transformed container center + scaled parent offset - half of scaled container size
        const parentBounds = {
            left: transformedContainerCenter.x
                + (parentOffsetInContainer.x * scale)
                - (containerRect.width * scale / 2),
            top: transformedContainerCenter.y
                + (parentOffsetInContainer.y * scale)
                - (containerRect.height * scale / 2)
        };

        parentBounds.right = parentBounds.left + scaledParentWidth;
        parentBounds.bottom = parentBounds.top + scaledParentHeight;

        // Adjust translation to keep parent in viewport
        if (parentBounds.left > padding.x) {
            translateX -= (parentBounds.left - padding.x);
        } else if (parentBounds.right < window.innerWidth - padding.x) {
            translateX += (window.innerWidth - padding.x - parentBounds.right);
        }

        // KORRIGIERT: Verwende topPadding für oben, padding.y für unten
        if (parentBounds.top > topPadding) {
            translateY -= (parentBounds.top - topPadding);
        } else if (parentBounds.bottom < window.innerHeight - padding.y) {
            translateY += (window.innerHeight - padding.y - parentBounds.bottom);
        }

        // Apply push-right modifier
        const pushModifier = Math.max(1,
            (window.innerWidth - (parentBounds.left + scaledParentWidth / 2)) / 1000 * this.config.zoom.pushRight
        );
        translateX *= pushModifier;

        // Limit translation to reasonable bounds
        const maxTranslate = {
            x: (window.innerWidth * scale - window.innerWidth) / 2,
            y: (window.innerHeight * scale - window.innerHeight) / 2
        };

        translateX = Math.max(-maxTranslate.x, Math.min(maxTranslate.x, translateX));
        translateY = Math.max(-maxTranslate.y, Math.min(maxTranslate.y, translateY));

        return { x: translateX, y: translateY, scale };
    }

    /**
     * Zoom out one level
     */
    zoomOut() {
        if (this.state.zoomHistory.length === 0 || this.state.zooming) return;
        this.state.zooming = true;

        const lastZoom = this.state.zoomHistory.pop();
        this.state.zoomLevel--;
        this.state.zoomedMarker = null;

        // WICHTIG: ScrollExtension State zurücksetzen
        if (window.wpScrollExtension) {
            // Finde den Index des Markers, zu dem wir zurückkehren
            if (lastZoom.marker && this.state.zoomHistory.length > 0) {
                const previousZoom = this.state.zoomHistory[this.state.zoomHistory.length - 1];
                const previousMarkers = previousZoom.container?.querySelectorAll(this.config.selectors.marker);
                if (previousMarkers) {
                    const markerIndex = Array.from(previousMarkers).findIndex(m =>
                        m === previousZoom.marker
                    );
                    window.wpScrollExtension.state.currentMarkerIndex = markerIndex;
                }
            } else {
                // Komplett ausgezoomt - zurück zur Übersicht
                window.wpScrollExtension.state.currentMarkerIndex = -1;
            }
        }

        // Kill existing animation
        if (this.state.zoomTimeline) {
            this.state.zoomTimeline.kill();
        }

        // Hide current elements
        this.hideAllElements(() => {
            // Show global elements again if we're back at level 0
            if (this.state.zoomLevel === 0) {
                // Re-fetch global elements from root container
                this.state.globalElements = this.getGlobalElements();

                if (this.state.globalElements) {
                    // Show original global elements
                    Object.values(this.state.globalElements).forEach(elementArray => {
                        elementArray.forEach(el => {
                            if (el) {
                                el.classList.add(this.config.classes.open);
                            }
                        });
                    });
                }
            }
        });

        // Animate zoom out
        this.animateZoomOut(lastZoom);
    }

    /**
     * Reset state when zoom out is triggered externally (e.g., back button)
     */
    resetToOverview() {
        this.state.currentMarkerIndex = -1;
        this.state.isNavigating = false;
    }

    /**
     * Animate zoom out
     * @param {Object} zoomData - Previous zoom state
     */
    animateZoomOut(zoomData) {
        const tl = gsap.timeline({
            onComplete: () => {
                // Reset zoom state BEFORE re-initialization
                this.state.zooming = false;
                this.state.zoomTimeline = null;
                this.onZoomOutComplete(zoomData);
            }
        });

        // Animate back to original position
        tl.to(zoomData.container, {
            duration: this.config.animation.zoomOutDuration,
            scale: 1,
            x: 0,
            y: 0,
            ease: this.config.animation.ease,
            onComplete: () => {
                // Clear all transforms after animation
                gsap.set(zoomData.container, { clearProps: "all" });
            }
        });

        // Remove zoom classes halfway through animation
        tl.add(() => {
            zoomData.container.classList.remove(this.config.classes.zoomed);
            zoomData.marker.classList.remove(this.config.classes.zoomed);

            // Remove back button if this was the last zoom level
            if (this.state.zoomHistory.length === 0) {
                this.removeBackButton();
            }
        }, this.config.animation.zoomOutDuration * 0.5);

        this.state.zoomTimeline = tl;
    }

    /**
     * Handle zoom out completion
     * @param {Object} zoomData - Previous zoom state
     */
    onZoomOutComplete(zoomData) {
        // Reset state to previous container
        this.state.parentContainer = zoomData.parent;
        this.state.currentContainer = zoomData.container;

        // Re-initialize the parent container
        setTimeout(() => {
            const containerElement = zoomData.parent ||
                zoomData.container.closest(this.config.selectors.container);

            if (containerElement) {
                // Store current root to preserve it
                const currentRoot = this.state.rootContainer;
                this.initContainer(containerElement);
                // Ensure root container is preserved
                this.state.rootContainer = currentRoot;

                // Force re-attachment of all event listeners
                if (this.markers) {
                    this.markers.forEach((marker, index) => {
                        // Re-attach events
                        this.attachMarkerEvents(marker);

                        // Re-prepare canvas if image is loaded
                        const img = marker.querySelector(this.config.selectors.overlay);
                        if (img && img.complete && img.naturalWidth > 0) {
                            this.setupMarkerCanvas(marker, img, index);
                        }
                    });
                }

                // WICHTIGER FIX: ScrollExtension Marker aktualisieren
                if (window.wpScrollExtension) {
                    window.wpScrollExtension.refreshMarkers();
                    // Reset current marker index to overview state
                    window.wpScrollExtension.state.currentMarkerIndex = -1;
                }

                this.debug('Zoom-out complete, container re-initialized')
            }
        }, 100);
    }

    /**
     * Get related UI elements from specific container
     * @param {string} markerId - Marker ID
     * @param {HTMLElement} container - Container to search in
     * @returns {Object} Related elements
     */
    getRelatedElementsFromContainer(markerId, container) {
        // Always use root container for finding elements
        const searchContainer = this.state.rootContainer || container;

        if (!markerId || !searchContainer) return {};

        const escaped = CSS.escape(markerId.toString());
        const selector = `[data-hotspot-id="${escaped}"]`;

        return {
            side: searchContainer.querySelector(`${this.config.selectors.sideContent}${selector}`),
            person: searchContainer.querySelector(`${this.config.selectors.personImage}${selector}`),
            illustration: searchContainer.querySelector(`${this.config.selectors.illustrationImage}${selector}`),
            svgPath: searchContainer.querySelector(`${this.config.selectors.path}${selector}`)
        };
    }

    /**
     * Add back button
     */
    addBackButton() {
        this.removeBackButton();

        const btn = document.createElement('button');
        btn.className = 'zoom-back-btn';
        btn.textContent = 'Zurück';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();

            // Notify ScrollExtension before zooming out
            if (window.wpScrollExtension) {
                window.wpScrollExtension.syncWithMapperState();
            }

            this.zoomOut();
        });

        document.body.appendChild(btn);
    }

    /**
     * Remove back button
     */
    removeBackButton() {
        document.querySelectorAll('.zoom-back-btn').forEach(btn => btn.remove());
    }

    /**
     * Setup global event listeners (only for window events)
     */
    setupGlobalListeners() {
        // Only window-level events, no document events
        window.addEventListener('resize', this.boundHandlers.resize, { passive: true });
        document.addEventListener('keydown', this.boundHandlers.keydown);
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeydown(e) {
        // ESC to zoom out
        if (e.key === 'Escape' && this.state.zoomLevel > 0) {
            e.preventDefault();
            this.zoomOut();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Recalculate if zoomed
        if (this.state.zoomLevel > 0 && this.state.zoomedMarker) {
            // Could recalculate zoom here if needed
        }
    }

    /**
     * Observe DOM for new content
     */
    observeDOM() {
        if (typeof MutationObserver === 'undefined') return;

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.matches) {
                        // Only initialize new containers if we don't have a root yet
                        if (!this.state.rootContainer && node.matches(this.config.selectors.container)) {
                            this.initContainer(node);
                        } else if (node.querySelector) {
                            const containers = node.querySelectorAll(this.config.selectors.container);
                            if (!this.state.rootContainer && containers.length > 0) {
                                this.initContainer(containers[0]);
                            }
                        }
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Reset current state
     */
    resetCurrentState() {
        document.querySelectorAll(this.config.selectors.preview).forEach(p =>
            p.classList.remove(this.config.classes.current)
        );
    }

    /**
     * Clear canvas data
     */
    clearCanvasData() {
        this.canvasData.clear();
        this.markerZIndices = [];
    }

    /**
     * Utility: Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Public API: Destroy instance
     */
    destroy() {

        // Kill animations
        if (this.state.zoomTimeline) {
            this.state.zoomTimeline.kill();
        }

        this.stopSVGPositioning();
        this.activeCheckpoints.clear();
        this.svgPaths.clear();

        // Remove container event listeners
        document.querySelectorAll(this.config.selectors.container).forEach(container => {
            this.removeContainerListeners(container);
            container.classList.remove(this.config.classes.active);
            container.style.cursor = '';
        });

        // Remove global event listeners
        window.removeEventListener('resize', this.boundHandlers.resize);
        document.removeEventListener('keydown', this.boundHandlers.keydown);

        // Clean up markers
        if (this.markers) {
            this.markers.forEach(marker => this.detachMarkerEvents(marker));
        }

        // Clean up DOM
        this.removeBackButton();

        // Reset transforms
        if (this.state.currentContainer) {
            gsap.set(this.state.currentContainer, { clearProps: "all" });
        }

        // Stop observing
        if (this.observer) {
            this.observer.disconnect();
        }

        // Clear data
        this.clearCanvasData();

        // Reset state
        this.state.rootContainer = null;
        this.state.parentContainer = null;
        this.state.currentContainer = null;
        this.state.globalElements = null;
        this.state.currentlyVisibleElements.clear();

        this.debug('Image Mapper destroyed');
    }

    /**
     * Public API: Refresh instance
     */
    refresh() {
        this.debug('Refreshing Image Mapper...');
        // Store root container before destroy
        const oldRoot = this.state.rootContainer;
        this.destroy();
        // Reset root container to null for fresh init
        this.state.rootContainer = null;
        this.init();
    }

    /**
     * Debugging
     * @param {string} message displayed message
     * @param {object} object additional object
     */
    debug(message, object) {
        if (!this.config.debug) return;
        console.log(message, object)
    }
}

/**
 * Auto-initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    window.wpImageMapper = new WordPressImageMapper({
        zoom: {
            targetViewportHeight: 1,
            targetViewportWidth: 0.8,
            pushRight: 5,
            maxScaleBoost: 0.8,
            viewportPadding: 0.2,
            topPadding: 250
        },
        animation: {
            zoomDuration: 1.5,
            zoomOutDuration: 1.2,
            ease: 'power2.inOut',
            badgeDelay: 0.4,
            badgeDuration: 1.5,
            elementFadeOut: 0.3,
            elementFadeIn: 0.3
        },
        alphaThreshold: 10,
        debug: false
    });
});


/**
 * Scroll Extension for WordPress Image Mapper - FIXED VERSION
 * Adds scroll-based navigation through markers with proper marker switching
 */

class ScrollExtension {
    constructor(imageMapper, options = {}) {
        this.mapper = imageMapper;
        this.config = {
            mode: 'simple-animation', // 'live-scroll' or 'simple-animation'
            scrollSensitivity: 100, // pixels for simple-animation
            virtualScrollHeight: 400, // vh per marker for live-scroll
            autoPlayDelay: 0, // ms delay between auto animations
            enableKeyboardNavigation: true, // Enable arrow key navigation
            ...options
        };

        this.state = {
            isScrolling: false,
            currentMarkerIndex: -1, // -1 means no marker selected (zoomed out view)
            scrollProgress: 0,
            virtualScroll: 0,
            markers: [],
            isAutoPlaying: false,
            initialized: false,
            isNavigating: false // Prevent multiple simultaneous navigations
        };

        this.init();
    }

    init() {
        // Collect all markers in order
        this.collectMarkers();

        if (this.state.markers.length === 0) {
            console.log('No markers found, aborting scroll extension');
            return;
        }

        // Setup scroll handling based on mode
        if (this.config.mode === 'live-scroll') {
            this.initLiveScroll();
        } else {
            this.initSimpleAnimation();
        }

        // Setup keyboard navigation
        if (this.config.enableKeyboardNavigation) {
            this.setupKeyboardNavigation();
        }

        this.state.initialized = true;
        console.log(`Scroll Extension initialized in ${this.config.mode} mode with ${this.state.markers.length} markers`);
    }

    /**
     * Collect all markers in hierarchical order
     */
    collectMarkers() {
        const markers = [];

        // Get root level markers only for now
        const rootMarkers = this.mapper.markers;

        if (rootMarkers) {
            rootMarkers.forEach((marker, index) => {
                // Skip markers without proper setup
                if (!marker.dataset.hotspotId) {
                    marker.dataset.hotspotId = index.toString();
                }

                markers.push({
                    element: marker,
                    level: 0,
                    parent: null,
                    index: index,
                    id: marker.dataset.hotspotId
                });
            });
        }

        this.state.markers = markers;
        console.log(`Found ${markers.length} markers for scroll navigation`);
    }

    /**
     * Initialize simple animation mode
     */
    initSimpleAnimation() {
        let scrollAccumulator = 0;
        let lastScrollTime = 0;

        // Listen for wheel events
        const handleWheel = (e) => {
            // Check if overlay is open - NEW CHECK
            if (this.isOverlayOpen()) {
                return;
            }

            e.preventDefault();

            if (this.mapper.state.zooming) return;

            const now = Date.now();
            const timeDiff = now - lastScrollTime;

            // Reset accumulator if too much time passed
            if (timeDiff > 500) {
                scrollAccumulator = 0;
            }

            scrollAccumulator += e.deltaY;
            lastScrollTime = now;

            // Trigger animation when threshold reached
            if (Math.abs(scrollAccumulator) > this.config.scrollSensitivity) {
                if (scrollAccumulator > 0) {
                    this.nextMarker();
                } else {
                    this.previousMarker();
                }
                scrollAccumulator = 0;
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        this._wheelHandler = handleWheel;

        // Touch support
        this.setupTouchScroll();

        console.log('Simple animation mode initialized');
    }


    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        const handleKeydown = (e) => {
            // Check if overlay is open - NEW CHECK
            if (this.isOverlayOpen()) {
                return; // Let overlay handle keys
            }

            if (this.mapper.state.zooming) return;

            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextMarker();
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousMarker();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToStart();
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToEnd();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeydown);
        this._keydownHandler = handleKeydown;
    }

    /**
     * Setup touch scrolling
     */
    setupTouchScroll() {
        let touchStartY = 0;
        let touchAccumulator = 0;

        const handleTouchStart = (e) => {
            // Check if overlay is open - NEW CHECK
            if (this.isOverlayOpen()) {
                return;
            }

            touchStartY = e.touches[0].clientY;
            touchAccumulator = 0;
        };

        const handleTouchMove = (e) => {
            // Check if overlay is open - NEW CHECK
            if (this.isOverlayOpen()) {
                return;
            }

            if (this.mapper.state.zooming) return;

            const touchY = e.touches[0].clientY;
            const diff = touchStartY - touchY;
            touchAccumulator += diff;
            touchStartY = touchY;

            if (Math.abs(touchAccumulator) > this.config.scrollSensitivity / 2) {
                if (touchAccumulator > 0) {
                    this.nextMarker();
                } else {
                    this.previousMarker();
                }
                touchAccumulator = 0;
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });

        this._touchStartHandler = handleTouchStart;
        this._touchMoveHandler = handleTouchMove;
    }

    /**
     * Navigate to next marker
     */
    nextMarker() {
        // Check if overlay is open - NEW CHECK
        if (this.isOverlayOpen()) {
            return;
        }

        if (this.mapper.state.zooming) {
            return;
        }

        const nextIndex = this.state.currentMarkerIndex + 1;

        if (nextIndex < this.state.markers.length) {
            this.navigateToMarkerIndex(nextIndex);
        } else {
            console.log('Already at last marker');
        }
    }

    /**
     * Navigate to previous marker
     */
    previousMarker() {
        // Check if overlay is open - NEW CHECK
        if (this.isOverlayOpen()) {
            return;
        }

        if (this.mapper.state.zooming) {
            return;
        }

        const previousIndex = this.state.currentMarkerIndex - 1;

        if (previousIndex >= -1) {
            if (previousIndex === -1) {
                // Go back to overview (zoom out completely)
                this.goToOverview();
            } else {
                this.navigateToMarkerIndex(previousIndex);
            }
        } else {
            console.log('Already at beginning');
        }
    }

    /**
     * Navigate to specific marker index
     */
    navigateToMarkerIndex(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.state.markers.length) {
            return;
        }

        const currentIndex = this.state.currentMarkerIndex;
        const targetMarker = this.state.markers[targetIndex];

        console.log(`Navigating from marker ${currentIndex} to marker ${targetIndex}`);

        this.state.currentMarkerIndex = targetIndex;

        if (currentIndex === -1) {
            // Currently in overview, zoom to marker
            this.mapper.zoomToMarker(targetMarker.element);
        } else {
            // Currently viewing a marker, switch directly to another marker
            this.mapper.switchToMarker(targetMarker.element);

        }
    }

    /**
     * Go to overview (zoom out completely)
     */
    goToOverview() {
        if (this.mapper.state.zooming) {
            return;
        }

        this.state.currentMarkerIndex = -1;

        // Nur einmal auszoomen - Rest handled das normale System
        if (this.mapper.state.zoomLevel > 0) {
            this.mapper.zoomOut();
        }
    }

    /**
     * Go to start (first marker)
     */
    goToStart() {
        if (this.state.markers.length === 0) return;
        this.navigateToMarkerIndex(0);
    }

    /**
     * Go to end (last marker)
     */
    goToEnd() {
        if (this.state.markers.length === 0) return;
        this.navigateToMarkerIndex(this.state.markers.length - 1);
    }

    /**
     * Get current position info
     */
    getCurrentPosition() {
        return {
            currentIndex: this.state.currentMarkerIndex,
            totalMarkers: this.state.markers.length,
            isInOverview: this.state.currentMarkerIndex === -1,
            progress: this.state.currentMarkerIndex === -1 ? 0 :
                (this.state.currentMarkerIndex + 1) / this.state.markers.length
        };
    }

    /**
     * Initialize live scroll mode with GSAP ScrollTrigger (for future use)
     */
    initLiveScroll() {
        // Check if ScrollTrigger is available
        if (typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP ScrollTrigger not found, loading...');
            this.loadScrollTrigger(() => this.initLiveScroll());
            return;
        }

        // Register ScrollTrigger
        gsap.registerPlugin(ScrollTrigger);

        // Create virtual scroll container
        this.createVirtualScroll();

        // Setup scroll timeline
        this.setupScrollTimeline();
    }

    /**
     * Create virtual scroll container for live-scroll
     */
    createVirtualScroll() {
        // Remove existing container if any
        const existing = document.querySelector('.virtual-scroll-container');
        if (existing) existing.remove();

        // Create invisible scroll container
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'virtual-scroll-container';
        const totalHeight = this.state.markers.length * this.config.virtualScrollHeight;
        scrollContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 1px;
            height: ${totalHeight}vh;
            pointer-events: none;
            visibility: hidden;
        `;
        document.body.appendChild(scrollContainer);

        // Enable body scroll
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';

        this.virtualScrollContainer = scrollContainer;
        console.log(`Virtual scroll container created with height: ${totalHeight}vh`);
    }

    /**
     * Refresh markers after zoom changes
     */
    refreshMarkers() {
        // Store current state
        const previousIndex = this.state.currentMarkerIndex;

        // Re-collect markers from root level
        this.collectMarkers();

        // Sync with mapper state
        this.syncWithMapperState();

    }


    /**
     * Sync state with mapper's zoom level
     */
    syncWithMapperState() {
        if (this.mapper.state.zoomLevel === 0) {
            this.state.currentMarkerIndex = -1;
        } else if (this.mapper.state.zoomedMarker) {
            // Find index of current zoomed marker
            const markerIndex = this.state.markers.findIndex(m =>
                m.element === this.mapper.state.zoomedMarker
            );
            if (markerIndex !== -1) {
                this.state.currentMarkerIndex = markerIndex;
            }
        }
    }

    /**
     * Setup GSAP timeline controlled by scroll (for live-scroll mode)
     */
    setupScrollTimeline() {
        // Kill existing timeline if any
        if (this.scrollTimeline) {
            this.scrollTimeline.kill();
        }

        // Create master timeline
        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: this.virtualScrollContainer,
                start: "top top",
                end: "bottom bottom",
                scrub: 1, // Smooth scrubbing
                markers: false, // Set to true for debugging
                onUpdate: (self) => {
                    this.handleScrollProgress(self.progress);
                }
            }
        });

        // Add animations for each marker
        this.state.markers.forEach((markerData, index) => {
            const startTime = index;
            const duration = 1;

            // Create zoom timeline for this marker
            const markerTl = gsap.timeline();

            markerTl.to(this.mapper.state.currentContainer, {
                duration: duration,
                scale: () => {
                    const zoomData = this.mapper.calculateZoomTransform(markerData.element);
                    return zoomData.scale;
                },
                x: () => {
                    const zoomData = this.mapper.calculateZoomTransform(markerData.element);
                    return zoomData.translateX;
                },
                y: () => {
                    const zoomData = this.mapper.calculateZoomTransform(markerData.element);
                    return zoomData.translateY;
                },
                ease: "none",
                onStart: () => {
                    console.log(`Starting zoom to marker ${index + 1}`);
                    this.prepareMarkerZoom(markerData, index);
                },
                onComplete: () => {
                    console.log(`Completed zoom to marker ${index + 1}`);
                    this.completeMarkerZoom(markerData, index);
                }
            });

            timeline.add(markerTl, startTime);
        });

        this.scrollTimeline = timeline;
        console.log('Scroll timeline created');
    }

    /**
     * Handle scroll progress update (for live-scroll)
     */
    handleScrollProgress(progress) {
        this.state.scrollProgress = progress;

        // Calculate current marker
        const markerIndex = Math.min(
            Math.floor(progress * this.state.markers.length),
            this.state.markers.length - 1
        );

        if (markerIndex !== this.state.currentMarkerIndex && markerIndex >= 0) {
            this.state.currentMarkerIndex = markerIndex;
            console.log(`Scroll progress: ${(progress * 100).toFixed(1)}% - Marker ${markerIndex + 1}/${this.state.markers.length}`);
        }
    }

    /**
     * Prepare marker for zoom (live-scroll)
     */
    prepareMarkerZoom(markerData, index) {
        // Store current state
        this.state.currentMarkerIndex = index;

        // Add visual indicator
        markerData.element.classList.add('scroll-target');
    }

    /**
     * Complete marker zoom (live-scroll)
     */
    completeMarkerZoom(markerData, index) {
        // Update mapper state
        this.mapper.state.zoomedMarker = markerData.element;
        this.mapper.state.zoomLevel = markerData.level + 1;

        // Show related elements - KORREKTUR: targetMarker direkt übergeben
        const markerId = markerData.element.dataset.hotspotId;
        if (markerId) {
            this.mapper.showElementsForMarker(markerId, null, markerData.element);
        }

        // Remove visual indicator
        markerData.element.classList.remove('scroll-target');
    }

    /**
     * Utility function to check if overlay is open
     */
    isOverlayOpen() {
        // Check for global overlay instance
        if (window.wpOverlay && window.wpOverlay.state && window.wpOverlay.state.isOpen) {
            return true;
        }

        // Fallback: check for overlay container with active class
        const overlayContainer = document.querySelector('.wp-overlay-container.active');
        return overlayContainer !== null;
    }


    /**
     * Load ScrollTrigger plugin
     */
    loadScrollTrigger(callback) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    /**
     * Switch between modes
     */
    setMode(mode) {
        if (mode === this.config.mode) return;

        console.log(`Switching from ${this.config.mode} to ${mode}`);

        // Cleanup current mode
        this.cleanup();

        // Set new mode
        this.config.mode = mode;

        // Reinitialize
        this.init();
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Remove virtual scroll container
        if (this.virtualScrollContainer) {
            this.virtualScrollContainer.remove();
            this.virtualScrollContainer = null;
        }

        // Kill scroll timeline
        if (this.scrollTimeline) {
            this.scrollTimeline.kill();
            this.scrollTimeline = null;
        }

        // Remove ScrollTrigger instances
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        }

        // Remove event listeners
        if (this._wheelHandler) {
            window.removeEventListener('wheel', this._wheelHandler);
            this._wheelHandler = null;
        }
        if (this._touchStartHandler) {
            window.removeEventListener('touchstart', this._touchStartHandler);
            this._touchStartHandler = null;
        }
        if (this._touchMoveHandler) {
            window.removeEventListener('touchmove', this._touchMoveHandler);
            this._touchMoveHandler = null;
        }
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }

        // Reset body scroll
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.documentElement.style.overflow = '';

        // Reset container transforms
        if (this.mapper.state.currentContainer) {
            gsap.set(this.mapper.state.currentContainer, { clearProps: "all" });
        }

        // Reset state
        this.state.currentMarkerIndex = -1;
        this.state.scrollProgress = 0;
    }

    /**
     * Destroy extension
     */
    destroy() {
        console.log('Destroying scroll extension');
        this.cleanup();
        this.state.initialized = false;
    }
}