<?php

/**
 * WordPress Overlay System - Backend Handler
 * Add to functions.php or create as plugin
 */

// Enqueue scripts and localize AJAX
add_action('wp_enqueue_scripts', 'wpoverlay_enqueue_scripts');
function wpoverlay_enqueue_scripts()
{
    // GSAP from CDN
    wp_enqueue_script(
        'gsap',
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
        array(),
        '3.12.2',
        true
    );

    // Overlay script
    wp_enqueue_script(
        'wp-overlay',
        get_template_directory_uri() . '/assets/js/wp-overlay.js',
        array('gsap'),
        '1.0.0',
        true
    );

    // Overlay styles
    wp_enqueue_style(
        'wp-overlay',
        get_template_directory_uri() . '/assets/css/wp-overlay.css',
        array(),
        '1.0.0'
    );

    // Localize script
    wp_localize_script('wp-overlay', 'wpOverlay', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'apiBase' => home_url('/wp-json/wp/v2'),
        'nonce' => wp_create_nonce('wp_overlay_nonce')
    ));
}

// AJAX handler for loading page content
add_action('wp_ajax_load_page_content', 'wpoverlay_load_page_content');
add_action('wp_ajax_nopriv_load_page_content', 'wpoverlay_load_page_content');
function wpoverlay_load_page_content()
{
    // Security check
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'wp_overlay_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'));
    }

    $page_id = isset($_POST['page_id']) ? intval($_POST['page_id']) : 0;

    if (!$page_id) {
        wp_send_json_error(array('message' => 'Invalid page ID'));
    }

    // Get page
    $page = get_post($page_id);

    if (!$page || $page->post_type !== 'page') {
        wp_send_json_error(array('message' => 'Page not found'));
    }

    // Setup postdata for proper rendering
    global $post;
    $post = $page;
    setup_postdata($post);

    // Get content with filters applied
    $content = apply_filters('the_content', $page->post_content);

    // Also handle Gutenberg blocks
    if (has_blocks($page->post_content)) {
        $content = do_blocks($page->post_content);
    }

    // Apply shortcodes
    $content = do_shortcode($content);

    // Reset postdata
    wp_reset_postdata();

    wp_send_json_success(array(
        'title' => $page->post_title,
        'content' => $content,
        'id' => $page_id,
        'slug' => $page->post_name,
        'url' => get_permalink($page_id)
    ));
}

// REST API modification to expose content properly
add_action('rest_api_init', 'wpoverlay_rest_api_init');
function wpoverlay_rest_api_init()
{
    // Add rendered content field
    register_rest_field('page', 'rendered_content', array(
        'get_callback' => function ($post) {
            $content = apply_filters('the_content', $post['content']['raw']);
            return do_shortcode($content);
        },
        'schema' => array(
            'description' => 'Rendered content with filters applied',
            'type' => 'string',
            'context' => array('view', 'edit')
        )
    ));
}

// Helper function for manual integration
function wpoverlay_trigger($page_id, $label = 'Open', $classes = '')
{
    return sprintf(
        '<button onclick="Overlay.open(\'%s\', event)" class="%s">%s</button>',
        esc_attr($page_id),
        esc_attr($classes),
        esc_html($label)
    );
}

// Shortcode for overlay triggers
add_shortcode('overlay_button', 'wpoverlay_button_shortcode');
function wpoverlay_button_shortcode($atts)
{
    $atts = shortcode_atts(array(
        'page' => '',
        'label' => 'Open',
        'class' => 'wp-overlay-trigger'
    ), $atts);

    if (empty($atts['page'])) {
        return '';
    }

    return wpoverlay_trigger($atts['page'], $atts['label'], $atts['class']);
}

// Add body class when overlay capable
add_filter('body_class', 'wpoverlay_body_class');
function wpoverlay_body_class($classes)
{
    $classes[] = 'wp-overlay-capable';
    return $classes;
}
