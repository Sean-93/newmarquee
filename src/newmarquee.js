// DEFINE SAFE DIRECTION VALUES
// THESE ARE THE DIRECTIONS THAT THE MARQUEE CAN MOVE SAFELY
const SAFE_DIRECTIONS = ["left", "right", "up", "down"];

// DEFINE NEW CUSTOM ELEMENT
// THIS CREATES A NEW CUSTOM ELEMENT THAT WILL BE THE MARQUEE
class NewMarquee extends HTMLElement {
    constructor() {
        super();

        // CREATE SHADOW ROOT
        // THIS ENSURES THAT STYLES AND STRUCTURE OF THE MARQUEE ARE ENCLOSED IN A SHADOW DOM
        this.attachShadow({ mode: 'open' });

        // BUILD STRUCTURE WITHOUT USING innerHTML
        const style = document.createElement('style');
        style.textContent = `
            .newmarquee-container {
                display: block;
                max-width: 100%;
                margin: 0 auto;
                overflow: hidden;
                width: 100%;
                height: 100%;
            }
            #newmarquee-content {
                white-space: nowrap;
                will-change: transform;
                display: inline-block;
                visibility: hidden;
                transform-style: preserve-3d;
                backface-visibility: hidden;
            }
        `;

        // CONTAINER AND CONTENT ELEMENT CREATION
        const container = document.createElement('section');
        container.className = 'newmarquee-container';

        const content = document.createElement('div');
        content.id = 'newmarquee-content';

        // ADD SLOT TO ALLOW USER CONTENT INSIDE THE MARQUEE
        const slot = document.createElement('slot');
        content.appendChild(slot);
        container.appendChild(content);

        // APPEND STYLE AND CONTAINER TO THE SHADOW ROOT
        this.shadowRoot.append(style, container);

        // ELEMENT REFERENCES
        this.marqueeContent = content;

        // STATE FLAGS
        this.initialized = false;
        this.isPaused = false;

        // BINDINGS
        this.boundResizeListener = this.onResize.bind(this);
        this.boundVisibilityChangeListener = this.onVisibilityChange.bind(this);
        this.boundLoadHandler = this.onWindowLoad.bind(this);
    }

