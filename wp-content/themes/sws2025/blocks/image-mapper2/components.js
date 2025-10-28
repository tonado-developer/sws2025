
// Import Image Mapper 2 block components
window.imageMapperComponents = {

    // Frontend components
    frontend: {

        // Wrapper for the entire image mapper
        imageMapperContainer: (...children) => {
            return createElement(
                'div',
                {
                    className: 'image-mapper-container'
                },
                ...children
            );
        },

        // Wrapper for global details
        globalWrapper: (...children) => {
            return createElement(
                'div',
                {
                    className: 'global-details-wrapper'
                },
                ...children
            );
        },

        // Wrapper for marker details
        markerWrapper: (...children) => {
            return createElement(
                'div',
                {
                    className: 'all-hotspot-details-wrapper'
                },
                ...children
            );
        },

        // Wrapper for zoom container
        ZoomWrapper: (...children) => {
            return createElement(
                'div',
                {
                    className: 'position-prezoom'
                },
                createElement(
                    'div',
                    {
                        className: 'position-preview'
                    },
                    ...children
                )
            );
        },

        // Wrapper for global Zoom Content
        globalZoomContent: (...children) => {
            return createElement(
                'div',
                {
                    className: 'global-zoom-content'
                },
                ...children
            );
        },

        // Iterate over markers
        markerIterate: (props, callback) => {
            return pbw2.array.output(props, 'hotspots', (itemProps, index) => {
                return callback(itemProps.attributes, index);
            });
        },

        // globaly used elements
        global: {

            // Background image for the image mapper
            backgroundImage: (props) => {
                return createElement(
                    'div',
                    {
                        className: 'background-images'
                    },
                    pbw2.img.output(props, 'backgroundImage'),
                    pbw2.img.output(props, 'backgroundImageRespo')
                );
            },

            // Base image for the image mapper
            baseImage: (props) => {
                return createElement(
                    'div',
                    {
                        className: 'base-images'
                    },
                    pbw2.img.output(props, 'baseImage', {
                        dataset: {
                            'hd': props.attributes.baseImageHd
                        },
                        className: 'parent_img desktop alwaysVisibile'
                    }),
                    pbw2.img.output(props, 'baseImageRespo', {
                        dataset: {
                            'hd': props.attributes.baseImageHd
                        },
                        className: 'parent_img mobile alwaysVisibile'
                    })
                );
            },

            // Base image HD for the image mapper
            baseImageHd: (props) => {
                return pbw2.img.output(props, 'baseImageHd', {
                    className: 'parent_img hdImage'
                });
            },

            // Base image HD for the image mapper
            zoomBoundaries: () => {
                return createElement(
                    'div',
                    {
                        className: 'zoom-boundaries'
                    },
                );
            }
        },

        // Object containing various marker detail components
        marker: {

            // Wrapper for each marker with its checkpoints
            wrapper: (index, ...children) => {
                return createElement(
                    'div',
                    {
                        className: 'hotspot-details-container',
                        'data-hotspot-id': index
                    },
                    ...children
                );
            },

            // Wrapper for marker Zoom Content
            zoomContentWrapper: (...children) => {
                return createElement(
                    'div',
                    {
                        className: 'marker-zoom-content'
                    },
                    ...children
                );
            },

            // SVG path with checkpoints for markers
            svgPath: (marker, index) => {
                if (marker.pathSvg && marker.checkpoints?.length) {
                    return createElement(
                        'div',
                        {
                            key: `path-${index}`,
                            className: 'svg-path-container',
                            'data-hotspot-id': index
                        },
                        createElement('img', {
                            className: 'svg-path',
                            src: marker.pathSvg,
                            alt: ''
                        }),
                        createElement('div', { className: 'checkpointsWrapper' },
                            marker.checkpoints.map((checkpoint, cpIndex) =>
                                createElement('div', {
                                    key: cpIndex,
                                    className: `checkpoint-marker markerLabel opening-${checkpoint.previewOrientation || 'right'}`,
                                    'data-path-position': checkpoint.pathPosition,
                                    style: `--path-position: ${checkpoint.pathPosition}%`
                                },
                                    createElement('a', {
                                        href: checkpoint.targetLink || '#',
                                        className: 'badge',
                                        onclick: 'Overlay.open(this.href, event); return false;'
                                    }, checkpoint.previewLabel),

                                    createElement('div', {
                                        className: `badgeInfo has_border is_rounded`
                                    },
                                        pbw2.img.output({ attributes: checkpoint }, "previewImage"),
                                        createElement('div', { className: 'textwrap' },
                                            pbw2.text.output({ attributes: checkpoint }, "h3", "previewLabel"),
                                            pbw2.text.output({ attributes: checkpoint }, "p", "previewText"),
                                            checkpoint.targetLink && createElement('a', {
                                                href: checkpoint.targetLink,
                                                className: 'targetLink',
                                                onclick: 'Overlay.open(this.href, event); return false;'
                                            }, 'Mehr erfahren')
                                        )
                                    ),
                                    createElement('div', { className: 'string' })
                                )
                            )
                        )
                    )
                }
            },

            // Illustration for person markers
            personIllustration: (marker, index = null) => {

                const elements = [];

                // Only render if there is an illustration SVG
                if (marker.illustrationImageSvg) {

                    // Determine if the content should be open by default
                    const className = 'illustration-image desktop' + (index === null ? ` open` : '');

                    elements.push(createElement('div', {
                        key: `illu-${index}`,
                        className: className,
                        'data-hotspot-id': index,
                        'data-original-file': marker.illustrationImage,
                        dangerouslySetInnerHTML: {
                            __html: atob(marker.illustrationImageSvg)
                        },
                        style: {
                            transform: 'translate(-20%,100%) scale(.7)',
                        }
                    }));
                }

                // Only render if there is an illustration SVG
                if (marker.illustrationImageSvgRespo) {

                    // Determine if the content should be open by default
                    const className = 'illustration-image mobile' + (index === null ? ` open` : '');

                    elements.push(createElement('div', {
                        key: `illu-${index}`,
                        className: className,
                        'data-hotspot-id': index,
                        'data-original-file': marker.illustrationImageRespo,
                        dangerouslySetInnerHTML: {
                            __html: atob(marker.illustrationImageSvgRespo)
                        },
                        style: {
                            transform: 'translate(-20%,100%) scale(.7)',
                        }
                    }));
                }

                return createElement(
                    'div',
                    {
                        className: 'person-illustrations'
                    },
                    ...elements
                );
            },

            // Person image for person markers
            personImage: (marker, index = null) => {

                const elements = [];
                // Only render if there is a person image
                if (marker.personImage) {

                    // Determine if the content should be open by default
                    const className = 'person-image desktop' + (index === null ? ` open` : '');

                    elements.push(createElement('img', {
                        key: `person-${index}`,
                        className: className,
                        'data-hotspot-id': index,
                        src: marker.personImage,
                        alt: marker.personImageAlt || '',
                        style: {
                            transform: 'translate(-20%,100%) scale(.7)',
                        }
                    }));
                }

                if (marker.personImageRespo) {

                    // Determine if the content should be open by default
                    const className = 'person-image mobile' + (index === null ? ` open` : '');

                    elements.push(createElement('img', {
                        key: `person-${index}`,
                        className: className,
                        'data-hotspot-id': index,
                        src: marker.personImageRespo,
                        alt: marker.personImageRespoAlt || '',
                        style: {
                            transform: 'translate(-20%,100%) scale(.7)',
                        }
                    }));
                }

                return createElement(
                    'div',
                    {
                        className: 'person-images'
                    },
                    ...elements
                );
            },

            // Wrapper for marker Zoom Content
            personWrapper: (...children) => {
                return createElement(
                    'div',
                    {
                        className: 'person-illu-wrapper'
                    },
                    ...children
                );
            },

            // Side bar content for markers
            sideBarContent: (marker, index = null) => {

                // Only render if there is side text or a side link
                if (marker.sideText || marker.sideLink) {

                    // Determine if the content should be open by default
                    const className = 'side-content' + (index === null ? ` open` : '');

                    // Determine the name to display
                    const name = marker.catname ?? marker.sideHeadline ?? '';

                    return createElement(
                        'div',
                        {
                            key: `side-${index}`,
                            className: className,
                            'data-hotspot-id': index,
                            style: {
                                transform: 'translateX(-100%)',
                            }
                        },
                        name && createElement('h2', {
                            className: 'side-name has-gold-night-font-family',
                            dangerouslySetInnerHTML: { __html: name }
                        }),
                        marker.sideText && createElement('div', {
                            className: 'side-text',
                            dangerouslySetInnerHTML: { __html: marker.sideText }
                        }),
                        marker.sideLink && createElement('a', {
                            href: marker.sideLink,
                            className: 'side-link-button'
                        }, marker.sideLinkText || 'Mehr erfahren'),
                        createElement('div', { className: 'fakeCorner' })
                    )
                }
            },

            // Zoom content for markers
            zoomContent: (marker, index = null, ...children) => {
                return createElement(
                    'div',
                    {
                        key: index,
                        className: 'position-marker',
                        'data-hotspot-id': index,
                        style: `
                        --x-pos: ${marker.xPosition}%; 
                        --y-pos: ${marker.yPosition}%; 
                        --width: ${marker.width}%;
                        --x-pos-mobile: ${marker.xPositionRespo}%; 
                        --y-pos-mobile: ${marker.yPositionRespo}%; 
                        --width-mobile: ${marker.widthRespo}%
                        `
                    },
                    ...children
                );
            },

            // marker Label
            markerLabel: (marker) => {
                if (marker.catName) {
                    return createElement(
                        'div',
                        {
                            className: 'markerLabel'
                        },
                        createElement('h3', { className: 'badge' }, marker.catName),
                        createElement('div', { className: 'string' })
                    );
                }
            }
        }
    },

    // Backend components
    backend: {

        // Iterate over markers
        markerIterate: (props, callback, param = {}) => {
            return pbw2.array.input(props, 'hotspots', (itemProps, index) => {
                return callback(itemProps, index);
            }, param);
        },

        // Iterate over checkpoints
        checkpointsIterate: (props, callback, param = {}) => {
            return pbw2.array.input(props, 'checkpoints', (itemProps, index) => {
                return callback(itemProps, index);
            }, param);
        },

        marker: {
            positioningInstructions: () => {
                return createElement(
                    'div',
                    {
                        style: {
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '6px',
                            padding: '12px',
                            marginBottom: '16px'
                        }
                    },
                    createElement('strong', { style: { display: 'block', marginBottom: '8px' } },
                        '💡 Bedienungshinweise:'
                    ),
                    createElement('ul', { style: { margin: 0, fontSize: '13px', paddingLeft: '20px' } },
                        createElement('li', null, '🖱️ Klicke auf das Basis-Bild um Hotspots zu positionieren'),
                        createElement('li', null, '✋ Verschiebe Hotspots per Drag & Drop'),
                        createElement('li', null, '⚙️ Konfiguriere Hotspot-Inhalte unten')
                    )
                );
            },

            // Preview window for positioning hotspots
            positioningWindow: (attributes) => {
                const { useRef } = wp.element;
                const previewRef = useRef(null);


                return attributes.baseImage ? createElement('div', {
                    style: {
                        position: 'relative',
                        border: '2px dashed #ccc',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }
                },
                    createElement('img', {
                        ref: previewRef,
                        src: attributes.baseImage,
                        alt: 'Preview',
                        style: { width: '100%', display: 'block', cursor: 'crosshair' }
                    }),

                    // Hotspot Markers
                    attributes.hotspots?.map((hotspot, index) =>
                        createElement('div', {
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
                            hotspot.overlay && createElement('img', {
                                src: hotspot.overlay,
                                style: {
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    pointerEvents: 'none'
                                }
                            }),
                            createElement('span', {
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
                ) : createElement('div', {
                    style: {
                        padding: '60px 20px',
                        textAlign: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        border: '2px dashed #ccc'
                    }
                },
                    createElement('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '🖼️'),
                    createElement('p', { style: { margin: 0, color: '#666' } },
                        'Bitte zuerst ein Basis-Bild auswählen'
                    )
                );
            },

            // Basis-Einstellungen
            baseSettings: (itemProps) => {
                return group('📍 Basis-Einstellungen', { open: false },
                    pbw2.text.input(itemProps, 'p', 'catName', { title: 'Hotspot-Name' }),
                    pbw2.img.input(itemProps, 'overlay', { title: 'Hover Overlay (Desktop) (WebP 100% Vollton, Größe = Echtes Format auf Basis-Bild)' }),

                    createElement(
                        'div',
                        {
                            style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }
                        },
                        pbw2.text.input(itemProps, 'p', 'xPosition', { title: 'X Position (%)' }),
                        pbw2.text.input(itemProps, 'p', 'yPosition', { title: 'Y Position (%)' }),
                        pbw2.text.input(itemProps, 'p', 'width', { title: 'Breite (%)' })
                    ),

                    createElement(
                        'div',
                        {
                            style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }
                        },
                        pbw2.text.input(itemProps, 'p', 'xPositionRespo', { title: 'X Position (Mobile) (%)' }),
                        pbw2.text.input(itemProps, 'p', 'yPositionRespo', { title: 'Y Position (Mobile) (%)' }),
                        pbw2.text.input(itemProps, 'p', 'widthRespo', { title: 'Breite (Mobile) (%)' })
                    )
                );
            },

            // svg Path Input
            svgPathInput: (itemProps) => {
                return createElement(
                    'div',
                    null,
                    pbw2.img.input(itemProps, 'pathSvg', { title: 'SVG Pfad (Desktop) (SVG)' }),
                    pbw2.img.input(itemProps, 'pathSvgRespo', { title: 'SVG Pfad (Mobile) (SVG)' })
                );
            },

            // svg Path Checkpoints
            svgPathCheckpoint: (itemProps) => {
                return group(itemProps.attributes.previewLabel || "Marker", { open: false },
                    createElement(wp.element.Fragment, null,
                        pbw2.text.input(itemProps, 'p', 'previewLabel', { title: 'Vorschau Überschrift' }),
                        pbw2.text.input(itemProps, 'p', 'previewText', { title: 'Vorschau Text' }),
                        pbw2.link.input(itemProps, 'targetLink', { title: 'Zielseite' }),
                        pbw2.img.input(itemProps, 'previewImage', { title: 'Vorschau Bild (WebP min200 x min200)' }),

                        group('📍 Positionierung auf Pfad (Desktop)', { open: false },
                            pbw2.text.input(itemProps, 'p', 'pathPosition', { title: 'Position auf Pfad (0-100%)' }),
                            pbw2.choose.input(
                                itemProps,
                                'previewOrientation',
                                [
                                    { label: 'Rechts', value: 'right' },
                                    { label: 'Links', value: 'left' }
                                ],
                                {
                                    title: 'Vorschau-Ausrichtung',
                                    description: 'In welche Richtung soll sich die Vorschau öffnen?'
                                }
                            )
                        ),
                        
                        group('📍 Positionierung auf Pfad (Mobile)', { open: false },
                            pbw2.text.input(itemProps, 'p', 'pathPositionRespo', { title: 'Position auf Pfad (0-100%)' }),
                            pbw2.choose.input(
                                itemProps,
                                'previewOrientationRespo',
                                [
                                    { label: 'Rechts', value: 'right' },
                                    { label: 'Links', value: 'left' }
                                ],
                                {
                                    title: 'Vorschau-Ausrichtung',
                                    description: 'In welche Richtung soll sich die Vorschau öffnen?'
                                }
                            )
                        )
                    )
                );
            },

            // Zoom-Inhalte Einstellungen
            zoomSettings: (itemProps) => {
                return createElement(
                    'div',
                    null,
                    group('🔍 Zoom-Inhalte (Desktop)', { open: false },
                        pbw2.img.input(itemProps, 'zoomImage', { title: 'Freigestellter Berg (WebP, Größe = Echtes Format auf Basis-Bild HD)' }),
                        pbw2.img.input(itemProps, 'personImage', { title: 'Person Bild (WebP 1920 x 1080)' }),
                        pbw2.img.input(itemProps, 'illustrationImage', { title: 'Orange Illustration (SVG 1920 x 1080) (fluegel.svg,illu_feuer.svg,illu_helm.svg)' }),
                        pbw2.text.input(itemProps, 'p', 'sideText', { title: 'Seiten-Text' }),
                        pbw2.link.input(itemProps, 'sideLink', { title: 'Seiten-Link' }),
                        pbw2.text.input(itemProps, 'p', 'sideLinkText', { title: 'Link-Text' })
                    ),
                    group('🔍 Zoom-Inhalte (Mobile)', { open: false },
                        pbw2.img.input(itemProps, 'personImageRespo', { title: 'Person Bild (WebP 720x1440)' }),
                        pbw2.img.input(itemProps, 'illustrationImageRespo', { title: 'Orange Illustration (SVG 720x1440) (fluegel.svg,illu_feuer.svg,illu_helm.svg)' }),
                    )
                );
            },

            // Iterate Einstellungen
            iterateSettings: {
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
            },

            // Checkpoint Einstellungen
            checkpointIterateSettings: {
                title: 'Checkpoints',
                addButtonText: 'Checkpoint hinzufügen',
                maximum: 5,
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
            }
        }
    }
}