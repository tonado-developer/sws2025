/**
 * WordPress Gutenberg Block Builder Framework - Enhanced Version
 * 
 * Ein umfassendes Framework für die Erstellung von WordPress Gutenberg Blöcken
 * mit automatischer Attribut-Migration für bestehende Blöcke
 * 
 * @author Programmierung-BW
 * @version 2.0.0
 * @requires WordPress 5.0+
 */

/**
 * WORDPRESS GUTENBERG API IMPORTS
 * =====================================================
 */

// BLOCK EDITOR KOMPONENTEN (wp.blockEditor)
// const {
//     URLInput,
//     URLInputButton,
//     InnerBlocks,
//     MediaUpload,
//     InspectorControls,
//     RichText,
//     useBlockProps,
//     ColorPalette
// } = wp.blockEditor;

// // UI KOMPONENTEN (wp.components) 
const {
    // Button,
    // PanelBody,
    // TextControl,
    // SelectControl,
    ExternalLink,
    // BaseControl
} = wp.components;

// // REACT-ÄHNLICHE FUNKTIONEN (wp.element)
// const {
//     createElement,
//     Fragment,
//     useState
// } = wp.element;

// BLOCK REGISTRATION (wp.blocks)
// const { registerBlockType } = wp.blocks;

// INTERNATIONALISIERUNG (wp.i18n) 
// const { __ } = wp.i18n;

/**
 * UTILITY FUNCTIONS
 * =====================================================
 */

/**
 * Sicherer Zugriff auf verschachtelte Objekte
 * @param {Object} obj - Das Objekt
 * @param {string} path - Der Pfad (z.B. 'a.b.c')
 * @param {*} defaultValue - Fallback-Wert
 */
function safeGet(obj, path, defaultValue = null) {
    return path.split('.').reduce((acc, part) =>
        acc && acc[part] !== undefined ? acc[part] : defaultValue, obj);
}

/**
 * Deep Clone für Objekte und Arrays
 * @param {*} obj - Zu klonendes Objekt
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Debounce für Performance-Optimierung
 * @param {Function} func - Die zu verzögernde Funktion
 * @param {number} wait - Wartezeit in ms
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * ENHANCED SETATTRIBUTES MIT AUTO-MIGRATION
 * =====================================================
 */

/**
 * Erweiterte setAttributes Funktion mit automatischer Attribut-Migration
 * Löst das Problem wenn neue Felder zu bestehenden Blöcken hinzugefügt werden
 */
function createEnhancedSetAttributes(originalSetAttributes, blockName, currentAttributes) {
    const blockType = wp.blocks.getBlockType(blockName);
    const definedAttributes = blockType?.attributes || {};

    // Cache für Performance
    const cache = new WeakMap();

    return function enhancedSetAttributes(newAttributes) {
        try {
            // 1. Migriere fehlende Attribute mit Default-Werten
            const migratedAttributes = { ...currentAttributes };

            Object.keys(definedAttributes).forEach(attrName => {
                if (!(attrName in migratedAttributes)) {
                    const attrConfig = definedAttributes[attrName];
                    migratedAttributes[attrName] = attrConfig.default !== undefined
                        ? attrConfig.default
                        : getDefaultForType(attrConfig.type);
                }
            });

            // 2. Spezielle Behandlung für Array-Attribute 
            Object.keys(definedAttributes).forEach(attrName => {
                const attrConfig = definedAttributes[attrName];
                if (attrConfig.type === 'array' && Array.isArray(migratedAttributes[attrName])) {
                    migratedAttributes[attrName] = migrateArrayStructure(
                        migratedAttributes[attrName],
                        attrConfig.default || []
                    );
                }
            });

            // 3. Validierung der neuen Attribute
            const validatedAttributes = validateAttributes(newAttributes, definedAttributes);

            // 4. Setze alle Attribute (alte + neue + Updates)
            const finalAttributes = {
                ...migratedAttributes,
                ...validatedAttributes
            };

            originalSetAttributes(finalAttributes);

        } catch (error) {
            console.error('[PBW Framework] Error in enhancedSetAttributes:', error);
            // Fallback: Setze nur die neuen Attribute
            originalSetAttributes(newAttributes);
        }
    };
}

/**
 * Validiert Attribute gegen ihre Definitionen
 */
function validateAttributes(attributes, definitions) {
    const validated = {};

    Object.keys(attributes).forEach(key => {
        const value = attributes[key];
        const definition = definitions[key];

        if (!definition) {
            validated[key] = value;
            return;
        }

        // Type checking und Konvertierung
        switch (definition.type) {
            case 'string':
                validated[key] = value != null ? String(value) : '';
                break;
            case 'number':
                validated[key] = !isNaN(value) ? Number(value) : 0;
                break;
            case 'boolean':
                validated[key] = Boolean(value);
                break;
            case 'array':
                validated[key] = Array.isArray(value) ? value : [];
                break;
            case 'object':
                validated[key] = value && typeof value === 'object' ? value : {};
                break;
            default:
                validated[key] = value;
        }
    });

    return validated;
}

/**
 * Migriert Array-Strukturen für neue Felder in bestehenden Array-Items
 */
function migrateArrayStructure(existingArray, templateArray) {
    if (!templateArray || templateArray.length === 0) return existingArray;

    const template = templateArray[0];
    const templateKeys = Object.keys(template);

    return existingArray.map(item => {
        if (!item) return null;

        // OBJEKT-FORMAT zu ARRAY-FORMAT konvertieren
        if (!Array.isArray(item) && typeof item === 'object') {
            const newArrayItem = [];

            templateKeys.forEach(fieldName => {
                const fieldConfig = template[fieldName];
                const existingData = item[fieldName] || {};

                const newField = {
                    name: fieldName,
                    type: fieldConfig.type,
                    label: fieldConfig.label || fieldName
                };

                if (fieldConfig.type === 'img') {
                    newField[fieldName] = existingData[fieldName] || null;
                    newField[fieldName + 'Alt'] = existingData[fieldName + 'Alt'] || '';
                    newField[fieldName + 'Data'] = existingData[fieldName + 'Data'] || '';
                    newField[fieldName + 'Id'] = existingData[fieldName + 'Id'] || null; // FIX: Id auch migrieren
                } else if (fieldConfig.type === 'nested_array') {
                    newField[fieldName] = existingData[fieldName] || [];
                } else if (fieldConfig.type === 'choose') {
                    newField[fieldName] = existingData[fieldName] || fieldConfig.default || '';
                } else {
                    newField[fieldName] = existingData[fieldName] || fieldConfig.default || '';
                }

                newArrayItem.push(newField);
            });

            return newArrayItem;
        }

        // ARRAY-FORMAT: Fehlende Felder hinzufügen
        if (Array.isArray(item)) {
            const migratedItem = [...item];

            templateKeys.forEach(fieldName => {
                const fieldConfig = template[fieldName];
                const existingField = migratedItem.find(field => field && field.name === fieldName);

                if (!existingField) {
                    const newField = {
                        name: fieldName,
                        type: fieldConfig.type,
                        label: fieldConfig.label || fieldName
                    };

                    if (fieldConfig.type === 'img') {
                        newField[fieldName] = null;
                        newField[fieldName + 'Alt'] = '';
                        newField[fieldName + 'Data'] = '';
                        newField[fieldName + 'Id'] = null; // FIX: Id auch initialisieren
                    } else if (fieldConfig.type === 'nested_array') {
                        newField[fieldName] = [];
                    } else if (fieldConfig.type === 'choose') {
                        newField[fieldName] = fieldConfig.default || '';
                    } else {
                        newField[fieldName] = fieldConfig.default || '';
                    }

                    migratedItem.push(newField);
                }
            });

            return migratedItem;
        }

        return item;
    }).filter(item => item !== null);
}

/**
 * Standard-Werte basierend auf Attribut-Typ
 */
function getDefaultForType(type) {
    const defaults = {
        'array': [],
        'object': {},
        'boolean': false,
        'number': 0,
        'string': '',
        'null': null
    };
    return defaults[type] || '';
}

/**
 * BLOCK ICON RENDERER
 * =====================================================
 */

/**
 * Rendert Block Icon aus verschiedenen Quellen
 * @param {*} icon - Icon Definition (string, element, object, function)
 */
