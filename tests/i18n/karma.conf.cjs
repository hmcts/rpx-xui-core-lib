module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    plugins: [require('karma-jasmine'), require('karma-chrome-launcher'), require('karma-junit-reporter')],
    client: { jasmine: { random: false } },
    reporters: ['progress', 'junit'],
    junitReporter: { outputDir: 'test-results/i18n', outputFile: 'junit.xml', useBrowserName: false },
    browsers: ['ChromeHeadless'],
    singleRun: true,
  });
};
