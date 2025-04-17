const RTL_LANGUAGES = ["ar", "he", "fa", "ur", "yi", "ps", "dv", "ug", "syr"];
class NewMarquee extends HTMLElement {
  constructor() {
    super(),
      this.attachShadow({ mode: "open" }),
      (this.shadowRoot.innerHTML = `
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
                }
            </style>
            <section class="newmarquee-container">
                <div id="newmarquee-content">
                    <slot></slot>
                </div>
            </section>
        `),
      (this.marqueeContent = this.shadowRoot.querySelector(
        "#newmarquee-content"
      )),
      (this.pauseStartTime = 0),
      (this.pauseDuration = 0);
  }
  connectedCallback() {
    this.ensureImagesLoaded(() => {
      this.setDefaultDirection(),
        this.animateMarquee(),
        (this.resizeListener = this.animateMarquee.bind(this)),
        window.addEventListener("resize", this.resizeListener),
        "true" === this.getAttribute("pauseonhover") &&
          this.addHoverListeners();
    }),
      (this.observer = new MutationObserver(() => {
        this.languageChangeTimeout && clearTimeout(this.languageChangeTimeout),
          (this.languageChangeTimeout = setTimeout(
            () => this.setDefaultDirection(),
            100
          ));
      })),
      this.observer.observe(document.documentElement, {
        attributes: !0,
        attributeFilter: ["lang"],
      });
  }
  disconnectedCallback() {
    this.resizeListener &&
      window.removeEventListener("resize", this.resizeListener),
      "true" === this.getAttribute("pauseonhover") &&
        this.removeHoverListeners(),
      this.currentAnimation &&
        (this.currentAnimation.cancel(), (this.currentAnimation = null)),
      this.progressUpdateInterval && clearInterval(this.progressUpdateInterval),
      this.observer && this.observer.disconnect();
  }
  ensureImagesLoaded(e) {
    let t = this.querySelectorAll("img"),
      i = Array.from(t).map(
        (e) =>
          new Promise((t) => {
            e.complete && 0 !== e.naturalHeight
              ? t()
              : e.addEventListener("load", t, { once: !0 });
          })
      );
    Promise.all(i)
      .then(e)
      .catch((e) => {
        console.error("Error loading images:", e);
      });
  }
  setDefaultDirection() {
    let e = document.documentElement.lang,
      t = this.getAttribute("direction");
    !RTL_LANGUAGES.includes(e) ||
      (t && ["left", "right", "up", "down"].includes(t)) ||
      this.setAttribute("direction", "right");
  }
  animateMarquee = () => {
    let e = this.marqueeContent.scrollWidth,
      t = this.marqueeContent.scrollHeight,
      i = this.shadowRoot.querySelector(".newmarquee-container"),
      n = i.offsetWidth,
      r = i.offsetHeight,
      s = parseInt(this.getAttribute("speed"), 10) || 50,
      a = this.getAttribute("direction") || "left",
      o,
      h;
    switch (a) {
      case "right":
        (o = e / s),
          (h = [
            { transform: `translateX(-${e}px)` },
            { transform: `translateX(${n}px)` },
          ]);
        break;
      case "up":
        (o = t / s),
          (h = [
            { transform: `translateY(${r}px)` },
            { transform: `translateY(-${t}px)` },
          ]);
        break;
      case "down":
        (o = t / s),
          (h = [
            { transform: `translateY(-${t}px)` },
            { transform: `translateY(${r}px)` },
          ]);
        break;
      default:
        (o = e / s),
          (h = [
            { transform: `translateX(${n}px)` },
            { transform: `translateX(-${e}px)` },
          ]);
    }
    let u = this.marqueeContent.animate(h, {
      duration: 1e3 * o,
      iterations: 1 / 0,
    });
    this.currentAnimation = u;
  };
  addHoverListeners() {
    (this.pauseAnimation = () => {
      this.currentAnimation &&
        (this.currentAnimation.pause(), (this.pauseStartTime = Date.now()));
    }),
      (this.resumeAnimation = () => {
        this.currentAnimation &&
          (this.currentAnimation.play(),
          (this.pauseDuration += Date.now() - this.pauseStartTime));
      }),
      this.marqueeContent.addEventListener("mouseenter", this.pauseAnimation),
      this.marqueeContent.addEventListener("mouseleave", this.resumeAnimation);
  }
  removeHoverListeners() {
    this.marqueeContent.removeEventListener("mouseenter", this.pauseAnimation),
      this.marqueeContent.removeEventListener(
        "mouseleave",
        this.resumeAnimation
      );
  }
}
customElements.define("new-marquee", NewMarquee);
