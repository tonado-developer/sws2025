const { URLInput, URLInputButton, InnerBlocks, MediaUpload, InspectorControls, RichText, useBlockProps, ColorPalette } = wp.blockEditor;
const { Button, PanelBody, TextControl, SelectControl, ExternalLink, BaseControl } = wp.components;
const { createElement, Fragment } = wp.element;
const { useState, useEffect, useRef } = wp.element;
const { createPortal } = wp.element;
const { SortableContainer, SortableElement, SortableHandle } = wp.components.__experimentalDragDrop || {};
const { registerBlockType } = wp.blocks;

const { __ } = wp.i18n;

function text_input(props, tag, name) {
    var { setAttributes } = props;

    // Attribute-Definition aus Block-Type auslesen
    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];
    
    // Title und Description extrahieren (fallback auf defaults)
    const title = "✍️ " + (attributeConfig?.title || 'Text');
    return wp.element.createElement(
        'div',
        { 
            className: 'field-group',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement(
            'h4',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#666', 
                    fontSize: '12px'
                }
            },
            attributeConfig?.description
        ),
        wp.element.createElement(
            wp.blockEditor.RichText,
            {
                tagName: tag,
                placeholder: 'Text hier eingeben...',
                value: props.attributes[name],
                onChange: (value) => setAttributes({ [name]: value }),
                className: 'wp-block-' + tag,
                allowedFormats: ['core/bold', 'core/italic', 'core/link'],
            }
        )
    );
}

function text_output(props, tag, name) {
    return props.attributes[name] ? wp.element.createElement(
        wp.blockEditor.RichText.Content,
        { tagName: tag, value: props.attributes[name], className: 'wp-block-' + tag }
    ) : "";
}

function img_input(props, name) {
    var { setAttributes } = props;
    return wp.element.createElement(
        'div',
        { 
            style: { 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
            } 
        },
        wp.blockEditor.MediaUpload,
        {
            onSelect: (media) => setAttributes({ [name]: media.url }),
            allowedTypes: ['image'],
            render: ({ open }) => wp.element.createElement(
                wp.components.Button,
                {
                    className: 'button button-large',
                    style: { 
                        display: 'flex', 
                        gap: '8px' 
                    },
                    onClick: open
                },
                !props.attributes[name] ? "Bild auswählen" : wp.element.createElement('img', { 
                    src: props.attributes[name], 
                    alt: name, 
                    style: { height: '100%' }
                }),"Bild ändern"
            )
        },
        props.attributes[name] && wp.element.createElement(
            wp.components.Button,
            {
                className: 'button button-large',
                style: { 
                    marginLeft: '8px',
                    color: 'red'
                },
                onClick: () => setAttributes({ [name]: null })
            },
            "Bild entfernen"
        )
    );
}

