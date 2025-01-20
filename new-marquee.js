// CERTAIN LANGUAGES READ RIGHT TO LEFT PRIMARILY ON DIGITAL DEVICES, WHICH WILL SWITCH THE DEFAULT DIRECTION TO ACCOMODATE
const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];

class NewMarquee extends HTMLElement {
    constructor() {
        super();
        // ATTACH A SHADOW DOM
        this.attachShadow({ mode: 'open' });
        // SET INTERNAL STYLES AND HTML FOR THE COMPONENT
        this.shadowRoot.innerHTML = `
            <style>
                .new-marquee-container {
                    display: block;
                    max-width: 100%;
                    margin: 0 auto;
                    overflow: hidden;
                    width: 100%;
                    height: 100%;
                }
                #new-marquee-content {
                    white-space: nowrap;
                    will-change: transform;
                    display: inline-block;
                }
            </style>
            <section class="new-marquee-container">
                <div id="new-marquee-content">
                    <slot></slot> <!-- PLACEHOLDER FOR USER CONTENT -->
                </div>
            </section>
        `;
        // REFERENCE TO THE MARQUEE CONTENT ELEMENT
        this.marqueeContent = this.shadowRoot.querySelector('#new-marquee-content');
    }

    connectedCallback() {
        // ENSURE IMAGES ARE LOADED BEFORE ANIMATION
        this.ensureImagesLoaded(() => {
            this.setDefaultDirection();
            this.animateMarquee();
            // RECALCULATE AND REANIMATE WHEN WINDOW RESIZES
            this.resizeListener = this.animateMarquee.bind(this);
            window.addEventListener('resize', this.resizeListener);

            // ADD EVENT LISTENERS FOR PAUSE ON HOVER IF ENABLED
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
        // REMOVE EVENT LISTENERS WHEN ELEMENT IS REMOVED
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }

        // REMOVE HOVER EVENT LISTENERS
        if (this.getAttribute('pauseonhover') === 'true') {
            this.removeHoverListeners();
        }

        // CANCEL ONGOING ANIMATIONS TO PREVENT RESOURCE LEAKS
        if (this.currentAnimation) {
            this.currentAnimation.cancel();
            this.currentAnimation = null;
        }

        // CLEAR ANY INTERVALS
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
        // GET THE LANGUAGE FROM THE DOCUMENT
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
        const container = this.shadowRoot.querySelector('.new-marquee-container');
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // READ SPEED ATTRIBUTE OR USE DEFAULT
        const DEFAULT_SPEED = 50;
        const speed = parseInt(this.getAttribute('speed'), 10) || DEFAULT_SPEED;
        // READ DIRECTION ATTRIBUTE OR DEFAULT TO 'LEFT'
        const direction = this.getAttribute('direction') || 'left';
        // READ PERSISTENT ATTRIBUTE
        const isPersistent = this.getAttribute('persistent')?.trim().toLowerCase() === 'true';
        const storageKey = `${this.tagName.toLowerCase()}-state`;

        // CHECK IF PERSISTENT STATE EXISTS
        let savedTime = 0;
        let lastSavedTimestamp = 0;
        if (isPersistent) {
            let savedState;
            try {
                savedState = localStorage.getItem(storageKey);
                if (savedState) savedState = JSON.parse(savedState);
            } catch (error) {
                console.error('Error parsing saved state:', error);
                savedState = null;
            }
            if (savedState) {
                savedTime = parseFloat(savedState.time);
                lastSavedTimestamp = parseFloat(savedState.timestamp);
            }
        }

        // INITIALIZE VARIABLES
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
            case 'left':
            default:
                animationDuration = marqueeWidth / speed;
                keyframes = [
                    { transform: `translateX(${containerWidth}px)` },
                    { transform: `translateX(-${marqueeWidth}px)` }
                ];
                break;
        }

        // PERFORM THE ANIMATION AND HANDLE PERSISTENCE
        const animation = this.marqueeContent.animate(keyframes, {
            duration: animationDuration * 1000,
            iterations: Infinity
        });

        // RESTORE SAVED TIME WITH DYNAMIC FORWARD OFFSET AND CLOCK SYNCHRONIZATION
        if (isPersistent) {
            if (isFinite(savedTime)) {
                const now = Date.now();
                const elapsedSinceSave = Math.max(0, now - lastSavedTimestamp);
                const adjustedTime = (savedTime + elapsedSinceSave) % (animationDuration * 1000);
                animation.currentTime = adjustedTime;
            }

            const updateProgress = (() => {
                let lastExecutionTime = 0;
                return () => {
                    const now = Date.now();
                    if (now - lastExecutionTime >= Math.min(animationDuration * 100, 1000)) {
                        lastExecutionTime = now;
                        const progress = animation.currentTime % (animationDuration * 1000);
                        localStorage.setItem(storageKey, JSON.stringify({ time: progress, timestamp: Date.now() }));
                    }
                };
            })();
            this.progressUpdateInterval = setInterval(updateProgress, 500);
        }

        // SAVE ANIMATION INSTANCE FOR HOVER EVENTS
        this.currentAnimation = animation;
    }

    addHoverListeners() {
        // PAUSE THE ANIMATION ON MOUSE ENTER
        this.pauseAnimation = () => {
            if (this.currentAnimation) this.currentAnimation.pause();
        };
        this.resumeAnimation = () => {
            if (this.currentAnimation) this.currentAnimation.play();
        };
        this.marqueeContent.addEventListener('mouseenter', this.pauseAnimation);
        this.marqueeContent.addEventListener('mouseleave', this.resumeAnimation);
    }

    removeHoverListeners() {
        // REMOVE MOUSE ENTER AND LEAVE EVENT LISTENERS
        this.marqueeContent.removeEventListener('mouseenter', this.pauseAnimation);
        this.marqueeContent.removeEventListener('mouseleave', this.resumeAnimation);
    }
}

// DEFINE THE CUSTOM ELEMENT
customElements.define('new-marquee', NewMarquee);
