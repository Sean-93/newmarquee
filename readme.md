# New Marquee

New Marquee is a small JavaScript library that allows you to use marquee-like functionality without using the deprecated marquee tag.  

## Features

- **Marquee Functionality**: New Marquee allows you to have the same or better functionality than using the deprecated marquee tag
- **Seamless Animation**: The content emerges from one side of the screen, scrolls away, and then once it has completely scrolled away, the content seamlessly re-emerges from the other side
- **Adjustable Speed**: Allows for variable speed
- **Four Directions**: Supports four directions - up, down, left, and right
- **Pause on Hover**: Optional pause of marquee scrolling animation when hovering over the New Marquee content - resumes when no longer hovering

## Usage

- The primary way to use this is with the custom Shadow-DOM 'newmarquee' component provided, but there is also an alternate version where you can assign the 'newmarquee-content' ID to any HTML element that is the child of an element that has 'newmarquee-container' as a CSS class.

### With 'newmarquee' Shadow DOM Element

**With CDN**:
<br>
```<script src="https://cdn.jsdelivr.net/gh/Sean-93/newmarquee@0.9.0/newmarquee-min.js"></script>```
<br>
**Use Locally Without CDN**:
<br>
https://github.com/Sean-93/newmarquee/blob/main/newmarquee.js

    <new-marquee speed="150" direction="left" pauseonhover="true">
        <div style="display: flex; align-items: center;">
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p><p>Magni repellat nemo nesciunt rerum asperiores assumenda ex quos dignissimos.</p>
        </div>
    </new-marquee>

### Without Shadow DOM Element

- Make sure to include this CSS if you are not using the Shadow-DOM 'newmarquee' element:

    ```
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

**With CDN**:
<br>
```<script src="https://cdn.jsdelivr.net/gh/Sean-93/newmarquee@0.9.0/no-shadow-dom-min.js"></script>```
<br>
**Use Locally Without CDN**:
<br>
https://github.com/Sean-93/newmarquee/blob/main/no-shadow-dom.js

    <section class="newmarquee-container" data-direction="left" data-speed="150" data-pauseonhover="true">
        <div id="newmarquee-content" style="display: flex; align-items: center;">
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p><p>Magni repellat nemo nesciunt rerum asperiores assumenda ex quos dignissimos.</p>
        </div>
    </section>

## Default Direction

- If the direction attribute is left blank or with an invalid value, New Marquee will default to moving left.  The exception is if the HTML Lang attribute on the page is set to a language that primarily reads right to left on digital devices- then, the default will be to move right.