function media_input(props, name) {
    var { setAttributes } = props;
    
    // Attribute-Definition aus Block-Type auslesen
    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];
    
    // Title und Description extrahieren (fallback auf defaults)
    const title = "🖼️ " + (attributeConfig?.title || 'Bild');
    
    const regularInput = wp.element.createElement(
        'div',
        { 
            className: 'field-group',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement(
            'h4',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title  // <- Jetzt dynamisch
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#666', 
                    fontSize: '12px'
                }
            },
            attributeConfig?.description  // <- Jetzt dynamisch
        ),
        wp.element.createElement(
            'div',
            { 
                style: { 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px' 
                } 
            },
            wp.element.createElement(
                wp.blockEditor.MediaUpload,
                {
                    onSelect: (media) => setAttributes({ 
                        [name]: media.url,
                        [name + 'Alt']: typeof media.alt === 'string' ? media.alt : '',
                    }),
                    render: ({ open }) => wp.element.createElement(
                        wp.components.Button,
                        {
                            className: 'button button-large',
                            style: { 
                                display: 'flex', 
                                gap: '8px' 
                            },
                            onClick: open
                        },
                        !props.attributes[name] ? "Bild auswählen" : wp.element.createElement('img', { 
                            src: props.attributes[name], 
                            alt: props.attributes[name + 'Alt'] || name, 
                            style: { height: '100%' }
                        })
                    )
                }
            ),
            props.attributes[name] && wp.element.createElement(
                wp.components.Button,
                {
                    className: 'button button-large',
                    style: { 
                        marginLeft: '8px',
                        color: 'red'
                    },
                    onClick: () => setAttributes({ 
                        [name]: null,
                        [name + 'Alt']: null,
                    })
                },
                "Bild entfernen"
            )
        )
    );

    const inspectorControls = wp.element.createElement(
        wp.blockEditor.InspectorControls,
        null,
        wp.element.createElement(
            wp.components.PanelBody,
            {
                title: title, // <- Auch hier dynamisch
                initialOpen: false
            },
            wp.element.createElement(
                wp.blockEditor.MediaUpload,
                {
                    onSelect: (media) => setAttributes({ 
                        [name]: media.url,
                        [name + 'Alt']: typeof media.alt === 'string' ? media.alt : ''
                    }),
                    render: ({ open }) => wp.element.createElement(
                        wp.components.Button,
                        {
                            className: 'button button-large',
                            onClick: open,
                            style: { 
                                width: '100%', 
                                marginBottom: '10px' 
                            }
                        },
                        !props.attributes[name] ? "Bild auswählen" : "Bild ändern"
                    )
                }
            ),
            props.attributes[name] && wp.element.createElement(
                'div',
                { style: { marginBottom: '10px' } },
                wp.element.createElement('img', {
                    src: props.attributes[name],
                    alt: props.attributes[name + 'Alt'] || name,
                    style: { 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: '150px', 
                        objectFit: 'cover' 
                    }
                })
            ),
            props.attributes[name] && wp.element.createElement(
                wp.components.TextControl,
                {
                    label: __('Alt-Text', 'text-domain'),
                    value: props.attributes[name + 'Alt'] || '',
                    onChange: (value) => setAttributes({
                        [name + 'Alt']: value
                    }),
                    help: attributeConfig?.description // <- Description als Hilfetext
                }
            ),
            props.attributes[name] && wp.element.createElement(
                wp.components.Button,
                {
                    className: 'button button-large',
                    onClick: () => setAttributes({ 
                        [name]: null,
                        [name + 'Alt']: null,
                    }),
                    style: { 
                        width: '100%', 
                        marginTop: '10px',
                        color: 'red'
                    }
                },
                __('Bild entfernen', 'text-domain')
            )
        )
    );
    
    return wp.element.createElement(
        wp.element.Fragment,
        null,
        regularInput,
        inspectorControls
    );
}

function media_output(props, name) {
    const mediaUrl = props.attributes[name];
    const mediaAlt = props.attributes[name + 'Alt'];
    const thumbnail = props.attributes["thumbnail"];

    if (!mediaUrl) return null;

    const url = mediaUrl;
    const alt = mediaAlt || name;

    const fileExtension = url.split('.').pop().toLowerCase();
    const videoExtensions = ['mp4', 'webm', 'ogg'];

    if (videoExtensions.includes(fileExtension)) {
        const videoProps = { 
            src: url, 
            className: name, 
            controls: false
        };

        if (thumbnail && thumbnail.url) {
            videoProps.poster = thumbnail.url;
        }

        return wp.element.createElement(
            'figure',
            {className: "videoWrap"},
            wp.element.createElement(
                'video',
                videoProps,
                "Your browser does not support the video tag."
            ),
            wp.element.createElement(
                'span',
                {className: "videoPlay"},
                wp.element.createElement('span')
            ),
            wp.element.createElement(
                'span',
                {className: "videoProgress"},
                wp.element.createElement('span')
            )
        );
    }

    return wp.element.createElement(
        'figure',
        {className: "imageWrap"},
        wp.element.createElement(
            'img',
            { 
                src: url, 
                alt: alt,
                className: name,
            }
        )
    );
}

