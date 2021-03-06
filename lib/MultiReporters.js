/* global require, module, console */

var _ = {
    get: require('lodash/get'),
    camelCase: require('lodash/camelCase')
};
var debug = require('debug')('mocha:reporters:MultiReporters');
var fs = require('fs');
var util = require('util')
var mocha = require('mocha');
var Base = mocha.reporters.Base;
var objectAssignDeep = require('object-assign-deep');
var path = require('path');

function MultiReporters(runner, options) {
    Base.call(this, runner);

    var promises = [];

    if (_.get(options, 'execute', true)) {
        options = this.getOptions(options);

        _.get(options, 'reporterEnabled', 'tap').split(',').map(
            function processReporterEnabled(name, index) {
                debug(name, index);

                name = name.trim();

                var reporterOptions = this.getReporterOptions(options, name);

                //
                // Mocha Reporters
                // https://github.com/mochajs/mocha/blob/master/lib/reporters/index.js
                //
                var Reporter = _.get(mocha, ['reporters', name], null);

                //
                // External Reporters.
                // Try to load reporters from process.cwd() and node_modules.
                //
                if (Reporter === null) {
                    try {
                        Reporter = require(name);
                    }
                    catch (err) {
                        err.message.indexOf('Cannot find module') !== -1 ?
                            console.warn('"' + name + '" reporter not found') : console.warn('"' + name + '" reporter blew up with error:\n' + err.stack);
                        Reporter = null;
                    }
                }

                if (Reporter !== null) {
                    new Reporter(
                        runner, {
                            reporterOptions: reporterOptions
                        }
                    );
                }
                else {
                    console.error('Reporter does not found!', name);
                }
            }.bind(this)
        );
    }
}
util.inherits(MultiReporters, Base)

MultiReporters.CONFIG_FILE = '../config.json';

MultiReporters.prototype.getOptions = function (options) {
    debug('options', options);
    var resultantOptions = objectAssignDeep({}, this.getDefaultOptions(), this.getCustomOptions(options));
    debug('options file (resultant)', resultantOptions);
    return resultantOptions;
};

MultiReporters.prototype.getCustomOptions = function (options) {
    var customOptionsFile = _.get(options, 'reporterOptions.configFile');
    debug('options file (custom)', customOptionsFile);

    var customOptions;
    if (customOptionsFile) {
        customOptionsFile = path.resolve(customOptionsFile);
        debug('options file (custom)', customOptionsFile);

        try {
          if ('.js' === path.extname(customOptionsFile)) {
              customOptions = require(customOptionsFile);
          }
          else {
              customOptions = JSON.parse(fs.readFileSync(customOptionsFile).toString());
          }

          debug('options (custom)', customOptions);
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }

    return customOptions;
};

MultiReporters.prototype.getDefaultOptions = function () {
    var defaultOptionsFile = require.resolve(MultiReporters.CONFIG_FILE);
    debug('options file (default)', defaultOptionsFile);

    var defaultOptions = fs.readFileSync(defaultOptionsFile).toString();
    debug('options (default)', defaultOptions);

    try {
        defaultOptions = JSON.parse(defaultOptions);
    }
    catch (e) {
        console.error(e);
        throw e;
    }

    return defaultOptions;
};

MultiReporters.prototype.getReporterOptions = function (options, name) {
    var _name = name;
    var commonReporterOptions = _.get(options, 'reporterOptions', {});
    debug('reporter options (common)', _name, commonReporterOptions);

    name = [_.camelCase(name), 'ReporterOptions'].join('');
    var customReporterOptions = _.get(options, [name], {});
    debug('reporter options (custom)', _name, customReporterOptions);

    var resultantReporterOptions = objectAssignDeep({}, commonReporterOptions, customReporterOptions);
    debug('reporter options (resultant)', _name, resultantReporterOptions);

    return resultantReporterOptions;
};

module.exports = MultiReporters;
