/**
 * Mobile Header Scroll Behavior with Dynamic Content Positioning
 * Hides navigation and social icons on scroll down, shows on scroll up
 * Keeps the main name/title visible at all times
 * Dynamically adjusts headline position to avoid header overlap
 * Fixed: Prevents content jumping and header jittering
 */
(function() {
    'use strict';
    
    // Configuration
    const MOBILE_BREAKPOINT = 1080;
    const SCROLL_THRESHOLD = 20; // Increased threshold to reduce jittering
    const COMPACT_AFTER_SCROLL = 100;
    const DEBOUNCE_DELAY = 16; // ~60fps
    const TRANSITION_COOLDOWN = 500; // Prevent state changes for 500ms after transition
    const HYSTERESIS_BUFFER = 100; // Different thresholds for up/down to prevent oscillation
    
    // State tracking
    let lastScrollTop = 0;
    let ticking = false;
    let isTransitioning = false;
    let lastTransitionTime = 0;
    let headerHeightCache = { expanded: null, compact: null };
    let scrollDirection = 0; // -1 for up, 1 for down, 0 for none
    
    // Check if mobile device
    function isMobileDevice() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }
    
    // Cache header heights for smooth transitions
    function cacheHeaderHeights() {
        const header = document.getElementById('header');
        if (!header || !isMobileDevice()) return;
        
        // Get expanded height
        header.classList.remove('header-compact');
        headerHeightCache.expanded = header.offsetHeight;
        
        // Get compact height
        header.classList.add('header-compact');
        headerHeightCache.compact = header.offsetHeight;
        
        // Reset to current state
        header.classList.remove('header-compact');
    }
    
    // Smooth content adjustment to prevent jumping
    function adjustContentPosition(newHeaderHeight, oldHeaderHeight, isExpanding = false) {
        const headline = document.getElementsByClassName('top')[0];
        if (!headline || !isMobileDevice()) return;
        
        const heightDiff = newHeaderHeight - oldHeaderHeight;
        
        // Adjust scroll position to compensate for header height change
        if (heightDiff !== 0) {
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (isExpanding && heightDiff > 0) {
                // When expanding (header getting taller), we need to scroll down 
                // to compensate so the content stays in the same visual position
                if (currentScrollTop > 0) {
                    window.scrollTo(0, currentScrollTop + heightDiff);
                }
            } else if (!isExpanding && heightDiff < 0) {
                // When compacting (header getting shorter), we need to scroll up
                // to keep content in the same visual position
                window.scrollTo(0, Math.max(0, currentScrollTop + heightDiff));
            }
        }
        
        // Set headline margin
        headline.style.marginTop = `${newHeaderHeight}px`;
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
    }
    
    // Initialize header behavior
    function initMobileHeader() {
        const header = document.getElementById('header');
        if (!header) return;
        
        // Cache header heights on mobile
        if (isMobileDevice()) {
            cacheHeaderHeights();
            adjustHeadlinePosition();
        }
        
        function updateHeader() {
            if (!isMobileDevice()) {
                ticking = false;
                return;
            }
            
            const now = Date.now();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollDelta = scrollTop - lastScrollTop;
            
            // Determine scroll direction
            if (Math.abs(scrollDelta) >= SCROLL_THRESHOLD) {
                scrollDirection = scrollDelta > 0 ? 1 : -1;
            }
            
            // Skip if we're in cooldown period after a recent transition
            if (now - lastTransitionTime < TRANSITION_COOLDOWN) {
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
                ticking = false;
                return;
            }
            
            // Skip if we haven't scrolled enough
            if (Math.abs(scrollDelta) < SCROLL_THRESHOLD) {
                ticking = false;
                return;
            }
            
            const isCurrentlyCompact = header.classList.contains('header-compact');
            let shouldBeCompact = isCurrentlyCompact; // Default to current state
            
            // Use hysteresis and direction-based logic to prevent oscillation
            if (scrollDirection > 0) {
                // Scrolling down - compact if past threshold
                if (scrollTop > COMPACT_AFTER_SCROLL + HYSTERESIS_BUFFER) {
                    shouldBeCompact = true;
                }
            } else if (scrollDirection < 0) {
                // Scrolling up - always expand (show menu) regardless of position
                // This allows users to access menu by scrolling up from anywhere
                shouldBeCompact = false;
            }
            
            // Only change state if it's actually different and we have a clear direction
            if (isCurrentlyCompact !== shouldBeCompact && Math.abs(scrollDelta) >= SCROLL_THRESHOLD) {
                lastTransitionTime = now;
                isTransitioning = true;
                
                const oldHeight = header.offsetHeight;
                const newHeight = shouldBeCompact ? 
                    headerHeightCache.compact : 
                    headerHeightCache.expanded;
                
                const isExpanding = !shouldBeCompact; // expanding when going from compact to expanded
                
                // Apply the class change
                if (shouldBeCompact) {
                    header.classList.add('header-compact');
                } else {
                    header.classList.remove('header-compact');
                }
                
                // Smooth content adjustment with expansion awareness
                adjustContentPosition(newHeight, oldHeight, isExpanding);
                
                // Reset transition flag after animation completes
                setTimeout(() => {
                    isTransitioning = false;
                }, 300); // Match CSS transition duration
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
        
        // Debounced scroll handler
        let scrollTimer;
        function handleScroll() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(requestTick, DEBOUNCE_DELAY);
        }
        
        // Event listeners
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            // Clear any ongoing transitions and reset timers
            isTransitioning = false;
            lastTransitionTime = 0;
            scrollDirection = 0;
            
            if (!isMobileDevice()) {
                header.classList.remove('header-compact');
                // Reset headline positioning for desktop
                const headline = document.getElementsByClassName("top")[0];
                if (headline) {
                    headline.style.marginTop = '';
                }
            } else {
                // Recache heights and recalculate for mobile after resize
                setTimeout(() => {
                    cacheHeaderHeights();
                    adjustHeadlinePosition();
                }, 100);
            }
        });
        
        // Also adjust on orientation change for mobile devices
        window.addEventListener('orientationchange', function() {
            if (isMobileDevice()) {
                isTransitioning = false;
                lastTransitionTime = 0;
                scrollDirection = 0;
                setTimeout(() => {
                    cacheHeaderHeights();
                    adjustHeadlinePosition();
                }, 200);
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