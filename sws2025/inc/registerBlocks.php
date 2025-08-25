<?php
// 1. Block REGISTRIERUNG (Frontend + Backend)
function custom_block_register()
{
    $blocks = array_filter(scandir(get_template_directory() . "/blocks"), function ($block) {
        if (is_dir(get_template_directory() . "/blocks/$block") == false) return false;
        if (in_array($block, ['.', '..'])) return false;
        if (!file_exists(get_template_directory() . "/blocks/$block/block.js")) return false;
        return true;
    });

    foreach ($blocks as $block) {
        $param = [
            'category' => 'custom-blocks',
        ];

        // NUR Render Callback (für Frontend)
        if (file_exists(get_template_directory() . "/blocks/$block/render.php")) {
            include_once get_template_directory() . "/blocks/$block/render.php";

            if (function_exists("custom_render_$block")) {
                $param["render_callback"] = "custom_render_$block";
                $param["attributes"] = array(
                    'content' => array(
                        'type' => 'string',
                        'default' => '',
                    ),
                );
            }
        }

        // Block registrieren OHNE Assets
        register_block_type("custom/$block", $param);
    }
}
add_action('init', 'custom_block_register');

// 2. Assets NUR im Block Editor (Backend Only)
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

    // Globale Editor CSS NUR im Editor
    wp_enqueue_style(
        "custom-category-style",
        get_template_directory_uri() . "/assets/css/global_editor.css",
        array('wp-edit-blocks'),
        filemtime(get_template_directory() . '/assets/css/global_editor.css')
    );

    // Block-spezifische Assets laden
    $blocks = array_filter(scandir(get_template_directory() . "/blocks"), function ($block) {
        if (is_dir(get_template_directory() . "/blocks/$block") == false) return false;
        if (in_array($block, ['.', '..'])) return false;
        if (!file_exists(get_template_directory() . "/blocks/$block/block.js")) return false;
        return true;
    });

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
