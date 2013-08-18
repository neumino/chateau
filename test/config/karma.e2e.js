// Karma configuration
// Generated on Sat Aug 17 2013 12:07:20 GMT-0700 (PDT)

module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',

    // frameworks to use
    frameworks: ['ng-scenario'],


    // list of files / patterns to load in the browser
    files: [
      '../../public/js/lib/angular/angular-1.0.7.js',
      '../../public/js/lib/jquery-2.0.3.min.js',
      '../../public/js/app.js',
      '../../public/js/services.js',
      '../../public/js/controllers.js',
      '../../public/js/filters.js',
      '../../public/js/directives.js',
      '../e2e/*.js',
      '../lib/angular/angular-mocks.js',
      '../lib/angular/angular-scenario.js'
    ],


    // list of files to exclude
    exclude: [
      '../../**/*.swp'
    ],


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['Chrome'],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
