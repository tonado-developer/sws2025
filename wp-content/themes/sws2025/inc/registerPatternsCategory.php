<?php

function pattern_categories()
{
    register_block_pattern_category('CUSTOM_BLOCK_CATEGORY_page', [
        'label' => __('Custom Layout', CUSTOM_BLOCK_CATEGORY),
    ]);
}
add_action('init', 'pattern_categories');
