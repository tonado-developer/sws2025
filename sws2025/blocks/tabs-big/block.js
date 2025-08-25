wp.blocks.registerBlockType('sws2025/tabs-big', {
    title: 'Tabs (groß)',
    description: "Bild und viel text in Tabs verpackt",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    attributes: {
        heading: pbw.h1.attr({
            title: "Überschrift",
            description: "Falls nur Tabs erwünscht sind einfach frei lassen"
        }),
        sectionBackground: pbw.choose.attr({ 
            default: "none",
            title: 'Sektion Hintergrund',
            description: 'Wie soll die Fläche allgemein hinter dem Block gefärbt sein?',
        }),
        items: {
            type: 'array',
            title: 'Tabs',
            default: [
                {
                    label: { 
                        type: 'text', 
                        title: 'Name',
                        description: 'Der Text für die Navigation'
                    },
                    image: { 
                        type: 'img', 
                        title: 'Bild',
                        description: "Das Bild neben dem Text"
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
        }
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
                    // Überschrift Input
                    pbw.h1.input(props, "h1", "heading"),
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
                    ])
                )
            )
        );
    },
    save: function (props) {
        const { attributes } = props;
        return wp.element.createElement('section',{ 
            className: "bg-" + pbw.choose.output(props, "sectionBackground"),
        },
            wp.element.createElement(
                'container',
                null,
                pbw.h1.output(props,"h2","heading"),
            ),
            wp.element.createElement(
                'container',
                { 
                    className: "tabContainer",
                    "data-duration": 1200
                },
                wp.element.createElement(
                    'div',
                    { 
                        className: "tabNavigation",
                    },
                    pbw.array.output(props, "items", function(item) {
                        return wp.element.createElement(
                            'a',
                            { 
                                onclick: "openTab(this)", 
                                class: "button " + (item.key == 0 ? "current" : ""),
                                "data-pane": item.key
                            },
                            item.label
                        );
                    })
                ),
                wp.element.createElement(
                    'div',
                    { 
                        className: "tabWrap open",
                    },
                    pbw.array.output(props, "items", function(item) {                    
                        return wp.element.createElement(
                            "div", 
                            {
                                className: 'tabPane has_border is_rounded opening-' + item.opening + ' pane-' + item.key + " " + (item.key == 0 ? "open" : ""),
                                key: item.key
                            },
                            wp.element.createElement(
                                'figure',
                                { className: `wp-block-image`, key: item.key },
                                item.image && wp.element.createElement(
                                    'img',
                                    { 
                                        src: item.image, 
                                        alt: item.imageAlt || 'Bild',
                                    }
                                ),
                            ),
                            wp.element.createElement(
                                'div',
                                { className: `textWrap`, key: item.key },
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'h3',
                                    value: item.headline || "", // Zugriff auf den ersten Wert
                                }),
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'p',
                                    value: item.text || "", // Zugriff auf den ersten Wert
                                })
                            )
                        );
                    })
                ),
            )
        );
    },
});