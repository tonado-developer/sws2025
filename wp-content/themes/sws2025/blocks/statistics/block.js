wp.blocks.registerBlockType('sws2025/statistics', {
    title: 'Statistiken',
    description: "Das kleine Ein mal Eins",
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
        duration: pbw.choose.attr({
            default: 1,
            title: "Animation-Geschwindigkeit",
            description: "Wie lange soll eine Zahl brauchen um hochzuzählen"
        }),
        delay: pbw.choose.attr({
            default: 500,
            title: "Verzögerung zwischen Animationen",
            description: "Wie viel Verzögerung soll zwischen dem Start der Zahlen liegen?"
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
        numberSize: pbw.choose.attr({
            default: "normal",
            title: 'Zahlengröße',
            description: 'Wie Groß sollen die Zahlen dargestellt werden?',
        }),
        items: {
            type: 'array',
            title: 'Zahlen-Elemente',
            default: [
                {
                    number: {
                        type: 'text',
                        title: 'Zahl',
                        description: 'Die Zahl zu der gezählt werden soll'
                    },
                    text: {
                        type: 'text',
                        title: 'Text',
                        description: 'Der Beschreibungstext'
                    },
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
                    // Animation-Geschwindigkeit
                    pbw.choose.input(props, 'duration', [
                        { label: '1 Sekunde', value: 1 },
                        { label: '2 Sekunden', value: 2 },
                        { label: '3 Sekunden', value: 3 },
                        { label: '4 Sekunden', value: 4 }
                    ]),
                    // Verzögerung zwischen Animationen
                    pbw.choose.input(props, 'delay', [
                        { label: '300 Millisekunden', value: 300 },
                        { label: '500 Millisekunden', value: 500 },
                        { label: '700 Millisekunden', value: 700 },
                        { label: '1000 Millisekunden', value: 1000 }
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
                    // Zahlengröße
                    pbw.choose.input(props, 'numberSize', [
                        { label: 'kleiner', value: 'smaller' },
                        { label: 'klein', value: 'small' },
                        { label: 'normal', value: 'normal' },
                        { label: 'groß', value: 'big' },
                        { label: 'größer', value: 'bigger' },
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
                // Animation-Geschwindigkeit
                pbw.choose.input(props, 'duration', [
                    { label: '1 Sekunde', value: 1 },
                    { label: '2 Sekunden', value: 2 },
                    { label: '3 Sekunden', value: 3 },
                    { label: '4 Sekunden', value: 4 }
                ]),
                // Verzögerung zwischen Animationen
                pbw.choose.input(props, 'delay', [
                    { label: '300 Millisekunden', value: 300 },
                    { label: '500 Millisekunden', value: 500 },
                    { label: '700 Millisekunden', value: 700 },
                    { label: '1000 Millisekunden', value: 1000 }
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
                // Zahlengröße
                pbw.choose.input(props, 'numberSize', [
                    { label: 'kleiner', value: 'smaller' },
                    { label: 'klein', value: 'small' },
                    { label: 'normal', value: 'normal' },
                    { label: 'groß', value: 'big' },
                    { label: 'größer', value: 'bigger' },
                ])

            )
        );
    },
    save: function (props) {
        const { attributes } = props;
        return wp.element.createElement('section', {
            className: "bg-" + pbw.choose.output(props, "sectionBackground")
                + " card-" + pbw.choose.output(props, "cardBackground")
                + " numberSize-" + pbw.choose.output(props, "numberSize"),
        },
            wp.element.createElement(
                'container',
                {
                    className: "flex"
                },
                pbw.array.output(props, "items", function (item) {
                    const Component = "div";
                    const componentProps = {
                        className: 'numberWrap appear',
                        key: item.key,
                        'data-duration': attributes.duration,
                        'data-delay': item.key * attributes.delay
                    };

                    return wp.element.createElement(
                        Component,
                        componentProps,
                        wp.element.createElement(
                            'h3',
                            {
                                className: `number`,
                                'data-number': item.number,
                                key: item.key
                            },
                            0
                        ),
                        wp.element.createElement(
                            'p',
                            { className: `text`, key: item.key },
                            item.text
                        ),
                    );
                })
            )
        );
    },
});