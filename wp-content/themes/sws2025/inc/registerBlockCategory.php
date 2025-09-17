<?php
function register_block_categories($categories)
{
    return array_merge(
        array(
            array(
                'slug'  => 'custom-blocks',
                'title' => __('Geiler Scheiß', 'text-domain'),
                'icon'  => 'dashicons-desktop',
            ),
        ),
        $categories
    );
}
add_filter('block_categories_all', 'register_block_categories', 10, 1);
