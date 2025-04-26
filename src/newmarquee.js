// DEFINE RIGHT-TO-LEFT (RTL) LANGUAGES THAT MAY AFFECT DEFAULT DIRECTION
const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];

// DEFINE SAFE DIRECTIONS
const SAFE_DIRECTIONS = ["left", "right", "up", "down"];

// DEFINE NEW CUSTOM ELEMENT: NEW-MARQUEE
class NewMarquee extends HTMLElement {
    constructor() {
        super();

        // CREATE SHADOW ROOT FOR ENCAPSULATED STYLING AND STRUCTURE
        this.attachShadow({ mode: 'open' });

        // DEFINE HTML STRUCTURE AND STYLES FOR THE MARQUEE INSIDE SHADOW ROOT
        this.shadowRoot.innerHTML = `
            <style>
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
                    visibility: hidden; /* HIDE UNTIL LAYOUT IS STABLE */
                    transform-style: preserve-3d;
                    backface-visibility: hidden;
                }
            </style>
            <section class="newmarquee-container">
                <div id="newmarquee-content">
                    <slot></slot> <!-- ALLOW USER CONTENT -->
                </div>
            </section>
        `;

        // STORE REFERENCE TO THE CONTENT WRAPPER
        this.marqueeContent = this.shadowRoot.querySelector('#newmarquee-content');

        // FLAG TO ENSURE ANIMATION STARTS ONLY ONCE
        this.initialized = false;

        // FLAG FOR PAUSE STATE
        this.isPaused = false;
    }

    connectedCallback() {
        // ENSURE EVERYTHING LOADS INCLUDING IMAGES BEFORE STARTING
        window.addEventListener('load', () => {
            this.ensureImagesLoaded(() => {
                this.setDefaultDirection();

                if (document.visibilityState !== 'visible') {
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible') {
                            this.waitForLayoutAndStart();
                        }
                    }, { once: true });
                } else {
                    this.waitForLayoutAndStart();
                }

                // DEBOUNCED RESIZE LISTENER TO RE-CALCULATE MARQUEE
                this.resizeListener = () => {
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        const container = this.shadowRoot.querySelector('.newmarquee-container');
                        if (!container) return;
                        const containerWidth = container.offsetWidth;
                        const containerHeight = container.offsetHeight;

                        if (containerWidth !== this.lastContainerWidth || containerHeight !== this.lastContainerHeight) {
                            this.lastContainerWidth = containerWidth;
                            this.lastContainerHeight = containerHeight;
                            this.fadeMarquee(() => this.animateMarquee());
                        }
                    }, 200);
                };
                window.addEventListener('resize', this.resizeListener);

