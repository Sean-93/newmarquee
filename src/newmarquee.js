// DEFINE RIGHT-TO-LEFT (RTL) LANGUAGES THAT MAY AFFECT DEFAULT DIRECTION
const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];

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
                }
            </style>
            <section class="newmarquee-container">
                <div id="newmarquee-content">
                    <slot></slot> <!-- ALLOW USER CONTENT -->
                </div>
            </section>
        `;

        this.marqueeContent = this.shadowRoot.querySelector('#newmarquee-content');

        // FLAGS TO CONTROL INITIALIZATION AND RESIZE HANDLING
        this.initialized = false;
        this.didStartOnce = false;
        this.resizeThrottleTimeout = null;
        this.lastDimensions = { width: null, height: null };
    }

    connectedCallback() {
        window.addEventListener('load', () => {
            this.ensureFontsLoaded(() => {
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

                    this.resizeListener = () => {
                        clearTimeout(this.resizeThrottleTimeout);
                        this.resizeThrottleTimeout = setTimeout(() => {
                            if (!this.didStartOnce) return; // DON'T INTERRUPT INITIAL RUN

                            const container = this.shadowRoot.querySelector('.newmarquee-container');
                            const newWidth = container.offsetWidth;
                            const newHeight = container.offsetHeight;

                            // ONLY RE-RUN ANIMATION IF SIZE ACTUALLY CHANGED
                            if (newWidth !== this.lastDimensions.width || newHeight !== this.lastDimensions.height) {
                                this.lastDimensions = { width: newWidth, height: newHeight };
                                this.fadeMarquee(() => this.animateMarquee());

                            }
                        }, 300);
                    };
                    window.addEventListener('resize', this.resizeListener);

                    if (this.getAttribute('pauseonhover') === 'true') {
                        this.addHoverListeners();
                    }
                });
            });
        });

        this.observer = new MutationObserver(() => {
            if (this.languageChangeTimeout) clearTimeout(this.languageChangeTimeout);
            this.languageChangeTimeout = setTimeout(() => this.setDefaultDirection(), 100);
        });
        this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    disconnectedCallback() {
        if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
        if (this.getAttribute('pauseonhover') === 'true') this.removeHoverListeners();
        if (this.currentAnimation) this.currentAnimation.cancel();
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
            }
        }));
        Promise.all(promises).then(callback).catch(error => console.error('ERROR LOADING IMAGES:', error));
    }

    // ENSURE FONTS HAVE LOADED BEFORE STARTING LAYOUT-SENSITIVE LOGIC
    ensureFontsLoaded(callback) {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(callback);
        } else {
            setTimeout(callback, 100);
        }
    }

    // SET DEFAULT DIRECTION BASED ON LANGUAGE
    setDefaultDirection() {
        const htmlLang = document.documentElement.lang;
        const validDirections = ["left", "right", "up", "down"];
        const directionAttr = this.getAttribute('direction');
        if (RTL_LANGUAGES.includes(htmlLang) && (!directionAttr || !validDirections.includes(directionAttr))) {
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
                const start = () => {
                    if (!this.initialized) {
                        this.initialized = true;
                        this.animateMarquee();
                        this.didStartOnce = true;
                    }
                };

                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => requestAnimationFrame(start), { timeout: 200 });
                } else {
                    requestAnimationFrame(() => requestAnimationFrame(start));
                }

            } else {
                requestAnimationFrame(checkStability);
            }
        };

        requestAnimationFrame(checkStability);
    }

    // MAIN ANIMATION LOGIC
    animateMarquee = () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.marqueeContent.style.visibility = 'visible';
            return;
        }

        const marqueeWidth = this.marqueeContent.scrollWidth;
        const marqueeHeight = this.marqueeContent.scrollHeight;
        const container = this.shadowRoot.querySelector('.newmarquee-container');
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

        // SAVE CURRENT DIMENSIONS TO AVOID RE-RUNNING ON RESIZE
        this.lastDimensions = { width: containerWidth, height: containerHeight };

        const DEFAULT_SPEED = 50;
        const speed = parseInt(this.getAttribute('speed'), 10) || DEFAULT_SPEED;
        const direction = this.getAttribute('direction') || 'left';

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
            case 'left':
            default:
                this.marqueeContent.style.transform = `translateX(${containerWidth}px)`;
                animationDuration = marqueeWidth / speed;
                keyframes = [
                    { transform: `translateX(${containerWidth}px)` },
                    { transform: `translateX(-${marqueeWidth}px)` }
                ];
                break;
        }

        if (this.currentAnimation) {
            this.currentAnimation.cancel();
        }

        this.currentAnimation = this.marqueeContent.animate(keyframes, {
            duration: animationDuration * 1000,
            iterations: Infinity
        });
    }

    // FADE OUT THEN FADE IN CONTENT AROUND ANIMATION RESET
fadeMarquee(callback) {
    const content = this.marqueeContent;
    content.style.transition = 'opacity 0.25s ease';
    content.style.opacity = '0';

    setTimeout(() => {
        callback(); // RUN ANIMATION RESET WHILE FADED OUT
        content.style.opacity = '1';

        // CLEAN UP TRANSITION AFTER COMPLETION
        setTimeout(() => {
            content.style.transition = '';
        }, 300);
    }, 250);
}

    // ADD HOVER EVENT LISTENERS TO PAUSE/RESUME ANIMATION
    addHoverListeners() {
        this.pauseAnimation = () => {
            if (this.currentAnimation) this.currentAnimation.pause();
        };

        this.resumeAnimation = () => {
            if (this.currentAnimation) this.currentAnimation.play();
        };

        this.marqueeContent.addEventListener('mouseenter', this.pauseAnimation);
        this.marqueeContent.addEventListener('mouseleave', this.resumeAnimation);
    }

    // REMOVE HOVER EVENT LISTENERS
    removeHoverListeners() {
        this.marqueeContent.removeEventListener('mouseenter', this.pauseAnimation);
        this.marqueeContent.removeEventListener('mouseleave', this.resumeAnimation);
    }
}

// REGISTER CUSTOM ELEMENT
customElements.define('new-marquee', NewMarquee);