function link_input(props, name) {
    var { setAttributes } = props;

    // Attribute-Definition aus Block-Type auslesen
    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];
    
    // Title und Description extrahieren (fallback auf defaults)
    const title = "🔗 " + (attributeConfig?.title || 'Link');

    const regularInput = wp.element.createElement(
        BaseControl,
        null,
        wp.element.createElement(URLInputButton, {
            url: props.attributes[name] || '',
            onChange: (url) => setAttributes({ [name]: url })
        })
    );
    
    const inspectorControls = wp.element.createElement(
        InspectorControls,
        null,
        wp.element.createElement(
            PanelBody,
            {
                title: __('Link Settings', 'text-domain'),
                initialOpen: true
            },
            wp.element.createElement(
                BaseControl,
                {
                    label: __('Link URL', 'text-domain')
                },
                wp.element.createElement(URLInput, {
                    value: props.attributes[name] || '',
                    onChange: (url) => setAttributes({ [name]: url })
                })
            )
        )
    );
    
    return wp.element.createElement(
        'div',
        { 
            className: 'field-group',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement(
            'h4',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title  // <- Jetzt dynamisch
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#666', 
                    fontSize: '12px'
                }
            },
            attributeConfig?.description  // <- Jetzt dynamisch
        ),
        wp.element.createElement(
            wp.element.Fragment,
            null,
            regularInput,
            inspectorControls
        )
    );
}

function link_output(props, name, content = null) {
    return props.attributes[name] && wp.element.createElement('a', { 
        href: props.attributes[name],
        className: name,
    }, content)
}

function select_input(props, name, options) {
    var { setAttributes } = props;

    // Attribute-Definition aus Block-Type auslesen
    const blockType = wp.blocks.getBlockType(props.name);
    const attributeConfig = blockType?.attributes?.[name];
    
    // Title und Description extrahieren (fallback auf defaults)
    const title = "" + (attributeConfig?.title || 'Auswahl');

    const options_array = typeof options === 'function' ? options(props) : (options || [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' }
    ]);
    
    return wp.element.createElement(
        'div',
        { 
            className: 'field-group',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement(
            'h4',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            title  // <- Jetzt dynamisch
        ),
        attributeConfig?.description && wp.element.createElement(
            'p',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#666', 
                    fontSize: '12px'
                }
            },
            attributeConfig?.description  // <- Jetzt dynamisch
        ),
        wp.element.createElement(
            SelectControl,
            {
                value: props.attributes[name],
                options: options_array,
                onChange: (value) => setAttributes({ [name]: value }),
                className: 'wp-block-select'
            }
        )
    );
}

function select_output(props, name) {
    return props.attributes[name];
}

function array_addblock(props, name, items) {
    var { setAttributes } = props;
    var addBlock = () => {
        const newItem = [];
        const template = items[0];
        
        Object.keys(template).forEach(key => {
            const config = template[key];
            const newField = {
                name: key,
                type: config.type,
                label: config.label
            };
            
            if (config.type === 'img') {
                newField[key] = null;
                newField[key + 'Alt'] = '';
            } else if (config.type === 'nested_array') {
                // WICHTIG: Initialisiere als leeres Array, nicht mit dem default template
                newField[key] = [];
            } else {
                newField[key] = '';
            }
            
            newItem.push(newField);
        });
        
        setAttributes({
            [name]: [...(props.attributes[name] || []), newItem]
        });
    };
    
    return wp.element.createElement(
        wp.components.Button,
        { isPrimary: true, onClick: addBlock },
        'Neuer Block hinzufügen'
    );
}

function array_removeblock(props, name, index) {
    var { setAttributes } = props;
    
    var removeBlock = (index) => {
        const newBlocks = [...props.attributes[name]];
        newBlocks.splice(index, 1);
        setAttributes({ [name]: newBlocks });
    };
    return wp.element.createElement(wp.components.Button, {
        isDestructive: true,
        isPrimary: true,
        size: 'compact',
        onClick: () => removeBlock(index)
    }, 'Block entfernen')
}

