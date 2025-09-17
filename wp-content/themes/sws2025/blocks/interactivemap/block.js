/**
 * Interactive Map Block für WordPress
 * Refactored to use pbw.array.input system
 * Vollständig barrierefrei, DSGVO-konform, mit Geocoding
 */

// Helper function to strip HTML tags
const stripHtmlTags = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
};

// Escape Helper für HTML-Attribute
const escapeAttribute = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
};


// Geocoding Cache Helper
const geocodeCache = {};
const geocodeAddress = async (address) => {
    if (!address) return null;
    
    // Check cache first
    if (geocodeCache[address]) {
        return geocodeCache[address];
    }
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(address)}&format=json&limit=1`,
            {
                headers: {
                    'User-Agent': 'WordPress/' + window.location.hostname
                }
            }
        );
        
        // Rate limiting protection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const data = await response.json();
        if (data.length > 0) {
            const result = {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
            geocodeCache[address] = result;
            return result;
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return null;
};

// Block Registration
wp.blocks.registerBlockType('sws2025/interactivemap', {
    title: 'Interaktive Karte',
    description: 'Barrierefreie Karte mit mehreren Standorten',
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    supports: {
        align: ['wide', 'full']
    },
    
    attributes: {
        locations: {
            type: 'array',
            title: 'Standorte',
            description: 'Fügen Sie Ihre Standorte hinzu',
            default: [{
                address: { 
                    type: 'text', 
                    title: 'Adresse',
                    description: 'Vollständige Adresse für Geocoding'
                },
                latitude: { 
                    type: 'text', 
                    title: 'Breitengrad',
                    description: 'Wird automatisch ermittelt'
                },
                longitude: { 
                    type: 'text', 
                    title: 'Längengrad',
                    description: 'Wird automatisch ermittelt'
                },
                title: {
                    type: 'text',
                    title: 'Titel',
                    description: 'Überschrift für den Standort'
                },
                description: { 
                    type: 'text', 
                    title: 'Beschreibung',
                    description: 'Text im Popup-Fenster'
                },
                markerIcon: { 
                    type: 'img', 
                    title: 'Marker Icon',
                    description: 'Eigenes Icon (32x32px empfohlen)'
                }
            }]
        },

        mapId: {
            type: 'string',
            default: ''
        },
        
        mapHeight: pbw.choose.attr({ 
            default: '400',
            title: 'Kartenhöhe',
            description: 'Höhe der Karte in Pixeln'
        }),
        
        zoomLevel: pbw.choose.attr({ 
            default: '13',
            title: 'Zoom-Stufe',
            description: 'Standard Zoom der Karte'
        }),
        
        privacyMode: pbw.choose.attr({ 
            default: 'consent',
            title: 'Datenschutz-Modus',
            description: 'Wie soll die Karte geladen werden?'
        }),
        
        consentText: pbw.p.attr({
            default: 'Diese Karte nutzt OpenStreetMap. Beim Laden werden Daten an OSM-Server übertragen.',
            title: 'Consent-Text',
            description: 'Hinweistext vor dem Laden'
        }),
        
        showList: pbw.choose.attr({
            default: 'true',
            title: 'Standortliste zeigen',
            description: 'Textuelle Alternative für Screenreader'
        })
    },
    
    edit: function(props) {
        const { attributes, setAttributes } = props;

        const enhancedSetAttributes = createEnhancedSetAttributes(
            setAttributes, 
            props.name, 
            attributes
        );

        if (!attributes.mapId) {
            enhancedSetAttributes({ mapId: 'map-' + Math.random().toString(36).substr(2, 9) });
        }
        
        // Geocoding für einzelnen Standort
        const geocodeLocation = async (index) => {
            const location = attributes.locations[index];
            if (!Array.isArray(location)) return;
            
            const addressField = location.find(f => f.name === 'address');
            if (!addressField || !addressField.address) {
                alert('Bitte erst eine Adresse eingeben');
                return;
            }
            
            const coords = await geocodeAddress(addressField.address);
            if (coords) {
                const updatedLocations = [...attributes.locations];
                const currentItem = updatedLocations[index];
                
                currentItem.forEach(field => {
                    if (field.name === 'latitude') {
                        field.latitude = coords.lat.toString();
                    }
                    if (field.name === 'longitude') {
                        field.longitude = coords.lon.toString();
                    }
                });
                
                enhancedSetAttributes({ locations: updatedLocations });
                wp.data.dispatch('core/notices').createSuccessNotice(
                    'Koordinaten erfolgreich ermittelt!',
                    { type: 'snackbar', isDismissible: true }
                );
            } else {
                wp.data.dispatch('core/notices').createErrorNotice(
                    'Keine Koordinaten gefunden. Bitte Adresse prüfen.',
                    { type: 'snackbar', isDismissible: true }
                );
            }
        };
        
        // Custom Geocoding Button für Location Items
        const renderGeocodingButton = (index) => {
            const location = attributes.locations[index];
            if (!Array.isArray(location)) return null;
            
            const addressField = location.find(f => f.name === 'address');
            const latField = location.find(f => f.name === 'latitude');
            const lonField = location.find(f => f.name === 'longitude');
            
            return wp.element.createElement(
                'div',
                { 
                    style: {
                        backgroundColor: '#f0f8ff',
                        padding: '15px',
                        borderRadius: '6px',
                        marginBottom: '15px',
                        border: '1px solid #007cba'
                    }
                },
                wp.element.createElement(
                    wp.components.Button,
                    {
                        isPrimary: true,
                        onClick: () => geocodeLocation(index),
                        disabled: !addressField?.address,
                        style: { 
                            marginBottom: '10px',
                            display: 'block'
                        }
                    },
                    '🔍 Koordinaten für Standort ' + (index + 1) + ' ermitteln'
                ),
                
                // Koordinaten-Anzeige
                (latField?.latitude && lonField?.longitude) && 
                wp.element.createElement(
                    'div',
                    { 
                        style: { 
                            padding: '10px',
                            backgroundColor: '#d4edda',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }
                    },
                    `✓ Koordinaten: ${latField.latitude}, ${lonField.longitude}`
                )
            );
        };
        
        // Enhanced props für pbw.array.input mit Geocoding Integration
        const enhancedProps = {
            ...props,
            setAttributes: enhancedSetAttributes
        };
        
        // Editor UI
        return wp.element.createElement(
            wp.element.Fragment,
            null,
            
            pbw.block.title(props),
            
            // Inspector Controls
            wp.element.createElement(
                InspectorControls,
                null,
                
                // Karten-Einstellungen
                wp.element.createElement(
                    PanelBody,
                    { title: 'Karten-Einstellungen', initialOpen: true },
                    
                    pbw.choose.input(props, 'mapHeight', [
                        { label: '300px', value: '300' },
                        { label: '400px', value: '400' },
                        { label: '500px', value: '500' },
                        { label: '600px', value: '600' }
                    ]),
                    
                    pbw.choose.input(props, 'zoomLevel', [
                        { label: 'Weit (10)', value: '10' },
                        { label: 'Standard (13)', value: '13' },
                        { label: 'Nah (15)', value: '15' },
                        { label: 'Sehr nah (17)', value: '17' }
                    ])
                ),
                
                // Datenschutz
                wp.element.createElement(
                    PanelBody,
                    { title: 'Datenschutz', initialOpen: false },
                    
                    pbw.choose.input(props, 'privacyMode', [
                        { label: 'Mit Einwilligung (empfohlen)', value: 'consent' },
                        { label: 'Direkt laden', value: 'direct' }
                    ]),
                    
                    pbw.p.input(props, 'p', 'consentText'),
                    
                    pbw.choose.input(props, 'showList', [
                        { label: 'Ja', value: 'true' },
                        { label: 'Nein', value: 'false' }
                    ])
                )
            ),
            
            // Main Content
            wp.element.createElement(
                'div',
                { className: 'map-block-editor' },
                
                // Standorte verwalten mit pbw.array.input
                wp.element.createElement(
                    'details',
                    { 
                        open: true,
                        style: { 
                            marginBottom: '20px',
                            border: '2px solid #007cba',
                            borderRadius: '4px',
                            padding: '15px'
                        }
                    },
                    wp.element.createElement(
                        'summary',
                        { style: { cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' } },
                        '📍 Standorte verwalten'
                    ),
                    
                    // Hier wird das pbw.array.input verwendet
                    pbw.array.input(enhancedProps, 'locations'),
                    
                    // Geocoding Buttons für alle Standorte
                    attributes.locations.length > 0 && wp.element.createElement(
                        'div',
                        { 
                            style: { 
                                marginTop: '20px',
                                borderTop: '1px solid #ddd',
                                paddingTop: '15px'
                            }
                        },
                        wp.element.createElement('h4', null, '🗺️ Geocoding'),
                        attributes.locations.map((location, index) => renderGeocodingButton(index))
                    )
                ),
                
            )
        );
    },
    
    save: function(props) {
        const { attributes } = props;
        const mapId = attributes.mapId;
        
        // Prepare location data - Korrigierte Array-Verarbeitung
        const validLocations = [];
        let centerLat = 51.1657;
        let centerLon = 10.4515;
        
        // Direkte Array-Verarbeitung ohne pbw.array.output
        if (attributes.locations && Array.isArray(attributes.locations)) {
            attributes.locations.forEach((location, index) => {
                if (!Array.isArray(location)) return;
                
                // Extrahiere Felder aus Array-Struktur
                let lat = null, lon = null, title = '', description = '', icon = null, address = '';
                
                location.forEach(field => {
                    if (!field || !field.name) return;
                    
                    switch(field.name) {
                        case 'latitude':
                            lat = field.latitude ? parseFloat(field.latitude) : null;
                            break;
                        case 'longitude':
                            lon = field.longitude ? parseFloat(field.longitude) : null;
                            break;
                        case 'title':
                            title = field.title || '';
                            break;
                        case 'description':
                            description = field.description || '';
                            break;
                        case 'markerIcon':
                            icon = field.markerIcon || null;
                            break;
                        case 'address':
                            address = field.address || '';
                            break;
                    }
                });
                
                if (lat && lon) {
                    // Für JSON: Strip HTML tags für sichere Übertragung
                    const locationData = { 
                        lat, 
                        lon, 
                        title: stripHtmlTags(title),
                        description: stripHtmlTags(description), // Stripped für JSON
                        descriptionHtml: description, // Original HTML für spätere Verwendung
                        icon, 
                        address: stripHtmlTags(address),
                        addressHtml: address // Original HTML für Anzeige
                    };
                    validLocations.push(locationData);
                    
                    if (validLocations.length === 1) {
                        centerLat = lat;
                        centerLon = lon;
                    }
                }
            });
        }
        
        const mapConfig = {
            center: [centerLat, centerLon],
            zoom: parseInt(attributes.zoomLevel),
            locations: validLocations.map(loc => ({
                lat: loc.lat,
                lon: loc.lon,
                title: loc.title,
                description: loc.description, // Plain text für JSON
                icon: loc.icon,
                address: loc.address
            })),
            height: attributes.mapHeight,
            tileProvider: attributes.tileProvider || 'osm_standard',
            disableControls: true
        };
        
        return wp.element.createElement(
            'div',
            { 
                className: 'wp-block-interactive-map',
                'data-align': props.attributes.align
            },
            
            // Skip Link für Screenreader
            wp.element.createElement(
                'a',
                { 
                    href: '#map-text-' + mapId,
                    className: 'screen-reader-text skip-link'
                },
                'Karte überspringen und zur Standortliste'
            ),
            
            // Map Container
            wp.element.createElement(
                'div',
                {
                    className: 'map-container ' + (attributes.privacyMode === 'consent' ? 'requires-consent' : ''),
                    'data-map-id': mapId,
                    'data-map-config': escapeAttribute(JSON.stringify(mapConfig)),
                    'data-privacy-mode': attributes.privacyMode,
                    style: { height: attributes.mapHeight + 'px' }
                },
                
                // Consent Overlay (wenn aktiviert)
                attributes.privacyMode === 'consent' && wp.element.createElement(
                    'div',
                    { 
                        className: 'map-consent-overlay',
                        'data-map-id': mapId
                    },
                    wp.element.createElement(
                        'div',
                        { className: 'consent-content' },
                        wp.element.createElement(
                            'div',
                            { className: 'consent-icon' },
                            '🗺️'
                        ),
                        wp.element.createElement(
                            wp.blockEditor.RichText.Content,
                            { 
                                tagName: 'p',
                                value: attributes.consentText
                            }
                        ),
                        wp.element.createElement(
                            'button',
                            { 
                                className: 'button load-map-btn',
                                'data-map-id': mapId,
                                type: 'button'
                            },
                            'Karte laden'
                        )
                    )
                ),
                
                // Actual Map Element
                wp.element.createElement(
                    'div',
                    { 
                        id: mapId,
                        className: 'leaflet-map',
                        role: 'application',
                        'aria-label': `Interaktive Karte mit ${validLocations.length} Standorten`,
                        tabIndex: '0'
                    }
                )
            )
        );
    }
});