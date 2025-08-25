<?php

function sws2025_pattern_categories()
{
    register_block_pattern_category('sws2025_page', [
        'label' => __('SWS Layout', 'sws2025'),
    ]);
}
add_action('init', 'sws2025_pattern_categories');
