<?php

/**
 * SWS Funcitons and definitions
 *
 * @package WordPress
 * @subpackage sws2025
 * @since sws2025 1.0
 */

// Enqueues style.css on the front.
if (! function_exists('sws2025_enqueue_styles')) :
    /**
     * Enqueues style.css on the front.
     *
     * @since sws2025 1.0
     *
     * @return void
     */
    function sws2025_enqueue_styles()
    {
        wp_enqueue_style(
            'sws2025-style',
            get_parent_theme_file_uri('assets/css/main.css'),
            array(),
            wp_get_theme()->get('Version')
        );
    }
endif;
add_action('wp_enqueue_scripts', 'sws2025_enqueue_styles');

add_filter('qm/dispatchers', function ($dispatchers) {
    if (isset($dispatchers['html'])) {
        add_filter('qm/output/buffer', function ($buffer) {
            return str_replace('Zend OPcache can\'t be temporary enabled', '', $buffer);
        });
    }
    return $dispatchers;
});
// Registers pattern categories.
if (! function_exists('sws2025_pattern_categories')) :
    /**
     * Registers pattern categories.
     *
     * @since sws2025 1.0
     *
     * @return void
     */
    function sws2025_pattern_categories()
    {

        register_block_pattern_category(
            'sws2025_page',
            array(
                'label'       => __('Layout', 'sws2025'),
                'description' => __('A collection of full page layouts.', 'sws2025'),
            )
        );
    }
endif;
add_action('init', 'sws2025_pattern_categories');
