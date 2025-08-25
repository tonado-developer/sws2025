wp.blocks.registerBlockType('sws2025/text', {
    title: 'Text',
    description: "Damit schreibt es sich am besten",
    icon: wp.element.createElement('img', {
        src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
    }),
    category: 'custom-blocks',
    attributes: {
        heading: pbw.h1.attr({
            title: "Überschrift",
            description: "Falls nur Text erwünscht ist einfach frei lassen"
        }),
        subheading: pbw.p.attr({
            selector: 'p.subheading',
            title: "Unterüberschrift",
            description: "Falls man möchte kann man hier der Hauptüberschrift noch etwas anfügen"
        }),
        text: pbw.p.attr({
            title: "Text",
            description: "Dies ist der haupt Fließtext."
        }),
        button_text: pbw.p.attr({
            selector: 'a.button',
            title: "Button Text",
            description: "Dieser Text steht später auf dem Button"
        }),
        link: pbw.link.attr({
            title: "Button Verlinkung",
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
        indent: pbw.choose.attr({
            default: 'textIndentTrue',
            title: "Text Einrücken-Auswahl",
            description: "Soll der Fließtext eingerückt werden oder nicht?"
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
        return wp.element.createElement(wp.element.Fragment,null,
            // Block Info
            pbw.block.title(props),

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
                    // Überschrift Input
                    pbw.h1.input(props, "h1", "heading"),
                    // Unterüberschrift Input
                    pbw.p.input(props, "p", "subheading"),
                    // Text Input
                    pbw.p.input(props, "p", "text"),
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
                    // Texteinrückung-Auswahl
                    pbw.choose.input(props, 'indent', [
                        { label: 'Ja, bitte einrücken', value: 'textIndentTrue' },
                        { label: 'Nein, heute nicht', value: 'textIndentFalse' }
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
                    // Texteinrückung-Auswahl
                    pbw.choose.input(props, 'indent', [
                        { label: 'Ja, bitte einrücken', value: 'textIndentTrue' },
                        { label: 'Nein, heute nicht', value: 'textIndentFalse' }
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
        return wp.element.createElement('section',{ 
            className: "bg-" + pbw.choose.output(props, "sectionBackground") + " card-" + pbw.choose.output(props, "cardBackground"),
        },
            wp.element.createElement(
                'container',
                { 
                    className: pbw.choose.output(props, "align"),
                },
                wp.element.createElement(
                    'div',
                    { 
                        className: 'headingWrap ' + pbw.choose.output(props, "circled"),
                    },
                    pbw.h1.output(props,"h1","heading"),
                    pbw.p.output(props,"h3","subheading"),
                ),
                wp.element.createElement(
                    'div',
                    { 
                        className: 'textWrap ' + pbw.choose.output(props, "indent"),
                    },
                    (pbw.choose.output(props, "line") === "textLineTrue") && wp.element.createElement('hr'),
                    pbw.p.output(props,"p","text"),
                    pbw.link.output(props,"link",pbw.p.output(props,"span","button_text")),
                ),
            )
        );
    },
});