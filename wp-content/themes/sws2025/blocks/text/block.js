wp.blocks.registerBlockType('sws2025/text', {
    title: 'Text',
    description: "Damit schreibt es sich am besten",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
        style: {pointerEvents: 'none'}
    }),
    category: 'custom-blocks',
    attributes: {
        heading: pbw.h1.attr({
            title: "Überschrift",
            description: "Falls nur Text erwünscht ist einfach frei lassen"
        }),
        headingSize: pbw.choose.attr({
            default: "h1",
            title: "Headline",
        }),
        text: pbw.p.attr({
            title: "Text",
            description: "Dies ist der haupt Fließtext."
        }),
        button_text: pbw.p.attr({
            selector: 'a.button',
            title: "Button",
        }),
        link: pbw.link.attr({
            title: "",
        }),
        align: pbw.choose.attr({
            default: 'left',
            title: "Ausrichtungs-Auswahl",
            description: "Hier kann man auswählen wie der Inhalt ausgerichtet werden soll"
        }),
        circled: pbw.choose.attr({
            default: 'headingCircledTrue',
            title: "Überschrift Umkreisung-Auswahl",
            description: "Sollen die ersten Buchstaben der Überschrift eingekreist werden oder nicht?"
        }),
        line: pbw.choose.attr({
            default: 'textLineFalse',
            title: "Trennstrich-Auswahl",
            description: "Soll der Text von der Überschrift mit einem Trennstrich getrennt werden oder nicht?"
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

            group("Konfiguration", { open: false, color: "#ffcb20" },
                // Ausrichtungs-Auswahl
                pbw.choose.input(props, 'align', [
                    { label: 'Linksbündig', value: 'left' },
                    { label: 'Mittig', value: 'centered' }
                ]),
                // Umkreisung-Auswahl
                pbw.choose.input(props, 'circled', [
                    { label: 'Ja, bitte einkreisen', value: 'headingCircledTrue' },
                    { label: 'Nein, heute kein kreisen', value: 'headingCircledFalse' }
                ]),
                // Trennstrich-Auswahl
                pbw.choose.input(props, 'line', [
                    { label: 'Ja, das scheint hier nötig', value: 'textLineTrue' },
                    { label: 'Nein, eher nicht', value: 'textLineFalse' }
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
                    // Ausrichtungs-Auswahl
                    pbw.choose.input(props, 'align', [
                        { label: 'Linksbündig', value: 'left' },
                        { label: 'Mittig', value: 'centered' }
                    ]),
                    // Umkreisung-Auswahl
                    pbw.choose.input(props, 'circled', [
                        { label: 'Ja, bitte einkreisen', value: 'headingCircledTrue' },
                        { label: 'Nein, heute kein kreisen', value: 'headingCircledFalse' }
                    ]),
                    // Trennstrich-Auswahl
                    pbw.choose.input(props, 'line', [
                        { label: 'Ja, das scheint hier nötig', value: 'textLineTrue' },
                        { label: 'Nein, eher nicht', value: 'textLineFalse' }
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
        return wp.element.createElement('section', {
            className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-" + pbw.choose.output(props, "cardBackground"),
        },
            wp.element.createElement(
                'container',
                {
                    className: pbw.choose.output(props, "align"),
                },
                props.attributes.heading && wp.element.createElement(
                    'div',
                    {
                        className: 'headingWrap ' + pbw.choose.output(props, "circled"),
                    },
                    pbw.h1.output(props, pbw.choose.output(props, 'headingSize'), "heading"),
                ),
                wp.element.createElement(
                    'div',
                    {
                        className: 'textWrap'
                    },
                    (pbw.choose.output(props, "line") === "textLineTrue") && wp.element.createElement('hr'),
                    pbw.p.output(props, "p", "text"),
                    pbw.link.output(props, "link", pbw.p.output(props, "span", "button_text")),
                ),
            )
        );
    },
});