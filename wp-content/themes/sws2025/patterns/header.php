<?php

/**
 * Title: Header
 * Slug: CUSTOM_BLOCK_CATEGORY/header
 * Categories: CUSTOM_BLOCK_CATEGORY_page
 * Block Types: core/template-part/header
 */
?>
<!-- wp:html -->
<div class="whitepanel full"></div>
<div class="whitepanel small"></div>
<div class="whitepanel image"></div>
<!-- <img class="whitepanel image" src="<?php echo get_template_directory_uri(); ?>/assets/img/headerTransition.webp" alt=""> -->
<svg style="position: absolute; width: 0; height: 0;">
    <clipPath id="headerTransition" clipPathUnits="objectBoundingBox">
        <path d="M0.5,0.5 C0.670,0.216 0.868,0.001 1,0 C1.132,-0.001 0,0 0,0 L0,1 C0.157,1 0.309,0.819 0.5,0.5 Z" />
    </clipPath>
    <clipPath id="headerTransitionReverse" clipPathUnits="objectBoundingBox">
        <path d="M0.5,0.5 C0.330,0.784 0.132,0.999 0,1 C-0.132,1.001 1,1 1,1 L1,0 C0.843,0 0.691,0.181 0.5,0.5 Z" />
    </clipPath>
</svg>
<!-- /wp:html -->

<!-- wp:site-logo {"width":220,"className":"logo"} /-->

<!-- wp:navigation {"overlayMenu":"always","icon":"menu","layout":{"type":"flex","justifyContent":"right"}} /-->