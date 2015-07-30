(function initializeGulp () {
  'use strict';

  var fs = require('fs');
  var cheerio = require('cheerio');
  var rimraf = require('rimraf');
  var mainBowerFiles = require('main-bower-files');

  var gulp = require('gulp');
  var git = require('gulp-git');
  var ghPages = require('gulp-gh-pages');
  var filter = require('gulp-filter');
  var less = require('gulp-less');
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
    'hbs': dir.src + '/index.hbs',
    'index': dir.src + '/index.hbs'
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
    var files = fs.readdirSync(dir.src);

    for (var i = 0; i < files.length; i++) {
      var file = dir.src + '/' + files[i] + '/index.html';
      try {
        var stat = fs.statSync(file);
        var $ = cheerio.load(fs.readFileSync(file));
        presentations.push({
          'title': $("head title").text(),
          'description': $("head meta[name='description']").attr('content'),
          'author': $('head meta[name="author"]').attr('content'),
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

    return streamqueue({'objectMode': true}, resolveCSS, resolveLESS,
      resolveReveal, resolveLibs, resolveFonts);
  });

  /**
   * Package the handlebars files.
   */
  gulp.task('package:hbs', function () {

    var templateData = {
      'presentations': buildPresentationManifest(),
      'author': packageJson.author
    };

    // Automatically build the site list.
    return gulp.src(paths.hbs, {'base': dir.src})
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
  gulp.task('package', ['package:html', 'package:hbs', 'package:libs']);

  /**
   * Push the contents of the dist directory to gh-pages.
   */
  gulp.task('gh-pages', function () {
    return gulp.src(dir.dist + '/**/*')
      .pipe(ghPages());
  });

  /**
   * Build the current release package and push it to gh-pages.
   */
  gulp.task('release', ['package', 'gh-pages']);

  /**
   * Start a local server and serve the application code. This is
   * equivalent to opening index.html in a browser.
   *
   * @return {*} A gulp stream that performs this action.
   */
  gulp.task('serve', function () {
    gulp.watch(paths.html, ['package:html']);
    gulp.watch(paths.hbs, ['package:hbs']);

    return gulp.src(dir.dist)
      .pipe(webserver({
        'livereload': true,
        'open': true
      }));
  });
})();