function renderBlockIcon(icon) {
    if (!icon) return null;

    // Function die ein Icon returned
    if (typeof icon === 'function') {
        try {
            icon = icon();
        } catch (e) {
            console.warn('[PBW Framework] Error rendering icon function:', e);
            return null;
        }
    }

    // Dashicon (string)
    if (typeof icon === 'string') {
        return wp.element.createElement(
            'span',
            {
                className: `dashicons dashicons-${icon}`,
                style: {
                    fontSize: '24px',
                    width: '24px',
                    height: '24px',
                    marginRight: '10px',
                    display: 'inline-block',
                    lineHeight: '24px'
                }
            }
        );
    }

    // SVG Element oder React Component
    if (wp.element.isValidElement(icon)) {
        return wp.element.createElement(
            'span',
            {
                style: {
                    display: 'inline-block',
                    width: '24px',
                    height: '24px',
                    marginRight: '10px',
                    verticalAlign: 'middle'
                }
            },
            icon
        );
    }

    // Object mit verschiedenen Properties
    if (typeof icon === 'object' && icon !== null) {
        // Object mit src property
        if (icon.src !== undefined) {
            // src ist ein React Element
            if (wp.element.isValidElement(icon.src)) {
                return wp.element.createElement(
                    'span',
                    {
                        style: {
                            display: 'inline-block',
                            width: '24px',
                            height: '24px',
                            marginRight: '10px',
                            verticalAlign: 'middle'
                        }
                    },
                    icon.src
                );
            }

            // src ist ein String
            if (typeof icon.src === 'string') {
                // SVG String (inline)
                if (icon.src.includes('<svg')) {
                    return wp.element.createElement(
                        'span',
                        {
                            dangerouslySetInnerHTML: { __html: icon.src },
                            style: {
                                display: 'inline-block',
                                width: '24px',
                                height: '24px',
                                marginRight: '10px',
                                verticalAlign: 'middle'
                            }
                        }
                    );
                }

                // URL zu einem Bild
                if (icon.src.match(/\.(svg|png|jpg|jpeg|gif|webp)$/i) || icon.src.startsWith('http') || icon.src.startsWith('data:')) {
                    return wp.element.createElement(
                        'img',
                        {
                            src: icon.src,
                            alt: '',
                            style: {
                                width: '24px',
                                height: '24px',
                                marginRight: '10px',
                                verticalAlign: 'middle',
                                objectFit: 'contain'
                            }
                        }
                    );
                }

                // Dashicon name in src
                return wp.element.createElement(
                    'span',
                    {
                        className: `dashicons dashicons-${icon.src}`,
                        style: {
                            fontSize: '24px',
                            width: '24px',
                            height: '24px',
                            marginRight: '10px',
                            display: 'inline-block',
                            lineHeight: '24px'
                        }
                    }
                );
            }
        }

        // Object mit background/foreground (WordPress Core Block Style)
        if (icon.background || icon.foreground) {
            const iconContent = icon.foreground
                ? (typeof icon.foreground === 'string'
                    ? wp.element.createElement('span', {
                        dangerouslySetInnerHTML: { __html: icon.foreground }
                    })
                    : icon.foreground)
                : wp.element.createElement('span', null, '■');

            return wp.element.createElement(
                'span',
                {
                    style: {
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        backgroundColor: icon.background || '#555',
                        marginRight: '10px',
                        borderRadius: '2px',
                        position: 'relative',
                        verticalAlign: 'middle'
                    }
                },
                wp.element.createElement(
                    'span',
                    {
                        style: {
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '20px',
                            height: '20px',
                            fill: icon.foreground && typeof icon.foreground === 'string' && icon.foreground.startsWith('#')
                                ? icon.foreground
                                : '#fff'
                        }
                    },
                    iconContent
                )
            );
        }
    }

    // Fallback: Default Block Icon
    return wp.element.createElement(
        'span',
        {
            className: 'dashicons dashicons-block-default',
            style: {
                fontSize: '24px',
                width: '24px',
                height: '24px',
                marginRight: '10px',
                display: 'inline-block',
                lineHeight: '24px'
            }
        }
    );
}

/**
 * TEXT INPUT/OUTPUT FUNCTIONS
 * =====================================================
 */

function text_input(props, tag, name) {
    const { setAttributes } = props;

    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];

    const title = "✏️ " + (attributeConfig?.title || 'Text');

    // Debounced onChange für Performance
    const debouncedOnChange = debounce((value) => {
        setAttributes({ [name]: value });
    }, 300);

    return wp.element.createElement(
        'div',
        {
            className: 'field-group pbw-text-input',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s ease'
            }
        },
        wp.element.createElement(
            'h4',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#666',
                    fontSize: '12px'
                }
            },
            attributeConfig.description
        ),
        wp.element.createElement(
            wp.blockEditor.RichText,
            {
                tagName: tag,
                placeholder: attributeConfig?.placeholder || 'Text hier eingeben...',
                value: safeGet(props.attributes, name, ''),
                onChange: (value) => setAttributes({ [name]: value }),
                allowedFormats: attributeConfig?.allowedFormats || ['core/bold', 'core/italic', 'core/link'],
            }
        )
    );
}

function text_output(props, tag, name) {
    return props.attributes[name] ? wp.element.createElement(
        tag,
        {
            className: 'wp-block-' + tag,
            dangerouslySetInnerHTML: { __html: props.attributes[name] },
        }
    ) : "";
}

/**
 * MEDIA INPUT/OUTPUT FUNCTIONS - ENHANCED
 * =====================================================
 */

function media_input(props, name, options = {}) {
    const { setAttributes } = props;

    // Options mit Defaults
    const {
        allowedTypes = null, // null = alle Medientypen erlaubt
        title = null,
        description = null
    } = options;

    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, props.name, props.attributes);

    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];

    // Medientypen Priorität: Parameter > AttributeConfig > null (alle)
    const mediaTypes = allowedTypes || attributeConfig?.allowedTypes || null;

    const displayTitle = title || "🖼️ " + (attributeConfig?.title || 'Media');
    const displayDescription = description || attributeConfig?.description;

    const currentValue = safeGet(props.attributes, name);
    const currentAlt = safeGet(props.attributes, `${name}Alt`, '');

    const regularInput = wp.element.createElement(
        'div',
        {
            className: 'field-group pbw-media-input',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s ease'
            }
        },
        wp.element.createElement(
            'h4',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            displayTitle
        ),
        displayDescription && wp.element.createElement(
            'p',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#666',
                    fontSize: '12px'
                }
            },
            displayDescription
        ),
        wp.element.createElement(
            'div',
            {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }
            },
            // Media Preview
            currentValue && wp.element.createElement(
                'div',
                {
                    style: {
                        maxWidth: '300px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid #e0e0e0'
                    }
                },
                wp.element.createElement('img', {
                    src: currentValue,
                    alt: currentAlt || name,
                    style: {
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                    }
                })
            ),
            // Controls
            wp.element.createElement(
                'div',
                {
                    style: {
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                    }
                },
                wp.element.createElement(
                    wp.blockEditor.MediaUpload,
                    {
                        onSelect: (media) => {
                            enhancedSetAttributes({
                                [name]: media.url,
                                [name + 'Alt']: media.alt || '',
                                [name + 'Id']: media.id || null,
                                [name + 'Data']: JSON.stringify(media) || null
                            });
                        },
                        allowedTypes: mediaTypes,
                        value: props.attributes[name + 'Id'],
                        render: ({ open }) => wp.element.createElement(
                            wp.components.Button,
                            {
                                isPrimary: !currentValue,
                                isSecondary: !!currentValue,
                                onClick: open
                            },
                            !currentValue ? "Medium auswählen" : "Medium ändern"
                        )
                    }
                ),
                currentValue && wp.element.createElement(
                    wp.components.Button,
                    {
                        isDestructive: true,
                        onClick: () => enhancedSetAttributes({
                            [name]: null,
                            [name + 'Alt']: '',
                            [name + 'Id']: null,
                            [name + 'Data']: null
                        })
                    },
                    "Entfernen"
                )
            ),
            // Alt Text Input
            currentValue && wp.element.createElement(
                wp.components.TextControl,
                {
                    label: "Alt-Text",
                    placeholder: 'Beschreibung für Screenreader',
                    value: currentAlt,
                    onChange: (value) => enhancedSetAttributes({
                        [name + 'Alt']: value
                    }),
                    help: "Wichtig für SEO und Barrierefreiheit"
                }
            )
        )
    );

    return wp.element.createElement(
        wp.element.Fragment,
        null,
        regularInput
    );
}

