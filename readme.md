# New Marquee

New Marquee is a small JavaScript library that allows you to use marquee-like functionality without using the deprecated marquee tag.  The primary way to use this is to use the <new-marquee> custom Shadow-DOM component privided, but there is also an alternate version where you can assign the ID to any HTML element.

## Features

- **Marquee Functionality**: New Marquee allows you to have the same or better functionality than using the deprecated marquee tag
- **Seamless Animation**: The content emerges from one side of the screen, scrolls away, and then once it has completely scrolled away, the content seamlessly re-emerges from the other side
- **Adjustable Speed**: Allows for variable speed
- **Four Directions**: Supports four directions - up, down, left, and right
- **Persistance Between Pages**: Optional persistance between pages where the animation will seamlessly continue when navigating to another page that has an identical use of New Marquee
- **Pause on Hover**: Optional pause of marquee scrolling animation when hovering over the New Marquee content - resumes when no longer hovering

## Usage

### With <new-marquee> Shadow DOM Element

**With CDN**:
<br>
```<script src="https://cdn.jsdelivr.net/gh/Sean-93/new-marquee@1.0.0/new-marquee-min.js"></script>```
<br>
**Use Locally Without CDN**:
<br>
https://github.com/Sean-93/new-marquee/blob/main/new-marquee.js

    <new-marquee speed="150" direction="left" persistent="true" pauseonhover="true">
        <div style="display: flex; align-items: center;">
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p><p>Magni repellat nemo nesciunt rerum asperiores assumenda ex quos dignissimos.</p>
        </div>
    </new-marquee>

### Without Shadow DOM Element

**With CDN**:
<br>
```<script src="https://cdn.jsdelivr.net/gh/Sean-93/new-marquee@1.0.0/no-shadow-dom-min.js"></script>```
<br>
**Use Locally Without CDN**:
<br>
https://github.com/Sean-93/new-marquee/blob/main/no-shadow-dom.js

    <section class="new-marquee-container" data-direction="left" data-speed="150" data-pauseonhover="true" data-persistent="true">
        <div id="new-marquee-content" style="display: flex; align-items: center;">
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p><p>Magni repellat nemo nesciunt rerum asperiores assumenda ex quos dignissimos.</p>
        </div>
    </section>

## Default Direction

- If the direction attribute is left blank or with an invalid value, New Marquee will default to moving left.  The exception is if the HTML Lang attribute on the page is set to a language that primarily reads right to left on digital devices- then, the default will be to move right.
