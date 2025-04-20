// DEFINE RIGHT-TO-LEFT (RTL) LANGUAGES THAT MAY AFFECT DEFAULT DIRECTION
const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];

// INITIALIZE MARQUEES ON PAGE LOAD
window.addEventListener('load', () => {
    document.querySelectorAll('.newmarquee-container').forEach(container => {
        const content = container.querySelector('#newmarquee-content');
        if (!content) return;

        // ENSURE ALL IMAGES INSIDE THE CONTAINER HAVE FINISHED LOADING
        const ensureImagesLoaded = (callback) => {
            const images = container.querySelectorAll('img');
            const promises = Array.from(images).map(img => new Promise(resolve => {
                if (img.complete && img.naturalHeight !== 0) {
                    resolve();
                } else {
                    img.addEventListener('load', resolve, { once: true });
                }
            }));
            Promise.all(promises).then(callback).catch(error => console.error('ERROR LOADING IMAGES:', error));
        };

        // SET DEFAULT DIRECTION BASED ON HTML LANG
        const setDefaultDirection = () => {
            const htmlLang = document.documentElement.lang;
            const validDirections = ["left", "right", "up", "down"];
            const currentDirection = container.dataset.direction;
            if (RTL_LANGUAGES.includes(htmlLang) && (!currentDirection || !validDirections.includes(currentDirection))) {
                container.dataset.direction = 'right';
            }
        };

        // FADE OUT AND FADE IN MARQUEE BEFORE RESTARTING ANIMATION
        const fadeMarquee = (cb) => {
            content.style.transition = 'opacity 0.5s ease';
            content.style.opacity = '0';
            content.addEventListener('transitionend', () => {
                content.style.opacity = '1';
                content.style.transition = 'none'; // REMOVE TRANSITION FOR THE NEXT ANIMATION CYCLE
                cb();
            }, { once: true });
        };

        // MAIN ANIMATION LOGIC
        const animateMarquee = () => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                content.style.visibility = 'visible';
                return;
            }

            const marqueeWidth = content.scrollWidth;
            const marqueeHeight = content.scrollHeight;
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            if (marqueeWidth === 0 || containerWidth === 0 || marqueeHeight === 0 || containerHeight === 0) {
                console.warn('MARQUEE ANIMATION SKIPPED: INVALID DIMENSIONS.');
                if (!container.__retriedAnimation) {
                    container.__retriedAnimation = true;
                    setTimeout(() => animateMarquee(), 100);
                }
                return;
            }

            container.__retriedAnimation = false;

            const DEFAULT_SPEED = 50;
            const speed = parseInt(container.dataset.speed, 10) || DEFAULT_SPEED;
            const direction = container.dataset.direction || 'left';

            let animationDuration, keyframes;

            content.style.visibility = 'visible';

            switch (direction) {
                case 'right':
                    content.style.transform = `translateX(-${marqueeWidth}px)`;
                    animationDuration = marqueeWidth / speed;
                    keyframes = [
                        { transform: `translateX(-${marqueeWidth}px)` },
                        { transform: `translateX(${containerWidth}px)` }
                    ];
                    break;
                case 'up':
                    content.style.transform = `translateY(${containerHeight}px)`;
                    animationDuration = marqueeHeight / speed;
                    keyframes = [
                        { transform: `translateY(${containerHeight}px)` },
                        { transform: `translateY(-${marqueeHeight}px)` }
                    ];
                    break;
                case 'down':
                    content.style.transform = `translateY(-${marqueeHeight}px)`;
                    animationDuration = marqueeHeight / speed;
                    keyframes = [
                        { transform: `translateY(-${marqueeHeight}px)` },
                        { transform: `translateY(${containerHeight}px)` }
                    ];
                    break;
                case 'left':
                default:
                    content.style.transform = `translateX(${containerWidth}px)`;
                    animationDuration = marqueeWidth / speed;
                    keyframes = [
                        { transform: `translateX(${containerWidth}px)` },
                        { transform: `translateX(-${marqueeWidth}px)` }
                    ];
                    break;
            }

            if (container.__currentAnimation) {
                container.__currentAnimation.cancel();
            }

            container.__currentAnimation = content.animate(keyframes, {
                duration: animationDuration * 1000,
                iterations: Infinity,
                easing: 'linear'
            });

            container.__currentAnimation.onfinish = () => {
                container.__currentAnimation = null;
            };
        };

        // WAIT FOR STABLE LAYOUT BEFORE STARTING ANIMATION
        const waitForLayoutAndStart = () => {
            let previousWidth = 0;
            let previousHeight = 0;
            let stableFrames = 0;

            const checkStability = () => {
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
                            if (!container.__initialized) {
                                container.__initialized = true;
                                fadeMarquee(() => animateMarquee());
                            }
                        });
                    });
                } else {
                    requestAnimationFrame(checkStability);
                }
            };

            requestAnimationFrame(checkStability);
        };

        // HANDLE RESIZE EVENTS TO RESTART MARQUEE
        const handleResize = () => {
            clearTimeout(container.__resizeTimeout);
            container.__resizeTimeout = setTimeout(() => {
                const w = container.offsetWidth;
                const h = container.offsetHeight;
                if (w !== container.__lastW || h !== container.__lastH) {
                    container.__lastW = w;
                    container.__lastH = h;
                    fadeMarquee(() => animateMarquee());
                }
            }, 200);
        };

        // ADD HOVER LISTENERS TO PAUSE ANIMATION
        const addHoverListeners = () => {
            content.addEventListener('mouseover', () => {
                if (!container.__isPaused) {
                    container.__isPaused = true;
                    if (container.__currentAnimation) container.__currentAnimation.pause();
                }
            });
            content.addEventListener('mouseout', () => {
                if (container.__isPaused) {
                    container.__isPaused = false;
                    if (container.__currentAnimation) container.__currentAnimation.play();
                }
            });
        };

        // INIT LOGIC
        ensureImagesLoaded(() => {
            setDefaultDirection();

            if (document.visibilityState !== 'visible') {
                document.addEventListener('visibilitychange', () => {
                    if (document.visibilityState === 'visible') {
                        waitForLayoutAndStart();
                    }
                }, { once: true });
            } else {
                waitForLayoutAndStart();
            }

            window.addEventListener('resize', handleResize);

            if (container.dataset.pauseonhover === 'true') {
                addHoverListeners();
            }

            // WATCH FOR LANG CHANGES TO UPDATE DIRECTION
            const observer = new MutationObserver(() => {
                clearTimeout(container.__langTimeout);
                container.__langTimeout = setTimeout(() => setDefaultDirection(), 100);
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

            // CLEANUP ON UNLOAD
            window.addEventListener('beforeunload', () => {
                if (container.__currentAnimation) container.__currentAnimation.cancel();
                if (observer) observer.disconnect();
            });
        });
    });
});
