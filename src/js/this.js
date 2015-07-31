/*!
 * configuation for this presentation
 */

// Full list of configuration options available here:
// https://github.com/hakimel/reveal.js#configuration
Reveal.initialize({
  controls: true,
  progress: true,
  history: true,
  center: true,
  //width: 1500,


  //theme: Reveal.getQueryHash().theme, // available themes are in /css/theme
  //transition: Reveal.getQueryHash().transition || 'default', // default/cube/page/concave/zoom/linear/fade/none

	// Optional libraries used to extend on reveal.js
	dependencies: [
                {
                    src: '../lib/js/classList.js', condition: function () {
                    return !document.body.classList;
                }
                },
                {
                    src: '../plugin/markdown/marked.js',
                    condition: function () {
                        return !!document.querySelector('[data-markdown]');
                    }
                },
                {
                    src: '../plugin/markdown/markdown.js',
                    condition: function () {
                        return !!document.querySelector('[data-markdown]');
                    }
                },
                {
                    src: '../plugin/highlight/highlight.js',
                    async: true,
                    condition: function () {
                        return !!document.querySelector('pre code');
                    },
                    callback: function () {
                        hljs.initHighlightingOnLoad();
                    }
                },
                {src: '../plugin/zoom-js/zoom.js', async: true},
                {src: '../plugin/notes/notes.js', async: true}
	]
});

// footer displayed upon load, hides when slide changes
Reveal.addEventListener('slidechanged', function(event) {
    document.querySelector('.reveal .footer').style.display = 'none';
});
