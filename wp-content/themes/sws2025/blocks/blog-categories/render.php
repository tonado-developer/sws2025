<?php
// Render Callback
function sws2025_render_blog_categories($attributes)
{
    $section_bg = $attributes['sectionBackground'] ?? 'none';
    $card_bg = $attributes['cardBackground'] ?? 'none';

    $categories = get_categories(['hide_empty' => true]);
    $posts = get_posts([
        'post_type' => 'post',
        'posts_per_page' => -1,
        'orderby' => 'date',
        'order' => 'DESC'
    ]);
    ob_start();
?>
    <section class="blog-categories-block bg-<?php echo esc_attr($section_bg); ?> card-<?php echo esc_attr($card_bg); ?>" data-block="blog-categories">
        <container>

            <div class="categories-filter wp-block-buttons is-layout-flex wp-block-buttons-is-layout-flex" role="navigation" aria-label="Kategorie-Filter">
                <div class="wp-block-button">
                    <a class="wp-block-button__link wp-element-button category-btn active" data-category="all">Alle</a>
                </div>
                <?php foreach ($categories as $cat): ?>
                    <div class="wp-block-button">
                        <a class="wp-block-button__link wp-element-button category-btn" data-category="<?php echo esc_attr($cat->term_id); ?>">
                            <?php echo esc_html($cat->name); ?>
                            <span class="count">(<?php echo $cat->count; ?>)</span>
                        </a>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="posts-grid" data-posts-container>
                <?php foreach ($posts as $post):
                    $post_categories = wp_get_post_categories($post->ID);
                    $cats_string = implode(',', $post_categories);
                ?>
                    <article class="post-card bg-light is_rounded" data-categories="<?php echo esc_attr($cats_string); ?>">
                        <?php if (has_post_thumbnail($post->ID)): ?>
                            <div class="post-thumbnail">
                                <?php echo get_the_post_thumbnail($post->ID, 'medium'); ?>
                            </div>
                        <?php endif; ?>

                        <div class="post-content">
                            <div class="post-meta">
                                <?php
                                $cats = get_the_category($post->ID);
                                if ($cats): ?>
                                    <span class="post-categories">
                                        <?php foreach ($cats as $cat): ?>
                                            <span class="category-badge"><?php echo esc_html($cat->name); ?></span>
                                        <?php endforeach; ?>
                                    </span>
                                <?php endif; ?>
                                <time datetime="<?php echo get_the_date('c', $post->ID); ?>">
                                    <?php echo get_the_date('', $post->ID); ?>
                                </time>
                            </div>

                            <h3 class="post-title">
                                <a href="<?php echo get_permalink($post->ID); ?>">
                                    <?php echo get_the_title($post->ID); ?>
                                </a>
                            </h3>

                            <div class="post-excerpt">
                                <?php echo wp_trim_words(get_the_excerpt($post->ID), 20); ?>
                            </div>

                            <a href="<?php echo get_permalink($post->ID); ?>" class="read-more">
                                Weiterlesen →
                            </a>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>

            <div class="no-results" style="display: none;">
                <p>Keine Beiträge in dieser Kategorie gefunden.</p>
            </div>

        </container>
    </section>
<?php
    return ob_get_clean();
}