/**
 * Media Output für Frontend mit automatischer Dateityp-Erkennung
 * Unterstützt: Bilder, Videos, Audio, PDFs, Dokumente
 * 
 * @param {Object} props - Block Properties
 * @param {string} name - Media Attributname
 * @param {Object} settings - Einstellungen
 * @param {string} settings.size - Eigene Größe vorgeben
 * @param {boolean} settings.fancybox - Aktiviert Fancybox
 * @param {string} settings.fancyboxGroup - Fancybox Gruppe
 * @param {boolean} settings.videoControls - Video Controls anzeigen (default: true)
 * @param {boolean} settings.audioControls - Audio Controls anzeigen (default: true)
 * @param {boolean} settings.autoplay - Autoplay für Video/Audio
 * @param {boolean} settings.loop - Loop für Video/Audio
 * @param {boolean} settings.muted - Muted für Video/Audio
 * @param {string} settings.className - Zusätzliche CSS-Klasse
 * @returns {React.Element|null}
 */
function media_output(props, name, settings = {}) {
    let mediaUrl = props.attributes[name];
    const mediaAlt = props.attributes[name + 'Alt'];
    const mediaId = props.attributes[name + 'Id'];
    const mediaDataRaw = props.attributes[name + 'Data'];
    const thumbnail = props.attributes["thumbnail"];

    const {
        size = null,
        fancybox = false,
        fancyboxGroup = 'gallery',
        videoControls = true,
        audioControls = true,
        autoplay = false,
        loop = false,
        muted = false,
        className = ''
    } = settings;

    // MediaData parsen
    let mediaData = null;
    let selectedSize = null;

    if (mediaDataRaw) {
        try {
            mediaData = JSON.parse(mediaDataRaw);

            console.log('[PBW Framework] Parsed mediaData:', mediaData);

            if (size && mediaData.sizes?.[size]) {
                selectedSize = mediaData.sizes[size];
                mediaUrl = selectedSize.url;
            } else if (!mediaUrl && mediaData.sizes?.full) {
                selectedSize = mediaData.sizes.full;
                mediaUrl = selectedSize.url;
            } else if (!mediaUrl && mediaData.url) {
                mediaUrl = mediaData.url;
            }
        } catch (e) {
            console.error('[PBW Framework] Invalid mediaData JSON:', e);
        }
    }

    if (!mediaUrl) return null;

    const alt = mediaAlt || mediaData?.alt || name;
    const fileExtension = String(mediaUrl?.url || mediaUrl || '')
        .split('.')
        .pop()
        .split('?')[0]
        .toLowerCase();

    const mediaTypes = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
        video: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
        audio: ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
        pdf: ['pdf'],
        document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'zip', 'rar']
    };

    const getMediaType = (ext) => {
        for (const [type, extensions] of Object.entries(mediaTypes)) {
            if (extensions.includes(ext)) return type;
        }
        return 'unknown';
    };

    const mediaType = getMediaType(fileExtension);

    // === VIDEO ===
    if (mediaType === 'video') {
        const videoProps = {
            src: mediaUrl,
            className: `media-video ${name} ${className}`.trim(),
            controls: videoControls,
            ...(autoplay && { autoPlay: true }),
            ...(loop && { loop: true }),
            ...(muted && { muted: true }),
            playsInline: true,
            ...(thumbnail && { poster: thumbnail })
        };

        const videoElement = wp.element.createElement('video', videoProps, "Ihr Browser unterstützt das Video-Tag nicht.");

        if (fancybox) {
            return wp.element.createElement(
                'figure',
                { className: "media-wrap media-wrap--video fancybox-enabled" },
                wp.element.createElement('a', {
                    href: mediaUrl,
                    'data-fancybox': fancyboxGroup,
                    'data-type': 'video',
                    className: 'fancybox'
                }, videoElement)
            );
        }

        return wp.element.createElement('figure', { className: "media-wrap media-wrap--video" }, videoElement);
    }

    // === AUDIO ===
    if (mediaType === 'audio') {
        const audioProps = {
            src: mediaUrl,
            className: `media-audio ${name} ${className}`.trim(),
            controls: audioControls,
            ...(autoplay && { autoPlay: true }),
            ...(loop && { loop: true }),
            ...(muted && { muted: true })
        };

        return wp.element.createElement(
            'figure',
            { className: "media-wrap media-wrap--audio" },
            wp.element.createElement('audio', audioProps, "Ihr Browser unterstützt das Audio-Tag nicht."),
            alt && wp.element.createElement('figcaption', { className: 'media-caption' }, alt)
        );
    }

    // === PDF ===
    if (mediaType === 'pdf') {
        return wp.element.createElement(
            'figure',
            { className: "media-wrap media-wrap--pdf" },
            wp.element.createElement('a', {
                href: mediaUrl,
                className: `media-pdf ${name} ${className}`.trim(),
                target: '_blank',
                rel: 'noopener noreferrer',
                ...(fancybox && {
                    'data-fancybox': fancyboxGroup,
                    'data-type': 'iframe'
                })
            },
                wp.element.createElement('span', { className: 'media-pdf__icon' }, '📄'),
                wp.element.createElement('span', { className: 'media-pdf__text' }, alt || 'PDF öffnen')
            )
        );
    }

    // === DOKUMENT ===
    if (mediaType === 'document') {
        return wp.element.createElement(
            'figure',
            { className: "media-wrap media-wrap--document" },
            wp.element.createElement('a', {
                href: mediaUrl,
                className: `media-document ${name} ${className}`.trim(),
                download: true
            },
                wp.element.createElement('span', { className: 'media-document__icon' }, '📎'),
                wp.element.createElement('span', { className: 'media-document__text' }, alt || 'Dokument herunterladen'),
                wp.element.createElement('span', { className: 'media-document__type' }, `.${fileExtension}`)
            )
        );
    }

    // === BILD (Standard) ===
    const imgWidth = selectedSize?.width || mediaData?.width;
    const imgHeight = selectedSize?.height || mediaData?.height;

    const imageElement = wp.element.createElement('img', {
        src: mediaUrl,
        alt: alt,
        className: `media-image ${name} ${className}`.trim(),
        loading: 'lazy',
        ...(imgWidth && { width: imgWidth }),
        ...(imgHeight && { height: imgHeight })
    });

    if (fancybox) {
        return wp.element.createElement(
            'figure',
            { className: "media-wrap media-wrap--image fancybox-enabled" },
            wp.element.createElement('a', {
                href: mediaData?.sizes?.full?.url || mediaUrl,
                'data-fancybox': fancyboxGroup,
                'data-caption': alt,
                className: 'fancybox'
            }, imageElement)
        );
    }

    return wp.element.createElement('figure', { className: "media-wrap media-wrap--image" }, imageElement);
}

/**
 * LINK INPUT/OUTPUT FUNCTIONS
 * =====================================================
 */

function link_input(props, name) {
    const { setAttributes } = props;

    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];
    const title = (attributeConfig?.title || "🔗 Link");

    const currentValue = safeGet(props.attributes, name, '');

    const regularInput = wp.element.createElement(
        BaseControl,
        {
            // label: "URL",
            // help: "Vollständige URL mit https://"
        },
        wp.element.createElement(URLInputButton, {
            url: currentValue,
            onChange: (url) => setAttributes({ [name]: url })
        })
    );

    return wp.element.createElement(
        'div',
        {
            className: 'field-group pbw-link-input',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s ease'
            }
        },
        wp.element.createElement(
            'h4',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#666',
                    fontSize: '12px'
                }
            },
            attributeConfig.description
        ),
        regularInput,
        currentValue && wp.element.createElement(
            'div',
            {
                style: {
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '3px',
                    fontSize: '12px',
                    wordBreak: 'break-all'
                }
            },
            wp.element.createElement(ExternalLink, { href: currentValue }, currentValue)
        )
    );
}

function link_output(props, name, content = null) {
    return props.attributes[name] && wp.element.createElement('a', {
        href: props.attributes[name],
        className: name,
    }, content)
}

/**
 * SELECT INPUT/OUTPUT FUNCTIONS
 * =====================================================
 */

function select_input(props, name, options) {
    const { setAttributes } = props;

    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];
    const title = "📝 " + (attributeConfig?.title || 'Auswahl');

    const currentValue = safeGet(props.attributes, name, '');

    const options_array = typeof options === 'function'
        ? options(props)
        : (options || attributeConfig?.options || [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' },
            { label: 'Option 3', value: 'option3' }
        ]);

    return wp.element.createElement(
        'div',
        {
            className: 'field-group pbw-select-input',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s ease'
            }
        },
        wp.element.createElement(
            'h4',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#666',
                    fontSize: '12px'
                }
            },
            attributeConfig.description
        ),
        wp.element.createElement(
            SelectControl,
            {
                value: currentValue,
                options: options_array,
                onChange: (value) => setAttributes({ [name]: value }),
                className: 'wp-block-select'
            }
        )
    );
}