// NEUE NESTED ARRAY FUNKTIONEN
function nested_array_addblock(props, parentIndex, parentFieldName, fieldName, nestedConfig) {
    var { setAttributes } = props;
    var addNestedBlock = () => {
        const currentItems = [...(props.attributes[parentFieldName] || [])];
        
        if (!currentItems[parentIndex] || !Array.isArray(currentItems[parentIndex])) {
            return;
        }
        
        const currentParent = [...currentItems[parentIndex]];
        
        // Finde das nested array field
        const fieldIndex = currentParent.findIndex(item => item && item.name === fieldName);
        if (fieldIndex === -1) return;
        
        // Erstelle neues nested item als ARRAY struktur (nicht object)
        const template = nestedConfig.default[0];
        const newNestedItem = [];
        
        Object.keys(template).forEach(key => {
            const config = template[key];
            const newField = {
                name: key,
                type: config.type,
                label: config.label
            };
            
            if (config.type === 'img') {
                newField[key] = null;
                newField[key + 'Alt'] = '';
            } else {
                newField[key] = '';
            }
            
            newNestedItem.push(newField);
        });
        
        // Debug removed - functionality working
        // console.log('Adding nested item with structure:', newNestedItem);
        
        // Update das nested array - sicherstellen dass es existiert
        const currentNestedArray = currentParent[fieldIndex][fieldName] || [];
        currentParent[fieldIndex][fieldName] = [...currentNestedArray, newNestedItem];
        currentItems[parentIndex] = currentParent;
        
        props.setAttributes({ [parentFieldName]: currentItems });
    };
    
    return wp.element.createElement(
        wp.components.Button,
        { 
            isSecondary: true, 
            isSmall: true,
            onClick: addNestedBlock 
        },
        'Checkpoint hinzufügen'
    );
}

function nested_array_removeblock(props, parentIndex, parentFieldName, fieldName, nestedIndex) {
    var { setAttributes } = props;
    
    var removeNestedBlock = () => {
        const currentItems = [...(props.attributes[parentFieldName] || [])];
        
        if (!currentItems[parentIndex] || !Array.isArray(currentItems[parentIndex])) {
            return;
        }
        
        const currentParent = [...currentItems[parentIndex]];
        
        const fieldIndex = currentParent.findIndex(item => item && item.name === fieldName);
        if (fieldIndex === -1 || !currentParent[fieldIndex]) {
            return;
        }
        
        const currentNestedArray = [...(currentParent[fieldIndex][fieldName] || [])];
        currentNestedArray.splice(nestedIndex, 1);
        currentParent[fieldIndex][fieldName] = currentNestedArray;
        currentItems[parentIndex] = currentParent;
        
        setAttributes({ [parentFieldName]: currentItems });
    };
    
    return wp.element.createElement(wp.components.Button, {
        isDestructive: true,
        isSmall: true,
        size: 'compact',
        onClick: removeNestedBlock
    }, 'Entfernen')
}

function pbw_attributes(params = {}) {
    let config = {
        type: 'string'
    };

    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            config[key] = params[key];
        }
    }

    return config;
}

