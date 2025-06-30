/**
 * Mobile Header Collapse System - Enhanced with Visual Viewport API
 * Handles mobile-specific scroll behaviors and momentum scrolling
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
        this.lastScrollTime = 0;
        
        // Mobile-specific tracking
        this.touchStartY = 0;
        this.isTouching = false;
        this.momentumScrolling = false;
        this.scrollVelocity = 0;
        this.velocityHistory = [];
        
        // Bounce prevention
        this.isOverscrolling = false;
        this.overscrollStartY = 0;
        this.bottomDeadZone = 200; // Increased dead zone at bottom
        
        // Thresholds
        this.collapseThreshold = 50;
        this.expandThreshold = window.innerHeight * 0.5;
        
        // Mobile-optimized timing
        this.transitionDuration = 250;
        this.debounceDelay = 8;
        this.velocityDecayTime = 150;
        
        // Store heights
        this.originalHeaderHeight = 0;
        this.collapsedHeaderHeight = 0;
        this.transitionTimeout = null;
        
        // Visual Viewport support
        this.supportsVisualViewport = 'visualViewport' in window;
        
        // Bind methods
        this.handleScroll = this.throttle(this.handleScroll.bind(this), this.debounceDelay);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleResize = this.debounce(this.handleResize.bind(this), 100);
        this.handleVisualViewportChange = this.handleVisualViewportChange.bind(this);
        
        this.init();
    }
    
    init() {
        if (!this.isMobile()) {
            return;
        }
        
        this.measureHeaderHeights();
        this.setupEventListeners();
        this.initializeBodyPadding();
        this.setupTransitions();
        
        // Initialize scroll position
        this.lastScrollY = this.getScrollY();
        this.lastScrollTime = performance.now();
    }
    
    isMobile() {
        return window.innerWidth <= 1080;
    }
    
    // Enhanced scroll position getter using Visual Viewport API
    getScrollY() {
        if (this.supportsVisualViewport) {
            return window.visualViewport.pageTop;
        }
        return window.pageYOffset; // || document.documentElement.scrollTop;
    }
    
    // Enhanced viewport height getter
    getViewportHeight() {
        if (this.supportsVisualViewport) {
            return window.visualViewport.height;
        }
        return window.innerHeight;
    }
    
    // More accurate document height calculation
    getDocumentHeight() {
        // Use multiple methods and take the maximum
        return Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.clientHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
        );
    }
    
    measureHeaderHeights() {
        this.header.classList.remove('header-compact');
        this.originalHeaderHeight = this.header.offsetHeight;
        
        this.header.classList.add('header-compact');
        this.collapsedHeaderHeight = this.header.offsetHeight;
        
        this.header.classList.remove('header-compact');
    }
    
    setupTransitions() {
        const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.header.style.transition = `padding ${this.transitionDuration}ms ${easing}`;
        this.body.style.transition = `padding-top ${this.transitionDuration}ms ${easing}`;
    }
    
    initializeBodyPadding() {
        this.body.style.paddingTop = `${this.originalHeaderHeight}px`;
    }
    
    setupEventListeners() {
        // Scroll events with passive listening
        window.addEventListener('scroll', this.handleScroll, { passive: true });
        
        // Touch events for mobile-specific behavior
        document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        
        // Resize handling
        window.addEventListener('resize', this.handleResize);
        
        // Visual Viewport API events
        if (this.supportsVisualViewport) {
            window.visualViewport.addEventListener('resize', this.handleVisualViewportChange);
            window.visualViewport.addEventListener('scroll', this.handleVisualViewportChange);
        }
        
        // Handle momentum scrolling end
        if ('onscrollend' in window) {
            window.addEventListener('scrollend', () => {
                this.momentumScrolling = false;
                this.velocityHistory = [];
                this.isOverscrolling = false;
            }, { passive: true });
        }
    }
    
    handleVisualViewportChange() {
        // Visual viewport changes can affect our calculations
        // Update threshold if needed
        this.expandThreshold = this.getViewportHeight() * 0.5;
    }
    
    // Enhanced boundary detection with tolerance
    isNearBottom() {
        const scrollY = this.getScrollY();
        const viewportHeight = this.getViewportHeight();
        const documentHeight = this.getDocumentHeight();
        
        // Calculate distance from bottom with tolerance
        const distanceFromBottom = documentHeight - (scrollY + viewportHeight);
        
        // Use larger tolerance for mobile due to rounding issues
        return distanceFromBottom < this.bottomDeadZone;
    }
    
    isNearTop() {
        return this.getScrollY() < 50;
    }
    
    isAtBoundary() {
        return this.isNearTop() || this.isNearBottom();
    }
    
    // Check if we're in the bottom dead zone where header should not change
    isInBottomDeadZone() {
        const scrollY = this.getScrollY();
        const viewportHeight = this.getViewportHeight();
        const documentHeight = this.getDocumentHeight();
        const distanceFromBottom = documentHeight - (scrollY + viewportHeight);
        
        // Dead zone is active when very close to bottom
        // console.log(distanceFromBottom)
        return distanceFromBottom < this.bottomDeadZone;
    }
    
    handleTouchStart(e) {
        this.isTouching = true;
        this.momentumScrolling = false;
        this.touchStartY = e.touches[0].clientY;
        this.velocityHistory = [];
        this.isOverscrolling = false;
        this.overscrollStartY = this.getScrollY();
        console.log("touch start")
    }
    
    handleTouchMove(e) {
        if (!this.isTouching) return;
        
        const currentY = e.touches[0].clientY;
        const currentScrollY = this.getScrollY();
        
        // Detect overscroll conditions
        if ((this.isNearTop() && currentY > this.touchStartY) ||
            (this.isNearBottom() && currentY < this.touchStartY)) {
            this.isOverscrolling = true;
        }
    }
    
    handleTouchEnd(e) {
        this.isTouching = false;
        
        // Detect if momentum scrolling will occur
        setTimeout(() => {
            if (Math.abs(this.scrollVelocity) > 0.5 && !this.isOverscrolling) {
                this.momentumScrolling = true;
            }
        }, 50);
        
        // Reset overscroll flag after a delay
        setTimeout(() => {
            this.isOverscrolling = false;
        }, 300);
        console.log("touch end")
    }
    
    calculateVelocity(currentScrollY, currentTime) {
        const timeDelta = currentTime - this.lastScrollTime;
        const scrollDelta = currentScrollY - this.lastScrollY;
        
        if (timeDelta > 0) {
            const velocity = scrollDelta / timeDelta;
            
            // Keep velocity history for smoothing
            this.velocityHistory.push({
                velocity: velocity,
                time: currentTime
            });
            
            // Clean old velocity data
            this.velocityHistory = this.velocityHistory.filter(
                v => currentTime - v.time < this.velocityDecayTime
            );
            
            // Calculate average velocity
            if (this.velocityHistory.length > 0) {
                this.scrollVelocity = this.velocityHistory.reduce((sum, v) => sum + v.velocity, 0) 
                                   / this.velocityHistory.length;
            }
        }
    }
    
    handleScroll() {
        const currentScrollY = this.getScrollY();
        const currentTime = performance.now();
        
        // CRITICAL: Skip all processing if we're in the bottom dead zone
        if (this.isInBottomDeadZone()) {
            this.lastScrollY = currentScrollY;
            this.lastScrollTime = currentTime;
            console.log("in deadzone")
            return;
        }
        
        // Calculate velocity for mobile momentum detection
        this.calculateVelocity(currentScrollY, currentTime);
        
        const scrollDelta = currentScrollY - this.lastScrollY;
        
        // Skip processing during overscroll bounce
        if (this.isOverscrolling) {
            this.lastScrollY = currentScrollY;
            this.lastScrollTime = currentTime;
            return;
        }
        
        // Update scroll direction with mobile-specific logic
        if (Math.abs(scrollDelta) > 0.5) {
            if (scrollDelta > 0) {
                this.scrollDirection = 1;
            } else if (scrollDelta < 0) {
                this.scrollDirection = -1;
            }
        }
        
        // Mobile-specific transition override logic
        if (this.isTransitioning) {
            const velocityThreshold = this.momentumScrolling ? 0.3 : 0.8;
            
            if (this.isCollapsed && this.scrollDirection < 0 && 
                (currentScrollY <= this.collapseThreshold || 
                 (this.scrollVelocity < -velocityThreshold && !this.isTouching))) {
                this.forceExpand();
            }
            else if (!this.isCollapsed && this.scrollDirection > 0 && 
                     currentScrollY > this.collapseThreshold && 
                     (scrollDelta > 8 || this.scrollVelocity > velocityThreshold)) {
                this.forceCollapse();
            }
            
            this.lastScrollY = currentScrollY;
            this.lastScrollTime = currentTime;
            return;
        }
        
        // Normal decision logic with mobile optimizations
        if (this.shouldCollapse(currentScrollY, scrollDelta)) {
            this.collapseHeader();
        } else if (this.shouldExpand(currentScrollY, scrollDelta)) {
            this.expandHeader();
        }
        
        this.lastScrollY = currentScrollY;
        this.lastScrollTime = currentTime;
    }
    
    shouldCollapse(scrollY, scrollDelta) {
        if (this.isCollapsed || this.isInBottomDeadZone()) return false;
        
        const minScrollDelta = this.momentumScrolling ? 3 : 5;
        
        return this.scrollDirection > 0 && 
               scrollY > this.collapseThreshold &&
               scrollDelta > minScrollDelta;
    }
    
    shouldExpand(scrollY, scrollDelta) {
        if (!this.isCollapsed || this.isInBottomDeadZone()) return false;
        
        const isNearTop = scrollY < this.collapseThreshold;
        const hasScrolledUpSignificantly = Math.abs(this.lastScrollY - scrollY) > this.expandThreshold;
        const hasUpwardVelocity = this.scrollVelocity < -0.2;
        
        return this.scrollDirection < 0 && 
               (isNearTop || (hasScrolledUpSignificantly && hasUpwardVelocity && !this.isOverscrolling));
    }
    
    forceCollapse() {
        if (this.isCollapsed || this.isInBottomDeadZone()) return;
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.isTransitioning = false;
        this.collapseHeader();
    }
    
    forceExpand() {
        if (!this.isCollapsed || this.isInBottomDeadZone()) return;
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.isTransitioning = false;
        console.log("Force expansion")
        this.expandHeader();
    }
    
    collapseHeader() {
        if (this.isCollapsed || this.isTransitioning || this.isInBottomDeadZone()) return;
        
        this.isTransitioning = true;
        this.isCollapsed = true;
        
        this.header.classList.add('header-compact');
        this.updateBodyPadding();
        
        this.transitionTimeout = setTimeout(() => {
            this.isTransitioning = false;
            this.transitionTimeout = null;
        }, this.transitionDuration);
    }
    
    expandHeader() {
        if (!this.isCollapsed || this.isTransitioning || this.isInBottomDeadZone()) return;
        
        this.isTransitioning = true;
        this.isCollapsed = false;
        
        this.header.classList.remove('header-compact');
        this.updateBodyPadding();
        
        this.transitionTimeout = setTimeout(() => {
            this.isTransitioning = false;
            this.transitionTimeout = null;
        }, this.transitionDuration);
    }
    
    updateBodyPadding() {
        const targetHeight = this.isCollapsed ? this.collapsedHeaderHeight : this.originalHeaderHeight;
        this.body.style.paddingTop = `${targetHeight}px`;
    }
    
    handleResize() {
        if (!this.isMobile()) {
            this.cleanup();
            return;
        }
        
        this.measureHeaderHeights();
        this.updateBodyPadding();
        this.expandThreshold = this.getViewportHeight() * 0.5;
    }
    
    cleanup() {
        this.header.classList.remove('header-compact');
        this.header.style.transition = '';
        this.body.style.transition = '';
        this.body.style.paddingTop = '';
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        // Remove event listeners
        window.removeEventListener('scroll', this.handleScroll);
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('resize', this.handleResize);
        
        if (this.supportsVisualViewport) {
            window.visualViewport.removeEventListener('resize', this.handleVisualViewportChange);
            window.visualViewport.removeEventListener('scroll', this.handleVisualViewportChange);
        }
    }
    
    // Throttle for high-frequency events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    // Debounce for resize events
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
let headerController;
document.addEventListener('DOMContentLoaded', () => {
    headerController = new MobileHeaderController();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && headerController) {
        // Re-initialize if needed
        if (headerController.isMobile()) {
            headerController.init();
        }
    }
});