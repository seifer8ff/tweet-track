// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var concat = require('gulp-concat');
var path = require('path');
var uglify = require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');
var gulpIf = require('gulp-if');
var cssnano = require('gulp-cssnano');
var imagemin = require('gulp-imagemin');
var imageminJpegRecompress = require('imagemin-jpeg-recompress');
var imageminPngquant = require('imagemin-pngquant');



// Concatenate & Minify JS & CSS
gulp.task('minify', function(){
  return gulp.src([
    'client/vendor/bootstrap/dist/css/bootstrap.min.css',
    'client/vendor/jquery/dist/jquery.min.js',
    'client/vendor/bootstrap/dist/js/bootstrap.min.js',
    'client/css/*.css',
    'client/js/*.js'
  ])
// strips debug and minifies only if it's a JavaScript file
.pipe(gulpIf('*.js', stripDebug()))
.pipe(gulpIf('*.js', uglify()))
.pipe(gulpIf('*.js', concat('main.min.js')))
.pipe(gulpIf('*.js', gulp.dest('public/js')))
// Minifies only if it's a CSS file
.pipe(gulpIf('*.css', cssnano()))
.pipe(gulpIf('*.css', concat('styles.min.css')))
.pipe(gulpIf('*.css', gulp.dest('public/css')))
});

// optimize images
gulp.task('images', function(){
  return gulp.src('client/img/**/*.+(png|jpg|gif|svg|pdf)')
  .pipe(imagemin([
    imageminJpegRecompress({
      progressive: true,
      max: 80,
      min: 70
    }),
    imageminPngquant({quality: '75-85'}),
    ]))
  .pipe(gulp.dest('public/img'))
});

// copy fonts to dist
gulp.task('fonts', function() {
  return gulp.src('client/vendor/bootstrap/dist/fonts/*')
  .pipe(gulp.dest('public/fonts'))
})

// copy extras to dist
gulp.task('extras', function() {
  return gulp.src('client/favicon/*.+(png|xml|ico|json|svg)')
  .pipe(gulp.dest('public/favicon/'))
})

// build task
gulp.task('build', function() {
  gulp.run('minify'); 
  gulp.run('fonts'); 
  gulp.run('extras'); 
  gulp.run('images'); 
});

// Default Task
// gulp.task('default', ['watch']);


