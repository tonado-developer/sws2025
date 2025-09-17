// WordPress Interactivity API State Toggle
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.querySelector('.wp-block-navigation__responsive-container-open');
    const nav = document.querySelector('.wp-block-navigation__responsive-container');
    
    if (!btn || !nav) return;
    
    // Warten bis WordPress Interactivity API geladen ist
    function waitForInteractivity() {
        if (window.wp && window.wp.interactivity) {
            setupToggle();
        } else {
            setTimeout(waitForInteractivity, 100);
        }
    }
    
    function setupToggle() {
        const { store, getContext } = window.wp.interactivity;
        
        btn.addEventListener('click', function(e) {
            if (btn.classList.contains('menu-close-mode')) {
                // CLOSE MODE
                e.preventDefault();
                e.stopPropagation();
                
                // WordPress State auf false setzen
                try {
                    const context = getContext('core/navigation');
                    if (context) {
                        context.isMenuOpen = false;
                    }
                    
                    // Store State auch setzen
                    const storeData = store('core/navigation');
                    if (storeData && storeData.state) {
                        storeData.state.isMenuOpen = false;
                    }
                } catch (error) {
                    console.log('Fallback: Manual class removal');
                    nav.classList.remove('has-modal-open', 'is-menu-open');
                    document.body.classList.remove('has-modal-open');
                }
                
                // Button zurücksetzen
                btn.classList.remove('menu-close-mode');
                btn.setAttribute('aria-label', 'Menü öffnen');
                
                console.log('Menu closed via state');
                
            } else {
                // OPEN MODE - WordPress übernehmen lassen
                setTimeout(() => {
                    if (nav.classList.contains('is-menu-open')) {
                        btn.classList.add('menu-close-mode');
                        btn.setAttribute('aria-label', 'Menü schließen');
                        console.log('Menu opened, close mode activated');
                    }
                }, 50);
            }
        });
    }
    
    waitForInteractivity();
});

// Alternative: Direkte State Manipulation
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.querySelector('.wp-block-navigation__responsive-container-open');
    const nav = document.querySelector('.wp-block-navigation__responsive-container');
    
    if (!btn || !nav) return;
    
    btn.addEventListener('click', function(e) {
        if (btn.classList.contains('close-state')) {
            e.preventDefault();
            e.stopPropagation();
            
            // WordPress Interactivity State direkt setzen
            if (window.wp?.interactivity) {
                const { getContext, getElement } = window.wp.interactivity;
                
                try {
                    // Context vom Navigation Element holen
                    const navContext = getContext('core/navigation', nav);
                    if (navContext) {
                        navContext.isMenuOpen = false;
                    }
                    
                    // Element State setzen
                    const navElement = getElement(nav);
                    if (navElement && navElement.context) {
                        navElement.context.isMenuOpen = false;
                    }
                    
                    console.log('State set to false via Interactivity API');
                    
                } catch (error) {
                    // Fallback
                    console.log('Fallback to manual close');
                    nav.classList.remove('has-modal-open', 'is-menu-open');
                    document.body.classList.remove('has-modal-open');
                }
            }
            
            btn.classList.remove('close-state');
            btn.setAttribute('aria-label', 'Menü öffnen');
            
        } else {
            // Open - nach WordPress Verarbeitung state setzen
            setTimeout(() => {
                if (nav.classList.contains('is-menu-open')) {
                    btn.classList.add('close-state');
                    btn.setAttribute('aria-label', 'Menü schließen');
                }
            }, 50);
        }
    });
});

// Einfachste Lösung: Close Button Klick simulieren
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.querySelector('.wp-block-navigation__responsive-container-open');
    const nav = document.querySelector('.wp-block-navigation__responsive-container');
    
    if (!btn || !nav) return;
    
    btn.addEventListener('click', function(e) {
        if (btn.classList.contains('will-close')) {
            // Close Button finden und klicken
            e.preventDefault();
            e.stopPropagation();
            
            const closeBtn = nav.querySelector('.wp-block-navigation__responsive-container-close');
            if (closeBtn) {
                closeBtn.click();
                console.log('Triggered close button');
            } else {
                // Fallback
                nav.classList.remove('has-modal-open', 'is-menu-open');
                document.body.classList.remove('has-modal-open');
            }
            
            btn.classList.remove('will-close');
            btn.setAttribute('aria-label', 'Menü öffnen');
            
        } else {
            // Nach dem Öffnen close state setzen
            setTimeout(() => {
                if (nav.classList.contains('is-menu-open')) {
                    btn.classList.add('will-close');
                    btn.setAttribute('aria-label', 'Menü schließen');
                    console.log('Ready to close');
                }
            }, 100);
        }
    });
});

// Saubere Version mit Event Delegation
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.querySelector('.wp-block-navigation__responsive-container-open');
    const nav = document.querySelector('.wp-block-navigation__responsive-container');
    
    if (!btn || !nav) return;
    
    // Event Delegation auf höherer Ebene
    document.addEventListener('click', function(e) {
        if (e.target === btn || e.target.closest('.wp-block-navigation__responsive-container-open') === btn) {
            
            if (btn.classList.contains('is-closer')) {
                // Schließen durch Close-Button Simulation
                e.preventDefault();
                e.stopPropagation();
                
                const closeButton = document.querySelector('.wp-block-navigation__responsive-container-close');
                if (closeButton) {
                    // Close button programmatisch klicken
                    closeButton.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                }
                
                btn.classList.remove('is-closer');
                console.log('Close triggered');
                
            } else {
                // Nach Öffnung state setzen
                setTimeout(() => {
                    if (nav.classList.contains('is-menu-open')) {
                        btn.classList.add('is-closer');
                        console.log('Closer mode activated');
                    }
                }, 50);
            }
        }
    }, true);
});