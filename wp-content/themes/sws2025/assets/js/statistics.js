/**
 * StatisticsAnimate - Mit Dynamic Content Support
 * Animiert nur die Zahlen in gemischten Strings (< 700, > 500, etc.)
 */

class StatisticsAnimate {
    constructor(options = {}) {
        this.options = {
            parentClassname: 'wp-block-sws2025-statistics',
            itemClassname: 'numberWrap',
            animateNumberClassname: 'number',
            triggerAttributeName: 'data-appeared',
            triggerAttributeValue: 'true',
            durationAttribute: 'data-duration',
            
            duration: 1,
            easingPower: 1.5,
            observeDOM: true,
            debounceDelay: 100,
            debug: false,
            debugLevel: 'info',

            ...options
        };

        this.elements = new Map();
        this.observer = null;
        this.mutationObserver = null;
        this.attributeObservers = new Map();
        this.animations = new Map();
        this.debounceTimer = null;
        this.elementIdCounter = 0;
        
        this.debugStats = {
            elementsFound: 0,
            animationsStarted: 0,
            animationsCompleted: 0,
            errors: 0
        };

        this.debug('🚀 StatisticsAnimate initialized', this.options, 'info');
        this.init();
    }

    init() {
        this.collectElements();
        this.setupObserver();
        
        if (this.options.observeDOM) {
            this.setupDOMMutationObserver();
        }
        
        this.setupGlobalEvents();
    }

    collectElements(root = document) {
        const parents = root.querySelectorAll(`.${this.options.parentClassname}`);
        let addedCount = 0;

        if (parents.length === 0 && root === document) {
            return addedCount;
        }

        parents.forEach((parent, parentIndex) => {
            const items = parent.querySelectorAll(`.${this.options.itemClassname}`);

            items.forEach((item, itemIndex) => {
                if (this.getElementDataByItem(item)) {
                    return;
                }
                
                const numberElement = item.querySelector(`.${this.options.animateNumberClassname}`);

                if (numberElement) {
                    const dataNumber = numberElement.getAttribute('data-number') || numberElement.textContent;
                    const numberData = this.parseStringWithNumber(dataNumber);

                    if (!numberElement.getAttribute('data-number')) {
                        numberElement.setAttribute('data-number', dataNumber);
                    }

                    // Initial auf 0 setzen, aber Format beibehalten
                    if (numberElement.textContent.trim() === '' ||
                        numberElement.textContent.trim() === dataNumber) {
                        numberElement.textContent = numberData.prefix + '0' + numberData.suffix;
                    }

                    if (!isNaN(numberData.number) && numberData.number > 0) {
                        const elementId = `element-${++this.elementIdCounter}`;
                        const elementData = {
                            parent,
                            item,
                            numberElement,
                            targetNumber: numberData.number,
                            prefix: numberData.prefix,
                            suffix: numberData.suffix,
                            originalDataNumber: dataNumber,
                            hasAnimated: false,
                            id: elementId
                        };
                        
                        this.elements.set(elementId, elementData);
                        
                        if (this.observer) {
                            this.observer.observe(item);
                        }
                        
                        this.setupAttributeObserver(item, elementId);
                        
                        addedCount++;
                        this.debugStats.elementsFound++;
                    } else {
                        this.debugStats.errors++;
                    }
                }
            });
        });

        if (addedCount > 0 && root !== document) {
            this.debug(`📦 Added ${addedCount} new elements from container`, root, 'info');
            this.checkElementsInContainer(root);
        }

        return addedCount;
    }

    // Neue Methode: String in Prefix + Zahl + Suffix aufteilen
    parseStringWithNumber(str) {
        if (!str) return { prefix: '', number: 0, suffix: '' };
        
        const strTrimmed = str.toString().trim();
        
        // Regex um Zahl zu finden (inkl. Dezimalzahlen)
        const numberMatch = strTrimmed.match(/(\d+(?:[.,]\d+)?)/);
        
        if (!numberMatch) {
            return { prefix: strTrimmed, number: 0, suffix: '' };
        }
        
        const numberStr = numberMatch[0];
        const numberIndex = numberMatch.index;
        const number = parseFloat(numberStr.replace(',', '.'));
        
        const prefix = strTrimmed.substring(0, numberIndex);
        const suffix = strTrimmed.substring(numberIndex + numberStr.length);
        
        return {
            prefix,
            number: isNaN(number) ? 0 : number,
            suffix
        };
    }
    
    getElementDataByItem(item) {
        for (const [id, data] of this.elements) {
            if (data.item === item) {
                return data;
            }
        }
        return null;
    }
    
