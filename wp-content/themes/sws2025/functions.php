<?php

/**
 * 
 * This file contains the main functionality for the WordPress theme.
 * It handles theme setup, asset enqueuing, custom post types, and various
 * WordPress hooks and filters.
 *
 * @package     WordPress
 * @version     1.0
 * @author      Programmierung-BW
 */


/**
 * =========================================================================
 * THEME CONSTANTS & HELPERS
 * =========================================================================
 */

if (!defined('CUSTOM_BLOCK_CATEGORY')) {
    define('CUSTOM_BLOCK_CATEGORY', 'sws2025');
}

/**
 * Define theme constants for consistent file paths and URLs
 */
if (!defined('CUSTOM_THEME_VERSION')) {
    define('CUSTOM_THEME_VERSION', wp_get_theme()->get('Version'));
}

if (!defined('CUSTOM_THEME_PATH')) {
    define('CUSTOM_THEME_PATH', get_template_directory());
}

if (!defined('CUSTOM_THEME_URL')) {
    define('CUSTOM_THEME_URL', get_template_directory_uri());
}


// Verwendung überall:
// JavaScript: php_vars.block_category
// PHP: CUSTOM_BLOCK_CATEGORY

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * =========================================================================
 * THEME SETUP & CONFIGURATION
 * =========================================================================
 */

/**
 * Setup theme defaults and register support for various WordPress features
 * 
 * This function is hooked into the after_setup_theme action, which runs
 * before the init hook. The init hook is too late for some features.
 *
 * @since CUSTOM_BLOCK_CATEGORY 1.0
 * @return void
 */
function custom_setup()
{
    // Register navigation menus
    register_nav_menus([
        'navigation' => __('Navigation', CUSTOM_BLOCK_CATEGORY),
    ]);
}
add_action('after_setup_theme', 'custom_setup');

/**
 * =========================================================================
 * ASSET MANAGEMENT
 * =========================================================================
 */

/**
 * Enqueue frontend styles and scripts
 * 
 * Loads all necessary CSS and JavaScript files for the frontend.
 * Includes GSAP for animations and custom theme styles.
 *
 * @since CUSTOM_BLOCK_CATEGORY 1.0
 * @return void
 */
function enqueue_styles()
{
    $theme_version = wp_get_theme()->get('Version');

    // Main theme stylesheet
    wp_enqueue_style(
        'style',
        get_parent_theme_file_uri('assets/css/main.css'),
        [],
        $theme_version
    );

    // Image mapper specific styles
    wp_enqueue_style(
        'style-imagemapper',
        get_parent_theme_file_uri('assets/css/position-render.css'),
        [],
        $theme_version
    );

    // leaflet specific styles
    wp_enqueue_style(
        'style-leaflet',
        get_parent_theme_file_uri('assets/js/leaflet/leaflet.css'),
        [],
        $theme_version
    );
}
add_action('wp_enqueue_scripts', 'enqueue_styles');

/**
 * Enqueue block editor specific assets
 * 
 * Loads styles that are only needed in the WordPress block editor.
 *
 * @since CUSTOM_BLOCK_CATEGORY 1.0
 * @return void
 */
function block_editor_only()
{
    wp_enqueue_style(
        'editor',
        get_theme_file_uri('editor/assets/css/main.css'),
        [],
        wp_get_theme()->get('Version')
    );
}
add_action('enqueue_block_editor_assets', 'block_editor_only');

/**
 * Enqueue interactive component scripts
 * 
 * Loads JavaScript for custom interactive components like
 * image mapper and parallax effects.
 *
 * @since CUSTOM_BLOCK_CATEGORY 1.0
 * @return void
 */
function enqueue_scripts()
{
    $theme_version = wp_get_theme()->get('Version');

    // GSAP Animation Library
    wp_enqueue_script(
        'gsap',
        get_template_directory_uri() . '/assets/js/gsap.min.js',
        [],
        '3.13.0',
        true
    );

    // Appear Animations
    wp_enqueue_script(
        'appear-frontend',
        get_template_directory_uri() . '/assets/js/appear.js',
        [],
        $theme_version,
        true
    );

    // leaflet Animations
    wp_enqueue_script(
        'leaflet-frontend',
        get_template_directory_uri() . '/assets/js/leaflet/leaflet.js',
        [],
        $theme_version,
        true
    );

    wp_enqueue_script(
        'burger-toggle',
        get_template_directory_uri() . '/assets/js/burger-toggle.js',
        array(),
        $theme_version,
        true
    );
}
add_action('wp_enqueue_scripts', 'enqueue_scripts');