                // ENABLE HOVER PAUSE IF SPECIFIED
                if (this.getAttribute('pauseonhover') === 'true') {
                    this.addHoverListeners();
                }
            });
        });

        // WATCH FOR LANG ATTRIBUTE CHANGES TO UPDATE DIRECTION
        this.observer = new MutationObserver(() => {
            if (this.languageChangeTimeout) clearTimeout(this.languageChangeTimeout);
            this.languageChangeTimeout = setTimeout(() => this.setDefaultDirection(), 100);
        });
        this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    disconnectedCallback() {
        // CLEAN UP EVENT LISTENERS AND OBSERVERS
        if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
        if (this.getAttribute('pauseonhover') === 'true') this.removeHoverListeners();
        if (this.currentAnimation) this.currentAnimation.cancel();
        if (this.progressUpdateInterval) clearInterval(this.progressUpdateInterval);
        if (this.observer) this.observer.disconnect();
    }

    // ENSURE ALL IMAGES INSIDE THE SLOT HAVE FINISHED LOADING
    ensureImagesLoaded(callback) {
        const images = this.querySelectorAll('img');
        const promises = Array.from(images).map(img => new Promise(resolve => {
            if (img.complete && img.naturalHeight !== 0) {
                resolve();
            } else {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true }); // NEVER HANG IF IMAGE FAILS
            }
        }));
        Promise.all(promises).then(callback).catch(error => console.error('ERROR LOADING IMAGES:', error));
    }

    // SANITIZE CONTENT TO PREVENT XSS ATTACKS
    sanitizeContent(content) {
        const div = document.createElement('div');
        div.textContent = content;  // This automatically escapes any HTML
        return div.innerHTML;
    }

    // SET DEFAULT DIRECTION BASED ON LANGUAGE
    setDefaultDirection() {
        const htmlLang = (document.documentElement.lang || "").toLowerCase();
        const directionAttr = (this.getAttribute('direction') || '').toLowerCase();
        if (RTL_LANGUAGES.includes(htmlLang) && !SAFE_DIRECTIONS.includes(directionAttr)) {
            this.setAttribute('direction', 'right');
        }
    }

    // WAIT FOR STABLE LAYOUT BEFORE STARTING ANIMATION
    waitForLayoutAndStart() {
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
                    requestAnimationFrame(() => {
                        if (!this.initialized) {
                            this.initialized = true;
                            this.fadeMarquee(() => this.animateMarquee());
                        }
                    });
                });
            } else {
                requestAnimationFrame(checkStability);
            }
        };

        requestAnimationFrame(checkStability);
    }

    // FADE OUT AND FADE IN MARQUEE BEFORE RESTARTING ANIMATION
    fadeMarquee(callback) {
        const content = this.shadowRoot.querySelector('#newmarquee-content');
        if (!content) return;

        content.style.transition = 'opacity 0.5s ease';
        content.style.opacity = '0';

        content.addEventListener('transitionend', () => {
            content.style.opacity = '1';
            content.style.transition = 'none'; // REMOVE TRANSITION FOR THE NEXT ANIMATION CYCLE
            if (typeof callback === 'function') callback();
        }, { once: true });
    }

    // MAIN ANIMATION LOGIC
    animateMarquee() {
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
            console.warn('MARQUEE ANIMATION SKIPPED: INVALID DIMENSIONS.');
            if (!this.retriedAnimation) {
                this.retriedAnimation = true;
                setTimeout(() => this.animateMarquee(), 100);
            }
            return;
        }

        this.retriedAnimation = false;

        const DEFAULT_SPEED = 50;
        let speed = parseInt(this.getAttribute('speed'), 10);
        if (isNaN(speed) || speed <= 0 || speed > 1000) speed = DEFAULT_SPEED; // SANITIZE SPEED
        let direction = (this.getAttribute('direction') || 'left').toLowerCase();
        if (!SAFE_DIRECTIONS.includes(direction)) direction = 'left'; // SANITIZE DIRECTION

        let animationDuration, keyframes;

        this.marqueeContent.style.visibility = 'visible';

        switch (direction) {
            case 'right':
                this.marqueeContent.style.transform = `translateX(-${marqueeWidth}px)`;
                animationDuration = marqueeWidth / speed;
                keyframes = [
                    { transform: `translateX(-${marqueeWidth}px)` },
                    { transform: `translateX(${containerWidth}px)` }
                ];
                break;
            case 'up':
                this.marqueeContent.style.transform = `translateY(${containerHeight}px)`;
                animationDuration = marqueeHeight / speed;
                keyframes = [
                    { transform: `translateY(${containerHeight}px)` },
                    { transform: `translateY(-${marqueeHeight}px)` }
                ];
                break;
            case 'down':
                this.marqueeContent.style.transform = `translateY(-${marqueeHeight}px)`;
                animationDuration = marqueeHeight / speed;
                keyframes = [
                    { transform: `translateY(-${marqueeHeight}px)` },
                    { transform: `translateY(${containerHeight}px)` }
                ];
                break;
            default: // left
                this.marqueeContent.style.transform = `translateX(${containerWidth}px)`;
                animationDuration = marqueeWidth / speed;
                keyframes = [
                    { transform: `translateX(${containerWidth}px)` },
                    { transform: `translateX(-${marqueeWidth}px)` }
                ];
                break;
        }

        // START THE ANIMATION USING THE KEYFRAMES AND DURATION
        this.currentAnimation = this.marqueeContent.animate(keyframes, {
            duration: animationDuration * 1000,
            iterations: Infinity,
            easing: 'linear',
        });
    }

    // PAUSE ANIMATION ON HOVER
    addHoverListeners() {
        const hoverHandler = () => {
            this.isPaused = true;
            if (this.currentAnimation) this.currentAnimation.pause();
        };

        const resumeHandler = () => {
            this.isPaused = false;
            if (this.currentAnimation) this.currentAnimation.play();
        };

        this.marqueeContent.addEventListener('mouseenter', hoverHandler);
        this.marqueeContent.addEventListener('mouseleave', resumeHandler);
    }

    // REMOVE HOVER LISTENERS TO AVOID MEMORY LEAKS
    removeHoverListeners() {
        this.marqueeContent.removeEventListener('mouseenter', this.hoverHandler);
        this.marqueeContent.removeEventListener('mouseleave', this.resumeHandler);
    }
}

// DEFINE THE CUSTOM ELEMENT
customElements.define('new-marquee', NewMarquee);