    setupDOMMutationObserver() {
        if (!('MutationObserver' in window)) return;
        
        this.mutationObserver = new MutationObserver((mutations) => {
            let shouldProcess = false;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (this.hasStatisticsElements(node)) {
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
        
        this.debug('🔄 DOM Mutation Observer active', null, 'info');
    }
    
    hasStatisticsElements(element) {
        if (element.classList && element.classList.contains(this.options.parentClassname)) {
            return true;
        }
        if (element.querySelector && element.querySelector(`.${this.options.parentClassname}`)) {
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
            this.debug(`🆕 Found ${this.elements.size - currentSize} new elements`, null, 'info');
        }
    }
    
    checkElementsInContainer(container) {
        setTimeout(() => {
            const parents = container.querySelectorAll(`.${this.options.parentClassname}`);
            
            parents.forEach(parent => {
                const items = parent.querySelectorAll(`.${this.options.itemClassname}`);
                
                items.forEach(item => {
                    if (this.isElementVisibleInContainer(item, container)) {
                        const elementData = this.getElementDataByItem(item);
                        if (elementData && item.getAttribute(this.options.triggerAttributeName) === this.options.triggerAttributeValue) {
                            this.debug(`🎯 Auto-triggering element in container: ${elementData.id}`, null, 'info');
                            this.animateItem(item);
                        }
                    }
                });
            });
        }, 50);
    }
    
    isElementVisibleInContainer(el, container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        
        return (
            elRect.top >= containerRect.top &&
            elRect.bottom <= containerRect.bottom &&
            el.offsetParent !== null
        );
    }
    
    setupGlobalEvents() {
        document.addEventListener('statisticsAnimate:refresh', () => {
            this.refresh();
        });
        
        document.addEventListener('statisticsAnimate:processContainer', (e) => {
            if (e.detail && e.detail.container) {
                this.processContainer(e.detail.container);
            }
        });
        
        document.addEventListener('ajax:complete', () => {
            this.debouncedProcessNewElements();
        });
        
        if (window.jQuery) {
            jQuery(document).on('ajaxComplete', () => {
                this.debouncedProcessNewElements();
            });
        }
        
        this.debug('🌐 Global event listeners active', null, 'info');
    }
    
    processContainer(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (!container) {
            this.debug('❌ Container not found', container, 'error');
            return;
        }
        
        this.debug('📦 Processing container manually', container, 'info');
        
        const addedCount = this.collectElements(container);
        if (addedCount > 0) {
            this.checkElementsInContainer(container);
        }
        
        return addedCount;
    }

    setupObserver() {
        if (this.elements.size === 0) {
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const item = entry.target;
                const elementData = this.getElementDataByItem(item);

                if (entry.isIntersecting && elementData) {
                    if (item.getAttribute(this.options.triggerAttributeName) === this.options.triggerAttributeValue) {
                        this.animateItem(item);
                    }
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -10% 0px'
        });

        this.elements.forEach(({ item }) => {
            this.observer.observe(item);
        });
    }

    setupAttributeObserver(item, elementId) {
        const attributeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' &&
                    mutation.attributeName === this.options.triggerAttributeName) {
                    
                    const newValue = item.getAttribute(this.options.triggerAttributeName);
                    
                    if (newValue === this.options.triggerAttributeValue) {
                        this.animateItem(item);
                    }
                }
            });
        });

        attributeObserver.observe(item, {
            attributes: true,
            attributeFilter: [this.options.triggerAttributeName],
            attributeOldValue: true
        });
        
        this.attributeObservers.set(elementId, attributeObserver);
    }

    animateItem(item) {
        const elementData = this.getElementDataByItem(item);

        if (!elementData || elementData.hasAnimated || this.animations.has(item)) {
            return;
        }

        elementData.hasAnimated = true;

        const duration = parseFloat(item.getAttribute(this.options.durationAttribute)) || this.options.duration;

        this.debug('🎬 Starting animation:', {
            elementId: elementData.id,
            targetNumber: elementData.targetNumber,
            prefix: elementData.prefix,
            suffix: elementData.suffix,
            duration: duration
        }, 'info');

        this.animateNumber(elementData, duration * 1000);
        this.debugStats.animationsStarted++;
    }

    animateNumber(elementData, duration) {
        const { numberElement, targetNumber, prefix, suffix, item, id } = elementData;

        if (this.animations.has(item)) {
            return;
        }

        let startNumber = 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOut = 1 - Math.pow(1 - progress, this.options.easingPower);
            const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * easeOut);

            // Formatierte Ausgabe mit Prefix und Suffix
            const formattedNumber = this.formatNumberWithContext(currentNumber, targetNumber);
            numberElement.textContent = prefix + formattedNumber + suffix;

            if (progress < 1) {
                const animationId = requestAnimationFrame(animate);
                this.animations.set(item, { animationId, type: 'animation' });
            } else {
                const finalFormatted = this.formatNumberWithContext(targetNumber, targetNumber);
                numberElement.textContent = prefix + finalFormatted + suffix;
                this.animations.delete(item);
                this.debugStats.animationsCompleted++;

                this.debug('✅ Animation completed:', {
                    elementId: id,
                    finalText: prefix + finalFormatted + suffix
                }, 'info');
            }
        };

        requestAnimationFrame(animate);
        this.animations.set(item, { type: 'animation' });
    }

    // Optimierte Formatierung nur für die Zahl
    formatNumberWithContext(current, target) {
        const targetStr = target.toString();
        let result;

        if (targetStr.includes('.') || targetStr.includes(',')) {
            result = current.toFixed(1);
        } else if (target >= 1000) {
            result = current.toLocaleString();
        } else {
            result = current.toString();
        }

        return result;
    }

    // Public methods
    refresh() {
        this.debug('🔄 Refreshing StatisticsAnimate...', null, 'info');
        this.processNewElements();
    }
    
    reset() {
        this.debug('🔄 Resetting all animations...', null, 'info');
        
        this.animations.forEach((animation, item) => {
            if (animation.animationId) {
                cancelAnimationFrame(animation.animationId);
            }
        });
        
        this.animations.clear();
        
        this.elements.forEach(elementData => {
            elementData.hasAnimated = false;
            elementData.numberElement.textContent = elementData.prefix + '0' + elementData.suffix;
            elementData.item.removeAttribute(this.options.triggerAttributeName);
        });
        
        this.debugStats.animationsStarted = 0;
        this.debugStats.animationsCompleted = 0;
    }

    destroy() {
        this.debug('💥 Destroying StatisticsAnimate instance...', null, 'info');

        this.reset();

        if (this.observer) {
            this.observer.disconnect();
        }
        
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        this.attributeObservers.forEach(observer => {
            observer.disconnect();
        });
        this.attributeObservers.clear();
        
        clearTimeout(this.debounceTimer);
        
        this.elements.clear();
    }

    triggerItem(item) {
        item.setAttribute(this.options.triggerAttributeName, this.options.triggerAttributeValue);
    }

    triggerAll() {
        this.elements.forEach(({ item }) => {
            this.triggerItem(item);
        });
    }

    getStats() {
        return {
            ...this.debugStats,
            totalElements: this.elements.size,
            activeAnimations: this.animations.size,
            observerActive: !!this.observer
        };
    }

    debug(message, object = null, level = 'info') {
        if (!this.options.debug) return;

        const levels = ['error', 'warn', 'info', 'verbose'];
        const currentLevelIndex = levels.indexOf(this.options.debugLevel);
        const messageLevelIndex = levels.indexOf(level);

        if (messageLevelIndex > currentLevelIndex) return;

        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[StatisticsAnimate ${timestamp}]`;

        const styles = {
            error: 'color: #ff4444; font-weight: bold;',
            warn: 'color: #ff8800; font-weight: bold;',
            info: 'color: #0088ff; font-weight: bold;',
            verbose: 'color: #888888;'
        };

        const style = styles[level] || styles.info;

        if (object !== null) {
            console.group(`%c${prefix} ${message}`, style);
            console.log(object);
            console.groupEnd();
        } else {
            console.log(`%c${prefix} ${message}`, style);
        }
    }
}

// Auto-Initialisierung
function initStatisticsAnimate(options = {}) {
    if (document.readyState === 'loading') {
        let instance = null;
        document.addEventListener('DOMContentLoaded', () => {
            instance = new StatisticsAnimate(options);
            window.statisticsAnimateInstance = instance;
        });
        return instance;
    } else {
        const instance = new StatisticsAnimate(options);
        window.statisticsAnimateInstance = instance;
        return instance;
    }
}

window.StatisticsAnimate = StatisticsAnimate;
window.initStatisticsAnimate = initStatisticsAnimate;

initStatisticsAnimate();

window.processStatisticsAnimate = (container) => {
    if (window.statisticsAnimateInstance) {
        window.statisticsAnimateInstance.processContainer(container);
    } else {
        setTimeout(() => {
            if (window.statisticsAnimateInstance) {
                window.statisticsAnimateInstance.processContainer(container);
            } else {
                console.warn('StatisticsAnimate: Creating emergency instance');
                window.statisticsAnimateInstance = new StatisticsAnimate();
                window.statisticsAnimateInstance.processContainer(container);
            }
        }, 100);
    }
};