function select_output(props, name) {
    return safeGet(props.attributes, name, '');
}

/**
 * ARRAY MANAGEMENT FUNCTIONS - ENHANCED
 * =====================================================
 */

function array_addblock(props, name, items) {
    const { setAttributes } = props;
    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, props.name, props.attributes);

    const addBlock = () => {
        try {
            const newItem = [];
            const template = items[0];

            if (!template) {
                console.warn('[PBW Framework] No template found for array items');
                return;
            }

            Object.keys(template).forEach(key => {
                const config = template[key];
                const newField = {
                    name: key,
                    type: config.type,
                    label: config.label || key
                };

                if (config.type === 'img') {
                    newField[key] = null;
                    newField[key + 'Alt'] = '';
                    newField[key + 'Data'] = ''; // FIX: Data als String
                    newField[key + 'Id'] = null;  // FIX: Id hinzufügen
                } else if (config.type === 'nested_array') {
                    newField[key] = [];
                } else {
                    newField[key] = config.default || '';
                }

                newItem.push(newField);
            });

            const currentArray = props.attributes[name] || [];
            enhancedSetAttributes({
                [name]: [...currentArray, newItem]
            });
        } catch (error) {
            console.error('[PBW Framework] Error adding array block:', error);
        }
    };

    return wp.element.createElement(
        wp.components.Button,
        {
            isPrimary: true,
            onClick: addBlock,
            className: 'pbw-add-block-btn'
        },
        'Neuer Block hinzufügen'
    );
}

function array_removeblock(props, name, index) {
    const { setAttributes } = props;

    // Erstelle enhanced setAttributes
    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, props.name, props.attributes);

    const removeBlock = () => {
        try {
            const newBlocks = [...(props.attributes[name] || [])];
            newBlocks.splice(index, 1);
            enhancedSetAttributes({ [name]: newBlocks });
        } catch (error) {
            console.error('[PBW Framework] Error removing array block:', error);
        }
    };

    return wp.element.createElement(wp.components.Button, {
        isDestructive: true,
        isSmall: true,
        onClick: removeBlock,
        className: 'is-primary pbw-remove-block-btn'
    }, '✕');
}

/**
 * Array input funciton
 * ===================================================================
 */

function array_input(props, field, params = {}) {
    const { name, attributes, setAttributes } = props;

    // Extrahiere Parameter mit Defaults
    const {
        minimum = 0,
        maximum = null, // null = unbegrenzt
        showCounter = true,
        addButtonText = 'Element hinzufügen',
        removeConfirm = false,
        sortable = true,
        emptyMessage = 'Noch keine Elemente vorhanden',
        open = true
    } = params;

    // Erstelle enhanced setAttributes einmalig
    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, name, attributes);

    const blockType = wp.blocks.getBlockType(name);
    const attributeConfig = blockType?.attributes?.[field];
    const defaultItems = attributeConfig?.default || [];

    const arrayTitle = "📚 " + (attributeConfig?.title || 'Elemente');
    const arrayDescription = attributeConfig?.description;

    const currentItems = attributes[field] || [];

    // Validierung: Minimum Items beim Init prüfen
    React.useEffect(() => {
        if (minimum > 0 && currentItems.length < minimum) {
            const itemsToAdd = minimum - currentItems.length;
            const newItems = [...currentItems];

            for (let i = 0; i < itemsToAdd; i++) {
                newItems.push(deepClone(defaultItems[0] || {}));
            }

            enhancedSetAttributes({ [field]: newItems });
        }
    }, [minimum]);

    const setItemsCallback = (newItems) => {
        // Validierung vor dem Setzen
        if (minimum > 0 && newItems.length < minimum) {
            console.warn(`[PBW Framework] Minimum ${minimum} Items erforderlich`);
            return;
        }

        if (maximum !== null && newItems.length > maximum) {
            console.warn(`[PBW Framework] Maximum ${maximum} Items erlaubt`);
            return;
        }

        enhancedSetAttributes({ [field]: newItems });
    };

    /**
     * ENHANCED EDITITEM MIT AUTO-MIGRATION
     */
    const editItem = createEditItem(currentItems, setItemsCallback, defaultItems);



    const moveItemUp = (index) => {
        if (index === 0 || !sortable) return;
        const updatedItems = [...currentItems];
        [updatedItems[index], updatedItems[index - 1]] = [updatedItems[index - 1], updatedItems[index]];
        setItemsCallback(updatedItems);
    };

    const moveItemDown = (index) => {
        if (index === currentItems.length - 1 || !sortable) return;
        const updatedItems = [...currentItems];
        [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
        setItemsCallback(updatedItems);
    };

    const canRemoveItem = () => {
        return currentItems.length > minimum;
    };

    const canAddItem = () => {
        return maximum === null || currentItems.length < maximum;
    };

    const handleRemoveItem = (index) => {
        if (!canRemoveItem()) {
            return;
        }

        const performRemove = () => {
            const updatedItems = currentItems.filter((_, i) => i !== index);
            setItemsCallback(updatedItems);
        };

        if (removeConfirm) {
            if (window.confirm('Möchten Sie dieses Element wirklich entfernen?')) {
                performRemove();
            }
        } else {
            performRemove();
        }
    };

    // Erweiterte Add-Button Logik
    const renderAddButton = () => {
        if (!canAddItem()) {
            return wp.element.createElement(
                'div',
                {
                    style: {
                        textAlign: 'center',
                        padding: '8px',
                        color: '#999',
                        fontStyle: 'italic'
                    }
                },
                maximum !== null ? `Maximum erreicht (${maximum} Elemente)` : ''
            );
        }

        return wp.element.createElement(
            Button,
            {
                isPrimary: true,
                isSmall: true,
                icon: 'plus-alt',
                onClick: () => {
                    if (canAddItem()) {
                        const newItem = deepClone(defaultItems[0] || {});
                        const updatedItems = [...currentItems, newItem];
                        setItemsCallback(updatedItems);
                    }
                }
            },
            addButtonText
        );
    };

    // Erweiterte Remove-Button Logik
    const renderRemoveButton = (index) => {
        if (!canRemoveItem()) {
            return wp.element.createElement(
                Button,
                {
                    isSmall: true,
                    isDestructive: true,
                    icon: 'trash',
                    disabled: true,
                    title: `Minimum ${minimum} Elemente erforderlich`
                }
            );
        }

        return wp.element.createElement(
            Button,
            {
                isSmall: true,
                isDestructive: true,
                icon: 'trash',
                onClick: () => handleRemoveItem(index),
                label: 'Entfernen'
            }
        );
    };

    return wp.element.createElement(
        'div',
        {
            className: 'field-group pbw-array-input',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement(
            'h4',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center'
                }
            },
            `${arrayTitle} `,
            showCounter && wp.element.createElement(
                'span',
                {
                    style: {
                        marginLeft: '8px',
                        padding: '2px 8px',
                        backgroundColor: '#007cba',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'normal'
                    }
                },
                `${currentItems.length}${maximum !== null ? `/${maximum}` : ''}`
            ),
            // Min/Max Indicator
            (minimum > 0 || maximum !== null) && wp.element.createElement(
                'span',
                {
                    style: {
                        marginLeft: '8px',
                        padding: '2px 6px',
                        backgroundColor: '#f0f0f0',
                        color: '#666',
                        borderRadius: '4px',
                        fontSize: '11px'
                    }
                },
                `${minimum > 0 ? `Min: ${minimum}` : ''}${minimum > 0 && maximum !== null ? ' | ' : ''}${maximum !== null ? `Max: ${maximum}` : ''}`
            )
        ),
        arrayDescription && wp.element.createElement(
            'p',
            {
                style: {
                    margin: '0 0 12px 0',
                    color: '#666',
                    fontSize: '12px'
                }
            },
            arrayDescription
        ),
        currentItems.length === 0 ?
            wp.element.createElement(
                'div',
                {
                    style: {
                        padding: '20px',
                        textAlign: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }
                },
                wp.element.createElement(
                    'p',
                    { style: { margin: '0 0 10px 0', color: '#666' } },
                    emptyMessage
                ),
                renderAddButton()
            ) :
            currentItems.map((item, index) => {
                return wp.element.createElement(
                    'div',
                    {
                        className: 'pbw-array-item',
                        key: index,
                        style: {
                            backgroundColor: '#f9f9f9',
                            padding: '15px',
                            borderRadius: '4px',
                            marginBottom: '10px',
                            border: '1px solid #e0e0e0',
                            position: 'relative'
                        }
                    },
                    wp.element.createElement(
                        'div',
                        {
                            className: 'item-header',
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '15px',
                                paddingBottom: '10px',
                                borderBottom: '1px solid #e0e0e0'
                            }
                        },
                        open ?? wp.element.createElement('span', {
                            className: 'item-title',
                            style: {
                                fontWeight: '600',
                                color: '#2c3e50'
                            }
                        }, `Element #${index + 1}`),
                        wp.element.createElement(
                            'div',
                            {
                                className: 'item-controls',
                                style: { display: 'flex', gap: '4px' }
                            },
                            sortable && index > 0 && wp.element.createElement(
                                Button,
                                {
                                    isSmall: true,
                                    isSecondary: true,
                                    icon: 'arrow-up-alt2',
                                    onClick: () => moveItemUp(index),
                                    label: 'Nach oben'
                                }
                            ),
                            sortable && index < currentItems.length - 1 && wp.element.createElement(
                                Button,
                                {
                                    isSmall: true,
                                    isSecondary: true,
                                    icon: 'arrow-down-alt2',
                                    onClick: () => moveItemDown(index),
                                    label: 'Nach unten'
                                }
                            ),
                            renderRemoveButton(index)
                        )
                    ),
                    open ? wp.element.createElement(
                        'div',
                        { className: 'pbw-array-item-content' },
                        Object.keys(defaultItems[0] || {}).map((fieldName, fieldIndex) => {
                            const fieldConfig = defaultItems[0][fieldName];
                            /**
                             * ENHANCED CREATETEMPPROPS MIT DEFENSIVE PROGRAMMIERUNG
                             */
                            const tempProps = createTempProps(index, fieldName, fieldConfig.type, fieldConfig, currentItems, editItem, props);
                            const tempKey = `temp_${index}_${fieldName}`;

                            const originalBlockType = wp.blocks.getBlockType(props.name);
                            if (originalBlockType && !originalBlockType.attributes[tempKey]) {
                                originalBlockType.attributes[tempKey] = {
                                    title: fieldConfig?.title,
                                    description: fieldConfig?.description,
                                    placeholder: fieldConfig?.placeholder,
                                    allowedFormats: fieldConfig?.allowedFormats,
                                    allowedTypes: fieldConfig?.allowedTypes,
                                    options: fieldConfig?.options
                                };
                            }

                            return wp.element.createElement(
                                'div',
                                {
                                    className: `pbw-array-field pbw-field-${fieldConfig.type}`,
                                    key: fieldIndex,
                                },
                                fieldConfig.type === 'text' && text_input(tempProps, 'p', tempKey),
                                fieldConfig.type === 'link' && link_input(tempProps, tempKey),
                                fieldConfig.type === 'img' && media_input(tempProps, tempKey),
                                fieldConfig.type === 'choose' && select_input(tempProps, tempKey, fieldConfig.options),
                                fieldConfig.type === 'nested_array' && nested_array_input(props, index, field, fieldName, fieldConfig)
                            );
                        })
                    ) : group(`Element #${index + 1}`, { open: false },
                        // Side Headline
                        Object.keys(defaultItems[0] || {}).map((fieldName, fieldIndex) => {
                            const fieldConfig = defaultItems[0][fieldName];
                            /**
                             * ENHANCED CREATETEMPPROPS MIT DEFENSIVE PROGRAMMIERUNG
                             */
                            const tempProps = createTempProps(index, fieldName, fieldConfig.type, fieldConfig, currentItems, editItem, props);
                            const tempKey = `temp_${index}_${fieldName}`;

                            const originalBlockType = wp.blocks.getBlockType(props.name);
                            if (originalBlockType && !originalBlockType.attributes[tempKey]) {
                                originalBlockType.attributes[tempKey] = {
                                    title: fieldConfig?.title,
                                    description: fieldConfig?.description,
                                    placeholder: fieldConfig?.placeholder,
                                    allowedFormats: fieldConfig?.allowedFormats,
                                    allowedTypes: fieldConfig?.allowedTypes,
                                    options: fieldConfig?.options
                                };
                            }

                            return wp.element.createElement(
                                'div',
                                {
                                    className: `pbw-array-field pbw-field-${fieldConfig.type}`,
                                    key: fieldIndex,
                                },
                                fieldConfig.type === 'text' && text_input(tempProps, 'p', tempKey),
                                fieldConfig.type === 'link' && link_input(tempProps, tempKey),
                                fieldConfig.type === 'img' && media_input(tempProps, tempKey),
                                fieldConfig.type === 'choose' && select_input(tempProps, tempKey, fieldConfig.options),
                                fieldConfig.type === 'nested_array' && nested_array_input(props, index, field, fieldName, fieldConfig)
                            );
                        })
                    )
                );
            }),
        currentItems.length > 0 && wp.element.createElement(
            'div',
            { className: 'array-add-button', style: { marginTop: '10px', textAlign: 'center' } },
            renderAddButton()
        )
    );
}

