// CERTAIN LANGUAGES READ RIGHT TO LEFT PRIMARILY ON DIGITAL DEVICES, WHICH WILL SWITCH THE DEFAULT DIRECTION TO ACCOMMODATE
const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];

class Marquee {
    constructor(container) {
        // REFERENCE TO THE CONTAINER AND CONTENT ELEMENTS
        this.container = container;
        this.marqueeContent = container.querySelector('#newmarquee-content');

        // INITIALIZE STATE VARIABLES
        this.currentAnimation = null;
        this.resizeListener = null;
        this.languageChangeTimeout = null;

        // ENSURE IMAGES ARE LOADED BEFORE ANIMATION
        this.ensureImagesLoaded(() => {
            this.setDefaultDirection();
            this.animateMarquee();
            // RECALCULATE AND REANIMATE WHEN WINDOW RESIZES
            this.resizeListener = this.animateMarquee.bind(this);
            window.addEventListener('resize', this.resizeListener);

            // ADD EVENT LISTENERS FOR PAUSE ON HOVER IF ENABLED
            if (this.container.dataset.pauseonhover === 'true') {
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

    ensureImagesLoaded(callback) {
        const images = this.container.querySelectorAll('img');
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
        const directionAttr = this.container.dataset.direction;

        // SET DIRECTION TO 'RIGHT' IF LANGUAGE IS RTL AND DIRECTION IS NOT VALID
        if (RTL_LANGUAGES.includes(htmlLang) && (!directionAttr || !validDirections.includes(directionAttr))) {
            this.container.dataset.direction = 'right';
        }
    }

    animateMarquee() {
        // DETERMINE CONTENT AND CONTAINER DIMENSIONS
        const marqueeWidth = this.marqueeContent.scrollWidth;
        const marqueeHeight = this.marqueeContent.scrollHeight;
        const containerWidth = this.container.offsetWidth;
        const containerHeight = this.container.offsetHeight;

        // READ SPEED ATTRIBUTE OR USE DEFAULT
        const DEFAULT_SPEED = 50;
        const speed = parseInt(this.container.dataset.speed, 10) || DEFAULT_SPEED;
        // READ DIRECTION ATTRIBUTE OR DEFAULT TO 'LEFT'
        const direction = this.container.dataset.direction || 'left';

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

    destroy() {
        // REMOVE EVENT LISTENERS WHEN DESTROYING INSTANCE
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }

        // REMOVE HOVER EVENT LISTENERS
        if (this.container.dataset.pauseonhover === 'true') {
            this.removeHoverListeners();
        }

        // CANCEL ONGOING ANIMATIONS TO PREVENT RESOURCE LEAKS
        if (this.currentAnimation) {
            this.currentAnimation.cancel();
            this.currentAnimation = null;
        }

        // DISCONNECT LANGUAGE OBSERVER
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// FUNCTION TO INITIALIZE MARQUEE INSTANCES
function initializeMarquees() {
    document.querySelectorAll('.newmarquee-container').forEach(container => {
        new Marquee(container);
    });
}

// INITIALIZE MARQUEES ON DOM CONTENT LOADED
document.addEventListener('DOMContentLoaded', initializeMarquees);
