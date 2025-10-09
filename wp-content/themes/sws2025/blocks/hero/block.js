wp.blocks.registerBlockType('sws2025/hero', {
    title: 'Hero',
    description: "Hiermit ein Statement setzen",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    style: ["file:./editor.css"],
    category: 'custom-blocks',
    attributes: {
        heading: pbw.h1.attr({
            title: "Überschrift",
            description: "Falls das Bild keine Überschrift haben soll einfach frei lassen"
        }),
        ...pbw.img.attr('image', {
            title: "Haupt-Bild",
            description: "Das Bild das letztendlich den Bildschirm füllen soll"
        }),
        borderRadius: pbw.choose.attr({
            default: 'borderRadiusTrue',
            title: "Abgerundet-Auswahl",
            description: "Hier kann man auswählen ob die Ecken abgerundet sein sollen oder nicht"
        }),
        height: pbw.choose.attr({
            default: 'heightMedium',
            title: "Größen-Auswahl",
            description: "Hier kann man die Höhe des Bildes auswählen"
        }),
    },
    example: {
        attributes: {
            heading: pbw.h1.example,
            img: pbw.img.example
        },
    },
    edit: function (props) {
        return wp.element.createElement(wp.element.Fragment, null,
            // Block Info
            pbw.block.title(props),

            // Haupt Inputs
            group("Inhalt", { open: false },
                // Heading Input
                pbw.h1.input(props, "h1", "heading"),
                // Image Input
                pbw.img.input(props, "image"),

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
                    // Radius Input
                    pbw.choose.input(props, 'borderRadius', [
                        { label: 'abgerundet', value: 'borderRadiusTrue' },
                        { label: 'nicht abgerundet', value: 'borderRadiusFalse' }
                    ]),
                    // Height Input
                    pbw.choose.input(props, 'height', [
                        { label: 'Klein', value: 'heightSmall' },
                        { label: 'Mittel', value: 'heightMedium' },
                        { label: 'Groß', value: 'heightBig' }
                    ])
                )
            ),

            // Konfigurations Inputs
            group("Konfiguration", { open: false, color: "#ffcb20" },

                // Radius Input
                pbw.choose.input(props, 'borderRadius', [
                    { label: 'abgerundet', value: 'borderRadiusTrue' },
                    { label: 'nicht abgerundet', value: 'borderRadiusFalse' }
                ]),
                // Height Input
                pbw.choose.input(props, 'height', [
                    { label: 'Klein', value: 'heightSmall' },
                    { label: 'Mittel', value: 'heightMedium' },
                    { label: 'Groß', value: 'heightBig' }
                ])

            ),

        );
    },
    save: function (props) {
        return wp.element.createElement(
            'section',
            { className: pbw.choose.output(props, "borderRadius") + " " + pbw.choose.output(props, "height") },
            pbw.img.output(props, "image"),
            pbw.h1.output(props, "h1", "heading"),
        );

    },
});