function createTempProps(index, fieldName, type, fieldConfig, currentItems, editItem, props) {
    const currentItem = currentItems[index];
    let fieldData = {};

    if (Array.isArray(currentItem)) {
        const foundField = currentItem.find(item => item && item.name === fieldName);
        fieldData = foundField || {};
    } else if (typeof currentItem === 'object' && currentItem[fieldName]) {
        fieldData = currentItem[fieldName];
    }

    const tempKey = `temp_${index}_${fieldName}`;
    const tempAltKey = `temp_${index}_${fieldName}Alt`;
    const tempIdKey = `temp_${index}_${fieldName}Id`;
    const tempDataKey = `temp_${index}_${fieldName}Data`;

    const tempProps = {
        name: props.name,
        attributes: {},
        setAttributes: (newAttrs) => {
            const updateData = {};

            // FIX: Alle Media-Attribute übertragen
            if (tempKey in newAttrs) {
                updateData[fieldName] = newAttrs[tempKey];
            }
            if (tempAltKey in newAttrs) {
                updateData[`${fieldName}Alt`] = newAttrs[tempAltKey];
            }
            if (tempIdKey in newAttrs) {
                updateData[`${fieldName}Id`] = newAttrs[tempIdKey];
            }
            if (tempDataKey in newAttrs) {
                updateData[`${fieldName}Data`] = newAttrs[tempDataKey];
            }

            if (Object.keys(updateData).length > 0) {
                editItem(index, fieldName, updateData);
            }
        }
    };

    if (type === 'img') {
        tempProps.attributes[tempKey] = fieldData[fieldName] || '';
        tempProps.attributes[tempAltKey] = fieldData[`${fieldName}Alt`] || '';
        tempProps.attributes[tempIdKey] = fieldData[`${fieldName}Id`] || null;
        tempProps.attributes[tempDataKey] = fieldData[`${fieldName}Data`] || '';
    } else {
        tempProps.attributes[tempKey] = fieldData[fieldName] || '';
    }

    return tempProps;
}

