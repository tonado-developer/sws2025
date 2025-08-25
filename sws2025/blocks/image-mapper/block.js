registerBlockType('sws2025/image-mapper', {
    title: 'Berge',
    description: "Der Berglandschafts-Editor deines Vertrauens",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    example: {
        attributes: {
            heading: pbw.h1.example,
            text: pbw.p.example
        }, 
    },
    attributes: {
        ...pbw.img.attr('backgroundImage',{
            title: "Hintergrundbild",
            description: "Großflächiges Hintergrundbild für den gesamten Block"
        }),
        ...pbw.img.attr('baseImage',{
            title: "Basis-Bild (Hotspot-Grundlage)",
            description: "Hauptbild auf dem die Hotspots platziert werden. Optimal: 800-1200px Breite"
        }),
        ...pbw.img.attr('baseImageHd',{
            title: "Basis-Bild HD (Optional)",
            description: "Hochauflösende Version für Retina-Displays und Zoom-Funktionen"
        }),
        ...pbw.img.attr('personImage',{
            title: "Personen-Bild",
            description: "Bild einer Person oder Testimonial-Foto"
        }),
        ...pbw.img.attr('illustrationImage',{
            title: "Illustration/Grafik",
            description: "Zusätzliche Illustration oder dekorative Grafik"
        }),
        sideHeadline: pbw.h1.attr({
            title: "Haupt-Überschrift",
            description: "Große, aufmerksamkeitsstarke Überschrift für den Block."
        }),
        sideText: pbw.p.attr({
            title: "Beschreibungstext",
            description: "Längerer Beschreibungstext der unter der Überschrift angezeigt wird"
        }),
        hotspots: pbw.array.attr({
            title: "Hotspot-Konfiguration",
            description: "Hier kannst du die Inhalte für jeden Hotspot definieren. Nutze aussagekräftige Titel und Beschreibungen",
            default: [{
                catName: { 
                    type: 'text', 
                    title: 'Hotspot-Name',
                    description: "Der Name der auf der Orangenen-Fahne erscheint"
                },

                // Basic Hotspot Settings
                overlay: { 
                    type: 'img', 
                    title: 'Hover Overlay (100% Vollton)',
                    description: "Das Einfarbige OVerlay auf das man später klicken können soll"
                },
                xPosition: { 
                    type: 'text', 
                    title: 'X Position (%)' 
                },
                yPosition: { type: 'text', title: 'Y Position (%)' },
                width: { type: 'text', title: 'Breite (%)' },
                
                // Zoom Content
                zoomImage: { type: 'img', title: 'Freigestellter Berg (WebP)' },
                personImage: { type: 'img', title: 'Person Bild' },
                illustrationImage: { type: 'img', title: 'Orange Illustration' },
                sideText: { type: 'text', title: 'Seitentext' },
                sideLink: { type: 'link', title: 'Seitenlink' },
                
                // SVG Path System
                pathSvg: { type: 'img', title: 'SVG Pfad' },
                checkpoints: { 
                    type: 'nested_array', 
                    title: 'Checkpoints',
                    default: [{
                        pathPosition: { type: 'text', title: 'Position auf Pfad (0-100%)' },
                        previewImage: { type: 'img', title: 'Vorschau Bild' },
                        previewText: { type: 'text', title: 'Vorschau Text' },
                        targetLink: { type: 'link', title: 'Zielseite' }
                    }]
                }
            }]
        })
    },

    edit: function(props) {
        const { attributes, setAttributes } = props;

        // Drag & Drop State für Hotspot Positioning
        const [isDragging, setIsDragging] = useState(false);
        const [draggedHotspot, setDraggedHotspot] = useState(null);
        const previewRef = useRef(null);

        // Handle Click auf Preview für Hotspot Positioning
        const handlePreviewClick = (e, hotspotIndex) => {
            if (!previewRef.current || isDragging) return;
            
            const rect = previewRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            updateHotspotPosition(hotspotIndex, x, y);
        };

        // Update Hotspot Position
        const updateHotspotPosition = (hotspotIndex, x, y) => {
            const updatedHotspots = [...attributes.hotspots];
            const hotspot = [...updatedHotspots[hotspotIndex]];
            
            // Find and update x/y position fields
            const xIndex = hotspot.findIndex(item => item.name === 'xPosition');
            const yIndex = hotspot.findIndex(item => item.name === 'yPosition');
            
            if (xIndex !== -1) hotspot[xIndex].xPosition = x.toFixed(2);
            if (yIndex !== -1) hotspot[yIndex].yPosition = y.toFixed(2);
            
            updatedHotspots[hotspotIndex] = hotspot;
            setAttributes({ hotspots: updatedHotspots });
        };

        // Render Hotspot Markers on Preview
        const renderHotspotMarkers = () => {
            if (!attributes.hotspots || attributes.hotspots.length === 0) return null;
            
            return attributes.hotspots.map((hotspot, index) => {
                const hotspotData = {};
                
                // Transform array structure to object
                if (Array.isArray(hotspot)) {
                    hotspot.forEach(item => {
                        if (item && item.name) {
                            hotspotData[item.name] = item[item.name] || '';
                        }
                    });
                }
                
                const x = parseFloat(hotspotData.xPosition) || 50;
                const y = parseFloat(hotspotData.yPosition) || 50;
                const width = parseFloat(hotspotData.width) || 10;
                const overlayImage = hotspotData.overlay;
                
                return wp.element.createElement(
                    'div',
                    {
                        key: index,
                        className: 'hotspot-marker',
                        style: {
                            position: 'absolute',
                            left: x + '%',
                            top: y + '%',
                            width: width + '%',
                            height: width + '%',
                            transform: 'translate(-50%, -50%)',
                            cursor: 'move',
                            zIndex: 10,
                            border: overlayImage ? '2px solid #ff6b35' : '2px dashed #ff6b35',
                            borderRadius: overlayImage ? '0' : '50%'
                        },
                        onMouseDown: (e) => {
                            e.preventDefault();
                            setIsDragging(true);
                            setDraggedHotspot(index);
                        }
                    },
                    
                    // Actual Overlay Image OR Fallback
                    overlayImage ? 
                        wp.element.createElement('img', {
                            src: overlayImage,
                            alt: `Overlay ${index + 1}`,
                            style: {
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                pointerEvents: 'none'
                            }
                        }) :
                        wp.element.createElement('div', {
                            style: {
                                width: '100%',
                                height: '100%',
                                background: 'rgba(255, 107, 53, 0.3)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: '#ff6b35',
                                fontWeight: 'bold'
                            }
                        }, `H${index + 1}`),
                    
                    // Label
                    wp.element.createElement('span', {
                        style: {
                            position: 'absolute',
                            top: '-25px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#ff6b35',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none'
                        }
                    }, `Hotspot ${index + 1}`)
                );
            });
        };

        // Handle Mouse Events für Drag & Drop
        useEffect(() => {
            if (attributes.hotspots && attributes.hotspots.length > 0) {
                const needsMigration = attributes.hotspots.some(hotspot => {
                    if (Array.isArray(hotspot)) {
                        return !hotspot.find(item => item.name === 'catName');
                    }
                    return false;
                });
                
                if (needsMigration) {
                    const migrated = attributes.hotspots.map(hotspot => {
                        if (Array.isArray(hotspot)) {
                            const hasCatName = hotspot.find(item => item.name === 'catName');
                            if (!hasCatName) {
                                return [
                                    { name: 'catName', type: 'text', label: 'Name', catName: '' },
                                    ...hotspot
                                ];
                            }
                        }
                        return hotspot;
                    });
                    setAttributes({ hotspots: migrated });
                }
            }
        }, []);

        return wp.element.createElement('div',null,
            
            // Block Title
            pbw.block.title(props),
        
            // === BILDER SEKTION ===
            wp.element.createElement(
                'div',
                { 
                    className: 'editor-section images-section',
                    style: {
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e1e5e9',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '24px',
                        borderLeft: '4px solid #007cba'
                    }
                },
                wp.element.createElement(
                    'h3',
                    { 
                        style: { 
                            margin: '0 0 16px 0', 
                            color: '#1e1e1e',
                            fontSize: '16px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                    wp.element.createElement('span', { className: 'dashicons dashicons-format-image', style: { fontSize: '18px' } }),
                    '🖼️ Bild-Einstellungen'
                ),
                wp.element.createElement(
                    'p',
                    { 
                        style: { 
                            margin: '0 0 20px 0', 
                            color: '#757575', 
                            fontSize: '14px',
                            fontStyle: 'italic'
                        }
                    },
                    'Lade hier alle benötigten Bilder für den Block hoch. Verwende hochauflösende Bilder für beste Qualität.'
                ),
        
                // Background Image
                pbw.img.input(props, "backgroundImage"),
        
                // Base Image
                pbw.img.input(props, "baseImage"),
        
                // Base Image HD
                pbw.img.input(props, "baseImageHd"),
        
                // Person Image
                pbw.img.input(props, "personImage"),
        
                // Illustration Image
                pbw.img.input(props, "illustrationImage")
            ),
        
            // === TEXT SEKTION ===
            wp.element.createElement(
                'div',
                { 
                    className: 'editor-section text-section',
                    style: {
                        backgroundColor: '#f1f8ff',
                        border: '1px solid #c8e1ff',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '24px',
                        borderLeft: '4px solid #0073aa'
                    }
                },
                wp.element.createElement(
                    'h3',
                    { 
                        style: { 
                            margin: '0 0 16px 0', 
                            color: '#1e1e1e',
                            fontSize: '16px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                    wp.element.createElement('span', { className: 'dashicons dashicons-edit', style: { fontSize: '18px' } }),
                    '✍️ Text-Inhalte'
                ),
                wp.element.createElement(
                    'p',
                    { 
                        style: { 
                            margin: '0 0 20px 0', 
                            color: '#757575', 
                            fontSize: '14px',
                            fontStyle: 'italic'
                        }
                    },
                    'Bearbeite hier die Texte, die neben dem Hotspot-Bild angezeigt werden.'
                ),
        
                // Side Headline
                pbw.h1.input(props, "h1", "sideHeadline"),
        
                // Side Text
                pbw.p.input(props, "p", "sideText")
            ),
        
            // === HOTSPOT SEKTION ===
            wp.element.createElement(
                'div',
                { 
                    className: 'editor-section hotspot-section',
                    style: {
                        backgroundColor: '#fff8e1',
                        border: '1px solid #ffecb3',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '0',
                        borderLeft: '4px solid #ff9800'
                    }
                },
                wp.element.createElement(
                    'h3',
                    { 
                        style: { 
                            margin: '0 0 16px 0', 
                            color: '#1e1e1e',
                            fontSize: '16px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }
                    },
                    wp.element.createElement('span', { className: 'dashicons dashicons-location', style: { fontSize: '18px' } }),
                    '🎯 Interaktive Hotspots'
                ),
                wp.element.createElement(
                    'div',
                    { 
                        style: { 
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '20px'
                        }
                    },
                    wp.element.createElement(
                        'h4',
                        { 
                            style: { 
                                margin: '0 0 8px 0', 
                                color: '#856404',
                                fontSize: '14px',
                                fontWeight: '500'
                            }
                        },
                        '💡 Bedienungshinweise:'
                    ),
                    wp.element.createElement(
                        'ul',
                        { 
                            style: { 
                                margin: '0', 
                                color: '#856404', 
                                fontSize: '13px',
                                paddingLeft: '20px'
                            }
                        },
                        wp.element.createElement('li', null, '🖱️ Klicke auf das Basis-Bild um Hotspots zu positionieren'),
                        wp.element.createElement('li', null, '✋ Verschiebe Hotspots per Drag & Drop'),
                        wp.element.createElement('li', null, '⚙️ Konfiguriere Hotspot-Inhalte in den Feldern unten'),
                        wp.element.createElement('li', null, '🗑️ Entferne unbenötigte Hotspots mit dem "Entfernen"-Button')
                    )
                ),
                
                // Main Editor Interface
                wp.element.createElement(
                    'div',
                    { className: 'image-mapper-editor' },
                    
                    // Preview Area
                    wp.element.createElement(
                        'div',
                        { 
                            className: 'image-mapper-preview',
                            style: {
                                position: 'relative',
                                width: '100%',
                                margin: '0 auto 20px',
                                border: '2px dashed #ddd',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                backgroundColor: '#fafafa',
                                transition: 'all 0.3s ease'
                            }
                        },
                        
                        // Base Image Debug
                        attributes.baseImage && wp.element.createElement(
                            'img',
                            {
                                ref: previewRef,
                                src: attributes.baseImage,
                                alt: 'Base Image',
                                style: {
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block',
                                    cursor: 'crosshair'
                                },
                                onClick: (e) => {
                                    console.log('Base Image clicked, baseImage src:', attributes.baseImage);
                                    if (!isDragging && attributes.hotspots && attributes.hotspots.length > 0) {
                                        handlePreviewClick(e, 0);
                                    }
                                }
                            }
                        ),
                        
                        // Hotspot Markers
                        renderHotspotMarkers(),
                        
                        // Instructions Overlay
                        !attributes.baseImage && wp.element.createElement(
                            'div',
                            {
                                style: {
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    color: '#999',
                                    padding: '40px',
                                    backgroundColor: 'rgba(255,255,255,0.9)',
                                    borderRadius: '8px',
                                    border: '2px dashed #ccc'
                                }
                            },
                            wp.element.createElement(
                                'div',
                                { style: { fontSize: '48px', marginBottom: '16px' } },
                                '🖼️'
                            ),
                            wp.element.createElement(
                                'p', 
                                { style: { margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' } }, 
                                'Basis-Bild auswählen'
                            ),
                            wp.element.createElement(
                                'p', 
                                { style: { margin: '0', fontSize: '12px', color: '#666' } }, 
                                'Danach auf das Bild klicken um Hotspots zu positionieren'
                            )
                        )
                    ),
                    
                    // Hotspots Configuration
                    pbw.array.input(props, 'hotspots')
                )
            )
        );
    },

    save: function(props) {
        const { attributes } = props;
        
        return wp.element.createElement(
            'div',
            { className: 'image-mapper-container' },
            attributes.backgroundImage && wp.element.createElement(
                'img',
                {
                    className: 'backgroundImage',
                    src: attributes.backgroundImage,
                    alt: attributes.backgroundImageAlt || 'Interactive Image',
                }
            ),
            attributes.sideHeadline && wp.element.createElement(
                'div',
                {
                    className: 'side-content open',
                    style: {
                        transform: 'translateX(-100%)',
                    },
                },
                attributes.sideHeadline && wp.element.createElement(
                    'h2',
                    { className: 'side-name' },
                    attributes.sideHeadline
                ),
                attributes.sideText && wp.element.createElement(
                    'div',
                    { className: 'side-text' },
                    attributes.sideText
                )
            ),
            attributes.personImage && wp.element.createElement(
                'img',
                {
                    className: 'person-image open',
                    src: attributes.personImage,
                    alt: attributes.personImageAlt || '',
                    style: {
                        transform: 'translate(-20%,100%) scale(.7)',
                    },
                }
            ),
            wp.element.createElement(
                'img',
                {
                    className: 'illustration-image open',
                    src: attributes.illustrationImage,
                    alt: attributes.illustrationImageAlt || '',
                    style: {
                        transform: 'translate(-20%,100%) scale(.7)',
                    },
                }
            ),
            // Base Preview Structure
            wp.element.createElement(
                'div',
                { 
                    className: 'position-preview'
                },
                wp.element.createElement('div', { className: 'parent_overlay' }),
                
                // Base Image
                attributes.baseImage && wp.element.createElement(
                    'img',
                    {
                        className: 'parent_img alwaysVisibile',
                        src: attributes.baseImage,
                        alt: attributes.baseImageAlt || 'Interactive Image',
                        'data-hd': attributes.baseImageHd || '',
                    }
                ),
                attributes.baseImageHd && wp.element.createElement(
                    'img',
                    {
                        className: 'parent_img hdImage',
                        src: attributes.baseImageHd,
                        alt: attributes.baseImageHdAlt || 'Interactive Image',
                    }
                ),
                
                // Hotspot Markers
                pbw.array.output(props, 'hotspots', (hotspot, index) => {
                    const x = parseFloat(hotspot.xPosition) || 50;
                    const y = parseFloat(hotspot.yPosition) || 50;
                    const width = parseFloat(hotspot.width) || 10;
                    
                    const styles = [
                        `left: ${x}%`,
                        `top: ${y}%`,
                        `width: ${width}%`
                    ];
                    
                    return wp.element.createElement(
                        'div',
                        {
                            key: index,
                            className: 'position-marker',
                            'data-src': attributes.baseImage || '', // Original parent image
                            style: styles.join('; '),
                            'data-style': styles.join('; '),
                            'data-hotspot-id': index 
                        },
                        
                        // Overlay Image
                        hotspot.overlay && wp.element.createElement(
                            'img',
                            {
                                className: 'overlay',
                                src: hotspot.overlay,
                                alt: hotspot.overlayAlt || ''
                            }
                        ),

                        // 
                        hotspot.catName && wp.element.createElement(
                            'div',
                            {
                                className: 'markerLabel',
                            },
                            wp.element.createElement(
                                'h3',
                                {
                                    className: 'badge',
                                },
                                hotspot.catName
                            ),
                            wp.element.createElement(
                                'div',
                                {
                                    className: 'string',
                                }
                            ),
                        ),
                        
                        // Nested Zoom Content (rendered as nested position-preview)
                        (hotspot.zoomImage || hotspot.pathSvg) && wp.element.createElement(
                            'div',
                            { className: 'position-preview' },
                            wp.element.createElement('div', { className: 'parent_overlay' }),
                            
                            // Zoom Image
                            hotspot.zoomImage && wp.element.createElement(
                                'img',
                                {
                                    className: 'parent_img',
                                    src: hotspot.zoomImage,
                                    alt: hotspot.zoomImageAlt || ''
                                }
                            ),
                            
                            // SVG Path with Checkpoints
                            hotspot.pathSvg && wp.element.createElement(
                                'div',
                                { 
                                    className: 'svg-path-container',
                                },
                                wp.element.createElement(
                                    'img',
                                    {
                                        className: 'svg-path',
                                        src: hotspot.pathSvg,
                                        alt: 'Path',
                                    }
                                ),
                                
                                // Checkpoints
                                hotspot.checkpoints && Array.isArray(hotspot.checkpoints) && hotspot.checkpoints.length > 0 && 
                                wp.element.createElement(
                                    'div',
                                    { 
                                        className: 'checkpointsWrapper',
                                    },
                                    hotspot.checkpoints.map((checkpoint, checkIndex) => {
                                        // Sicherstellen dass checkpoint ein Objekt ist
                                        if (!checkpoint || typeof checkpoint !== 'object') return null;
                                        
                                        const pathPos = parseFloat(checkpoint.pathPosition) || 0;
                                        
                                        return wp.element.createElement(
                                            'div',
                                            {
                                                key: checkIndex,
                                                className: 'checkpoint-marker',
                                                'data-preview-image': checkpoint.previewImage || '',
                                                'data-preview-text': checkpoint.previewText || '',
                                                'data-target-link': checkpoint.targetLink || '',
                                                'data-path-position': pathPos, // Geändert zu path-position für Konsistenz
                                                style: `--path-position: ${pathPos}%` // CSS Variable für positioning
                                            },
                                            wp.element.createElement(
                                                'a',
                                                {
                                                    key: checkIndex,
                                                    href: checkpoint.targetLink || '',
                                                    onclick: "Overlay.open(this.href, event); return false;"
                                                },
                                                "Link"
                                            )
                                        );
                                    }).filter(Boolean)
                                )
                            )
                        )
                    );
                })
            ),
            pbw.array.output(props, 'hotspots', (hotspot, index) => {
                const elements = [];
                if (hotspot.sideText || hotspot.sideLink) {
                    elements.push(
                        wp.element.createElement(
                            'div',
                            {
                                className: 'side-content',
                                'data-hotspot-id': index,
                                style: {
                                    transform: 'translateX(-100%)',
                                },
                            },
                            hotspot.catName && wp.element.createElement(
                                'h2',
                                { className: 'side-name' },
                                hotspot.catName
                            ),
                            hotspot.sideText && wp.element.createElement(
                                'div',
                                { className: 'side-text' },
                                hotspot.sideText
                            ),
                            hotspot.sideLink && wp.element.createElement(
                                'a',
                                {
                                    href: hotspot.sideLink,
                                    className: 'side-link-button'
                                },
                                'ZUR ÜBERSICHT'
                            )
                        )
                    );
                }
                // Person Image 
                if (hotspot.personImage) {
                    elements.push(wp.element.createElement(
                        'img',
                        {
                            className: 'person-image',
                            'data-hotspot-id': index,
                            src: hotspot.personImage,
                            alt: hotspot.personImageAlt || '',
                            style: {
                                transform: 'translate(-20%,100%) scale(.7)',
                            },
                        }
                    ));
                }
                
                // Illustration
                if (hotspot.illustrationImage) {
                    elements.push(wp.element.createElement(
                        'img',
                        {
                            className: 'illustration-image',
                            'data-hotspot-id': index,
                            src: hotspot.illustrationImage,
                            alt: hotspot.illustrationImageAlt || '',
                            style: {
                                transform: 'translate(-20%,100%) scale(.7)',
                            },
                        }
                    ));
                }
        
                return elements;
            })
        );
    }
});