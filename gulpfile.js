(function initializeGulp () {
  'use strict';

  var fs = require('fs');
  var cheerio = require('cheerio');
  var rimraf = require('rimraf');
  var mainBowerFiles = require('main-bower-files');

  var gulp = require('gulp');
  var git = require('gulp-git');
  var filter = require('gulp-filter');
  var less = require('gulp-less');
  var rsync = require('gulp-rsync');
  var webserver = require('gulp-webserver');
  var streamqueue = require('streamqueue');
  var ignore = require('gulp-ignore');
  var prompt = require('gulp-prompt');
  var handlebars = require('gulp-compile-handlebars');
  var rename = require('gulp-rename');

  var dir = {
    'dist': './dist',
    'src': './src'
  };

  // List of file paths.
  var paths = {
    'html': dir.src + '/**/*.html',
    'index': dir.src + '/index.hbs',
    'css': dir.src + '/css/**/*.css',
    'js': dir.src + '/js/**/*.js',
    'talks': dir.src + '/talks',
    'talkindex': dir.src + '/talks/index.hbs',
    'posts': dir.src + '/posts',
    'images': [
      dir.src + '/**/*.png',
      dir.src + '/**/*.gif',
      dir.src + '/**/*.jpg',
      dir.src + '/**/*.jpeg',
      dir.src + '/**/*.svg'
    ]
  };

  // Contents of all our bower dependencies' main:[] fields.
  var bowerFiles = mainBowerFiles();

  // The current package.json file.
  var packageJson = require('./package.json');

  /**
   * The handlebars configuration object.
   */
  var handlebarsConfig = {
    helpers: {
      'datetime': function (object) {
        return object.toLocaleDateString();
      }
    }
  };

  /**
   * This method parses through discovered presentations, reads their
   * html metadata, and returns an array of that metadata.
   */
  function buildPresentationManifest () {
    var presentations = [];
    var files = fs.readdirSync(paths.talks);

    for (var i = 0; i < files.length; i++) {
      var file = paths.talks + '/' + files[i] + '/index.html';
      try {
        var stat = fs.statSync(file);
        var $ = cheerio.load(fs.readFileSync(file));
        presentations.push({
          'title': $("head title").text(),
          'mtime': stat.mtime,
          'path': files[i] + '/index.html'
        });
      } catch (e) {
        // Do nothing
      }
    }
    presentations.sort(function (a, b) {
      return a.mtime >= b.mtime ? 1 : -1;
    });
    return presentations;
  }

  /**
   * This method parses through discovered posts, reads their
   * html metadata, and returns an array of that metadata.
   */
  function buildPostManifest () {
    var posts = [];
    var files = fs.readdirSync(paths.posts);

    for (var i = 0; i < files.length; i++) {
      var file = paths.posts + '/' + files[i];
      try {
        var stat = fs.statSync(file);
        var $ = cheerio.load(fs.readFileSync(file));
        posts.push({
          'title': $("head title").text(),
          'mtime': stat.mtime,
          'path': 'posts/' + files[i]
        });
      } catch (e) {
        // Do nothing
      }
    }
    posts.sort(function (a, b) {
      return a.mtime >= b.mtime ? 1 : -1;
    });
    return posts;
  }

  /**
   * Clean the output directory.
   *
   * @param {Function} cb callback.
   * @return {*} A gulp stream that performs this action.
   */
  gulp.task('clean', function (cb) {
    rimraf(dir.dist, cb);
  });

  /**
   * Build the static file structure from our bower dependencies. Reveal.js
   * is given a special snowflake status, because it doesn't observe the
   * standard packaging format that bower files like.
   */
  gulp.task('package:libs', function (cb) {
    var resolveCSS = gulp.src(bowerFiles)
      .pipe(filter('*.css'))
      .pipe(gulp.dest(dir.dist + '/css'));

    var resolveLESS = gulp.src(bowerFiles)
      .pipe(filter('*.less'))
      .pipe(less())
      .pipe(gulp.dest(dir.dist + '/css'));

    var resolveFonts = gulp.src(bowerFiles)
      .pipe(filter(['*.otf', '*.eot', '*.svg', '*.ttf', '*.woff', '*.woff2']))
      .pipe(gulp.dest(dir.dist + '/fonts'));

    var resolveLibs = gulp.src(bowerFiles)
      .pipe(filter('*.js'))
      .pipe(gulp.dest(dir.dist + '/js'));

    // Reveal.js is a special snowflake.
    var resolveReveal = gulp.src('./bower_components/reveal.js/*/**/*.*',
      {'base': './bower_components/reveal.js/'})
      .pipe(ignore(['**/test/**', '*.js']))
      .pipe(filter([
        '**/*.js',
        '**/*.css',
        '**/*.eot',
        '**/*.ttf',
        '**/*.woff'
      ]))
      .pipe(gulp.dest(dir.dist));

    return streamqueue({'objectMode': true}, resolveCSS,
      resolveLESS, resolveReveal,
      resolveLibs, resolveFonts);
  });

  /**
   * Package all images.
   */
  gulp.task('package:images', function () {
    return gulp.src(paths.images, {'base': dir.src})
      .pipe(gulp.dest(dir.dist));
  });

  /**
   * Package all css.
   */
  gulp.task('package:css', function () {
    return gulp.src(paths.css, {'base': dir.src})
      .pipe(gulp.dest(dir.dist));
  });

  /**
   * Package all js.
   */
  gulp.task('package:js', function () {
    return gulp.src(paths.js, {'base': dir.src})
      .pipe(gulp.dest(dir.dist));
  });

  /**
   * Package the handlebars files.
   */
  gulp.task('package:talks', function () {

    var templateData = {
      'presentations': buildPresentationManifest(),
      'author': packageJson.author
    };

    // Automatically build the site list.
    return gulp.src(paths.talks + '/index.hbs', {'base': dir.src})
      .pipe(handlebars(templateData, handlebarsConfig))
      .pipe(rename(function (path) {
        path.extname = ".html";
      }))
      .pipe(gulp.dest(dir.dist));
  });

  /**
   * Package the handlebars files.
   */
  gulp.task('package:posts', function () {

    var templateData = {
      'posts': buildPostManifest(),
      'author': packageJson.author
    };

    // Automatically build the site list.
    return gulp.src(dir.src + '/index.hbs', {'base': dir.src})
      .pipe(handlebars(templateData, handlebarsConfig))
      .pipe(rename(function (path) {
        path.extname = ".html";
      }))
      .pipe(gulp.dest(dir.dist));
  });

  /**
   * Copy the HTML files into the dist folder.
   */
  gulp.task('package:html', function () {
    return gulp.src(paths.html, {'base': dir.src})
      .pipe(gulp.dest(dir.dist));
  });

  /**
   * This task builds a new presentation from the base presentation template.
   */
  gulp.task('new', function () {
    var templateData = {
      author: packageJson.author
    };
    var destinationFolder = '';
    return gulp.src(dir.src + '/template/index.hbs')
      .pipe(prompt.prompt([
          {
            type: 'input',
            name: 'folderName',
            message: 'Presentation Folder Name (/^[a-z][a-z_]+$/):',
            validate: function (value) {
              var result = value.match(/^([a-z][a-z_]+)$/);
              return result !== null;
            }
          },
          {
            type: 'input',
            name: 'title',
            message: 'Presentation Title:'
          },
          {
            type: 'input',
            name: 'description',
            message: 'Presentation Description:'
          },
          {
            type: 'input',
            name: 'event',
            message: 'First presented at:'
          },
          {
            type: 'input',
            name: 'event',
            message: 'First presented on (date):'
          }],
        function (res) {
          destinationFolder = res.folderName;
          templateData.presentation = {
            'title': res.title,
            'description': res.description,
            'event': res.event
          }
        }))
      .pipe(handlebars(templateData, handlebarsConfig))
      .pipe(rename(function (path) {
        path.dirname += '/' + destinationFolder;
        path.basename = "index";
        path.extname = ".html";
      }))
      .pipe(gulp.dest(dir.src))
      .pipe(git.add());
  });

  /**
   * Package the entire site into the dist folder.
   */
  gulp.task('package', ['package:html', 'package:talks', 'package:posts',
    'package:libs',
    'package:images', 'package:css', 'package:js']);

  gulp.task('rsync', function () {
    gulp.src('dest/**')
      .pipe(rsync({
            root: 'dest',
            hostname: 'kleos.inaugust.com',
            destination: '/var/www/inaugust.com/talks'
      }));
  });
  /**
   * Build the current release package and push it
   */
  gulp.task('release', ['package', 'rsync']);

  /**
   * Start a local server and serve the application code. This is
   * equivalent to opening index.html in a browser.
   *
   * @return {*} A gulp stream that performs this action.
   */
  gulp.task('serve', function () {
    gulp.watch(paths.html, ['package:html']);
    gulp.watch(paths.images, ['package:images']);
    gulp.watch(paths.talks, ['package:talks']);
    gulp.watch(paths.css, ['package:css']);
    gulp.watch(paths.js, ['package:js']);
    gulp.watch(paths.posts, ['package:posts']);
    gulp.watch(paths.index, ['package:posts']);

    return gulp.src(dir.dist)
      .pipe(webserver({
        'livereload': true,
        'open': true
      }));
  });
})();