    connectedCallback() {
        // LISTEN FOR WINDOW LOAD EVENT
        window.addEventListener('load', this.boundLoadHandler, { once: true });

        // SET MUTATION OBSERVER TO WATCH FOR DIR CHANGES IN HTML
        this.observer = new MutationObserver(() => {
            clearTimeout(this.dirChangeTimeout);
            this.dirChangeTimeout = setTimeout(() => this.setDefaultDirection(), 100);
        });
        this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });
    }

    disconnectedCallback() {
        // CLEAN UP EVENT LISTENERS AND ANIMATIONS WHEN ELEMENT IS REMOVED
        window.removeEventListener('resize', this.boundResizeListener);
        document.removeEventListener('visibilitychange', this.boundVisibilityChangeListener);
        window.removeEventListener('load', this.boundLoadHandler);
        if (this.currentAnimation) this.currentAnimation.cancel();
        if (this.progressUpdateInterval) clearInterval(this.progressUpdateInterval);
        if (this.observer) this.observer.disconnect();
        if (this.getAttribute('pauseonhover') === 'true') this.removeHoverListeners();
    }

    onWindowLoad() {
        // ENSURE IMAGES ARE LOADED BEFORE INITIALIZING MARQUEE
        this.ensureImagesLoaded(() => {
            this.setDefaultDirection();

            // IF THE DOCUMENT IS NOT VISIBLE, WAIT FOR VISIBILITY CHANGE
            if (document.visibilityState !== 'visible') {
                document.addEventListener('visibilitychange', this.boundVisibilityChangeListener, { once: true });
            } else {
                this.waitForLayoutAndStart();
            }

            // ADD RESIZE EVENT LISTENER
            window.addEventListener('resize', this.boundResizeListener, { passive: true });

            // ADD HOVER LISTENERS IF PAUSEONHOVER IS TRUE
            if (this.getAttribute('pauseonhover') === 'true') {
                this.addHoverListeners();
            }
        });
    }

    ensureImagesLoaded(callback) {
        // ENSURE ALL IMAGES INSIDE THE MARQUEE ARE LOADED BEFORE CONTINUING
        const images = this.querySelectorAll('img');
        const promises = Array.from(images).map(img => new Promise(resolve => {
            if (img.complete && img.naturalHeight !== 0) {
                resolve();
            } else {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            }
        }));
        Promise.all(promises).then(callback).catch(callback);
    }

    setDefaultDirection() {
        // SET THE DEFAULT DIRECTION OF THE MARQUEE
        // 1. IF A direction="" ATTRIBUTE IS SET ON <new-marquee>, RESPECT IT
        // 2. OTHERWISE, SET DEFAULT BASED ON <html dir="rtl"> OR <html dir="ltr">
        const directionAttr = (this.getAttribute('direction') || '').toLowerCase();
        if (!SAFE_DIRECTIONS.includes(directionAttr)) {
            const htmlDir = (document.documentElement.getAttribute('dir') || 'ltr').toLowerCase();
            if (htmlDir === 'rtl') {
                this.setAttribute('direction', 'right');
            } else {
                this.setAttribute('direction', 'left');
            }
        }
    }

    waitForLayoutAndStart() {
        // AWAIT STABILITY IN THE LAYOUT BEFORE STARTING THE ANIMATION
        let previousWidth = 0;
        let previousHeight = 0;
        let stableFrames = 0;

        const checkStability = () => {
            const container = this.shadowRoot.querySelector('.newmarquee-container');
            if (!container) return;

            const width = container.offsetWidth;
            const height = container.offsetHeight;

            if (width === previousWidth && height === previousHeight) {
                stableFrames++;
            } else {
                stableFrames = 0;
            }

            previousWidth = width;
            previousHeight = height;

            if (stableFrames >= 3) {
                requestAnimationFrame(() => {
                    if (!this.initialized) {
                        this.initialized = true;
                        this.fadeMarquee(() => this.animateMarquee());
                    }
                });
            } else {
                requestAnimationFrame(checkStability);
            }
        };

        requestAnimationFrame(checkStability);
    }

    fadeMarquee(callback) {
        // FADE IN THE MARQUEE CONTENT BEFORE ANIMATION STARTS
        if (!this.marqueeContent) return;

        this.marqueeContent.style.transition = 'opacity 0.5s ease';
        this.marqueeContent.style.opacity = '0';

        const handleTransitionEnd = () => {
            this.marqueeContent.style.opacity = '1';
            this.marqueeContent.style.transition = 'none';
            if (typeof callback === 'function') callback();
        };

        this.marqueeContent.addEventListener('transitionend', handleTransitionEnd, { once: true });
    }

    animateMarquee() {
        // HANDLE THE MARQUEE ANIMATION BASED ON DIRECTION AND SPEED
        if (!this.marqueeContent) return;

        // IF USER PREFERS REDUCED MOTION, SKIP ANIMATION
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.marqueeContent.style.visibility = 'visible';
            return;
        }

        const marqueeWidth = this.marqueeContent.scrollWidth;
        const marqueeHeight = this.marqueeContent.scrollHeight;
        const container = this.shadowRoot.querySelector('.newmarquee-container');
        if (!container) return;

        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        if (marqueeWidth === 0 || containerWidth === 0 || marqueeHeight === 0 || containerHeight === 0) {
            if (!this.retriedAnimation) {
                this.retriedAnimation = true;
                setTimeout(() => this.animateMarquee(), 100);
            }
            return;
        }

        this.retriedAnimation = false;
        this.marqueeContent.style.visibility = 'visible';

        const DEFAULT_SPEED = 50;
        let speed = parseInt(this.getAttribute('speed'), 10);
        if (!Number.isFinite(speed) || speed <= 0 || speed > 1000) speed = DEFAULT_SPEED;

        let direction = (this.getAttribute('direction') || 'left').toLowerCase();
        if (!SAFE_DIRECTIONS.includes(direction)) direction = 'left';

        let animationDuration, keyframes;

        switch (direction) {
            case 'right':
                animationDuration = marqueeWidth / speed;
                keyframes = [
                    { transform: `translateX(-${marqueeWidth}px)` },
                    { transform: `translateX(${containerWidth}px)` }
                ];
                break;
            case 'up':
                animationDuration = marqueeHeight / speed;
                keyframes = [
                    { transform: `translateY(${containerHeight}px)` },
                    { transform: `translateY(-${marqueeHeight}px)` }
                ];
                break;
            case 'down':
                animationDuration = marqueeHeight / speed;
                keyframes = [
                    { transform: `translateY(-${marqueeHeight}px)` },
                    { transform: `translateY(${containerHeight}px)` }
                ];
                break;
            default: // 'left'
                animationDuration = marqueeWidth / speed;
                keyframes = [
                    { transform: `translateX(${containerWidth}px)` },
                    { transform: `translateX(-${marqueeWidth}px)` }
                ];
                break;
        }

        // CANCEL PREVIOUS ANIMATION IF EXISTS
        if (this.currentAnimation) this.currentAnimation.cancel();

        // START A NEW ANIMATION
        this.currentAnimation = this.marqueeContent.animate(keyframes, {
            duration: animationDuration * 1000,
            iterations: Infinity,
            easing: 'linear',
        });
    }

    addHoverListeners() {
        // ADD LISTENERS TO PAUSE AND RESUME ANIMATION ON MOUSE ENTER/LEAVE
        if (!this.marqueeContent) return;

        this.hoverHandler = () => {
            this.isPaused = true;
            if (this.currentAnimation) this.currentAnimation.pause();
        };
        this.resumeHandler = () => {
            this.isPaused = false;
            if (this.currentAnimation) this.currentAnimation.play();
        };

        this.marqueeContent.addEventListener('mouseenter', this.hoverHandler);
        this.marqueeContent.addEventListener('mouseleave', this.resumeHandler);
    }

    removeHoverListeners() {
        // REMOVE HOVER EVENT LISTENERS
        if (!this.marqueeContent) return;

        if (this.hoverHandler) this.marqueeContent.removeEventListener('mouseenter', this.hoverHandler);
        if (this.resumeHandler) this.marqueeContent.removeEventListener('mouseleave', this.resumeHandler);
    }

    onResize() {
        // HANDLE RESIZE EVENTS TO RESTART ANIMATION IF SIZE CHANGES
        const container = this.shadowRoot.querySelector('.newmarquee-container');
        if (!container) return;

        const currentWidth = container.offsetWidth;
        const currentHeight = container.offsetHeight;

        if (currentWidth !== this.lastWidth || currentHeight !== this.lastHeight) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (!this.marqueeContent) return;
                if (this.currentAnimation) this.currentAnimation.cancel();
                this.animateMarquee();
            }, 200);
        }

        this.lastWidth = currentWidth;
        this.lastHeight = currentHeight;
    }

    onVisibilityChange() {
        // START ANIMATION WHEN DOCUMENT BECOMES VISIBLE
        if (document.visibilityState === 'visible') {
            this.waitForLayoutAndStart();
        }
    }
}

// DEFINE THE CUSTOM ELEMENT
customElements.define('new-marquee', NewMarquee);