/**
 * =========================================================================
 * WORDPRESS CUSTOMIZATIONS
 * =========================================================================
 */

/**
 * Filter Query Monitor dispatchers to suppress OPcache warnings
 * 
 * Removes annoying OPcache warnings from Query Monitor output
 * to keep the debug output clean and focused.
 *
 * @param array $dispatchers Array of QM dispatchers
 * @return array Modified dispatchers array
 */
add_filter('qm/dispatchers', function ($dispatchers) {
    if (isset($dispatchers['html'])) {
        add_filter('qm/output/buffer', function ($buffer) {
            return str_replace('Zend OPcache can\'t be temporary enabled', '', $buffer);
        });
    }
    return $dispatchers;
});

/**
 * =========================================================================
 * THEME COMPONENT LOADING
 * =========================================================================
 */

/**
 * Load Block Category Registry
 * Registers custom block categories for the Gutenberg editor
 */
require_once get_template_directory() . "/inc/registerBlockCategory.php";

/**
 * Load Custom Block Registration
 * Handles registration of custom Gutenberg blocks and their functionality
 */
require_once get_template_directory() . "/inc/registerBlocks.php";

/**
 * Load Pattern Categories
 * Registers custom block pattern categories for organized content templates
 */
require_once get_template_directory() . "/inc/registerPatternsCategory.php";

/**
 * Load Knowledge Base Functionality
 * Custom post type and functionality for knowledge base content
 */
// require_once get_template_directory() . '/inc/knowledge-base.php';

// require_once get_template_directory() . '/inc/enhanced-knowledge-base.php';

require_once get_template_directory() . '/inc/confluence-qdrant-sync.php';

/**
 * Load Overlay Components
 * Custom overlay functionality for interactive elements
 */
require_once get_template_directory() . '/inc/overlay.php';

/**
 * =========================================================================
 * MEDIA HANDLING
 * =========================================================================
 */

/**
 * Enable SVG file uploads
 * 
 * Adds SVG support to WordPress media uploads by extending
 * the allowed MIME types.
 *
 * @param array $mimes Existing allowed MIME types
 * @return array Extended MIME types including SVG
 */
function add_svg_support($mimes)
{
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}
add_filter('upload_mimes', 'add_svg_support');

/**
 * Fix SVG preview in Media Library
 * 
 * Enables proper preview of SVG files in the WordPress media library
 * by setting appropriate image dimensions and source.
 *
 * @param array $response   Attachment response data
 * @param object $attachment Attachment object
 * @param array $meta       Attachment metadata
 * @return array Modified response with SVG preview data
 */
function fix_svg_display($response, $attachment, $meta)
{
    if ($response['subtype'] === 'svg+xml') {
        $response['image'] = [
            'src'    => $response['url'],
            'width'  => 150,
            'height' => 150
        ];
    }
    return $response;
}
add_filter('wp_prepare_attachment_for_js', 'fix_svg_display', 10, 3);

function create_custom_menu_taxonomy()
{
    register_taxonomy(
        'menu_categories',
        null, // Nicht an Post-Type gebunden
        array(
            'labels' => array(
                'name' => 'Menü-Kategorien',
                'singular_name' => 'Menü-Kategorie',
            ),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_admin_column' => true,
        )
    );
}
add_action('init', 'create_custom_menu_taxonomy');

add_action('enqueue_block_editor_assets', function () {
    wp_enqueue_script(
        'custom-social-icons',
        get_template_directory_uri() . '/assets/js/social-icons.js',
        ['wp-blocks', 'wp-element', 'wp-dom-ready'],
        wp_get_theme()->get('Version'),
        true
    );
});

// Frontend rendering mit CSS masks
add_filter('render_block_core/social-link', function ($block_content, $block) {
    $service = $block['attrs']['service'] ?? '';

    $custom_services = ['linkedin', 'instagram', 'xing'];

    if (in_array($service, $custom_services)) {
        // SVG durch leeren Span ersetzen und custom class hinzufügen
        $block_content = preg_replace(
            '/(<a[^>]*class="[^"]*)(")([^>]*>)<svg.*?<\/svg>/s',
            '$1 custom-' . $service . '$2$3<span class="custom-social-icon"></span>',
            $block_content
        );
    }

    return $block_content;
}, 10, 2);

// functions.php
add_action('admin_init', function () {
    $editor = get_role('editor');
    $editor->add_cap('edit_theme_options');
});
