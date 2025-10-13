registerBlockType('sws2025/image-mapper2', {
    title: 'Berge V2',
    description: "Der Berglandschafts-Editor deines Vertrauens",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    
    attributes: {
        // Basis-Bilder
        ...pbw2.img.attr('backgroundImage', {
            title: 'Hintergrundbild',
            description: 'Großflächiges Hintergrundbild (WebP 1920x1080)'
        }),
        ...pbw2.img.attr('baseImage', {
            title: 'Basis-Bild',
            description: 'Hauptbild für Hotspot-Platzierung (WebP 1920x1080)'
        }),
        ...pbw2.img.attr('baseImageHd', {
            title: 'Basis-Bild HD',
            description: 'Hochauflösende Version (WebP 3840x2160)'
        }),
        ...pbw2.img.attr('personImage', {
            title: 'Personen-Bild',
            description: 'Testimonial-Foto (WebP 1920x1080)'
        }),
        ...pbw2.img.attr('illustrationImage', {
            title: 'Illustration',
            description: 'Dekorative Grafik (SVG)'
        }),
        
        illustrationImageSvg: {
            type: 'string',
            default: ''
        },
        
        // Texte
        sideHeadline: pbw2.h1.attr({
            title: 'Haupt-Überschrift',
            description: 'Große Überschrift für den Block'
        }),
        sideText: pbw2.p.attr({
            title: 'Beschreibungstext',
            description: 'Längerer Text unter der Überschrift'
        }),
        
        // Hotspots Array (flache Objekt-Struktur)
        hotspots: pbw2.array.attr({
            title: 'Hotspots',
            description: 'Interaktive Bereiche auf dem Bild'
        })
    },

    edit: function(props) {
        const { attributes, setAttributes } = props;
        const { useState, useRef, useEffect } = wp.element;
        
        const [isDragging, setIsDragging] = useState(false);
        const [draggedIndex, setDraggedIndex] = useState(null);
        const previewRef = useRef(null);

        // SVG Loader für globale Illustration
        useEffect(() => {
            if (attributes.illustrationImage && !attributes.illustrationImageSvg) {
                fetch(attributes.illustrationImage)
                    .then(r => r.text())
                    .then(svg => {
                        const base64 = btoa(unescape(encodeURIComponent(svg.trim())));
                        setAttributes({ illustrationImageSvg: base64 });
                    })
                    .catch(err => console.error('SVG load error:', err));
            }
        }, [attributes.illustrationImage]);

        // SVG Loader für Hotspot Illustrationen
        useEffect(() => {
            if (!attributes.hotspots) return;
            
            attributes.hotspots.forEach((hotspot, index) => {
                if (hotspot.illustrationImage && !hotspot.illustrationImageSvg) {
                    fetch(hotspot.illustrationImage)
                        .then(r => r.text())
                        .then(svg => {
                            const base64 = btoa(unescape(encodeURIComponent(svg.trim())));
                            const newHotspots = [...attributes.hotspots];
                            newHotspots[index] = { 
                                ...newHotspots[index], 
                                illustrationImageSvg: base64 
                            };
                            setAttributes({ hotspots: newHotspots });
                        })
                        .catch(err => console.error(`Hotspot ${index} SVG error:`, err));
                }
            });
        }, [attributes.hotspots?.map(h => h.illustrationImage).join(',')]);

        // Drag & Drop Handler
        useEffect(() => {
            if (!isDragging || draggedIndex === null) return;

            const handleMouseMove = (e) => {
                if (!previewRef.current) return;
                const rect = previewRef.current.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                const newHotspots = [...attributes.hotspots];
                newHotspots[draggedIndex] = {
                    ...newHotspots[draggedIndex],
                    xPosition: x.toFixed(2),
                    yPosition: y.toFixed(2)
                };
                setAttributes({ hotspots: newHotspots });
            };

            const handleMouseUp = () => {
                setIsDragging(false);
                setDraggedIndex(null);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }, [isDragging, draggedIndex]);

        return wp.element.createElement('div', null,

            // Block Title
            pbw2.block.title(props),

            // Bilder Section
            group('🖼️ Bilder', { open: false },
                wp.element.createElement('div', { 
                    style: { 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(2, 1fr)', 
                        gap: '16px' 
                    } 
                },
                    pbw2.img.input(props, 'backgroundImage'),
                    pbw2.img.input(props, 'baseImage'),
                    pbw2.img.input(props, 'baseImageHd'),
                    pbw2.img.input(props, 'personImage'),
                    pbw2.img.input(props, 'illustrationImage')
                )
            ),

            // Texte Section
            group('✍️ Texte', { open: false },
                pbw2.h1.input(props, 'h1', 'sideHeadline'),
                pbw2.p.input(props, 'p', 'sideText')
            ),

            // Spacer
            wp.element.createElement('div', { style: { height: "40px" } }),

            // Hotspot Positionierung
            group('🎯 Hotspot-Positionierung', { open: false },
                wp.element.createElement('div', {
                    style: {
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffeaa7',
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '16px'
                    }
                },
                    wp.element.createElement('strong', { style: { display: 'block', marginBottom: '8px' } }, 
                        '💡 Bedienungshinweise:'
                    ),
                    wp.element.createElement('ul', { style: { margin: 0, fontSize: '13px', paddingLeft: '20px' } },
                        wp.element.createElement('li', null, '🖱️ Klicke auf das Basis-Bild um Hotspots zu positionieren'),
                        wp.element.createElement('li', null, '✋ Verschiebe Hotspots per Drag & Drop'),
                        wp.element.createElement('li', null, '⚙️ Konfiguriere Hotspot-Inhalte unten')
                    )
                ),

                attributes.baseImage ? wp.element.createElement('div', { 
                    style: { 
                        position: 'relative',
                        border: '2px dashed #ccc',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    } 
                },
                    wp.element.createElement('img', {
                        ref: previewRef,
                        src: attributes.baseImage,
                        alt: 'Preview',
                        style: { width: '100%', display: 'block', cursor: 'crosshair' }
                    }),
                    
                    // Hotspot Markers
                    attributes.hotspots?.map((hotspot, index) => 
                        wp.element.createElement('div', {
                            key: index,
                            style: {
                                position: 'absolute',
                                left: (hotspot.xPosition || 50) + '%',
                                top: (hotspot.yPosition || 50) + '%',
                                width: (hotspot.width || 10) + '%',
                                height: (hotspot.width || 10) + '%',
                                transform: 'translate(-50%, -50%)',
                                border: '2px solid #ff6b35',
                                cursor: 'move',
                                zIndex: 10
                            },
                            onMouseDown: (e) => {
                                e.preventDefault();
                                setIsDragging(true);
                                setDraggedIndex(index);
                            }
                        },
                            hotspot.overlay && wp.element.createElement('img', {
                                src: hotspot.overlay,
                                style: { 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'contain',
                                    pointerEvents: 'none' 
                                }
                            }),
                            wp.element.createElement('span', {
                                style: {
                                    position: 'absolute',
                                    top: '-30px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#ff6b35',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }
                            }, hotspot.catName || `Hotspot ${index + 1}`)
                        )
                    )
                ) : wp.element.createElement('div', {
                    style: {
                        padding: '60px 20px',
                        textAlign: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        border: '2px dashed #ccc'
                    }
                },
                    wp.element.createElement('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '🖼️'),
                    wp.element.createElement('p', { style: { margin: 0, color: '#666' } }, 
                        'Bitte zuerst ein Basis-Bild auswählen'
                    )
                )
            ),

            // Hotspots Konfiguration
            group('⚙️ Hotspot-Konfiguration', { open: false },
                pbw2.array.input(props, 'hotspots', (itemProps, index) => {
                    return wp.element.createElement(wp.element.Fragment, null,
                        
                        // Basis-Einstellungen
                        group('📍 Basis-Einstellungen', { open: false },
                            pbw2.text.input(itemProps, 'p', 'catName'),
                            pbw2.img.input(itemProps, 'overlay'),
                            
                            wp.element.createElement('div', { 
                                style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' } 
                            },
                                pbw2.text.input(itemProps, 'p', 'xPosition'),
                                pbw2.text.input(itemProps, 'p', 'yPosition'),
                                pbw2.text.input(itemProps, 'p', 'width')
                            )
                        ),

                        // Zoom-Inhalte
                        group('🔍 Zoom-Inhalte', { open: false },
                            pbw2.img.input(itemProps, 'zoomImage'),
                            pbw2.img.input(itemProps, 'personImage'),
                            pbw2.img.input(itemProps, 'illustrationImage'),
                            pbw2.text.input(itemProps, 'p', 'sideText'),
                            pbw2.link.input(itemProps, 'sideLink'),
                            pbw2.text.input(itemProps, 'p', 'sideLinkText')
                        ),

                        // SVG Pfad + Checkpoints
                        group('🛤️ SVG Pfad & Checkpoints', { open: false },
                            pbw2.img.input(itemProps, 'pathSvg'),
                            
                            // NESTED ARRAY - Checkpoints
                            pbw2.array.input(itemProps, 'checkpoints', (checkpointProps) => {
                                return wp.element.createElement(wp.element.Fragment, null,
                                    pbw2.text.input(checkpointProps, 'p', 'pathPosition'),
                                    pbw2.img.input(checkpointProps, 'previewImage'),
                                    pbw2.text.input(checkpointProps, 'p', 'previewLabel'),
                                    pbw2.text.input(checkpointProps, 'p', 'previewText'),
                                    pbw2.link.input(checkpointProps, 'targetLink'),
                                    pbw2.choose.input(checkpointProps, 'previewOrientation', [
                                        { label: 'Rechts', value: 'right' },
                                        { label: 'Links', value: 'left' }
                                    ])
                                );
                            }, {
                                title: 'Checkpoints',
                                addButtonText: 'Checkpoint hinzufügen',
                                emptyTemplate: {
                                    pathPosition: '50',
                                    previewImage: null,
                                    previewImageAlt: '',
                                    previewImageId: null,
                                    previewLabel: '',
                                    previewText: '',
                                    targetLink: '',
                                    previewOrientation: 'right'
                                }
                            })
                        )
                    );
                }, {
                    title: 'Hotspots',
                    addButtonText: 'Hotspot hinzufügen',
                    collapsible: true,
                    sortable: true,
                    emptyTemplate: {
                        catName: '',
                        overlay: null,
                        overlayAlt: '',
                        overlayId: null,
                        xPosition: '50',
                        yPosition: '50',
                        width: '10',
                        zoomImage: null,
                        zoomImageAlt: '',
                        zoomImageId: null,
                        personImage: null,
                        personImageAlt: '',
                        personImageId: null,
                        illustrationImage: null,
                        illustrationImageAlt: '',
                        illustrationImageId: null,
                        illustrationImageSvg: '',
                        sideText: '',
                        sideLink: '',
                        sideLinkText: '',
                        pathSvg: null,
                        pathSvgAlt: '',
                        pathSvgId: null,
                        checkpoints: []
                    }
                })
            )
        );
    },

    save: function(props) {
        const { attributes } = props;

        return wp.element.createElement('div', { className: 'image-mapper-container' },
            
            // Background Image
            attributes.backgroundImage && wp.element.createElement('img', {
                className: 'backgroundImage',
                src: attributes.backgroundImage,
                alt: attributes.backgroundImageAlt || ''
            }),

            // Side Content (Global)
            (attributes.sideHeadline || attributes.sideText) && wp.element.createElement('div', {
                className: 'side-content open',
                style: {
                    transform: 'translateX(-100%)',
                }
            },
                attributes.sideHeadline && wp.element.createElement('h2', {
                    className: 'side-name has-gold-night-font-family',
                    dangerouslySetInnerHTML: { __html: attributes.sideHeadline }
                }),
                attributes.sideText && wp.element.createElement('div', {
                    className: 'side-text',
                    dangerouslySetInnerHTML: { __html: attributes.sideText }
                }),
                wp.element.createElement('div', { className: 'fakeCorner' })
            ),

            // Person Image (Global)
            attributes.personImage && wp.element.createElement('img', {
                className: 'person-image open',
                src: attributes.personImage,
                alt: attributes.personImageAlt || '',
                style: {
                    transform: 'translate(-20%,100%) scale(.7)',
                }
            }),

            // Illustration (Global)
            attributes.illustrationImageSvg && wp.element.createElement('div', {
                className: 'illustration-image open',
                'data-original-file': attributes.illustrationImage,
                dangerouslySetInnerHTML: { 
                    __html: atob(attributes.illustrationImageSvg) 
                },
                style: {
                    transform: 'translate(-20%,100%) scale(.7)',
                }
            }),

            // Position Preview
            wp.element.createElement('div', { className: 'position-preview' },
                wp.element.createElement('div', { className: 'parent_overlay' }),

                // Base Images
                attributes.baseImage && wp.element.createElement('img', {
                    className: 'parent_img alwaysVisibile',
                    src: attributes.baseImage,
                    alt: attributes.baseImageAlt || '',
                    'data-hd': attributes.baseImageHd || ''
                }),

                attributes.baseImageHd && wp.element.createElement('img', {
                    className: 'parent_img hdImage',
                    src: attributes.baseImageHd,
                    alt: attributes.baseImageHdAlt || ''
                }),

                // Hotspots
                pbw2.array.output(props, 'hotspots', (itemProps, index) => {
                    const hotspot = itemProps.attributes;
                    
                    return wp.element.createElement('div', {
                        key: index,
                        className: 'position-marker',
                        'data-hotspot-id': index,
                        style: `left: ${hotspot.xPosition}%; top: ${hotspot.yPosition}%; width: ${hotspot.width}%`
                    },
                        // Overlay
                        hotspot.overlay && wp.element.createElement('img', {
                            className: 'overlay',
                            src: hotspot.overlay,
                            alt: hotspot.overlayAlt || ''
                        }),

                        // Marker Label
                        hotspot.catName && wp.element.createElement('div', {
                            className: 'markerLabel'
                        },
                            wp.element.createElement('h3', { className: 'badge' }, hotspot.catName),
                            wp.element.createElement('div', { className: 'string' })
                        ),

                        // Nested Position Preview
                        (hotspot.zoomImage || hotspot.pathSvg) && wp.element.createElement('div', {
                            className: 'position-preview'
                        },
                            wp.element.createElement('div', { className: 'parent_overlay' }),
                            hotspot.zoomImage && wp.element.createElement('img', {
                                className: 'parent_img',
                                src: hotspot.zoomImage,
                                alt: hotspot.zoomImageAlt || ''
                            })
                        )
                    );
                })
            ),

            // Hotspot Details (Side Content per Hotspot)
            pbw2.array.output(props, 'hotspots', (itemProps, index) => {
                const hotspot = itemProps.attributes;
                const elements = [];

                // Side Content
                if (hotspot.sideText || hotspot.sideLink) {
                    elements.push(
                        wp.element.createElement('div', {
                            key: `side-${index}`,
                            className: 'side-content',
                            'data-hotspot-id': index,
                            style: {
                                transform: 'translateX(-100%)',
                            }
                        },
                            hotspot.catName && wp.element.createElement('h2', {
                                className: 'side-name has-gold-night-font-family'
                            }, hotspot.catName),
                            hotspot.sideText && wp.element.createElement('div', {
                                className: 'side-text',
                                dangerouslySetInnerHTML: { __html: hotspot.sideText }
                            }),
                            hotspot.sideLink && wp.element.createElement('a', {
                                href: hotspot.sideLink,
                                className: 'side-link-button'
                            }, hotspot.sideLinkText || 'Mehr erfahren'),
                            wp.element.createElement('div', { className: 'fakeCorner' })
                        )
                    );
                }

                // Person Image
                if (hotspot.personImage) {
                    elements.push(
                        wp.element.createElement('img', {
                            key: `person-${index}`,
                            className: 'person-image',
                            'data-hotspot-id': index,
                            src: hotspot.personImage,
                            alt: hotspot.personImageAlt || '',
                            style: {
                                transform: 'translate(-20%,100%) scale(.7)',
                            }
                        })
                    );
                }

                // Illustration
                if (hotspot.illustrationImageSvg) {
                    elements.push(
                        wp.element.createElement('div', {
                            key: `illu-${index}`,
                            className: 'illustration-image',
                            'data-hotspot-id': index,
                            'data-original-file': hotspot.illustrationImage,
                            dangerouslySetInnerHTML: { 
                                __html: atob(hotspot.illustrationImageSvg) 
                            },
                            style: {
                                transform: 'translate(-20%,100%) scale(.7)',
                            }
                        })
                    );
                }

                // SVG Path + Checkpoints
                if (hotspot.pathSvg && hotspot.checkpoints?.length) {
                    elements.push(
                        wp.element.createElement('div', {
                            key: `path-${index}`,
                            className: 'svg-path-container',
                            'data-hotspot-id': index
                        },
                            wp.element.createElement('img', {
                                className: 'svg-path',
                                src: hotspot.pathSvg,
                                alt: ''
                            }),
                            wp.element.createElement('div', { className: 'checkpointsWrapper' },
                                hotspot.checkpoints.map((checkpoint, cpIndex) => 
                                    wp.element.createElement('div', {
                                        key: cpIndex,
                                        className: `checkpoint-marker markerLabel opening-${checkpoint.previewOrientation || 'right'}`,
                                        'data-path-position': checkpoint.pathPosition,
                                        style: `--path-position: ${checkpoint.pathPosition}%`
                                    },
                                        wp.element.createElement('a', {
                                            href: checkpoint.targetLink || '#',
                                            className: 'badge',
                                            onclick: 'Overlay.open(this.href, event); return false;'
                                        }, checkpoint.previewLabel),
                                        
                                        wp.element.createElement('div', {
                                            className: `badgeInfo has_border is_rounded`
                                        },
                                            pbw2.img.output({ attributes: checkpoint }, "previewImage"),
                                            wp.element.createElement('div', { className: 'textwrap' },
                                                pbw2.text.output({ attributes: checkpoint }, "h3", "previewLabel"),
                                                pbw2.text.output({ attributes: checkpoint }, "p", "previewText"),
                                                checkpoint.targetLink && wp.element.createElement('a', {
                                                    href: checkpoint.targetLink,
                                                    className: 'targetLink',
                                                    onclick: 'Overlay.open(this.href, event); return false;'
                                                }, 'Mehr erfahren')
                                            )
                                        ),
                                        wp.element.createElement('div', { className: 'string' })
                                    )
                                )
                            )
                        )
                    );
                }

                return elements;
            })
        );
    }
});