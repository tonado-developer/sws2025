// frontend.js
document.addEventListener('DOMContentLoaded', () => {
    const blocks = document.querySelectorAll('[data-block="blog-categories"]');
    
    blocks.forEach(block => {
        const buttons = block.querySelectorAll('.category-btn');
        const posts = block.querySelectorAll('.post-card');
        const noResults = block.querySelector('.no-results');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                
                // Update active button
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter posts
                let visibleCount = 0;
                
                posts.forEach(post => {
                    const postCats = post.dataset.categories.split(',');
                    
                    if (category === 'all' || postCats.includes(category)) {
                        post.style.display = '';
                        post.classList.add('fade-in');
                        visibleCount++;
                    } else {
                        post.style.display = 'none';
                        post.classList.remove('fade-in');
                    }
                });
                
                // Show/hide no results message
                noResults.style.display = visibleCount === 0 ? 'block' : 'none';
            });
        });
    });
});