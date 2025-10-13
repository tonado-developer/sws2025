wp.blocks.registerBlockType('sws2025/image-columns', {
    title: 'Bild Spalten',
    description: "Zu jedem Themchen ein Bildchen",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
        style: {pointerEvents: 'none'}
    }),
    category: 'custom-blocks',
    attributes: {
        columns: pbw.choose.attr({
            default: 3,
            title: "Anzahl der Spalten",
            description: "Wieviele Bilder sollen auf dem Desktop nebeneinander stehen?"
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
        onhover: pbw.choose.attr({
            default: "onhover",
            title: 'Text erst beim Hovern?',
            description: 'Soll der Text erst beim Hovern über das Bild erscheinen?',
        }),
        items: {
            type: 'array',
            title: 'Spalten-Elemente',
            default: [
                {
                    image: {
                        type: 'img',
                        title: 'Bild',
                        description: "Das Bild das man als erstes sieht"
                    },
                    hoverimage: {
                        type: 'img',
                        title: 'Effekt-Bild',
                        description: "Das Bild das man erst beim hovern sieht"
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
                        title: 'Link (ggfs. mit Mail Funktion)',
                        description: 'Falls erwünscht: Verlinkung zu weiteren Informationen oder "mailto:" für E-Mail'
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
                    },
                    hasBorder: {
                        type: 'choose',
                        title: 'Umrandung',
                        description: 'Soll das Bild eine farbige Umrandung haben?',
                        options: [
                            { label: 'Ja, bitte umranden.', value: 'has_border' },
                            { label: 'Ja, bitte umranden (aber ohne verlauf).', value: 'has_silent_border' },
                            { label: 'Nein, bitte nicht umranden.', value: 'has_no_border' }
                        ]
                    },
                    textBackground: {
                        type: 'choose',
                        title: 'Text-Hintergrund',
                        description: 'Welche Farbe sollde rBalken hinter dem Text sein?',
                        options: [
                            { label: 'Bunt', value: 'color' },
                            { label: 'Dunkel', value: 'dark' },
                            { label: 'Hell', value: 'light' }
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
                    // Anzahl der Spalten
                    pbw.choose.input(props, 'columns', [
                        { label: '2', value: 2 },
                        { label: '3', value: 3 },
                        { label: '4', value: 4 }
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
                    // onhover
                    pbw.choose.input(props, 'onhover', [
                        { label: 'Ja bitte erst beim hovern anzeigen', value: 'onhover' },
                        { label: 'Nein bitte immer anzeigen', value: '' },
                    ])
                )
            ),


            // Haupt Inputs
            group("Inhalt", { open: false },
                // Einzelne Inputs
                pbw.array.input(props, "items")

            ),


            // Konfigurations Inputs
            group("Konfiguration", { open: false, color: "#ffcb20" },
                // Anzahl der Spalten
                pbw.choose.input(props, 'columns', [
                    { label: '2', value: 2 },
                    { label: '3', value: 3 },
                    { label: '4', value: 4 }
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
        );
    },
    save: function (props) {
        return wp.element.createElement(
            'section',
            {
                className: "bg-" + pbw.choose.output(props, "sectionBackground") +
                    " card-" + pbw.choose.output(props, "cardBackground"),
            },
            wp.element.createElement(
                'container',
                {
                    className: "columns-" + pbw.choose.output(props, "columns"),
                },
                pbw.array.output(props, "items", function (item) {
                    const isMailLink = item.link && item.link.startsWith("mailto:");
                    const hasNormalLink = item.link && !isMailLink;
                    const Component = hasNormalLink ? 'a' : 'div';

                    // Grundprops
                    const componentProps = {
                        className: 'kachel-text-reveal ' + (item.opening ?? "right") + '  ' + (item.hasBorder ?? "has_border") + '  ' + (item.textBackground ?? "color") +
                            " " + pbw.choose.output(props, "onhover"),
                        key: item.key
                    };

                    // Nur bei normalen Links href hinzufügen
                    if (hasNormalLink) {
                        componentProps.href = item.link;
                    }

                    // Inhalt der Karte
                    const children = [
                        wp.element.createElement(
                            'figure',
                            { className: `wp-block-image ` + (item.hoverimage && "has_effect"), key: item.key + "_figure" },
                            item.image && wp.element.createElement(
                                'img',
                                {
                                    src: item.image,
                                    alt: item.imageAlt || 'Bild',
                                }
                            ),
                            item.hoverimage && wp.element.createElement(
                                'img',
                                {
                                    src: item.hoverimage,
                                    alt: item.hoverimageAlt || 'Bild',
                                    class: "effect"
                                }
                            )
                        ),
                        (item.headline || item.text) && wp.element.createElement(
                            'div',
                            { className: `text-to-reveal `, key: item.key + "_text" },
                            wp.element.createElement('div', { key: item.key + "_inner" },
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'h3',
                                    value: item.headline || "",
                                }),
                                wp.element.createElement(wp.blockEditor.RichText.Content, {
                                    tagName: 'p',
                                    value: item.text || "",
                                }),
                                isMailLink && wp.element.createElement(
                                    'div',
                                    { className: 'mail-icon-container', key: item.key + "_mail" },
                                    wp.element.createElement(
                                        'a',
                                        { href: item.link, className: 'mail-icon' },
                                        wp.element.createElement('span', { className: 'dashicons dashicons-email' })
                                    )
                                )
                            )
                        )
                    ];
                    return wp.element.createElement(Component, componentProps, children);
                })
            )
        );
    }

});