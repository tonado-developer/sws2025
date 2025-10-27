/**
 * PBW Framework v3.0 - Vereinfacht mit Callback-Pattern
 * Flache Objekt-Struktur + Callback für maximale Flexibilität
 */

const { URLInputButton, MediaUpload, RichText, InspectorControls } = wp.blockEditor;
const { Button, PanelBody, TextControl, SelectControl, BaseControl } = wp.components;
const { createElement, Fragment, useState } = wp.element;
const { registerBlockType } = wp.blocks;
const { __ } = wp.i18n;

// ============================================
// HELPER FUNCTIONS
// ============================================

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function safeGet(obj, path, defaultValue = null) {
    return path.split('.').reduce((acc, part) =>
        acc && acc[part] !== undefined ? acc[part] : defaultValue, obj);
}

// ============================================
// TEXT INPUT/OUTPUT
// ============================================

function text_input(props, tag, name, options = {}) {
    const { attributes, setAttributes } = props;
    const blockType = wp.blocks.getBlockType(props.name);
    const config = blockType?.attributes?.[name] || {};

    const {
        title = config.title,
        description = config.description,
        placeholder = config.placeholder,
        allowedFormats = config.allowedFormats
    } = options;

    return createElement('div', {
        className: 'pbw-field-wrapper',
        style: styles.fieldWrapper
    },
        title && createElement('label', { style: styles.fieldLabel }, title),
        description && createElement('p', { style: styles.fieldDescription }, description),
        createElement(RichText, {
            tagName: tag,
            value: attributes[name] || '',
            onChange: (value) => setAttributes({ [name]: value }),
            placeholder: placeholder || 'Text eingeben...',
            allowedFormats: allowedFormats || ['core/bold', 'core/italic', 'core/link']
        })
    );
}

function text_output(props, tag, name) {
    const content = props.attributes[name];
    return content ? createElement(tag, {
        className: `wp-block-${tag}`,
        dangerouslySetInnerHTML: { __html: content }
    }) : null;
}

// ============================================
// MEDIA INPUT/OUTPUT
// ============================================

function media_input(props, name, options = {}) {
    const { attributes, setAttributes } = props;
    const blockType = wp.blocks.getBlockType(props.name);
    const config = blockType?.attributes?.[name] || {};

    const {
        allowedTypes = ['image'],
        title = config.title,
        description = config.description,
    } = options;
    const url = attributes[name];
    const alt = attributes[name + 'Alt'] || '';
    const id = attributes[name + 'Id'];

    return createElement('div', {
        className: 'pbw-field-wrapper',
        style: styles.fieldWrapper
    },
        title && createElement('label', { style: styles.fieldLabel }, title),
        description && createElement('p', { style: styles.fieldDescription }, description),

        url && createElement('img', {
            src: url,
            alt: alt,
            style: styles.previewImage
        }),

        url && createElement('p', { style: styles.fieldDescription }, `${url.split('/').pop()}`),

        createElement('div', { style: styles.mediaControls },
            createElement(MediaUpload, {
                onSelect: (media) => setAttributes({
                    [name]: media.url,
                    [name + 'Alt']: media.alt || '',
                    [name + 'Id']: media.id
                }),
                allowedTypes: allowedTypes,
                value: id,
                render: ({ open }) => createElement(Button, {
                    isPrimary: !url,
                    isSecondary: !!url,
                    onClick: open
                }, url ? 'Ändern' : 'Auswählen')
            }),
            url && createElement(Button, {
                isDestructive: true,
                onClick: () => setAttributes({
                    [name]: null,
                    [name + 'Alt']: '',
                    [name + 'Id']: null
                })
            }, 'Entfernen')
        ),

        url && createElement(TextControl, {
            label: 'Alt-Text',
            value: alt,
            onChange: (value) => setAttributes({ [name + 'Alt']: value }),
            help: 'Wichtig für SEO und Barrierefreiheit'
        })
    );
}

