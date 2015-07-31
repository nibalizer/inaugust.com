My website, blog posts and conference talks
===========================================

If you're interested in my presentations, you can go look at them here: 
http://inaugust.com/talks

Building
--------

First, you will need node and npm.
::

  apt-get install nodejs nodejs-legacy npm

The following commands will get you started:
::
    # This will install miscellaneous runtime dependencies.
    npm install
    
    # This will create a local webhost, serving all of your presentations. 
    # It will autodetect changes and refresh any applicable pages.
    npm run serve
    
    # This will construct your current presentations, and rsync them
    npm run release
