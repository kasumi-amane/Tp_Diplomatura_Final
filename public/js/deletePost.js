
    document.addEventListener('DOMContentLoaded', function() {
        // Attach click event to delete buttons
        var deleteButtons = document.querySelectorAll('.posts_day_post_btn');
        
        deleteButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                var postId = this.getAttribute('data-post-id');
                var dayIndex = this.getAttribute('data-day-index');
                
                // Make AJAX request to delete-post endpoint
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/delete-post', true);
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                
                xhr.onload = function() {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // Handle success, e.g., remove the deleted post from the UI
                        var deletedPost = document.querySelector(`.posts_day_post_btn[data-post-id="${postId}"][data-day-index="${dayIndex}"]`);
                        if (deletedPost) {
                            deletedPost.closest('.swiper-slide').remove();
                        }
                    } else {
                        console.error('Error deleting post:', xhr.statusText);
                        // Handle error if needed
                    }
                };
                
                xhr.onerror = function() {
                    console.error('Request failed');
                    // Handle error if needed
                };
                
                xhr.send(JSON.stringify({ postId: postId, dayIndex: dayIndex }));
            });
        });
    });