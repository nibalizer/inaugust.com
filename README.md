My Convention Presentations
===========================

If you're interested in my presentations, you can go look at them here: 
https://krotscheck.github.io/presentations/


Building your own presentations
-------------------------------

If you would like to use this repository as a base from which to build your 
own presentation website, you can clone the ``starter`` branch and work from 
there. The following commands will get you started:

    // This will install miscellaneous runtime dependencies.
    npm install
    
    // This will start a VERY basic presentation wizard. To modify the 
    // output, make changes in ./src/template/index.hbs
    npm run new
    
    // This will create a local webhost, serving all of your presentations. 
    // It will autodetect changes and refresh any applicable pages.
    npm run serve
    
    // This will construct your current presentations, and push them to 
    // gh-pages.
    npm run release
