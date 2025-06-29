/**
 * Mobile Header Scroll Behavior
 * Hides navigation and social icons on scroll down, shows on scroll up
 * Keeps the main name/title visible at all times
 */
(function() {
    'use strict';
    
    // Configuration
    const MOBILE_BREAKPOINT = 1080;
    const SCROLL_THRESHOLD = 10;
    const COMPACT_AFTER_SCROLL = 100;
    
    // Check if mobile device
    function isMobileDevice() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }
    
    // Initialize header behavior
    function initMobileHeader() {
        if (!isMobileDevice()) return;
        
        const header = document.getElementById('header');
        if (!header) return;
        
        let lastScrollTop = 0;
        let ticking = false;
        
        function updateHeader() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollDelta = scrollTop - lastScrollTop;
            
            // Only hide/show if we've scrolled a meaningful amount
            if (Math.abs(scrollDelta) < SCROLL_THRESHOLD) {
                ticking = false;
                return;
            }
            
            if (scrollDelta > 0 && scrollTop > COMPACT_AFTER_SCROLL) {
                // Scrolling down & past initial scroll threshold
                header.classList.add('header-compact');
            } else if (scrollDelta < 0) {
                // Scrolling up
                header.classList.remove('header-compact');
            }
            
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            ticking = false;
        }
        
        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        }
        
        // Event listeners
        window.addEventListener('scroll', requestTick, { passive: true });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (!isMobileDevice()) {
                header.classList.remove('header-compact');
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileHeader);
    } else {
        initMobileHeader();
    }
})();