function media_output(props, name, settings = {}) {
    const url = props.attributes[name];
    const alt = props.attributes[name + 'Alt'] || '';

    if (!url) return null;

    const {
        className = '',
        fancybox = false,
        fancyboxGroup = 'gallery',
        size = null,
        dataset = {}
    } = settings;

    const dataAttrs = {};
    for (const key in dataset) {
        dataAttrs[`data-${key}`] = dataset[key];
    }

    const img = createElement('img', {
        src: url,
        alt: alt,
        className: `media-image ${name} ${className}`.trim(),
        loading: 'lazy',
        ...(dataAttrs ? dataAttrs : {}),
    });

    if (fancybox) {
        return createElement('a', {
            href: url,
            'data-fancybox': fancyboxGroup,
            'data-caption': alt,
            className: 'fancybox'
        }, img);
    }

    return createElement('figure', { className: 'media-wrap media-wrap--image' }, img);
}

// ============================================
// LINK INPUT/OUTPUT
// ============================================

function link_input(props, name, options = {}) {
    const { attributes, setAttributes } = props;
    const blockType = wp.blocks.getBlockType(props.name);
    const config = blockType?.attributes?.[name] || {};
    const url = attributes[name] || '';

    const {
        title = config.title,
        description = config.description,
    } = options;

    return createElement('div', {
        className: 'pbw-field-wrapper',
        style: styles.fieldWrapper
    },
        title && createElement('label', { style: styles.fieldLabel }, title),
        description && createElement('p', { style: styles.fieldDescription }, description),
        createElement(BaseControl, { label: 'URL' },
            createElement(URLInputButton, {
                url: url,
                onChange: (newUrl) => setAttributes({ [name]: newUrl })
            })
        )
    );
}

function link_output(props, name, content = null) {
    const url = props.attributes[name];
    return url ? createElement('a', {
        href: url,
        className: name
    }, content) : null;
}

// ============================================
// SELECT INPUT/OUTPUT
// ============================================

function select_input(props, name, items, options = {}) {
    const { attributes, setAttributes } = props;
    const blockType = wp.blocks.getBlockType(props.name);
    const config = blockType?.attributes?.[name] || {};

    const itemsArray = typeof items === 'function'
        ? items(props)
        : (items || config.items || []);

    const {
        title = config.title,
        description = config.description,
    } = options;

    return createElement('div', {
        className: 'pbw-field-wrapper',
        style: styles.fieldWrapper
    },
        title && createElement('label', { style: styles.fieldLabel }, title),
        description && createElement('p', { style: styles.fieldDescription }, description),
        createElement(SelectControl, {
            value: attributes[name] || '',
            options: itemsArray,
            onChange: (value) => setAttributes({ [name]: value })
        })
    );
}

function select_output(props, name) {
    return props.attributes[name] || '';
}

// ============================================
// ARRAY INPUT - MIT CALLBACK
// ============================================

function array_input(props, fieldName, callback, params = {}) {
    const { attributes, setAttributes, name: blockName } = props;
    const blockType = wp.blocks.getBlockType(blockName);
    const config = blockType?.attributes?.[fieldName] || {};

    const {
        title = config.title || fieldName,
        description = config.description,
        addButtonText = 'Element hinzufügen',
        sortable = true,
        collapsible = true,
        minimum = 0,
        maximum = null,
        emptyTemplate = {}
    } = params;

    const items = attributes[fieldName] || [];

    const setItems = (newItems) => {
        setAttributes({ [fieldName]: newItems });
    };

    const addItem = () => {
        if (maximum !== null && items.length >= maximum) return;
        setItems([...items, deepClone(emptyTemplate)]);
    };

    const removeItem = (index) => {
        if (items.length <= minimum) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index, updates) => {
        const newItems = deepClone(items);
        newItems[index] = { ...newItems[index], ...updates };
        setItems(newItems);
    };

    const moveItem = (index, direction) => {
        if (!sortable) return;
        const newItems = [...items];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= items.length) return;
        [newItems[index], newItems[target]] = [newItems[target], newItems[index]];
        setItems(newItems);
    };

    return createElement('div', {
        className: 'pbw-array-wrapper',
        style: styles.arrayWrapper
    },
        // Header
        createElement('div', { style: styles.arrayHeader },
            createElement('h4', { style: styles.arrayTitle }, `📚 ${title}`),
            createElement('span', { style: styles.arrayCounter },
                `${items.length}${maximum !== null ? `/${maximum}` : ''}`
            )
        ),

        description && createElement('p', { style: styles.arrayDescription }, description),

        // Empty State
        items.length === 0 ?
            createElement('div', { style: styles.emptyState },
                createElement('p', null, 'Keine Elemente vorhanden'),
                createElement(Button, {
                    isPrimary: true,
                    onClick: addItem,
                    disabled: maximum !== null && items.length >= maximum
                }, addButtonText)
            ) :
            // Items
            items.map((item, index) => createElement(ArrayItem, {
                key: index,
                index,
                item,
                onUpdate: updateItem,
                onRemove: removeItem,
                onMove: moveItem,
                collapsible,
                sortable,
                minimum,
                total: items.length,
                callback,
                blockName
            })),

        // Add Button
        items.length > 0 && createElement('div', { style: styles.addButtonWrapper },
            createElement(Button, {
                isPrimary: true,
                onClick: addItem,
                disabled: maximum !== null && items.length >= maximum
            }, addButtonText)
        )
    );
}