function createEditItem(currentItems, setItemsCallback, defaultItems) {
    return (index, fieldName, newValues) => {
        try {
            const updatedItems = deepClone(currentItems);

            if (index >= updatedItems.length || updatedItems[index] === undefined) {
                return;
            }

            let currentItem = updatedItems[index];

            if (Array.isArray(currentItem)) {
                let fieldIndex = currentItem.findIndex(item => item && item.name === fieldName);

                // Auto-Migration für fehlende Felder
                if (fieldIndex === -1 && defaultItems.length > 0) {
                    const template = defaultItems[0];
                    const fieldConfig = template[fieldName];

                    if (fieldConfig) {
                        const newField = {
                            name: fieldName,
                            type: fieldConfig.type,
                            label: fieldConfig.label || fieldName
                        };

                        if (fieldConfig.type === 'img') {
                            newField[fieldName] = null;
                            newField[fieldName + 'Alt'] = '';
                            newField[fieldName + 'Data'] = '';
                            newField[fieldName + 'Id'] = null; // FIX
                        } else if (fieldConfig.type === 'nested_array') {
                            newField[fieldName] = [];
                        } else {
                            newField[fieldName] = fieldConfig.default || '';
                        }

                        currentItem.push(newField);
                        fieldIndex = currentItem.length - 1;
                    }
                }

                if (fieldIndex !== -1) {
                    Object.keys(newValues).forEach(key => {
                        currentItem[fieldIndex][key] = newValues[key];
                    });
                }
            } else if (typeof currentItem === 'object') {
                // Objekt zu Array konvertieren mit vollständiger Media-Unterstützung
                const newArrayItem = [];

                if (defaultItems.length > 0) {
                    const template = defaultItems[0];
                    Object.keys(template).forEach(templateFieldName => {
                        const fieldConfig = template[templateFieldName];
                        const existingData = currentItem[templateFieldName] || {};

                        const newField = {
                            name: templateFieldName,
                            type: fieldConfig.type,
                            label: fieldConfig.label || templateFieldName
                        };

                        if (fieldConfig.type === 'img') {
                            newField[templateFieldName] = existingData[templateFieldName] || null;
                            newField[templateFieldName + 'Alt'] = existingData[templateFieldName + 'Alt'] || '';
                            newField[templateFieldName + 'Data'] = existingData[templateFieldName + 'Data'] || '';
                            newField[templateFieldName + 'Id'] = existingData[templateFieldName + 'Id'] || null; // FIX
                        } else if (fieldConfig.type === 'nested_array') {
                            newField[templateFieldName] = existingData[templateFieldName] || [];
                        } else {
                            newField[templateFieldName] = existingData[templateFieldName] || fieldConfig.default || '';
                        }

                        newArrayItem.push(newField);
                    });
                }

                currentItem = newArrayItem;
                updatedItems[index] = newArrayItem;

                // Update durchführen
                const fieldIndex = newArrayItem.findIndex(item => item && item.name === fieldName);
                if (fieldIndex !== -1) {
                    Object.keys(newValues).forEach(key => {
                        newArrayItem[fieldIndex][key] = newValues[key];
                    });
                }
            }

            updatedItems[index] = currentItem;
            setItemsCallback(updatedItems);
        } catch (error) {
            console.error('[PBW Framework] Error editing array item:', error);
        }
    };
}

/**
 * ARRAY OUTPUT FUNCTION - ENHANCED
 * =====================================================
 */

function array_output(props, array, map_function) {
    const { attributes } = props;
    const items = attributes[array];

    if (!items || items.length === 0) return null;

    return items.map((itemArray, index) => {
        if (!itemArray) return null;

        const transformedItems = {};

        if (Array.isArray(itemArray)) {
            itemArray.forEach(item => {
                if (item && item.name) {
                    const keyName = item.name;
                    const typeName = item.type;

                    if (typeName === 'img') {
                        transformedItems[keyName] = item[keyName] || null;
                        transformedItems[keyName + 'Alt'] = item[keyName + 'Alt'] || null;
                        transformedItems[keyName + 'Data'] = item[keyName + 'Data'] || null;
                    } else if (typeName === 'nested_array') {
                        const nestedArray = item[keyName] || [];
                        transformedItems[keyName] = nestedArray.map(nestedItem => {
                            if (Array.isArray(nestedItem)) {
                                const nestedObj = {};
                                nestedItem.forEach(field => {
                                    if (field && field.name) {
                                        if (field.type === 'img') {
                                            nestedObj[field.name] = field[field.name] || null;
                                            nestedObj[field.name + 'Alt'] = field[field.name + 'Alt'] || null;
                                            nestedObj[field.name + 'Data'] = field[field.name + 'Data'] || null;
                                        } else {
                                            nestedObj[field.name] = field[field.name] || null;
                                        }
                                    }
                                });
                                return nestedObj;
                            }
                            return nestedItem;
                        });
                    } else {
                        transformedItems[keyName] = item[keyName] || null;
                    }
                }
            });
        } else if (typeof itemArray === 'object') {
            // Unterstützung für Objekt-Format (legacy/Index 0)
            Object.keys(itemArray).forEach(key => {
                const config = itemArray[key];
                if (config && config.type) {
                    if (config.type === 'img') {
                        transformedItems[key] = config[key] || null;
                        transformedItems[key + 'Alt'] = config[key + 'Alt'] || null;
                        transformedItems[key + 'Data'] = config[key + 'Data'] || null;
                    } else if (config.type === 'nested_array') {
                        const nestedArray = config[key] || [];
                        transformedItems[key] = nestedArray.map(nestedItem => {
                            if (Array.isArray(nestedItem)) {
                                const nestedObj = {};
                                nestedItem.forEach(field => {
                                    if (field && field.name) {
                                        if (field.type === 'img') {
                                            nestedObj[field.name] = field[field.name] || null;
                                            nestedObj[field.name + 'Alt'] = field[field.name + 'Alt'] || null;
                                            nestedObj[field.name + 'Data'] = field[field.name + 'Data'] || null;
                                        } else {
                                            nestedObj[field.name] = field[field.name] || null;
                                        }
                                    }
                                });
                                return nestedObj;
                            }
                            return nestedItem;
                        });
                    } else {
                        transformedItems[key] = config[key] || null;
                    }
                }
            });
        }

        // Legacy compatibility - behalte alte Feld-Namen
        transformedItems["key"] = index;
        transformedItems["length"] = Array.isArray(itemArray) ? itemArray.length : Object.keys(itemArray).length;

        return map_function(transformedItems, index);
    }).filter(item => item !== null);
}

/**
 * NESTED ARRAY FUNCTIONS - Basis Implementation
 * =====================================================
 */

function nested_array_addblock(props, parentIndex, parentFieldName, fieldName, nestedConfig) {
    const { setAttributes } = props;
    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, props.name, props.attributes);

    const addNestedBlock = () => {
        try {
            const currentItems = [...(props.attributes[parentFieldName] || [])];
            console.log(currentItems)
            if (!currentItems[parentIndex]) {
                console.warn('[PBW] Parent item not found');
                return;
            }

            let currentParent = currentItems[parentIndex];

            currentParent = [...currentParent];
            const fieldIndex = currentParent.findIndex(item => item && item.name === fieldName);

            if (fieldIndex === -1) {
                console.warn('[PBW] Field not found:', fieldName);
                console.log('Available fields:', currentParent.map(f => f.name));
                console.log('Current parent data:', currentItems);
                return;
            }

            if (!nestedConfig?.default?.[0]) {
                console.error('[PBW] Invalid nested config');
                return;
            }

            const template = nestedConfig.default[0];
            const newNestedItem = [];

            Object.keys(template).forEach(key => {
                const config = template[key];
                const newField = {
                    name: key,
                    type: config.type,
                    label: config.label || key
                };

                if (config.type === 'img') {
                    newField[key] = null;
                    newField[key + 'Alt'] = '';
                    newField[key + 'Data'] = '';
                    newField[key + 'Id'] = null;
                } else {
                    newField[key] = config.default || '';
                }

                newNestedItem.push(newField);
            });

            const currentNestedArray = currentParent[fieldIndex][fieldName] || [];
            
            currentParent[fieldIndex][fieldName] = [...currentNestedArray, newNestedItem];
            currentItems[parentIndex] = currentParent;

            enhancedSetAttributes({ [parentFieldName]: currentItems });
        } catch (error) {
            console.error('[PBW Framework] Error adding nested block:', error);
        }
    };

    return wp.element.createElement(
        wp.components.Button,
        {
            isSecondary: true,
            isSmall: true,
            onClick: addNestedBlock,
            className: 'pbw-add-nested-btn'
        },
        '+ Hinzufügen'
    );
}

function nested_array_removeblock(props, parentIndex, parentFieldName, fieldName, nestedIndex) {
    const { setAttributes } = props;
    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, props.name, props.attributes);

    const removeNestedBlock = () => {
        try {
            const currentItems = [...(props.attributes[parentFieldName] || [])];

            if (!currentItems[parentIndex] || !Array.isArray(currentItems[parentIndex])) {
                return;
            }

            const currentParent = [...currentItems[parentIndex]];
            const fieldIndex = currentParent.findIndex(item => item && item.name === fieldName);

            if (fieldIndex === -1 || !currentParent[fieldIndex]) {
                return;
            }

            const currentNestedArray = [...(currentParent[fieldIndex][fieldName] || [])];
            currentNestedArray.splice(nestedIndex, 1);
            currentParent[fieldIndex][fieldName] = currentNestedArray;
            currentItems[parentIndex] = currentParent;

            enhancedSetAttributes({ [parentFieldName]: currentItems });
        } catch (error) {
            console.error('[PBW Framework] Error removing nested block:', error);
        }
    };

    return wp.element.createElement(
        wp.components.Button,
        {
            isDestructive: true,
            isSmall: true,
            onClick: removeNestedBlock,
            className: 'pbw-remove-nested-btn'
        },
        '✕'
    );
}

