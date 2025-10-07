/**
 * Interactive Map Frontend Implementation
 * CSS Styles + JavaScript für Leaflet Integration
 */

/* ============================================================================
   JAVASCRIPT IMPLEMENTATION
   ============================================================================ */

// Tile Provider Definitionen mit hoher Qualität
const tileProviders = {
    osm_standard: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    },
    carto_positron: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 20,
        subdomains: 'abcd'
    },
    carto_dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 20,
        subdomains: 'abcd'
    },
    esri_satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        maxZoom: 18
    },
    osm_terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap (CC-BY-SA)',
        maxZoom: 17
    }
};

// Haupt-Initialisierungsfunktion
function initializeInteractiveMaps() {
    // Alle Karten-Container finden
    const mapContainers = document.querySelectorAll('.map-container');

    mapContainers.forEach(container => {
        const mapId = container.getAttribute('data-map-id');
        const mapConfig = JSON.parse(container.getAttribute('data-map-config') || '{}');
        const privacyMode = container.getAttribute('data-privacy-mode');

        if (privacyMode === 'consent') {
            setupConsentMode(container, mapId, mapConfig);
        } else {
            loadMap(mapId, mapConfig);
        }
    });
}

// Consent-Modus Setup
function setupConsentMode(container, mapId, mapConfig) {
    const loadBtn = container.querySelector('.load-map-btn');

    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            const overlay = container.querySelector('.map-consent-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
            loadMap(mapId, mapConfig);
        });
    }
}

// Karte laden und konfigurieren
function loadMap(mapId, config) {

    const mapElement = document.getElementById(mapId);
    if (!mapElement) return;

    // Map Style CSS anwenden
    const container = mapElement.closest('.map-container');
    if (config.mapStyle && config.mapStyle !== 'default') {
        container.classList.add('map-style-' + config.mapStyle);
    }

    // Karte initialisieren mit deaktivierten Controls
    // In der loadMap Funktion, beim Karte initialisieren:
    const map = L.map(mapId, {
        center: config.center || [51.1657, 10.4515],
        zoom: config.zoom || 13,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
        minZoom: config.minZoom || 2,  // Maximaler Zoom Out
        maxZoom: config.maxZoom || 18  // Optional: Maximaler Zoom In
    });

    // Tile Layer hinzufügen
    const provider = tileProviders[config.tileProvider] || tileProviders.osm_standard;

    L.tileLayer(provider.url, {
        attribution: provider.attribution,
        maxZoom: provider.maxZoom,
        subdomains: provider.subdomains || 'abc',
        // Hohe Qualität Settings
        tileSize: 256,
        zoomOffset: 0,
        detectRetina: true,  // Retina Display Support
        crossOrigin: true
    }).addTo(map);

    // Marker hinzufügen
    if (config.locations && config.locations.length > 0) {
        config.locations.forEach(location => {
            const marker = L.marker([location.lat, location.lon]);

            // Custom Icon wenn vorhanden
            if (location.icon) {
                const customIcon = L.icon({
                    iconUrl: location.icon,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });
                marker.setIcon(customIcon);
            }

            // Popup Content
            if (location.title || location.description) {
                let popupContent = '';
                if (location.title) {
                    popupContent += '<h3>' + location.title + '</h3>';
                }
                if (location.address) {
                    popupContent += '<p><strong>Adresse:</strong><br>' + location.address + '</p>';
                }
                if (location.description) {
                    popupContent += '<p>' + location.description + '</p>';
                }
                marker.bindPopup(popupContent);

                // Popup bei Hover statt Klick
                marker.on('mouseover', function () {
                    this.openPopup();
                });
                marker.on('mouseout', function () {
                    this.closePopup();
                });
            }

            marker.addTo(map);
        });

        // Auto-fit wenn mehrere Marker
        if (config.locations.length > 1) {
            const group = new L.featureGroup(
                config.locations.map(loc => L.marker([loc.lat, loc.lon]))
            );
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }


    // Keyboard Navigation für Accessibility
    mapElement.addEventListener('keydown', (e) => {
        const step = 0.01;
        const center = map.getCenter();

        switch (e.key) {
            case 'ArrowUp':
                map.setView([center.lat + step, center.lng]);
                e.preventDefault();
                break;
            case 'ArrowDown':
                map.setView([center.lat - step, center.lng]);
                e.preventDefault();
                break;
            case 'ArrowLeft':
                map.setView([center.lat, center.lng - step]);
                e.preventDefault();
                break;
            case 'ArrowRight':
                map.setView([center.lat, center.lng + step]);
                e.preventDefault();
                break;
            case '+':
            case '=':
                map.zoomIn();
                e.preventDefault();
                break;
            case '-':
                map.zoomOut();
                e.preventDefault();
                break;
        }
    });
}

// Auto-Initialize wenn DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInteractiveMaps);
} else {
    initializeInteractiveMaps();
}