/**
 * Mobile Header Collapse System - Mobile Optimized
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
        
        // Bottom detection
        this.isNearBottom = false;
        this.bottomThreshold = 100; // pixels from bottom
        this.wasAtBottom = false;
        
        // Thresholds
        this.collapseThreshold = 50;
        this.expandThreshold = window.innerHeight * 0.3;
        
        // Mobile-optimized timing
        this.transitionDuration = 250; // Faster for mobile
        this.debounceDelay = 8; // Higher frequency for mobile
        this.velocityDecayTime = 150; // Track velocity over 150ms
        
        // Store heights
        this.originalHeaderHeight = 0;
        this.collapsedHeaderHeight = 0;
        this.transitionTimeout = null;
        
        // Bind methods
        this.handleScroll = this.throttle(this.handleScroll.bind(this), this.debounceDelay);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleResize = this.debounce(this.handleResize.bind(this), 100);
        
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
        this.lastScrollY = window.pageYOffset;
        this.lastScrollTime = performance.now();
        this.updateBottomDetection();
    }
    
    isMobile() {
        return window.innerWidth <= 1080;
    }
    
    measureHeaderHeights() {
        this.header.classList.remove('header-compact');
        this.originalHeaderHeight = this.header.offsetHeight;
        
        this.header.classList.add('header-compact');
        this.collapsedHeaderHeight = this.header.offsetHeight;
        
        this.header.classList.remove('header-compact');
    }
    
    setupTransitions() {
        const easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Mobile-optimized easing
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
        document.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        
        // Resize handling
        window.addEventListener('resize', this.handleResize);
        
        // Handle momentum scrolling end
        window.addEventListener('scrollend', () => {
            this.momentumScrolling = false;
            this.velocityHistory = [];
            this.wasAtBottom = this.isNearBottom;
        }, { passive: true });
    }
    
    handleTouchStart(e) {
        this.isTouching = true;
        this.momentumScrolling = false;
        this.touchStartY = e.touches[0].clientY;
        this.velocityHistory = [];
    }
    
    handleTouchEnd(e) {
        this.isTouching = false;
        
        // Detect if momentum scrolling will occur
        setTimeout(() => {
            if (Math.abs(this.scrollVelocity) > 0.5) {
                this.momentumScrolling = true;
            }
        }, 50);
    }
    
    updateBottomDetection() {
        const scrollY = window.pageYOffset;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Check if we're near the bottom
        this.isNearBottom = (scrollY + windowHeight) >= (documentHeight - this.bottomThreshold);
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
        const currentScrollY = window.pageYOffset;
        const currentTime = performance.now();
        
        // Update bottom detection
        this.updateBottomDetection();
        
        // Calculate velocity for mobile momentum detection
        this.calculateVelocity(currentScrollY, currentTime);
        
        const scrollDelta = currentScrollY - this.lastScrollY;
        
        // Update scroll direction with mobile-specific logic
        if (Math.abs(scrollDelta) > 0.5) { // Lower threshold for mobile
            if (scrollDelta > 0) {
                this.scrollDirection = 1;
            } else if (scrollDelta < 0) {
                this.scrollDirection = -1;
            }
        }
        
        // CRITICAL FIX: Prevent unwanted behavior when at bottom
        if (this.isNearBottom) {
            // If we're at the bottom, don't make any header changes unless:
            // 1. We're scrolling up significantly (intentional user action)
            // 2. We're not in a momentum scroll situation
            const significantUpwardScroll = this.scrollDirection < 0 && Math.abs(scrollDelta) > 15;
            const intentionalUpwardVelocity = this.scrollVelocity < -1.0 && !this.momentumScrolling;
            
            if (this.isCollapsed && (significantUpwardScroll || intentionalUpwardVelocity)) {
                // Only expand if there's clear upward intent
                if (currentScrollY < (this.lastScrollY - 20)) {
                    this.expandHeader();
                }
            }
            
            // Don't process normal collapse/expand logic when at bottom
            this.lastScrollY = currentScrollY;
            this.lastScrollTime = currentTime;
            this.wasAtBottom = true;
            return;
        }
        
        // Reset bottom state when we move away from bottom
        if (this.wasAtBottom && !this.isNearBottom) {
            this.wasAtBottom = false;
            this.velocityHistory = []; // Clear velocity history to prevent carryover
        }
        
        // Mobile-specific transition override logic
        if (this.isTransitioning) {
            // During momentum scrolling, be more aggressive about overrides
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
        if (this.shouldCollapse(currentScrollY)) {
            this.collapseHeader();
        } else if (this.shouldExpand(currentScrollY)) {
            this.expandHeader();
        }
        
        this.lastScrollY = currentScrollY;
        this.lastScrollTime = currentTime;
    }
    
    shouldCollapse(scrollY) {
        if (this.isCollapsed || this.isNearBottom) return false;
        
        // More sensitive collapse for mobile
        const minScrollDelta = this.momentumScrolling ? 3 : 5;
        const scrollDelta = scrollY - this.lastScrollY;
        
        return this.scrollDirection > 0 && 
               scrollY > this.collapseThreshold &&
               scrollDelta > minScrollDelta;
    }
    
    shouldExpand(scrollY) {
        if (!this.isCollapsed || this.isNearBottom) return false;
        
        // Mobile-optimized expansion logic
        const isNearTop = scrollY < this.collapseThreshold;
        const hasScrolledUpSignificantly = (this.lastScrollY - scrollY) > this.expandThreshold;
        const hasUpwardVelocity = this.scrollVelocity < -0.3; // Increased threshold
        
        // Require more intentional upward movement
        const intentionalUpwardMovement = this.scrollDirection < 0 && 
                                        (this.lastScrollY - scrollY) > 10;
        
        return intentionalUpwardMovement && 
               (isNearTop || (hasScrolledUpSignificantly && hasUpwardVelocity && !this.momentumScrolling));
    }
    
    forceCollapse() {
        if (this.isCollapsed || this.isNearBottom) return;
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.isTransitioning = false;
        this.collapseHeader();
    }
    
    forceExpand() {
        if (!this.isCollapsed) return;
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        this.isTransitioning = false;
        this.expandHeader();
    }
    
    collapseHeader() {
        if (this.isCollapsed || this.isTransitioning || this.isNearBottom) return;
        
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
        if (!this.isCollapsed || this.isTransitioning) return;
        
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
        this.expandThreshold = window.innerHeight * 0.3;
        this.updateBottomDetection();
    }
    
    cleanup() {
        this.header.classList.remove('header-compact');
        this.header.style.transition = '';
        this.body.style.transition = '';
        this.body.style.paddingTop = '';
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
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
document.addEventListener('DOMContentLoaded', () => {
    new MobileHeaderController();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        new MobileHeaderController();
    }
});