function nested_array_input(props, parentIndex, parentFieldName, fieldName, nestedConfig) {
    const { setAttributes } = props;
    const enhancedSetAttributes = createEnhancedSetAttributes(setAttributes, props.name, props.attributes);

    const currentItems = props.attributes[parentFieldName] || [];
    let currentParent = currentItems[parentIndex] || [];

    let nestedArray = [];
    if (Array.isArray(currentParent)) {
        const fieldItem = currentParent.find(item => item && item.name === fieldName);
        nestedArray = fieldItem ? (fieldItem[fieldName] || []) : [];
    }

    const nestedTitle = "📂 " + (nestedConfig?.title || fieldName);
    const nestedDescription = nestedConfig?.description;

    const updateNestedItem = (nestedIndex, nestedFieldName, newValues) => {
        try {
            const updatedParents = deepClone(currentItems);
            const parent = updatedParents[parentIndex];
            const fieldIndex = parent.findIndex(item => item && item.name === fieldName);

            if (fieldIndex !== -1) {
                const currentNested = [...(parent[fieldIndex][fieldName] || [])];
                const nestedItem = currentNested[nestedIndex];

                if (Array.isArray(nestedItem)) {
                    let nestedFieldIndex = nestedItem.findIndex(item => item && item.name === nestedFieldName);

                    if (nestedFieldIndex === -1 && nestedConfig.default && nestedConfig.default[0]) {
                        const template = nestedConfig.default[0];
                        const fieldConfig = template[nestedFieldName];

                        if (fieldConfig) {
                            const newField = {
                                name: nestedFieldName,
                                type: fieldConfig.type,
                                label: fieldConfig.label || nestedFieldName
                            };

                            if (fieldConfig.type === 'img') {
                                newField[nestedFieldName] = null;
                                newField[nestedFieldName + 'Alt'] = '';
                                newField[nestedFieldName + 'Data'] = '';
                                newField[nestedFieldName + 'Id'] = null;
                            } else {
                                newField[nestedFieldName] = '';
                            }

                            nestedItem.push(newField);
                            nestedFieldIndex = nestedItem.length - 1;
                        }
                    }

                    if (nestedFieldIndex !== -1) {
                        Object.keys(newValues).forEach(key => {
                            nestedItem[nestedFieldIndex][key] = newValues[key];
                        });
                    }
                }

                parent[fieldIndex][fieldName] = currentNested;
                enhancedSetAttributes({ [parentFieldName]: updatedParents });
            }
        } catch (error) {
            console.error('[PBW Framework] Error updating nested item:', error);
        }
    };

    return wp.element.createElement(
        'div',
        {
            className: 'pbw-nested-array-input',
            style: {
                marginLeft: '20px',
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5'
            }
        },
        wp.element.createElement('h5', {
            style: {
                margin: '0 0 10px 0',
                fontSize: '13px',
                fontWeight: '600',
                color: '#2c3e50'
            }
        }, nestedTitle),
        nestedDescription && wp.element.createElement(
            'p',
            { style: { fontSize: '11px', color: '#666', margin: '0 0 10px 0' } },
            nestedDescription
        ),

        nestedArray.length === 0 ?
            wp.element.createElement(
                'div',
                {
                    style: {
                        padding: '10px',
                        textAlign: 'center',
                        backgroundColor: '#fff',
                        borderRadius: '3px',
                        marginBottom: '8px'
                    }
                },
                wp.element.createElement(
                    'p',
                    { style: { margin: '0 0 8px 0', color: '#999', fontSize: '12px' } },
                    'Keine Einträge'
                ),
                pbw.nested_array.addblock(props, parentIndex, parentFieldName, fieldName, nestedConfig)
            ) :
            nestedArray.map((nestedItem, nestedIndex) => {
                return wp.element.createElement(
                    'div',
                    {
                        key: nestedIndex,
                        className: 'pbw-nested-item',
                        style: {
                            backgroundColor: '#fff',
                            padding: '10px',
                            marginBottom: '8px',
                            borderRadius: '3px',
                            border: '1px solid #ddd'
                        }
                    },
                    wp.element.createElement(
                        'div',
                        {
                            style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '10px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid #eee'
                            }
                        },
                        wp.element.createElement('strong', {
                            style: { fontSize: '12px' }
                        }, `#${nestedIndex + 1}`),
                        pbw.nested_array.removeblock(props, parentIndex, parentFieldName, fieldName, nestedIndex)
                    ),

                    Object.keys(nestedConfig.default[0] || {}).map((nestedFieldName) => {
                        const fieldConfig = nestedConfig.default[0][nestedFieldName];

                        const tempKey = `nested_${parentIndex}_${nestedIndex}_${nestedFieldName}`;
                        let fieldValue = '';

                        if (Array.isArray(nestedItem)) {
                            const field = nestedItem.find(item => item && item.name === nestedFieldName);
                            fieldValue = field ? (field[nestedFieldName] || '') : '';
                        }

                        const tempProps = {
                            name: props.name,
                            attributes: { [tempKey]: fieldValue },
                            setAttributes: (newAttrs) => {
                                if (tempKey in newAttrs) {
                                    updateNestedItem(nestedIndex, nestedFieldName, {
                                        [nestedFieldName]: newAttrs[tempKey]
                                    });
                                }
                            }
                        };

                        const originalBlockType = wp.blocks.getBlockType(props.name);
                        if (originalBlockType && !originalBlockType.attributes[tempKey]) {
                            originalBlockType.attributes[tempKey] = {
                                title: fieldConfig?.title,
                                description: fieldConfig?.description
                            };
                        }

                        // FIX: Zeige title und description für jedes Feld an
                        return wp.element.createElement(
                            'div',
                            {
                                key: nestedFieldName,
                                style: {
                                    marginBottom: '12px',
                                    padding: '8px',
                                    backgroundColor: '#f9f9f9',
                                    borderRadius: '3px'
                                }
                            },
                            // Titel hinzufügen
                            fieldConfig?.title && wp.element.createElement(
                                'label',
                                {
                                    style: {
                                        display: 'block',
                                        fontWeight: '600',
                                        marginBottom: '4px',
                                        fontSize: '12px',
                                        color: '#2c3e50'
                                    }
                                },
                                fieldConfig.title
                            ),
                            // Description hinzufügen
                            fieldConfig?.description && wp.element.createElement(
                                'p',
                                {
                                    style: {
                                        fontSize: '11px',
                                        color: '#666',
                                        marginBottom: '8px',
                                        marginTop: '0'
                                    }
                                },
                                fieldConfig.description
                            ),
                            // Input Feld
                            fieldConfig.type === 'text' && text_input(tempProps, 'p', tempKey),
                            fieldConfig.type === 'link' && link_input(tempProps, tempKey),
                            fieldConfig.type === 'img' && media_input(tempProps, tempKey)
                        );
                    })
                );
            }),

        nestedArray.length > 0 && wp.element.createElement(
            'div',
            { style: { marginTop: '10px', textAlign: 'center' } },
            pbw.nested_array.addblock(props, parentIndex, parentFieldName, fieldName, nestedConfig)
        )
    );
}