const pbw = {
    choose: {
        attr: (customParams = {}) => pbw_attributes({
            ...{selector: 'select'}, 
            ...customParams
        }),
        example: "option1",
        input: select_input,
        output: select_output
    },
    h1: {
        attr: (customParams = {}) => pbw_attributes({
            ...{selector: 'h1'}, 
            ...customParams
        }),
        example: "Dies ist eine Überschrift",
        input: text_input,
        output: text_output
    },
    p: {
        attr: (customParams = {}) => pbw_attributes({
            ...{selector: 'p'}, 
            ...customParams
        }),
        example: "Dies ist ein Test-Textfeld. Es soll ein Paragraph-Element sein und ist dazu da um mehr als nur eine Zeile an Text darzustellen",
        input: text_input,
        output: text_output
    },
    img: {
        attr: (name = 'img', customParams = {}) => {
            const baseAttr = pbw_attributes({
                ...{selector: 'img'}, 
                ...customParams
            });
            
            return {
                [name]: baseAttr,
                [name + 'Alt']: {
                    type: 'string', 
                    default: ''
                },
                [name + 'Id']: {
                    type: 'number',
                    default: null
                }
            };
        },
        example: "https://www.programmierung-bw.de/welpen.jpg",
        input: media_input,
        output: media_output
    },
    link: {
        attr: (customParams = {}) => pbw_attributes({
            ...{source: 'attribute', attribute: 'href', selector: 'a.link'}, 
            ...customParams
        }),
        example: "https://example.com/",
        input: link_input,
        output: link_output
    },
    array: {
        attr: (customParams = {}) => pbw_attributes({
            ...{type: 'array',default: []}, 
            ...customParams
        }),
        example: [],
        input: array_input,
        output: array_output,
        addblock: array_addblock,
        removeblock: array_removeblock
    },
    nested_array: {
        attr: (customParams = {}) => pbw_attributes({
            ...{type: 'array', default: []}, 
            ...customParams
        }),
        input: nested_array_input,
        addblock: nested_array_addblock,
        removeblock: nested_array_removeblock
    },
    block: {
        title: (props) => {
            const { name } = props;
            const title = wp.blocks.getBlockType(name).title;
            const description = wp.blocks.getBlockType(name).description;

            return wp.element.createElement(
                'div',
                { className: 'block-title' },
                wp.element.createElement('img', {
                    src: php_vars.template_directory_uri + '/assets/img/Logo SWS 2 zeilig_min.svg',
                    style: {
                        width: "70px"
                    }
                }),
                wp.element.createElement('h2',null,title),
                wp.element.createElement('p',null,description),
            );
        }
    }
}

function array_output(props, array, map_function) {
    const { attributes } = props;
    const items = attributes[array];
    
    if (!items || items.length === 0) return null;
    
    return items.map((itemArray, index) => {
        if (!itemArray) return null;
        
        const transformedItems = {};
        
        if (Array.isArray(itemArray)) {
            itemArray.forEach(item => {
                if (item && item.name) {
                    const keyName = item.name;
                    const typeName = item.type;
                    
                    if (typeName === 'img') {
                        transformedItems[keyName] = item[keyName] || null;
                        transformedItems[keyName + 'Alt'] = item[keyName + 'Alt'] || null;
                    } else if (typeName === 'nested_array') {
                        // Transform nested array from pbw structure to simple array of objects
                        const nestedArray = item[keyName] || [];
                        transformedItems[keyName] = nestedArray.map(nestedItem => {
                            if (Array.isArray(nestedItem)) {
                                // Transform pbw array structure to object
                                const nestedObj = {};
                                nestedItem.forEach(field => {
                                    if (field && field.name) {
                                        if (field.type === 'img') {
                                            nestedObj[field.name] = field[field.name] || null;
                                            nestedObj[field.name + 'Alt'] = field[field.name + 'Alt'] || null;
                                        } else {
                                            nestedObj[field.name] = field[field.name] || null;
                                        }
                                    }
                                });
                                return nestedObj;
                            }
                            return nestedItem; // Already an object
                        });
                    } else {
                        transformedItems[keyName] = item[keyName] || null;
                    }
                }
            });
        } else if (typeof itemArray === 'object') {
            Object.keys(itemArray).forEach(key => {
                const config = itemArray[key];
                if (config && config.type) {
                    if (config.type === 'img') {
                        transformedItems[key] = config[key] || null;
                        transformedItems[key + 'Alt'] = config[key + 'Alt'] || null;
                    } else if (config.type === 'nested_array') {
                        // Handle nested array in object format
                        const nestedArray = config[key] || [];
                        transformedItems[key] = nestedArray.map(nestedItem => {
                            if (Array.isArray(nestedItem)) {
                                const nestedObj = {};
                                nestedItem.forEach(field => {
                                    if (field && field.name) {
                                        if (field.type === 'img') {
                                            nestedObj[field.name] = field[field.name] || null;
                                            nestedObj[field.name + 'Alt'] = field[field.name + 'Alt'] || null;
                                        } else {
                                            nestedObj[field.name] = field[field.name] || null;
                                        }
                                    }
                                });
                                return nestedObj;
                            }
                            return nestedItem;
                        });
                    } else {
                        transformedItems[key] = config[key] || null;
                    }
                }
            });
        }
        
        transformedItems["key"] = index;
        transformedItems["length"] = Array.isArray(itemArray) ? itemArray.length : Object.keys(itemArray).length;
        
        return map_function(transformedItems, index);
    }).filter(item => item !== null);
}