function ArrayItem({ index, item, onUpdate, onRemove, onMove, collapsible, sortable, minimum, total, callback, blockName }) {
    const [isOpen, setIsOpen] = wp.element.useState(true);

    const itemProps = {
        name: blockName,
        attributes: item,
        setAttributes: (updates) => onUpdate(index, updates)
    };

    return wp.element.createElement('div', {
        key: index,
        className: 'pbw-array-item',
        style: styles.arrayItem
    },
        wp.element.createElement('div', { style: styles.itemHeader },
            wp.element.createElement('div', { style: styles.itemHeaderLeft },
                wp.element.createElement('strong', null, `Element #${index + 1}`),
                collapsible && wp.element.createElement('button', {
                    onClick: () => setIsOpen(!isOpen),
                    style: styles.toggleBtn,
                    type: 'button'
                }, isOpen ? '▼' : '▶')
            ),
            wp.element.createElement('div', { style: styles.itemControls },
                sortable && index > 0 && wp.element.createElement(Button, {
                    isSmall: true,
                    icon: 'arrow-up-alt2',
                    onClick: () => onMove(index, 'up'),
                    label: 'Nach oben'
                }),
                sortable && index < total - 1 && wp.element.createElement(Button, {
                    isSmall: true,
                    icon: 'arrow-down-alt2',
                    onClick: () => onMove(index, 'down'),
                    label: 'Nach unten'
                }),
                wp.element.createElement(Button, {
                    isSmall: true,
                    isDestructive: true,
                    icon: 'trash',
                    onClick: () => onRemove(index),
                    disabled: total <= minimum,
                    label: 'Entfernen'
                })
            )
        ),
        isOpen && wp.element.createElement('div', {
            className: 'pbw-array-item-content',
            style: styles.itemContent
        }, callback(itemProps, index, item))
    );
}


// ============================================
// ARRAY OUTPUT
// ============================================

function array_output(props, arrayName, renderCallback) {
    const items = props.attributes[arrayName] || [];
    if (!items || items.length === 0) return null;

    return items.map((item, index) => {
        // Erstelle Props für jedes Item
        const itemProps = {
            attributes: item
        };
        return renderCallback(itemProps, index);
    }).filter(Boolean);
}

// ============================================
// ATTRIBUTE HELPER
// ============================================

function pbw_attributes(params = {}) {
    const defaults = {
        type: 'string',
        default: ''
    };

    return { ...defaults, ...params };
}

// IMG Attribute Helper
function img_attr(name, params = {}) {
    return {
        [name]: pbw_attributes({ type: 'string', default: null, ...params }),
        [name + 'Alt']: pbw_attributes({ type: 'string', default: '' }),
        [name + 'Id']: pbw_attributes({ type: 'number', default: null })
    };
}


/**
 * BLOCK ICON RENDERER
 * =====================================================
 */

/**
 * Rendert Block Icon aus verschiedenen Quellen
 * @param {*} icon - Icon Definition (string, element, object, function)
 */
// function renderBlockIcon(icon) {
//     if (!icon) return null;

//     // Function die ein Icon returned
//     if (typeof icon === 'function') {
//         try {
//             icon = icon();
//         } catch (e) {
//             console.warn('[PBW Framework] Error rendering icon function:', e);
//             return null;
//         }
//     }

//     // Dashicon (string)
//     if (typeof icon === 'string') {
//         return wp.element.createElement(
//             'span',
//             {
//                 className: `dashicons dashicons-${icon}`,
//                 style: {
//                     fontSize: '24px',
//                     width: '24px',
//                     height: '24px',
//                     marginRight: '10px',
//                     display: 'inline-block',
//                     lineHeight: '24px'
//                 }
//             }
//         );
//     }