function createUpdateNestedItem(currentItems, parentIndex, fieldName, enhancedSetAttributes, parentFieldName, nestedConfig) {
    return (nestedIndex, nestedFieldName, newValues) => {
        try {
            const updatedParents = deepClone(currentItems);
            const parent = updatedParents[parentIndex];
            const fieldIndex = parent.findIndex(item => item && item.name === fieldName);

            if (fieldIndex !== -1) {
                const currentNested = [...(parent[fieldIndex][fieldName] || [])];
                const nestedItem = currentNested[nestedIndex];

                if (Array.isArray(nestedItem)) {
                    let nestedFieldIndex = nestedItem.findIndex(item => item && item.name === nestedFieldName);

                    if (nestedFieldIndex === -1 && nestedConfig.default && nestedConfig.default[0]) {
                        const template = nestedConfig.default[0];
                        const fieldConfig = template[nestedFieldName];

                        if (fieldConfig) {
                            const newField = {
                                name: nestedFieldName,
                                type: fieldConfig.type,
                                label: fieldConfig.label || nestedFieldName
                            };

                            if (fieldConfig.type === 'img') {
                                newField[nestedFieldName] = null;
                                newField[nestedFieldName + 'Alt'] = '';
                                newField[nestedFieldName + 'Data'] = '';
                                newField[nestedFieldName + 'Id'] = null; // FIX
                            } else {
                                newField[nestedFieldName] = '';
                            }

                            nestedItem.push(newField);
                            nestedFieldIndex = nestedItem.length - 1;
                        }
                    }

                    if (nestedFieldIndex !== -1) {
                        Object.keys(newValues).forEach(key => {
                            nestedItem[nestedFieldIndex][key] = newValues[key];
                        });
                    }
                }

                parent[fieldIndex][fieldName] = currentNested;
                enhancedSetAttributes({ [parentFieldName]: updatedParents });
            }
        } catch (error) {
            console.error('[PBW Framework] Error updating nested item:', error);
        }
    };
}

function rich_input(props, name) {
    const { attributes, setAttributes } = props;
    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];

    const title = "📝 " + (attributeConfig?.title || 'Rich Content');

    const ALLOWED_BLOCKS = attributeConfig?.allowedBlocks || [
        'core/paragraph',
        'core/heading',
        'core/list',
        'core/quote'
    ];

    const TEMPLATE = attributeConfig?.template || [
        ['core/paragraph', { placeholder: 'Text eingeben...' }]
    ];

    return wp.element.createElement(
        'div',
        {
            className: 'field-group pbw-rich-content',
            style: {
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement('h4', {
            style: {
                margin: '0 0 12px 0',
                color: '#2c3e50',
                fontSize: '14px',
                fontWeight: '600'
            }
        }, title),

        attributeConfig?.description && wp.element.createElement('p', {
            style: {
                margin: '0 0 12px 0',
                color: '#666',
                fontSize: '12px'
            }
        }, attributeConfig.description),

        wp.element.createElement('div', {
            style: {
                padding: '12px',
                borderRadius: '4px',
                minHeight: '100px'
            }
        },
            wp.element.createElement(wp.blockEditor.InnerBlocks, {
                allowedBlocks: ALLOWED_BLOCKS,
                template: TEMPLATE,
                templateLock: false,
                // WICHTIG: Eindeutiger identifier pro InnerBlocks-Instanz
                __experimentalCaptureToolbars: true,
                // Speichere in Attribut
                value: attributes[name] || [],
                onInput: (blocks) => setAttributes({ [name]: blocks }),
                onChange: (blocks) => setAttributes({ [name]: blocks }),
                renderAppender: wp.blockEditor.InnerBlocks.ButtonBlockAppender
            })
        )
    );
}

function rich_output(props, name) {
    const blocks = props.attributes[name];

    if (!blocks || blocks.length === 0) {
        return null;
    }

    const { serialize } = wp.blocks;
    const serializedContent = blocks.map(block => serialize(block)).join('');

    return wp.element.createElement(
        wp.element.RawHTML,
        { className: `rich-content-${name}` },
        serializedContent
    );
}

/**
 * ATTRIBUTE HELPER FUNCTION
 * =====================================================
 */

function pbw_attributes(params = {}) {
    const config = {
        type: params.type || 'string',
        default: params.default !== undefined ? params.default : getDefaultForType(params.type || 'string')
    };

    // Kopiere alle zusätzlichen Parameter
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            config[key] = params[key];
        }
    }

    return config;
}

/**
 * PBW FRAMEWORK OBJECT
 * =====================================================
 */
const pbw = {
    // Version Info
    version: '2.0.0',

    // UI Components
    choose: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ selector: 'select' },
            ...customParams
        }),
        example: "option1",
        input: select_input,
        output: select_output
    },

    h1: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ selector: 'h1' },
            ...customParams
        }),
        example: "Dies ist eine Überschrift",
        input: (props, selector, name) => text_input(props, selector, name),
        output: (props, selector, name) => text_output(props, selector, name)
    },

    h2: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ selector: 'h2' },
            ...customParams
        }),
        example: "Dies ist eine Unterüberschrift",
        input: (props, selector, name) => text_input(props, selector, name),
        output: (props, selector, name) => text_output(props, selector, name)
    },

    p: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ selector: 'p' },
            ...customParams
        }),
        example: "Dies ist ein Test-Textfeld. Es soll ein Paragraph-Element sein und ist dazu da um mehr als nur eine Zeile an Text darzustellen",
        input: (props, selector, name) => text_input(props, selector, name),
        output: (props, selector, name) => text_output(props, selector, name)
    },

    text: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ selector: 'p' },
            ...customParams
        }),
        example: "Dies ist ein Test-Textfeld",
        input: (props, selector, name) => text_input(props, selector, name),
        output: (props, selector, name) => text_output(props, selector, name)
    },

    rich: {
        attr: (customParams = {}) => pbw_attributes({
            type: 'array', // WICHTIG: array statt string
            default: [],
            ...customParams
        }),
        example: [],
        input: (props, name) => rich_input(props, name),
        output: (props, name) => rich_output(props, name)
    },

    img: {
        attr: (name = 'img', customParams = {}) => {
            const baseAttr = pbw_attributes({
                ...{ selector: 'img' },
                ...customParams
            });

            return {
                [name]: baseAttr,
                [name + 'Alt']: {
                    type: 'string',
                    default: ''
                },
                [name + 'Data']: {
                    type: 'string',
                    default: ''
                },
                [name + 'Id']: {
                    type: 'number',
                    default: null
                }
            };
        },
        example: "https://www.programmierung-bw.de/welpen.jpg",
        input: media_input,
        output: media_output
    },

    link: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ source: 'attribute', attribute: 'href', selector: 'a.link' },
            ...customParams
        }),
        example: "https://example.com/",
        input: link_input,
        output: link_output
    },

    array: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ type: 'array', default: [] },
            ...customParams
        }),
        example: [],
        input: array_input,
        output: array_output,
        addblock: array_addblock,
        removeblock: array_removeblock
    },

    nested_array: {
        attr: (customParams = {}) => pbw_attributes({
            ...{ type: 'array', default: [] },
            ...customParams
        }),
        input: nested_array_input,
        addblock: nested_array_addblock,
        removeblock: nested_array_removeblock
    },

    // Block Utilities
    block: {
        /**
         * Enhanced Block Title mit Icon Support
         */
        title: (props) => {
            const { name } = props;
            const blockType = wp.blocks.getBlockType(name);

            if (!blockType) {
                console.warn('[PBW Framework] Block type not found:', name);
                return null;
            }

            const { title, description, icon } = blockType;

            return wp.element.createElement(
                'div',
                {
                    className: 'pbw-block-title',
                    style: {
                        marginBottom: '20px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        borderLeft: '4px solid #007cba'
                    }
                },
                wp.element.createElement(
                    'div',
                    {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: description ? '8px' : '0'
                        }
                    },
                    renderBlockIcon(icon),
                    wp.element.createElement(
                        'h2',
                        {
                            style: {
                                margin: '0',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#1e1e1e'
                            }
                        },
                        title
                    )
                ),
                description && wp.element.createElement(
                    'p',
                    {
                        style: {
                            margin: '0',
                            color: '#666',
                            fontSize: '13px',
                            lineHeight: '1.5'
                        }
                    },
                    description
                )
            );
        }
    },

    // Utility Functions (exposed for external use)
    utils: {
        safeGet,
        deepClone,
        debounce,
        validateAttributes,
        renderBlockIcon,
        createEnhancedSetAttributes
    }
}

// Method for grouping elements in Detail-Sections
const group = (name, settings = {}, ...children) => {
    const {
        open = true,
        color = "#ff6920"
    } = settings;
    return wp.element.createElement(
        'details',
        {
            className: 'wp-block-config',
            style: { borderLeft: `4px solid ${color}`, padding: '10px' },
            open: open
        },
        wp.element.createElement(
            'summary',
            { style: { cursor: 'pointer', fontWeight: 'bold' } },
            wp.element.createElement(
                'p',
                {
                    style: { display: 'inline', fontWeight: "bold" },
                },
                name
            )
        ),
        wp.element.createElement(
            'div',
            { style: { marginTop: '10px' } },

            // Hier Content
            ...children
        )
    );
}
window.group = group

// Global export für Kompatibilität
window.pbw = pbw;