function array_input(props, field) {
    const { name, attributes, setAttributes } = props;
    const blockType = wp.blocks.getBlockType(name);
    const attributeConfig = blockType?.attributes?.[field];
    const defaultItems = attributeConfig?.default || [];
    
    // Title und Description für das Array selbst
    const arrayTitle = "" + (attributeConfig?.title || 'Elemente');
    const arrayDescription = attributeConfig?.description;
    
    const setItemsCallback = (newItems) => {
        setAttributes({ [field]: newItems });
    };

    const currentItems = attributes[field] || defaultItems;
    
    const editItem = (index, fieldName, newValues) => {
        const updatedItems = [...(currentItems || [])];
        
        if (!updatedItems[index]) {
            return;
        }
        
        const currentItem = updatedItems[index];
        
        if (Array.isArray(currentItem)) {
            const fieldIndex = currentItem.findIndex(item => item && item.name === fieldName);
            if (fieldIndex !== -1) {
                Object.keys(newValues).forEach(key => {
                    currentItem[fieldIndex][key] = newValues[key];
                });
            }
        } else if (typeof currentItem === 'object' && currentItem[fieldName]) {
            updatedItems[index] = {
                ...currentItem,
                [fieldName]: { ...currentItem[fieldName], ...newValues }
            };
        }
        
        setItemsCallback(updatedItems);
    };

    const createTempProps = (index, fieldName, type, fieldConfig) => {
        const currentItem = currentItems[index];
        let fieldData = {};
        
        if (Array.isArray(currentItem)) {
            const foundField = currentItem.find(item => item.name === fieldName);
            fieldData = foundField || {};
        } else if (typeof currentItem === 'object' && currentItem[fieldName]) {
            fieldData = currentItem[fieldName];
        }
        
        const tempKey = `temp_${index}_${fieldName}`;
        const tempAltKey = `temp_${index}_${fieldName}Alt`;
        
        const tempProps = {
            name: props.name, // Use original block name
            attributes: {},
            setAttributes: (newAttrs) => {
                const updateData = {};
                
                if (tempKey in newAttrs) {
                    updateData[fieldName] = newAttrs[tempKey];
                }
                
                if (tempAltKey in newAttrs) {
                    updateData[`${fieldName}Alt`] = newAttrs[tempAltKey];
                }
                
                if (Object.keys(updateData).length > 0) {
                    editItem(index, fieldName, updateData);
                }
            }
        };
        
        // WICHTIG: Mock die BlockType attributes für title/description support
        const originalBlockType = wp.blocks.getBlockType(props.name);
        if (originalBlockType) {
            // Temporär die attributes erweitern
            if (!originalBlockType.attributes[tempKey]) {
                originalBlockType.attributes[tempKey] = {
                    title: fieldConfig?.title,
                    description: fieldConfig?.description
                };
            }
            if (type === 'img' && !originalBlockType.attributes[tempAltKey]) {
                originalBlockType.attributes[tempAltKey] = {};
            }
        }
        
        if (type === 'img') {
            tempProps.attributes[tempKey] = fieldData[fieldName] || '';
            tempProps.attributes[tempAltKey] = fieldData[`${fieldName}Alt`] || '';
        } else {
            tempProps.attributes[tempKey] = fieldData[fieldName] || '';
        }

        return tempProps;
    };

    const moveItemUp = (index) => {
        if (index === 0) return;
        const updatedItems = [...currentItems];
        [updatedItems[index], updatedItems[index - 1]] = [updatedItems[index - 1], updatedItems[index]];
        setItemsCallback(updatedItems);
    };

    const moveItemDown = (index) => {
        if (index === currentItems.length - 1) return;
        const updatedItems = [...currentItems];
        [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
        setItemsCallback(updatedItems);
    };

    return wp.element.createElement(
        'div',
        { 
            className: 'field-group dynamic-array-input',
            style: {
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                border: '1px solid #e0e0e0'
            }
        },
        wp.element.createElement(
            'h4',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#2c3e50',
                    fontSize: '14px',
                    fontWeight: '600'
                }
            },
            `${arrayTitle} (${currentItems.length})`
        ),
        arrayDescription && wp.element.createElement(
            'p',
            { 
                style: { 
                    margin: '0 0 12px 0', 
                    color: '#666', 
                    fontSize: '12px'
                }
            },
            arrayDescription
        ),
        currentItems.map((item, index) => {
            return wp.element.createElement(
                'div',
                { 
                    className: 'dynamic-item', 
                    key: index,
                    style: {
                        backgroundColor: '#f9f9f9',
                        padding: '15px',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        border: '1px solid #e0e0e0'
                    }
                },
                wp.element.createElement(
                    'div',
                    { 
                        className: 'item-header',
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '15px'
                        }
                    },
                    wp.element.createElement('span', { 
                        className: 'item-title',
                        style: { fontWeight: 'bold' }
                    }, `Item #${index + 1}`),
                    wp.element.createElement(
                        'div',
                        { className: 'item-controls' },
                        index > 0 && wp.element.createElement(
                            Button,
                            {
                                isSmall: true,
                                isSecondary: true,
                                icon: 'arrow-up-alt2',
                                onClick: () => moveItemUp(index),
                                label: 'Nach oben verschieben'
                            }
                        ),
                        index < currentItems.length - 1 && wp.element.createElement(
                            Button,
                            {
                                isSmall: true,
                                isSecondary: true,
                                icon: 'arrow-down-alt2',
                                onClick: () => moveItemDown(index),
                                label: 'Nach unten verschieben'
                            }
                        ),
                        pbw.array.removeblock(props, field, index)
                    )
                ),
                wp.element.createElement(
                    'div',
                    { className: 'dynamic-item-content' },
                    Object.keys(defaultItems[0]).map((fieldName, fieldIndex) => {
                        const fieldConfig = defaultItems[0][fieldName];
                        const tempProps = createTempProps(index, fieldName, fieldConfig.type, fieldConfig);
                        const tempKey = `temp_${index}_${fieldName}`;

                        // Felder ohne extra Wrapper - die Input-Funktionen zeigen title/description selbst an
                        return wp.element.createElement(
                            'div',
                            { 
                                className: `dynamic-inner-item ${fieldConfig.type}`, 
                                key: fieldIndex,
                            },
                            fieldConfig.type === 'text' && text_input(tempProps, 'p', tempKey),
                            fieldConfig.type === 'link' && link_input(tempProps, tempKey),
                            fieldConfig.type === 'img' && media_input(tempProps, tempKey),
                            fieldConfig.type === 'choose' && select_input(tempProps, tempKey, fieldConfig.options),
                            fieldConfig.type === 'nested_array' && nested_array_input(props, index, field, fieldName, fieldConfig)
                        );
                    })
                )
            );
        }),
        wp.element.createElement(
            'div',
            { className: 'array-add-button', style: { marginTop: '10px' } },
            pbw.array.addblock(props, field, defaultItems)
        )
    );
}

