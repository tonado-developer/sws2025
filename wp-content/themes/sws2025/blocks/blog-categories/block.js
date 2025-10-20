wp.blocks.registerBlockType('sws2025/blog-categories', {
    title: 'Blog-Kategorien',
    description: "Hier sieht man die Beitragsübersicht",
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
        sectionBackground: pbw.choose.attr({
            default: "none",
            title: 'Sektion Hintergrund',
            description: 'Wie soll die Fläche allgemein hinter dem Block gefärbt sein?',
        }),
        cardBackground: pbw.choose.attr({
            default: "none",
            title: 'Karte',
            description: 'Soll der Block in eine Karte verpackt werden? Wenn ja welcher Farbmodus?',
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

            wp.element.createElement(
                'p',
                {
                    style: {
                        color: "#FF6920"
                    },
                },
                'Die angezeigten Inhalte ergeben sich aus den Beiträgen und Beitragskategorien zu denen Sie zugeordnet wurden'
            ),

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
                ])
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
    save: function (props) {},
});