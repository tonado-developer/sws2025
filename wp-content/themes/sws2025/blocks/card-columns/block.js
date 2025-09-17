wp.blocks.registerBlockType('sws2025/card-columns', {
    title: 'Karten Spalten',
    description: "Zum Zeigen und aufzählen",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    attributes: {
        columns: pbw.choose.attr({
            default: 3,
            title: "Anzahl der Spalten",
            description: "Wieviele Karten sollen auf dem Desktop nebeneinander stehen?"
        }),
        rounded: pbw.choose.attr({
            default: "is_rounded",
            title: "Abgerundete Ecken",
            description: "Sollen die Ecken abgerundet werden?"
        }),
        mode: pbw.choose.attr({
            default: "dark",
            title: "Darstellungsmodus",
            description: "Wählen Sie hier einen Darstellungsmodus aus"
        }),
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
        items: {
            type: 'array',
            title: 'Spalten-Elemente',
            default: [
                {
                    image: { 
                        type: 'img', 
                        title: 'Bild',
                        description: "Das Bild am oberen Karten-Ende"
                    },
                    headline: { 
                        type: 'text', 
                        title: 'Überschrift',
                        description: 'Die Überschrift für diese Spalte'
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
                    // Anzahl der Spalten
                    pbw.choose.input(props, 'columns', [
                        { label: '2', value: 2 },
                        { label: '3', value: 3 },
                        { label: '4', value: 4 }
                    ]),
                    // Abgerundete Ecken
                    pbw.choose.input(props, 'rounded', [
                        { label: 'Ja, bitte abrunden', value: "is_rounded" },
                        { label: 'Nein, ich will das eckig', value: "is_not_rounded" }
                    ]),
                    // Darstellungsmodus
                    pbw.choose.input(props, 'mode', [
                        { label: 'Dunkel', value: "dark" },
                        { label: 'Hell', value: "light" }
                    ]),
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
                    // Anzahl der Spalten
                    pbw.choose.input(props, 'columns', [
                        { label: '2', value: 2 },
                        { label: '3', value: 3 },
                        { label: '4', value: 4 }
                    ]),
                    // Abgerundete Ecken
                    pbw.choose.input(props, 'rounded', [
                        { label: 'Ja, bitte abrunden', value: "is_rounded" },
                        { label: 'Nein, ich will das eckig', value: "is_not_rounded" }
                    ]),
                    // Darstellungsmodus
                    pbw.choose.input(props, 'mode', [
                        { label: 'Dunkel', value: "dark" },
                        { label: 'Hell', value: "light" }
                    ]),
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
                    ])
                )
            )
        );
    },
    save: function (props) {
        const { attributes } = props;
        return wp.element.createElement('section',{ 
            className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-" + pbw.choose.output(props, "cardBackground"),
        },
            wp.element.createElement(
                'container',
                { 
                    className: "columns-" + pbw.choose.output(props, "columns"),
                },
                pbw.array.output(props, "items", function(item) {
                    const Component = 'div';
                    
                    // Prepare props object for the main component (a or div)
                    const componentProps = {
                        className: 'kachel-card ' + attributes.rounded + ' ' + attributes.mode,
                        key: item.key
                    };
                
                    return wp.element.createElement(
                        Component, 
                        componentProps,
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
                        ),
                        item.link && wp.element.createElement(
                            'a',
                            { 
                                href: item.link,
                                className: `link`, 
                                key: item.key 
                            },
                            item.button_text
                        ),
                    );
                })
            )
        );
    },
});