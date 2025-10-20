wp.blocks.registerBlockType('sws2025/company-profile', {
    title: 'Steckbrief',
    description: "Firmen vorstellen am rechten Rand während Links offen für andere Blöcke",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
        style: { pointerEvents: 'none' }
    }),
    category: 'custom-blocks',
    supports: {
        spacing: {
            padding: true,
            margin: true
        }
    },
    attributes: {
        items: {
            type: 'array',
            title: 'Daten & Fakten für Steckbrief',
            default: [
                {
                    headline: {
                        type: 'text',
                        title: 'Überschrift',
                        description: 'Der Überschriftstext'
                    },
                    text: {
                        type: 'text',
                        title: 'Text',
                        description: 'Der Beschreibungstext'
                    }
                }
            ]
        },
        ...pbw.img.attr('logo', {
            title: "Firmenlogo",
            description: "Das Logo das ganz oben im Steckbrief angezeigt wird"
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
        profileBackground: pbw.choose.attr({
            default: "light",
            title: 'Steckbrief Hintergrund',
            description: 'Welchen Farbmodus soll der Steckbrief haben?',
        })
    },
    example: {
        attributes: {
            heading: pbw.h1.example,
            text: pbw.p.example
        },
    },
    edit: function (props) {
        const { useBlockProps } = wp.blockEditor;
        const blockProps = useBlockProps();

        const innerBlock = wp.element.createElement(
            'div',
            blockProps,
            wp.element.createElement(wp.blockEditor.InnerBlocks, null)
        );

        return wp.element.createElement(
            wp.element.Fragment,
            null,
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
                    // Steckbrief Hintergrund
                    pbw.choose.input(props, 'profileBackground', [
                        { label: 'Ja, Hell', value: 'light' },
                        { label: 'Ja, Dunkel', value: 'dark' },
                        { label: 'Ja, Farbig', value: 'color' }
                    ])
                )
            ),

            // Konfigurations Inputs
            group("Konfiguration", { open: false, color: "#ffcb20" },
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
                // Steckbrief Hintergrund
                pbw.choose.input(props, 'profileBackground', [
                    { label: 'Ja, Hell', value: 'light' },
                    { label: 'Ja, Dunkel', value: 'dark' },
                    { label: 'Ja, Farbig', value: 'color' }
                ])
            ),

            group("Rechter Steckbrief Inhalt", { open: false },
                pbw.img.input(props, "logo"),
                pbw.array.input(props, "items")
            ),
            group("Linker Rest Inhalt", { open: false },
                innerBlock
            )
        );
    },
    save: function (props) {
        const blockProps = wp.blockEditor.useBlockProps.save();

        return wp.element.createElement(
            'section',
            {
                className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-" + pbw.choose.output(props, "cardBackground"),
            },
            wp.element.createElement(
                'container',
                {
                    className: "innerblocks"
                },
                wp.element.createElement(
                    'div',
                    blockProps,
                    wp.element.createElement(wp.blockEditor.InnerBlocks.Content, null)
                ),
                wp.element.createElement(
                    'div',
                    {
                        className: 'company-profile-sidebar is_rounded bg-' + pbw.choose.output(props, "profileBackground")
                    },
                    pbw.img.output(props, "logo", {
                        size: 'medium',
                    }),
                    pbw.array.output(props, "items", function (item) {
                        return wp.element.createElement(
                            'div',
                            { className: 'item' },
                            pbw.text.output({ attributes: item }, "p", "headline"),
                            pbw.text.output({ attributes: item }, "p", "text"),
                        );
                    })
                )
            )
        );
    }
});