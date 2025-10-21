registerBlockType('sws2025/image-mapper2', {
    title: 'Berge',
    description: "Der Berglandschafts-Editor deines Vertrauens",
    icon: createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
        style: { pointerEvents: 'none' }
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
            description: 'Interaktive Bereiche auf dem Bild',

        })
    },

    edit: function (props) {
        const { attributes, setAttributes } = props;
        const { useState, useEffect } = wp.element;

        // Import Components from custom components file
        const {
            marker,
            markerIterate
        } = window.imageMapperComponents.backend;


        const [isDragging, setIsDragging] = useState(false);
        const [draggedIndex, setDraggedIndex] = useState(null);


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

        return createElement('div', null,

            // Block Title
            pbw2.block.title(props),

            // Bilder Section
            group('🖼️ Bilder', { open: false },
                createElement('div', {
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
            createElement('div', { style: { height: "40px" } }),

            // Hotspot Positionierung
            group('🎯 Hotspot-Positionierung', { open: false },

                // Hotspot Bedienungshinweise
                marker.positioningInstructions(),

                // Hotspot Positionierungs-Vorschau
                marker.positioningWindow(attributes),
            ),

            // Hotspots Konfiguration
            group('⚙️ Hotspot-Konfiguration', { open: false },

                // Iterate Hotspots
                markerIterate(props, (itemProps) => {
                    return createElement(wp.element.Fragment, null,

                        // Hotspot Positionierungs-Vorschau
                        marker.baseSettings(itemProps),

                        // Zoom-Inhalte
                        marker.zoomSettings(itemProps),

                        // SVG Pfad + Checkpoints
                        group('🛤️ SVG Pfad & Checkpoints', { open: false },
                            marker.svgPathInput(itemProps),
                            markerIterate(
                                itemProps,
                                (itemProps) => marker.svgPathCheckpoint(itemProps),
                                marker.checkpointIterateSettings
                            )
                        )
                    );
                }, marker.iterateSettings)
            )
        );
    },

    save: function (props) {
        const { attributes } = props;

        // Import Components from custom components file
        const {
            marker,
            markerWrapper,
            markerIterate,
            global,
            globalWrapper,
            imageMapperContainer,
            ZoomWrapper,
            globalZoomContent
        } = window.imageMapperComponents.frontend;


        //  Build Frontend Output
        return imageMapperContainer(

            //  Wrapper for Global Details
            globalWrapper(

                // Background Image
                global.backgroundImage(props),

                // Side Content (Global)
                marker.sideBarContent(attributes),

                // Person Image (Global)
                marker.personImage(attributes),

                // Illustration (Global)
                marker.personIllustration(attributes),
            ),

            // Wrapper for the content that needs zoom functionality
            ZoomWrapper(

                // global Zoom Content
                globalZoomContent(

                    // Base Image
                    global.baseImage(props),

                    // Base Image HD
                    global.baseImageHd(props),
                ),

                // marker Zoom Contents Wrapper
                marker.zoomContentWrapper(
                    // Iterate Hotspots
                    markerIterate(props, (markerData, index) => marker.zoomContent(markerData, index))
                )
            ),

            // Hotspot Details (Side Content per Hotspot)
            markerWrapper(

                // Iterate Hotspots
                markerIterate(props, (markerData, index) => {

                    // return Wrapper for each marker
                    return marker.wrapper(

                        // Person Illustration
                        marker.personIllustration(markerData, index),

                        // Person Image
                        marker.personImage(markerData, index),

                        // Svg Path with Checkpoints
                        marker.svgPath(markerData, index),

                        // Side Bar Content
                        marker.sideBarContent(markerData, index)
                    );
                })
            )
        );
    }
});