//     // SVG Element oder React Component
//     if (wp.element.isValidElement(icon)) {
//         return wp.element.createElement(
//             'span',
//             {
//                 style: {
//                     display: 'inline-block',
//                     width: '24px',
//                     height: '24px',
//                     marginRight: '10px',
//                     verticalAlign: 'middle'
//                 }
//             },
//             icon
//         );
//     }

//     // Object mit verschiedenen Properties
//     if (typeof icon === 'object' && icon !== null) {
//         // Object mit src property
//         if (icon.src !== undefined) {
//             // src ist ein React Element
//             if (wp.element.isValidElement(icon.src)) {
//                 return wp.element.createElement(
//                     'span',
//                     {
//                         style: {
//                             display: 'inline-block',
//                             width: '24px',
//                             height: '24px',
//                             marginRight: '10px',
//                             verticalAlign: 'middle'
//                         }
//                     },
//                     icon.src
//                 );
//             }

//             // src ist ein String
//             if (typeof icon.src === 'string') {
//                 // SVG String (inline)
//                 if (icon.src.includes('<svg')) {
//                     return wp.element.createElement(
//                         'span',
//                         {
//                             dangerouslySetInnerHTML: { __html: icon.src },
//                             style: {
//                                 display: 'inline-block',
//                                 width: '24px',
//                                 height: '24px',
//                                 marginRight: '10px',
//                                 verticalAlign: 'middle'
//                             }
//                         }
//                     );
//                 }

//                 // URL zu einem Bild
//                 if (icon.src.match(/\.(svg|png|jpg|jpeg|gif|webp)$/i) || icon.src.startsWith('http') || icon.src.startsWith('data:')) {
//                     return wp.element.createElement(
//                         'img',
//                         {
//                             src: icon.src,
//                             alt: '',
//                             style: {
//                                 width: '24px',
//                                 height: '24px',
//                                 marginRight: '10px',
//                                 verticalAlign: 'middle',
//                                 objectFit: 'contain'
//                             }
//                         }
//                     );
//                 }

//                 // Dashicon name in src
//                 return wp.element.createElement(
//                     'span',
//                     {
//                         className: `dashicons dashicons-${icon.src}`,
//                         style: {
//                             fontSize: '24px',
//                             width: '24px',
//                             height: '24px',
//                             marginRight: '10px',
//                             display: 'inline-block',
//                             lineHeight: '24px'
//                         }
//                     }
//                 );
//             }
//         }

//         // Object mit background/foreground (WordPress Core Block Style)
//         if (icon.background || icon.foreground) {
//             const iconContent = icon.foreground
//                 ? (typeof icon.foreground === 'string'
//                     ? wp.element.createElement('span', {
//                         dangerouslySetInnerHTML: { __html: icon.foreground }
//                     })
//                     : icon.foreground)
//                 : wp.element.createElement('span', null, '■');

//             return wp.element.createElement(
//                 'span',
//                 {
//                     style: {
//                         display: 'inline-block',
//                         width: '24px',
//                         height: '24px',
//                         backgroundColor: icon.background || '#555',
//                         marginRight: '10px',
//                         borderRadius: '2px',
//                         position: 'relative',
//                         verticalAlign: 'middle'
//                     }
//                 },
//                 wp.element.createElement(
//                     'span',
//                     {
//                         style: {
//                             position: 'absolute',
//                             top: '50%',
//                             left: '50%',
//                             transform: 'translate(-50%, -50%)',
//                             width: '20px',
//                             height: '20px',
//                             fill: icon.foreground && typeof icon.foreground === 'string' && icon.foreground.startsWith('#')
//                                 ? icon.foreground
//                                 : '#fff'
//                         }
//                     },
//                     iconContent
//                 )
//             );
//         }
//     }

//     // Fallback: Default Block Icon
//     return wp.element.createElement(
//         'span',
//         {
//             className: 'dashicons dashicons-block-default',
//             style: {
//                 fontSize: '24px',
//                 width: '24px',
//                 height: '24px',
//                 marginRight: '10px',
//                 display: 'inline-block',
//                 lineHeight: '24px'
//             }
//         }
//     );
// }

// ============================================
// STYLES
// ============================================

