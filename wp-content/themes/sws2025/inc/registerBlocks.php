<?php

/**
 * getBlocks
 *
 * @return array
 */
function getBlocks(): array
{
    return array_filter(scandir(get_template_directory() . "/blocks"), function ($block) {
        if (is_dir(get_template_directory() . "/blocks/$block") == false) return false;
        if (in_array($block, ['.', '..'])) return false;
        if (!file_exists(get_template_directory() . "/blocks/$block/block.js")) return false;
        return true;
    });
}

/**
 * custom_block_editor_assets
 *
 * @return void
 */
function custom_block_editor_assets()
{
    // Globales Skript NUR im Editor
    wp_enqueue_script(
        'custom-global-script',
        get_template_directory_uri() . '/assets/js/global_blocks.js',
        array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-block-editor', 'wp-media-utils'),
        filemtime(get_template_directory() . '/assets/js/global_blocks.js'),
        true
    );

    // Globales Skript NUR im Editor
    wp_enqueue_script(
        'custom-global-script2',
        get_template_directory_uri() . '/assets/js/pbw_global.js',
        array('wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-block-editor', 'wp-media-utils'),
        filemtime(get_template_directory() . '/assets/js/pbw_global.js'),
        true
    );

    // Globale Editor CSS NUR im Editor
    wp_enqueue_style(
        "custom-category-style",
        get_template_directory_uri() . "/assets/css/global_editor.css",
        array('wp-edit-blocks'),
        filemtime(get_template_directory() . '/assets/css/global_editor.css')
    );

    // Block-spezifische Assets laden
    $blocks = getBlocks();
    foreach ($blocks as $block) {
        // Block JS NUR im Editor
        if (file_exists(get_template_directory() . "/blocks/$block/block.js")) {
            wp_enqueue_script(
                "custom-block-$block-script",
                get_template_directory_uri() . "/blocks/$block/block.js",
                array('custom-global-script', 'wp-blocks', 'wp-element', 'wp-editor', 'wp-components', 'wp-block-editor', 'wp-media-utils'),
                filemtime(get_template_directory() . "/blocks/$block/block.js"),
                true
            );

            wp_localize_script("custom-block-$block-script", 'php_vars', array(
                'template_directory_uri' => get_template_directory_uri(),
                'exampleImage' => get_template_directory_uri() . '/img/AdobeStock_287823203.jpg',
                'exampleImage1' => 'https://www.hettenbach.de/wp-content/uploads/2024/09/1-2.jpg',
                'exampleImage2' => 'https://www.hettenbach.de/wp-content/uploads/2024/09/2-5.jpg'
            ));
        }

        // Block CSS NUR im Editor
        if (file_exists(get_template_directory() . "/blocks/$block/editor.css")) {
            wp_enqueue_style(
                "custom-block-$block-style",
                get_template_directory_uri() . "/blocks/$block/editor.css",
                array('wp-edit-blocks'),
                filemtime(get_template_directory() . "/blocks/$block/editor.css")
            );
        }
    }
}
add_action('enqueue_block_editor_assets', 'custom_block_editor_assets');

/**
 * Enqueue scripts for specific blocks
 */
function enqueue_block_scripts($blocks)
{
    foreach ($blocks as $block) {
        $script_path = get_template_directory() . "/blocks/$block/frontend.js";

        if (file_exists($script_path)) {

            wp_enqueue_script(
                "$block-frontend-script",
                get_template_directory_uri() . "/blocks/$block/frontend.js",
                array(),
                filemtime($script_path),
                true
            );
        }
    }
}
function enqueue_block_frontend_script()
{
    $blocks = getBlocks();
    foreach ($blocks as $block) {
        add_action('render_block', function ($block_content, $block_data) use ($block) {
            if ($block_data['blockName'] === CUSTOM_BLOCK_CATEGORY . "/$block") {
                enqueue_block_scripts([$block]);
            }
            return $block_content;
        }, 10, 2);
    }
}
add_action('init', 'enqueue_block_frontend_script');
