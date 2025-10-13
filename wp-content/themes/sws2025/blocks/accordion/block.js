wp.blocks.registerBlockType('sws2025/accordion', {
    title: 'Akkordion',
    description: "Einzelne Sätze zum ausklappen",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    attributes: {
        ...pbw.img.attr('image', {
            title: "Haupt-Bild",
            description: "Das Bild das neben dem Akkordion sitzen soll"
        }),
        rounded: pbw.choose.attr({
            default: "is_rounded",
            title: "Abgerundete Ecken",
            description: "Sollen die Ecken abgerundet werden?"
        }),
        border: pbw.choose.attr({
            default: "has_border",
            title: "Farbiger-Rand",
            description: "Soll das Bild einen farbigen Rand haben?"
        }),
        opening: pbw.choose.attr({
            default: "right",
            title: 'Randöffnung',
            description: 'An welcher Seite soll sich eine Öffnung im Rand befinden?',
        }),
        order: pbw.choose.attr({
            default: "left",
            title: 'Anordnung',
            description: 'Auf welcher Seite soll sich das Bild befinden?',
        }),
        imageFormat: pbw.choose.attr({
            default: "1-1",
            title: 'Bild Format',
            description: 'In welchem Format soll sich das Bild anzeigen?',
        }),
        imageWidth: pbw.choose.attr({
            default: "25",
            title: 'Bild Breite',
            description: 'Wie breit soll das Bild angezeigt werden? (100% = Container Breite)',
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
            title: 'Akkordion-Reihen',
            default: [
                {
                    headline: {
                        type: 'text',
                        title: 'Überschrift',
                        description: 'Die Überschrift für diese Reihe'
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
                    image: {
                        type: 'img',
                        title: 'Bild (optional)',
                        description: "Falls man ein anderes Bild für diese Reihe möchte"
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
        return wp.element.createElement(wp.element.Fragment, null,
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

                    // Abgerundete Ecken
                    pbw.choose.input(props, 'rounded', [
                        { label: 'Ja, bitte abrunden', value: "is_rounded" },
                        { label: 'Nein, ich will das eckig', value: "is_not_rounded" }
                    ]),
                    // Farbiger-Rand
                    pbw.choose.input(props, 'border', [
                        { label: 'Ja, bitte Rand dran lassen', value: "has_border" },
                        { label: 'Nein, bitte Rand wegschneiden', value: "has_no_border" }
                    ]),
                    // Randöffnung
                    pbw.choose.input(props, 'opening', [
                        { label: 'Rechts', value: 'right' },
                        { label: 'Unten', value: 'bottom' },
                        { label: 'Links', value: 'left' },
                        { label: 'Oben', value: 'top' },
                        { label: 'Keinen', value: 'none' }
                    ]),
                    // Anordnung
                    pbw.choose.input(props, 'order', [
                        { label: 'Bild links', value: 'left' },
                        { label: 'Bild rechts', value: 'right' }
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
                    ]),
                    // Bild Format
                    pbw.choose.input(props, 'imageFormat', [
                        { label: '1/1', value: '1-1' },
                        { label: '16/9 (Querformat)', value: '16-9' },
                        { label: '9/16 (Hochformat)', value: '9-16' }
                    ]),
                    // Bild Breite
                    pbw.choose.input(props, 'imageWidth', [
                        { label: '25%', value: '25' },
                        { label: '33%', value: '33' },
                        { label: '50%', value: '50' }
                    ])
                )
            ),


            // Haupt Inputs
            group("Inhalt", { open: false },
                // Image input
                pbw.img.input(props, "image"),
                // Einzelne Inputs
                pbw.array.input(props, "items")

            ),


            // Konfigurations Inputs
            group("Konfiguration", { open: false, color: "#ffcb20" },
                // Abgerundete Ecken
                pbw.choose.input(props, 'rounded', [
                    { label: 'Ja, bitte abrunden', value: "is_rounded" },
                    { label: 'Nein, ich will das eckig', value: "is_not_rounded" }
                ]),
                // Farbiger-Rand
                pbw.choose.input(props, 'border', [
                    { label: 'Ja, bitte Rand dran lassen', value: "has_border" },
                    { label: 'Nein, bitte Rand wegschneiden', value: "has_no_border" }
                ]),
                // Randöffnung
                pbw.choose.input(props, 'opening', [
                    { label: 'Rechts', value: 'right' },
                    { label: 'Unten', value: 'bottom' },
                    { label: 'Links', value: 'left' },
                    { label: 'Oben', value: 'top' },
                    { label: 'Keinen', value: 'none' }
                ]),
                // Anordnung
                pbw.choose.input(props, 'order', [
                    { label: 'Bild links', value: 'left' },
                    { label: 'Bild rechts', value: 'right' }
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
                ]),
                // Bild Format
                pbw.choose.input(props, 'imageFormat', [
                    { label: '1/1', value: '1-1' },
                    { label: '16/9 (Querformat)', value: '16-9' },
                    { label: '9/16 (Hochformat)', value: '9-16' }
                ]),
                // Bild Breite
                pbw.choose.input(props, 'imageWidth', [
                    { label: '25%', value: '25' },
                    { label: '33%', value: '33' },
                    { label: '50%', value: '50' }
                ])

            )
        );
    },
    save: function (props) {
        const { attributes } = props;
        return wp.element.createElement('section',
            {
                className:
                    "bg-" + pbw.choose.output(props, "sectionBackground")
                    + " card-" + pbw.choose.output(props, "cardBackground")
                    + " img-format-" + pbw.choose.output(props, "imageFormat")
                    + " img-width-" + pbw.choose.output(props, "imageWidth")
            },
            wp.element.createElement(
                'container',
                {
                    className: "contentGrid " + pbw.choose.output(props, "rounded") + " " + pbw.choose.output(props, "border") + " opening-" + pbw.choose.output(props, "opening") + " figure-" + pbw.choose.output(props, "order"),
                },
                wp.element.createElement('div', { className: "accordionImages" },
                    pbw.img.output(props, "image"),
                    pbw.array.output(props, "items", function (item) {

                        return item.image && wp.element.createElement(
                            'figure',
                            {
                                className: `imageWrap subImage ` + (item.key == 0 ? "open" : ""),
                                key: item.key,
                                'data-id': item.key
                            },
                            wp.element.createElement(
                                'img',
                                {
                                    src: item.image,
                                    alt: item.imageAlt || 'Bild',
                                }
                            ),
                        );
                    })
                ),
                wp.element.createElement('div', { className: "rowWrap", },
                    pbw.array.output(props, "items", function (item) {
                        const Component = 'div';

                        // Prepare props object for the main component (a or div)
                        const componentProps = {
                            className: 'row ' + (item.key == 0 ? "open" : ""),
                            key: item.key,
                            'data-id': item.key
                        };

                        return wp.element.createElement(
                            Component,
                            componentProps,
                            wp.element.createElement(
                                'a',
                                {
                                    className: `rowTrigger`,
                                    onclick: "openAccordionPane(this)"
                                },
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'h3',
                                    value: item.headline || "", // Zugriff auf den ersten Wert
                                }),
                            ),
                            wp.element.createElement(
                                'div',
                                {
                                    className: `textWrap`,
                                },
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'p',
                                    value: item.text || "", // Zugriff auf den ersten Wert
                                }),
                            ),
                            item.link && wp.element.createElement(
                                'a',
                                {
                                    href: item.link,
                                    className: `link`,
                                    key: item.key
                                },
                                item.button_text
                            )
                        );
                    })
                )
            )
        );
    },
});