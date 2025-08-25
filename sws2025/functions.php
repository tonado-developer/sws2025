<?php

/**
 * SWS2025 Theme Functions and Definitions
 * 
 * This file contains the main functionality for the SWS2025 WordPress theme.
 * It handles theme setup, asset enqueuing, custom post types, and various
 * WordPress hooks and filters.
 *
 * @package     WordPress
 * @subpackage  sws2025
 * @version     1.0
 * @author      Programmierung-BW
 * @since       sws2025 1.0
 */

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
 * @since sws2025 1.0
 * @return void
 */
function sws2025_setup()
{
    // Register navigation menus
    register_nav_menus([
        'navigation' => __('Navigation', 'sws2025'),
    ]);
}
add_action('after_setup_theme', 'sws2025_setup');

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
 * @since sws2025 1.0
 * @return void
 */
function sws2025_enqueue_styles()
{
    $theme_version = wp_get_theme()->get('Version');

    // Main theme stylesheet
    wp_enqueue_style(
        'sws2025-style',
        get_parent_theme_file_uri('assets/css/main.css'),
        [],
        $theme_version
    );

    // Image mapper specific styles
    wp_enqueue_style(
        'sws2025-style-imagemapper',
        get_parent_theme_file_uri('assets/css/position-render.css'),
        [],
        $theme_version
    );
}
add_action('wp_enqueue_scripts', 'sws2025_enqueue_styles');

/**
 * Enqueue block editor specific assets
 * 
 * Loads styles that are only needed in the WordPress block editor.
 *
 * @since sws2025 1.0
 * @return void
 */
function sws2025_block_editor_only()
{
    wp_enqueue_style(
        'sws2025-editor',
        get_theme_file_uri('editor/assets/css/main.css'),
        [],
        wp_get_theme()->get('Version')
    );
}
add_action('enqueue_block_editor_assets', 'sws2025_block_editor_only');

/**
 * Enqueue interactive component scripts
 * 
 * Loads JavaScript for custom interactive components like
 * image mapper and parallax effects.
 *
 * @since sws2025 1.0
 * @return void
 */
function sws2025_enqueue_scripts()
{
    $theme_version = wp_get_theme()->get('Version');

    // GSAP Animation Library
    wp_enqueue_script(
        'gsap',
        'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js',
        [],
        '3.13.0',
        true
    );

    // Interactive image mapper functionality
    wp_enqueue_script(
        'image-mapper-frontend',
        get_template_directory_uri() . '/assets/js/image-mapper.js',
        [],
        $theme_version,
        true
    );

    // Landscape parallax effects
    // wp_enqueue_script(
    //     'landscape-parallax-frontend',
    //     get_template_directory_uri() . '/assets/js/landscape-parallax.js',
    //     [],
    //     $theme_version,
    //     true
    // );

    // Appear Animations
    wp_enqueue_script(
        'appear-frontend',
        get_template_directory_uri() . '/assets/js/appear.js',
        [],
        $theme_version,
        true
    );

    // Statistics Animations
    wp_enqueue_script(
        'statistics-frontend',
        get_template_directory_uri() . '/assets/js/statistics.js',
        [],
        $theme_version,
        true
    );

    // Accordion Animations
    wp_enqueue_script(
        'accordion-frontend',
        get_template_directory_uri() . '/assets/js/accordion.js',
        [],
        $theme_version,
        true
    );

    // Tabs Animations
    wp_enqueue_script(
        'tabs-frontend',
        get_template_directory_uri() . '/assets/js/tabs.js',
        [],
        $theme_version,
        true
    );
}
add_action('wp_enqueue_scripts', 'sws2025_enqueue_scripts');

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
function sws2025_add_svg_support($mimes)
{
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}
add_filter('upload_mimes', 'sws2025_add_svg_support');

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
function sws2025_fix_svg_display($response, $attachment, $meta)
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
add_filter('wp_prepare_attachment_for_js', 'sws2025_fix_svg_display', 10, 3);

/**
 * =========================================================================
 * THEME CONSTANTS & HELPERS
 * =========================================================================
 */

/**
 * Define theme constants for consistent file paths and URLs
 */
if (!defined('SWS2025_THEME_VERSION')) {
    define('SWS2025_THEME_VERSION', wp_get_theme()->get('Version'));
}

if (!defined('SWS2025_THEME_PATH')) {
    define('SWS2025_THEME_PATH', get_template_directory());
}

if (!defined('SWS2025_THEME_URL')) {
    define('SWS2025_THEME_URL', get_template_directory_uri());
}

add_action('init', function () {
    if (isset($_GET['trigger_embeddings'])) {
        $kb = new Enhanced_WP_Knowledge_Base();
        $kb->process_embedding_batch(0);
        die('Embeddings triggered');
    }
});

add_action('init', function () {
    if (isset($_GET['kb_cron_test']) && current_user_can('manage_options')) {
        $kb = new Enhanced_WP_Knowledge_Base();
        $kb->process_atlassian_batch(0, true);
        die('Cron manually triggered');
    }
});
