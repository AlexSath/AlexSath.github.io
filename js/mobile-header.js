/**
 * Mobile Header Collapse System
 * Provides smooth header transitions with no content jumping
 * Optimized for performance and user experience
 */

class MobileHeaderController {
    constructor() {
        this.header = document.getElementById('header');
        this.body = document.body;
        
        // State management
        this.isCollapsed = false;
        this.isTransitioning = false;
        this.lastScrollY = 0;
        this.scrollDirection = 0;
        
        // Thresholds
        this.collapseThreshold = 50; // pixels scrolled down to collapse
        this.expandThreshold = window.innerHeight * 0.5; // 1/2 screen height
        
        // Timing and easing
        this.transitionDuration = 300; // milliseconds
        this.debounceDelay = 16; // ~60fps
        this.transitionTimeout = null; // Store timeout reference
        
        // Store original header height for calculations
        this.originalHeaderHeight = 0;
        this.collapsedHeaderHeight = 0;
        
        // Bind methods
        this.handleScroll = this.debounce(this.handleScroll.bind(this), this.debounceDelay);
        this.handleResize = this.debounce(this.handleResize.bind(this), 100);
        
        this.init();
    }
    
    init() {
        // Only activate on mobile devices
        if (!this.isMobile()) {
            return;
        }
        
        this.measureHeaderHeights();
        this.setupScrollListener();
        this.setupResizeListener();
        this.initializeBodyPadding();
        
        // Setup CSS transitions
        this.setupTransitions();
    }
    
    isMobile() {
        return window.innerWidth <= 1080; // Based on $desktop-breakpoint from SCSS
    }
    
    measureHeaderHeights() {
        // Temporarily ensure header is expanded to measure
        this.header.classList.remove('header-compact');
        this.originalHeaderHeight = this.header.offsetHeight;
        
        // Measure collapsed height
        this.header.classList.add('header-compact');
        this.collapsedHeaderHeight = this.header.offsetHeight;
        
        // Reset to expanded state initially
        this.header.classList.remove('header-compact');
    }
    
    setupTransitions() {
        // Add smooth transitions for header
        this.header.style.transition = `padding ${this.transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
        
        // Add smooth transitions for body padding
        this.body.style.transition = `padding-top ${this.transitionDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
    }
    
    initializeBodyPadding() {
        // Set initial body padding to account for fixed header
        this.body.style.paddingTop = `${this.originalHeaderHeight}px`;
    }
    
    setupScrollListener() {
        let ticking = false;
        
        const scrollHandler = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', scrollHandler, { passive: true });
    }
    
    setupResizeListener() {
        window.addEventListener('resize', this.handleResize);
    }
    
    handleResize() {
        if (!this.isMobile()) {
            this.cleanup();
            return;
        }
        
        // Recalculate heights on resize
        this.measureHeaderHeights();
        this.updateBodyPadding();
    }
    
    handleScroll() {
        const currentScrollY = window.pageYOffset;
        const scrollDelta = currentScrollY - this.lastScrollY;
        
        // Always update scroll direction and position, even during transitions
        if (Math.abs(scrollDelta) > 1) { // Ignore tiny movements
            if (scrollDelta > 0) {
                this.scrollDirection = 1; // scrolling down
            } else if (scrollDelta < 0) {
                this.scrollDirection = -1; // scrolling up
            }
        }
        
        this.lastScrollY = currentScrollY;
        
        // During transitions, only allow state changes that make sense with current momentum
        if (this.isTransitioning) {
            // If we're transitioning to collapsed but user is now scrolling up significantly,
            // allow expansion to override
            if (this.isCollapsed && this.scrollDirection < 0 && 
                (currentScrollY <= this.collapseThreshold || 
                 Math.abs(scrollDelta) > 20)) {
                this.forceExpand(currentScrollY);
            }
            // If we're transitioning to expanded but user continues scrolling down,
            // allow collapse to override
            else if (!this.isCollapsed && this.scrollDirection > 0 && 
                     currentScrollY > this.collapseThreshold && 
                     Math.abs(scrollDelta) > 10) {
                this.forceCollapse(currentScrollY);
            }
            return;
        }
        
        // Normal decision logic when not transitioning
        if (this.shouldCollapse(currentScrollY)) {
            this.collapseHeader();
        } else if (this.shouldExpand(currentScrollY)) {
            this.expandHeader();
        }
    }
    
    shouldCollapse(scrollY) {
        return !this.isCollapsed && 
               this.scrollDirection > 0 && 
               scrollY > this.collapseThreshold;
    }
    
    shouldExpand(scrollY) {
        if (!this.isCollapsed) return false;
        
        // More strict expansion criteria to prevent premature expansion
        const isNearTop = scrollY <= this.collapseThreshold;
        const hasScrolledUpSignificantly = this.scrollDirection < 0 && 
                                          this.lastScrollY < (this.expandThreshold * 0.8);
        
        return isNearTop || hasScrolledUpSignificantly;
    }
    
    // Force methods for overriding transitions
    forceCollapse(scrollY) {
        if (this.isCollapsed) return;
        
        // Clear any existing transition timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.isTransitioning = false; // Reset transition state
        this.collapseHeader();
    }
    
    forceExpand(scrollY) {
        if (!this.isCollapsed) return;
        
        // Clear any existing transition timeout
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.isTransitioning = false; // Reset transition state
        this.expandHeader();
    }
    
    collapseHeader() {
        if (this.isCollapsed || this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.isCollapsed = true;
        
        // Add compact class for header styling
        this.header.classList.add('header-compact');
        
        // Update body padding to prevent content jump
        this.updateBodyPadding();
        
        // Store timeout reference for potential cancellation
        this.transitionTimeout = setTimeout(() => {
            this.isTransitioning = false;
            this.transitionTimeout = null;
        }, this.transitionDuration);
    }
    
    expandHeader() {
        if (!this.isCollapsed || this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.isCollapsed = false;
        
        // Remove compact class for header styling
        this.header.classList.remove('header-compact');
        
        // Update body padding to prevent content jump
        this.updateBodyPadding();
        
        // Store timeout reference for potential cancellation
        this.transitionTimeout = setTimeout(() => {
            this.isTransitioning = false;
            this.transitionTimeout = null;
        }, this.transitionDuration);
    }
    
    updateBodyPadding() {
        const targetHeight = this.isCollapsed ? this.collapsedHeaderHeight : this.originalHeaderHeight;
        this.body.style.paddingTop = `${targetHeight}px`;
    }
    
    cleanup() {
        // Remove mobile-specific styles and behaviors
        this.header.classList.remove('header-compact');
        this.header.style.transition = '';
        this.body.style.transition = '';
        this.body.style.paddingTop = '';
    }
    
    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new MobileHeaderController();
});

// Handle page visibility changes (for mobile browsers that pause JS)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Re-initialize if necessary when page becomes visible
        const controller = new MobileHeaderController();
    }
});