// Erweiterte nested_array_input Funktion
function nested_array_input(props, parentIndex, parentFieldName, fieldName, nestedConfig) {
    const currentItems = props.attributes[parentFieldName] || [];
    let currentParent = currentItems[parentIndex] || [];
    
    // Find the nested array field
    let nestedArray = [];
    if (Array.isArray(currentParent)) {
        const fieldItem = currentParent.find(item => item && item.name === fieldName);
        nestedArray = fieldItem ? (fieldItem[fieldName] || []) : [];
    }
    
    const nestedTitle = "🔂 " + (nestedConfig?.title || fieldName);
    const nestedDescription = nestedConfig?.description;
    
    // Helper to update nested items
    const updateNestedItem = (nestedIndex, nestedFieldName, newValues) => {
        const updatedParents = [...currentItems];
        const parent = [...updatedParents[parentIndex]];
        const fieldIndex = parent.findIndex(item => item && item.name === fieldName);
        
        if (fieldIndex !== -1) {
            const currentNested = [...(parent[fieldIndex][fieldName] || [])];
            const nestedItem = currentNested[nestedIndex];
            
            if (Array.isArray(nestedItem)) {
                const nestedFieldIndex = nestedItem.findIndex(item => item && item.name === nestedFieldName);
                if (nestedFieldIndex !== -1) {
                    Object.keys(newValues).forEach(key => {
                        nestedItem[nestedFieldIndex][key] = newValues[key];
                    });
                }
            }
            
            parent[fieldIndex][fieldName] = currentNested;
            updatedParents[parentIndex] = parent;
            props.setAttributes({ [parentFieldName]: updatedParents });
        }
    };
    
    return wp.element.createElement(
        'div',
        { 
            className: 'nested-array-input',
            style: {
                marginLeft: '20px',
                padding: '10px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5'
            }
        },
        wp.element.createElement('h5', { style: { margin: '0 0 10px 0' } }, nestedTitle),
        nestedDescription && wp.element.createElement(
            'p',
            { style: { fontSize: '12px', color: '#666', margin: '0 0 10px 0' } },
            nestedDescription
        ),
        
        // Render nested items
        nestedArray.map((nestedItem, nestedIndex) => {
            return wp.element.createElement(
                'div',
                { 
                    key: nestedIndex,
                    style: {
                        backgroundColor: '#fff',
                        padding: '10px',
                        marginBottom: '8px',
                        borderRadius: '3px',
                        border: '1px solid #ddd'
                    }
                },
                wp.element.createElement(
                    'div',
                    { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' } },
                    wp.element.createElement('strong', null, `Checkpoint #${nestedIndex + 1}`),
                    pbw.nested_array.removeblock(props, parentIndex, parentFieldName, fieldName, nestedIndex)
                ),
                
                // Render fields for each nested item
                Object.keys(nestedConfig.default[0]).map((nestedFieldName) => {
                    const fieldConfig = nestedConfig.default[0][nestedFieldName];
                    
                    // Create temp props for nested field
                    const tempKey = `nested_${parentIndex}_${nestedIndex}_${nestedFieldName}`;
                    let fieldValue = '';
                    
                    if (Array.isArray(nestedItem)) {
                        const field = nestedItem.find(item => item && item.name === nestedFieldName);
                        fieldValue = field ? field[nestedFieldName] : '';
                    }
                    
                    const tempProps = {
                        name: props.name,
                        attributes: { [tempKey]: fieldValue },
                        setAttributes: (newAttrs) => {
                            if (tempKey in newAttrs) {
                                updateNestedItem(nestedIndex, nestedFieldName, {
                                    [nestedFieldName]: newAttrs[tempKey]
                                });
                            }
                        }
                    };
                    
                    // Mock block type for title/description
                    const originalBlockType = wp.blocks.getBlockType(props.name);
                    if (originalBlockType && !originalBlockType.attributes[tempKey]) {
                        originalBlockType.attributes[tempKey] = {
                            title: fieldConfig?.title,
                            description: fieldConfig?.description
                        };
                    }
                    
                    return wp.element.createElement(
                        'div',
                        { key: nestedFieldName, style: { marginBottom: '8px' } },
                        fieldConfig.type === 'text' && text_input(tempProps, 'p', tempKey),
                        fieldConfig.type === 'link' && link_input(tempProps, tempKey),
                        fieldConfig.type === 'img' && media_input(tempProps, tempKey)
                    );
                })
            );
        }),
        
        // Add button
        wp.element.createElement(
            'div',
            { style: { marginTop: '10px' } },
            pbw.nested_array.addblock(props, parentIndex, parentFieldName, fieldName, nestedConfig)
        )
    );
}