const styles = {
    fieldWrapper: {
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '4px'
    },
    fieldLabel: {
        display: 'block',
        fontWeight: '600',
        marginBottom: '8px',
        fontSize: '13px',
        color: '#2c3e50'
    },
    fieldDescription: {
        margin: '0 0 8px 0',
        fontSize: '12px',
        color: '#666',
        fontStyle: 'italic'
    },
    previewImage: {
        maxWidth: '300px',
        height: 'auto',
        borderRadius: '4px',
        marginBottom: '8px',
        display: 'block',
        border: '1px solid #ddd'
    },
    mediaControls: {
        display: 'flex',
        gap: '8px',
        marginBottom: '8px'
    },
    arrayWrapper: {
        backgroundColor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '16px'
    },
    arrayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #e0e0e0'
    },
    arrayTitle: {
        margin: 0,
        fontSize: '15px',
        fontWeight: '600',
        color: '#2c3e50'
    },
    arrayDescription: {
        margin: '0 0 16px 0',
        fontSize: '13px',
        color: '#666',
        fontStyle: 'italic'
    },
    arrayCounter: {
        padding: '4px 10px',
        backgroundColor: '#007cba',
        color: 'white',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
    },
    arrayItem: {
        backgroundColor: '#f9f9f9',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    itemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #ddd'
    },
    itemHeaderLeft: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
    },
    toggleBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 8px',
        fontSize: '12px',
        color: '#007cba'
    },
    itemControls: {
        display: 'flex',
        gap: '6px'
    },
    itemContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    emptyState: {
        textAlign: 'center',
        padding: '40px 20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        marginBottom: '16px',
        border: '2px dashed #ddd'
    },
    addButtonWrapper: {
        textAlign: 'center',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0'
    }
};

// ============================================
// EXPORTS
// ============================================

window.pbw2 = {
    // Text
    h1: {
        attr: (params = {}) => pbw_attributes({ ...params }),
        input: (props, tag, name, options) => text_input(props, 'h1', name, options),
        output: (props, tag, name) => text_output(props, 'h1', name)
    },
    h2: {
        attr: (params = {}) => pbw_attributes({ ...params }),
        input: (props, tag, name, options) => text_input(props, 'h2', name, options),
        output: (props, tag, name) => text_output(props, 'h2', name)
    },
    p: {
        attr: (params = {}) => pbw_attributes({ ...params }),
        input: (props, tag, name, options) => text_input(props, 'p', name, options),
        output: (props, tag, name) => text_output(props, 'p', name)
    },
    text: {
        attr: (params = {}) => pbw_attributes({ ...params }),
        input: text_input,
        output: text_output
    },

    // Media
    img: {
        attr: img_attr,
        input: media_input,
        output: media_output
    },

    // Link
    link: {
        attr: (params = {}) => pbw_attributes({ ...params }),
        input: link_input,
        output: link_output
    },

    // Select
    choose: {
        attr: (params = {}) => pbw_attributes({ ...params }),
        input: select_input,
        output: select_output
    },

    // Array
    array: {
        attr: (params = {}) => pbw_attributes({ type: 'array', default: [], ...params }),
        input: array_input,
        output: array_output
    },

    // Utils
    utils: {
        deepClone,
        safeGet
    },

    // Block Utilities
    block: {
        /**
         * Enhanced Block Title mit Icon Support
         */
        title: (props) => {
            const { name } = props;
            const blockType = wp.blocks.getBlockType(name);

            if (!blockType) {
                console.warn('[PBW Framework] Block type not found:', name);
                return null;
            }

            const { title, description, icon } = blockType;

            return wp.element.createElement(
                'div',
                {
                    className: 'pbw-block-title',
                    style: {
                        marginBottom: '20px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        borderLeft: '4px solid #007cba'
                    }
                },
                wp.element.createElement(
                    'div',
                    {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: description ? '8px' : '0'
                        }
                    },
                    renderBlockIcon(icon),
                    wp.element.createElement(
                        'h2',
                        {
                            style: {
                                margin: '0',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#1e1e1e'
                            }
                        },
                        title
                    )
                ),
                description && wp.element.createElement(
                    'p',
                    {
                        style: {
                            margin: '0',
                            color: '#666',
                            fontSize: '13px',
                            lineHeight: '1.5'
                        }
                    },
                    description
                )
            );
        }
    },
};