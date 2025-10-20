wp.blocks.registerBlockType('sws2025/image-text', {
    title: 'Bild & Text',
    description: "Bild-Text nebeneinander plaziert",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
        style: {pointerEvents: 'none'}
    }),
    category: 'custom-blocks',
    supports: {
        spacing: {
            padding: true,
            margin: true
        }
    },
    attributes: {
        ...pbw.img.attr('image', {
            title: "Haupt-Bild",
            description: "Das Bild das neben dem Text stehen soll"
        }),
        heading: pbw.h1.attr({
            title: "Falls das Bild keine Überschrift haben soll einfach frei lassen",
        }),
        headingSize: pbw.choose.attr({
            default: "h1",
            title: "Headline",
        }),
        text: pbw.p.attr({
            title: "Fließtext",
            description: "Der Hauptbestandteil an text neben dem Bild"
        }),
        button_text: pbw.p.attr({
            selector: 'a.button',
            title: "Button Text",
        }),
        link: pbw.link.attr(),
        opening: pbw.choose.attr({
            default: 'right',
            title: 'Randöffnung',
            description: 'An welcher Seite soll sich eine Öffnung im Rand befinden?',
        }),
        order: pbw.choose.attr({
            default: "left",
            title: 'Anordnung',
            description: 'Auf welcher Seite soll sich das Bild befinden?',
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
        align: pbw.choose.attr({
            default: "center",
            title: 'Ausrichtung',
            description: 'Wie sollen die Panele auf der X-Achse ausgerichtet werden?',
        })
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

            // Haupt Inputs
            group("Inhalt", { open: false },
                // Image Input
                pbw.img.input(props, "image"),
                // Heading Input
                wp.element.createElement('div', {
                    style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px' }
                },
                    pbw.choose.input(props, 'headingSize', [
                        { label: 'h1', value: 'h1' },
                        { label: 'h2', value: 'h2' },
                        { label: 'h3', value: 'h3' },
                        { label: 'h4', value: 'h4' },
                        { label: 'h5', value: 'h5' },
                        { label: 'h6', value: 'h6' }
                    ]),
                    pbw.h1.input(props, "h1", "heading"),
                ),

                // Text Input
                pbw.p.input(props, "p", "text"),
                // Button Input
                wp.element.createElement(
                    'div',
                    {
                        style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px' }
                    },
                    // Button-Text Input
                    pbw.p.input(props, "p", "button_text"),
                    // Button-Link Input
                    pbw.link.input(props, "link"),
                )

            ),

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
                    // Anordnung
                    pbw.choose.input(props, 'order', [
                        { label: 'Bild links', value: 'left' },
                        { label: 'Bild rechts', value: 'right' }
                    ]),
                    // Randöffnung
                    pbw.choose.input(props, 'opening', [
                        { label: 'Rechts', value: 'right' },
                        { label: 'Unten', value: 'bottom' },
                        { label: 'Links', value: 'left' },
                        { label: 'Oben', value: 'top' },
                        { label: 'Keinen', value: 'none' }
                    ]),
                    // Ausrichtung
                    pbw.choose.input(props, 'align', [
                        { label: 'Obere Kante', value: 'top' },
                        { label: 'Mittig', value: 'center' },
                        { label: 'Untere Kante', value: 'bottom' }
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

            // Konfigurations Inputs
            group("Konfiguration", { open: false, color: "#ffcb20" },
                // Anordnung
                pbw.choose.input(props, 'order', [
                    { label: 'Bild links', value: 'left' },
                    { label: 'Bild rechts', value: 'right' }
                ]),
                // Randöffnung
                pbw.choose.input(props, 'opening', [
                    { label: 'Rechts', value: 'right' },
                    { label: 'Unten', value: 'bottom' },
                    { label: 'Links', value: 'left' },
                    { label: 'Oben', value: 'top' },
                    { label: 'Keinen', value: 'none' }
                ]),
                // Ausrichtung
                pbw.choose.input(props, 'align', [
                    { label: 'Obere Kante', value: 'top' },
                    { label: 'Mittig', value: 'center' },
                    { label: 'Untere Kante', value: 'bottom' }
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

            ),

        );
    },
    save: function (props) {
        return wp.element.createElement('section', {
            className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-" + pbw.choose.output(props, "cardBackground"),
        },
            wp.element.createElement(
                'container',
                {
                    className: "imageTextGrid has_border is_rounded opening-" + pbw.choose.output(props, "opening")
                        + " figure-" + pbw.choose.output(props, "order")
                        + " align-items-" + pbw.choose.output(props, "align"),
                },
                pbw.img.output(props, "image"),
                wp.element.createElement(
                    'div',
                    { className: `textWrap` },
                    pbw.h1.output(props, pbw.choose.output(props,'headingSize'), "heading"),
                    pbw.p.output(props, "p", "text"),
                    pbw.link.output(props, "link", pbw.p.output(props, "span", "button_text")),
                )
            )
        );
    },
});