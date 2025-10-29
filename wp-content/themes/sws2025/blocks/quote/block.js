wp.blocks.registerBlockType('sws2025/quote', {
    title: 'Zitat',
    description: "Hiermit kann man alles zitieren was einem so einfällt.",
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
        quote: pbw.p.attr({
            title: "Zitat",
            description: "Dies ist das haupt Zitat."
        }),
        autor: pbw.p.attr({
            title: "Autor",
            description: "Hier steht der Autor des Zitats."
        }),
        sectionBackground: pbw.choose.attr({
            default: "none",
            title: 'Sektion Hintergrund',
            description: 'Wie soll die Fläche allgemein hinter dem Block gefärbt sein?',
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
                
                // Quote Input
                pbw.p.input(props, "p", "quote"),

                // Autor Input
                pbw.p.input(props, "p", "autor"),
            ),

            group("Konfiguration", { open: false, color: "#ffcb20" },
                // Sektion Hintergrund
                pbw.choose.input(props, 'sectionBackground', [
                    { label: 'Keine Hintergrundfarbe', value: 'none' },
                    { label: 'Hell', value: 'light' },
                    { label: 'Dunkel', value: 'dark' },
                    { label: 'Farbig', value: 'color' }
                ]),
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
                    // Sektion Hintergrund
                    pbw.choose.input(props, 'sectionBackground', [
                        { label: 'Keine Hintergrundfarbe', value: 'none' },
                        { label: 'Hell', value: 'light' },
                        { label: 'Dunkel', value: 'dark' },
                        { label: 'Farbig', value: 'color' }
                    ]),
                )
            )
        );
    },
    save: function (props) {
        return wp.element.createElement('section', {
            className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-light",
        },
            wp.element.createElement(
                'container',
                null,
                createElement('i',null, "”"),
                pbw.p.output(props, "p", "quote"),
                pbw.p.output(props, "p", "autor"),
            )
        );
    },
});