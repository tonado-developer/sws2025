wp.blocks.registerBlockType('sws2025/slider', {
    title: 'Slider',
    description: "Bild-Text in beliebig vielen Slides unterbringen",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    attributes: {
        items: {
            type: 'array',
            title: 'Slides',
            default: [
                {
                    image: { 
                        type: 'img', 
                        title: 'Bild',
                        description: "Das Bild neben dem Text (falls erwünscht)"
                    },
                    headline: { 
                        type: 'text', 
                        title: 'Überschrift',
                        description: 'Die Überschrift für den Text'
                    }, 
                    text: { 
                        type: 'text', 
                        title: 'Text',
                        description: 'Der Beschreibungstext'
                    }, 
                    link: { 
                        type: 'link', 
                        title: 'Button Verlinkung',
                    }, 
                    button_text: { 
                        type: 'text', 
                        title: 'Button Text',
                        description: 'Dieser Text steht später auf dem Button'
                    }, 
                    opening: { 
                        type: 'choose', 
                        title: 'Randöffnung',
                        description: 'An welcher Seite soll sich eine Öffnung im Rand befinden?',
                        options: [
                            { label: 'Rechts', value: 'right' },
                            { label: 'Unten', value: 'bottom' },
                            { label: 'Links', value: 'left' },
                            { label: 'Oben', value: 'top' },
                            { label: 'Keinen', value: 'none' }
                        ]
                    }
                }
            ]
        },
        sectionBackground: pbw.choose.attr({ 
            default: "none",
            title: 'Sektion Hintergrund',
            description: 'Wie soll die Fläche allgemein hinter dem Block gefärbt sein?',
        }),
        cardBackground: pbw.choose.attr({ 
            default: "none",
            title: 'Karte',
            description: 'Soll der Block in eine Karte verpackt werden? Wenn ja welcher Farbmodus?',
        }),
        duration: pbw.choose.attr({ 
            default: "300",
            title: 'Übergangs-Geschwindigkeit',
            description: 'Wie Schnell soll die Animation vom Wechsel sein?',
        }),
        timeout: pbw.choose.attr({ 
            default: "none",
            title: 'Wartezeit',
            description: 'Wie lange soll ein Slide zu sehen sein bis er gewechselt wird?',
        })
    },
    example: {
        attributes: {
            heading: pbw.h1.example,
            text: pbw.p.example
        }, 
    },
    edit: function (props) {
        return wp.element.createElement(wp.element.Fragment,null,
            // Block Info
            pbw.block.title(props),
            // Sidebar Panels
            wp.element.createElement(
                InspectorControls,
                null,
                wp.element.createElement(
                    PanelBody,
                    {
                        title: 'Konfiguration',
                        initialOpen: false, // Startet collapsed
                        icon: 'admin-generic'
                    },
                    // Sektion Hintergrund
                    pbw.choose.input(props, 'sectionBackground', [
                        { label: 'Keine Hintergrundfarbe', value: 'none' },
                        { label: 'Hell', value: 'light' },
                        { label: 'Dunkel', value: 'dark' },
                        { label: 'Farbig', value: 'color' }
                    ]),
                    // Karte
                    pbw.choose.input(props, 'cardBackground', [
                        { label: 'Nein bitte nicht', value: 'none' },
                        { label: 'Ja, Hell', value: 'light' },
                        { label: 'Ja, Dunkel', value: 'dark' },
                        { label: 'Ja, Farbig', value: 'color' }
                    ]),
                    // Übergangs-Geschwindigkeit
                    pbw.choose.input(props, 'duration', [
                        { label: 'Keine Animationen hier ok? Bitte, danke !', value: 'none' },
                        { label: '100ms', value: '100' },
                        { label: '200ms', value: '200' },
                        { label: '300ms', value: '300' },
                        { label: '400ms', value: '400' },
                        { label: '500ms', value: '500' }
                    ]),
                    // Wartezeit
                    pbw.choose.input(props, 'timeout', [
                        { label: 'Hier soll nix automatisch wechseln', value: 'none' },
                        { label: '1s', value: '1000' },
                        { label: '2s', value: '2000' },
                        { label: '3s', value: '3000' },
                        { label: '5s', value: '5000' },
                        { label: '7s', value: '7000' }
                    ])
                )
            ),
            // Haupt Inputs
            wp.element.createElement(
                'details',
                { 
                    className: 'wp-block-config',
                    style: { borderLeft: '4px solid #ff6920', padding: '10px' },
                    open: true
                },
                wp.element.createElement(
                    'summary', 
                    { style: { cursor: 'pointer', fontWeight: 'bold' } },
                    'Inhalt'
                ),
                wp.element.createElement(
                    'div',
                    { style: { marginTop: '10px' } },
                    // Einzelne Inputs
                    pbw.array.input(props, "items")
                )
            ),
            // Konfigurations Inputs
            wp.element.createElement(
                'details',
                { 
                    className: 'wp-block-config',
                    style: { borderLeft: '4px solid #ffcb20', padding: '10px' }
                },
                wp.element.createElement(
                    'summary', 
                    { style: { cursor: 'pointer', fontWeight: 'bold' } },
                    'Konfiguration'
                ),
                wp.element.createElement(
                    'div',
                    { style: { marginTop: '10px' } },
                    // Sektion Hintergrund
                    pbw.choose.input(props, 'sectionBackground', [
                        { label: 'Keine Hintergrundfarbe', value: 'none' },
                        { label: 'Hell', value: 'light' },
                        { label: 'Dunkel', value: 'dark' },
                        { label: 'Farbig', value: 'color' }
                    ]),
                    // Karte
                    pbw.choose.input(props, 'cardBackground', [
                        { label: 'Nein bitte nicht', value: 'none' },
                        { label: 'Ja, Hell', value: 'light' },
                        { label: 'Ja, Dunkel', value: 'dark' },
                        { label: 'Ja, Farbig', value: 'color' }
                    ]),
                    // Übergangs-Geschwindigkeit
                    pbw.choose.input(props, 'duration', [
                        { label: 'Keine Animationen hier ok? Bitte, danke !', value: 'none' },
                        { label: '100ms', value: '100' },
                        { label: '200ms', value: '200' },
                        { label: '300ms', value: '300' },
                        { label: '400ms', value: '400' },
                        { label: '500ms', value: '500' }
                    ]),
                    // Wartezeit
                    pbw.choose.input(props, 'timeout', [
                        { label: 'Hier soll nix automatisch wechseln', value: 'none' },
                        { label: '1s', value: '1000' },
                        { label: '2s', value: '2000' },
                        { label: '3s', value: '3000' },
                        { label: '5s', value: '5000' },
                        { label: '7s', value: '7000' }
                    ])
                )
            )
        );
    },
    save: function (props) {
        const { attributes } = props;
        return wp.element.createElement(
            'section',
            { 
                className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-" + pbw.choose.output(props, "cardBackground"),
                "data-duration": pbw.choose.output(props, "duration"),
                "data-timeout": pbw.choose.output(props, "timeout"),
            },
            wp.element.createElement(
                'container',
                { 
                    className: "sliderContainer",
                },
                wp.element.createElement(
                    'div',
                    { 
                        className: "slideWrap open",
                    },
                    pbw.array.output(props, "items", function(item) {                    
                        return wp.element.createElement(
                            "div", 
                            {
                                className: 'slidePane has_border is_rounded opening-' + item.opening + ' slide-' + item.key + " " + (item.key == 0 ? "open" : ""),
                                key: item.key
                            },
                            item.image && wp.element.createElement(
                                'figure',
                                { className: `wp-block-image`, key: item.key },
                                wp.element.createElement(
                                    'img',
                                    { 
                                        src: item.image, 
                                        alt: item.imageAlt || 'Bild',
                                    }
                                ),
                            ),
                            (item.text || item.headline) && wp.element.createElement(
                                'div',
                                { className: `textWrap`, key: item.key },
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'h3',
                                    value: item.headline || "", // Zugriff auf den ersten Wert
                                }),
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'p',
                                    value: item.text || "", // Zugriff auf den ersten Wert
                                }),
                                item.link && wp.element.createElement(
                                    'a',
                                    { 
                                        href: item.link,
                                        className: `link`, 
                                        key: item.key 
                                    },
                                    item.button_text
                                )
                            )
                        );
                    })
                ),
                wp.element.createElement(
                    'div',
                    { 
                        className: "sliderNavigation",
                    },
                    pbw.array.output(props, "items", function(item) {
                        return wp.element.createElement(
                            'a',
                            { 
                                class: "button " + (item.key == 0 ? "current" : ""),
                                "data-pane": item.key, 
                                "aria-label": `Zu Slide ${item.key + 1}`
                            }
                        );
                    })
                ),
                wp.element.createElement(
                    'a',
                    { 
                        className: "sliderArrow left",
                        "aria-label": "Vorheriger Slide"
                    },
                    wp.element.createElement('img', {
                        src: php_vars.template_directory_uri + '/assets/img/arrow.svg',
                    })
                ),
                wp.element.createElement(
                    'a',
                    { 
                        className: "sliderArrow right",
                        "aria-label": "Nächster Slide"
                    },
                    wp.element.createElement('img', {
                        src: php_vars.template_directory_uri + '/assets/img/arrow.svg',
                    }),
                    // SVG Progress Ring
                    wp.element.createElement(
                        'svg',
                        { 
                            className: 'progressRing',
                            width: '56',
                            height: '56',
                            viewBox: '0 0 56 56'
                        },
                        // Gradient Definition
                        wp.element.createElement(
                            'defs',
                            null,
                            wp.element.createElement(
                                'linearGradient',
                                { 
                                    id: 'progressGradient',
                                    x1: '0%',
                                    y1: '0%',
                                    x2: '100%',
                                    y2: '100%'
                                },
                                wp.element.createElement('stop', { 
                                    offset: '0%', 
                                    style: { stopColor: '#ff6920', stopOpacity: 1 }
                                }),
                                wp.element.createElement('stop', { 
                                    offset: '100%', 
                                    style: { stopColor: '#ffcd29', stopOpacity: 1 }
                                })
                            )
                        ),
                        // Background Circle
                        wp.element.createElement('circle', {
                            className: 'progressBackground',
                            cx: '28',
                            cy: '28',
                            r: '26'
                        }),
                        // Progress Circle
                        wp.element.createElement('circle', {
                            className: 'progressBar',
                            cx: '28',
                            cy: '28',
                            r: '26'
                        })
                    )
                )
            )
        );
    },
});