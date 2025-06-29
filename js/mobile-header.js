/**
 * Mobile Header Scroll Behavior with Dynamic Content Positioning
 * Hides navigation and social icons on scroll down, shows on scroll up
 * Keeps the main name/title visible at all times
 * Dynamically adjusts headline position to avoid header overlap
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
    
    // Calculate and set headline top position (mobile only)
    function adjustHeadlinePosition() {
        const header = document.getElementById('header');
        const headline = document.getElementsByClassName('top')[0];
        
        if (!header || !headline) return;
        
        // Only adjust position on mobile devices
        if (!isMobileDevice()) {
            headline.style.marginTop = '';
            return;
        }
        
        // Get the actual height of the header
        const headerHeight = header.offsetHeight;
        
        // Set the headline to start right after the header
        headline.style.marginTop = `${headerHeight}px`;
        // headline.style.paddingTop = `50px`;
    }
    
    // Initialize header behavior
    function initMobileHeader() {
        const header = document.getElementById('header');
        if (!header) return;
        
        let lastScrollTop = 0;
        let ticking = false;
        
        // Set initial headline position (mobile only)
        if (isMobileDevice()) {
            adjustHeadlinePosition();
        }
        
        function updateHeader() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollDelta = scrollTop - lastScrollTop;
            
            // Only hide/show if we've scrolled a meaningful amount
            if (Math.abs(scrollDelta) < SCROLL_THRESHOLD) {
                ticking = false;
                return;
            }
            
            let headerStateChanged = false;
            
            if (scrollDelta > 0 && scrollTop > COMPACT_AFTER_SCROLL) {
                // Scrolling down & past initial scroll threshold
                if (!header.classList.contains('header-compact')) {
                    header.classList.add('header-compact');
                    headerStateChanged = true;
                }
            } else if (scrollDelta < 0) {
                // Scrolling up
                if (header.classList.contains('header-compact')) {
                    header.classList.remove('header-compact');
                    headerStateChanged = true;
                }
            }
            
            // Adjust headline position if header state changed (mobile only)
            if (headerStateChanged && isMobileDevice()) {
                // Use setTimeout to ensure CSS transitions complete before measuring
                setTimeout(adjustHeadlinePosition, 50);
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
                // Reset headline positioning for desktop
                const headline = document.getElementsByClassName("top")[0];
                if (headline) {
                    headline.style.paddingTop = '';
                }
            } else {
                // Recalculate for mobile after resize
                setTimeout(adjustHeadlinePosition, 100);
            }
        });
        
        // Also adjust on orientation change for mobile devices
        window.addEventListener('orientationchange', function() {
            if (isMobileDevice()) {
                setTimeout(adjustHeadlinePosition, 200);
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