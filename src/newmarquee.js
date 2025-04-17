// CERTAIN LANGUAGES READ RIGHT TO LEFT PRIMARILY ON DIGITAL DEVICES, WHICH WILL SWITCH THE DEFAULT DIRECTION TO ACCOMMODATE
const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];

class NewMarquee extends HTMLElement {
    constructor() {
        super();
        // CREATE SHADOW ROOT AND SET INNER HTML TEMPLATE
        this.attachShadow({ mode: 'open' });
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
                    visibility: hidden; /* NEW */
                }
            </style>
            <section class="newmarquee-container">
                <div id="newmarquee-content">
                    <slot></slot>
                </div>
            </section>
        `;

        // REFERENCE TO MARQUEE CONTENT ELEMENT
        this.marqueeContent = this.shadowRoot.querySelector('#newmarquee-content');

        // TRACK PAUSE START TIME AND DURATION
        this.pauseStartTime = 0;
        this.pauseDuration = 0;
    }

    connectedCallback() {
        // ENSURE IMAGES ARE LOADED BEFORE STARTING ANIMATION
        this.ensureImagesLoaded(() => {
            this.setDefaultDirection();

            // DEFER ANIMATION UNTIL LAYOUT IS COMPLETE
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.animateMarquee();
                });
            });

            // RECALCULATE AND REANIMATE WHEN WINDOW RESIZES
            this.resizeListener = this.animateMarquee.bind(this);
            window.addEventListener('resize', this.resizeListener);

            // ADD HOVER EVENT LISTENERS IF ENABLED
            if (this.getAttribute('pauseonhover') === 'true') {
                this.addHoverListeners();
            }
        });

        // OBSERVE ATTRIBUTE CHANGES FOR LANGUAGE DIRECTION
        this.observer = new MutationObserver(() => {
            if (this.languageChangeTimeout) clearTimeout(this.languageChangeTimeout);
            this.languageChangeTimeout = setTimeout(() => this.setDefaultDirection(), 100);
        });
        this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    disconnectedCallback() {
        // REMOVE WINDOW RESIZE LISTENER
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }

        // REMOVE HOVER LISTENERS IF ENABLED
        if (this.getAttribute('pauseonhover') === 'true') {
            this.removeHoverListeners();
        }

        // CANCEL ANIMATION
        if (this.currentAnimation) {
            this.currentAnimation.cancel();
            this.currentAnimation = null;
        }

        // CLEAR PROGRESS INTERVAL IF USED
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
        }

        // DISCONNECT LANGUAGE OBSERVER
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    ensureImagesLoaded(callback) {
        const images = this.querySelectorAll('img');
        const promises = Array.from(images).map(img => {
            return new Promise(resolve => {
                if (img.complete && img.naturalHeight !== 0) {
                    resolve();
                } else {
                    img.addEventListener('load', resolve, { once: true });
                }
            });
        });
        Promise.all(promises).then(callback).catch(error => {
            console.error('Error loading images:', error);
        });
    }

    setDefaultDirection() {
        // GET DOCUMENT LANGUAGE
        const htmlLang = document.documentElement.lang;

        // VALID DIRECTION VALUES
        const validDirections = ["left", "right", "up", "down"];
        const directionAttr = this.getAttribute('direction');

        // SET DIRECTION TO 'RIGHT' IF LANGUAGE IS RTL AND DIRECTION IS NOT VALID
        if (RTL_LANGUAGES.includes(htmlLang) && (!directionAttr || !validDirections.includes(directionAttr))) {
            this.setAttribute('direction', 'right');
        }
    }

    animateMarquee = () => {
        // DETERMINE CONTENT AND CONTAINER DIMENSIONS
        const marqueeWidth = this.marqueeContent.scrollWidth;
        const marqueeHeight = this.marqueeContent.scrollHeight;
        const container = this.shadowRoot.querySelector('.newmarquee-container');
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // SKIP IF LAYOUT HAS NOT STABILIZED YET
        if (marqueeWidth === 0 || containerWidth === 0 || marqueeHeight === 0 || containerHeight === 0) {
            console.warn('Marquee animation skipped: invalid dimensions detected.');
            return;
        }

        // READ SPEED ATTRIBUTE OR USE DEFAULT
        const DEFAULT_SPEED = 50;
        const speed = parseInt(this.getAttribute('speed'), 10) || DEFAULT_SPEED;

        // READ DIRECTION ATTRIBUTE OR DEFAULT TO 'LEFT'
        const direction = this.getAttribute('direction') || 'left';

        // INITIALIZE VARIABLES
        let animationDuration, keyframes;

        // SHOW CONTENT ONCE DIMENSIONS ARE KNOWN
        this.marqueeContent.style.visibility = 'visible';

        // POSITION CONTENT BASED ON DIRECTION TO AVOID FLASHING
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

        // PERFORM THE ANIMATION
        const animation = this.marqueeContent.animate(keyframes, {
            duration: animationDuration * 1000,
            iterations: Infinity
        });

        // SAVE ANIMATION INSTANCE FOR HOVER EVENTS
        this.currentAnimation = animation;
    }

    addHoverListeners() {
        // PAUSE THE ANIMATION ON MOUSE ENTER
        this.pauseAnimation = () => {
            if (this.currentAnimation) {
                this.currentAnimation.pause();
                this.pauseStartTime = Date.now();
            }
        };

        // RESUME THE ANIMATION ON MOUSE LEAVE
        this.resumeAnimation = () => {
            if (this.currentAnimation) {
                this.currentAnimation.play();
                this.pauseDuration += Date.now() - this.pauseStartTime;
            }
        };

        // ADD EVENT LISTENERS TO MARQUEE CONTENT
        this.marqueeContent.addEventListener('mouseenter', this.pauseAnimation);
        this.marqueeContent.addEventListener('mouseleave', this.resumeAnimation);
    }

    removeHoverListeners() {
        // REMOVE MOUSE ENTER AND LEAVE EVENT LISTENERS
        this.marqueeContent.removeEventListener('mouseenter', this.pauseAnimation);
        this.marqueeContent.removeEventListener('mouseleave', this.resumeAnimation);
    }
}

// REGISTER THE CUSTOM ELEMENT
customElements.define('new-marquee', NewMarquee);
