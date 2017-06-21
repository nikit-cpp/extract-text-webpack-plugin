'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Chunk = require('webpack/lib/Chunk');

var _Chunk2 = _interopRequireDefault(_Chunk);

var _webpackSources = require('webpack-sources');

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _loaderUtils = require('loader-utils');

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var _schemaUtils = require('schema-utils');

var _schemaUtils2 = _interopRequireDefault(_schemaUtils);

var _NormalModule = require('webpack/lib/NormalModule');

var _NormalModule2 = _interopRequireDefault(_NormalModule);

var _ExtractTextPluginCompilation = require('./lib/ExtractTextPluginCompilation');

var _ExtractTextPluginCompilation2 = _interopRequireDefault(_ExtractTextPluginCompilation);

var _OrderUndefinedError = require('./lib/OrderUndefinedError');

var _OrderUndefinedError2 = _interopRequireDefault(_OrderUndefinedError);

var _helpers = require('./lib/helpers');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NS = _fs2.default.realpathSync(__dirname);

var nextId = 0;

var ExtractTextPlugin = function () {
  function ExtractTextPlugin(options) {
    _classCallCheck(this, ExtractTextPlugin);

    if ((0, _helpers.isString)(options)) {
      options = { filename: options };
    } else {
      (0, _schemaUtils2.default)(_path2.default.resolve(__dirname, './schema/plugin.json'), options, 'Extract Text Plugin');
    }
    this.filename = options.filename;
    this.id = options.id != null ? options.id : ++nextId;
    this.options = {};
    (0, _helpers.mergeOptions)(this.options, options);
    delete this.options.filename;
    delete this.options.id;
  }

  _createClass(ExtractTextPlugin, [{
    key: 'applyAdditionalInformation',
    value: function applyAdditionalInformation(source, info) {
      if (info) {
        return new _webpackSources.ConcatSource(`@media ${info[0]} {`, source, '}');
      }
      return source;
    }
  }, {
    key: 'loader',
    value: function loader(options) {
      return ExtractTextPlugin.loader((0, _helpers.mergeOptions)({ id: this.id }, options));
    }
  }, {
    key: 'mergeNonInitialChunks',
    value: function mergeNonInitialChunks(chunk, intoChunk, checkedChunks) {
      var _this = this;

      if (!intoChunk) {
        checkedChunks = [];
        chunk.chunks.forEach(function (c) {
          if ((0, _helpers.isInitialOrHasNoParents)(c)) return;
          _this.mergeNonInitialChunks(c, chunk, checkedChunks);
        }, this);
      } else if (checkedChunks.indexOf(chunk) < 0) {
        checkedChunks.push(chunk);
        chunk.modules.slice().forEach(function (module) {
          intoChunk.addModule(module);
          module.addChunk(intoChunk);
        });
        chunk.chunks.forEach(function (c) {
          if ((0, _helpers.isInitialOrHasNoParents)(c)) return;
          _this.mergeNonInitialChunks(c, intoChunk, checkedChunks);
        }, this);
      }
    }
  }, {
    key: 'renderExtractedChunk',
    value: function renderExtractedChunk(chunk) {
      var _this2 = this;

      var source = new _webpackSources.ConcatSource();
      chunk.modules.forEach(function (module) {
        var moduleSource = module.source();
        source.add(_this2.applyAdditionalInformation(moduleSource, module.additionalInformation));
      }, this);
      return source;
    }
  }, {
    key: 'extract',
    value: function extract(options) {
      if (Array.isArray(options) || (0, _helpers.isString)(options) || typeof options.options === 'object' || typeof options.query === 'object') {
        options = { use: options };
      } else {
        (0, _schemaUtils2.default)(_path2.default.resolve(__dirname, './schema/loader.json'), options, 'Extract Text Plugin (Loader)');
      }
      var loader = options.use;
      var before = options.fallback || [];
      if ((0, _helpers.isString)(loader)) {
        loader = loader.split('!');
      }
      if ((0, _helpers.isString)(before)) {
        before = before.split('!');
      } else if (!Array.isArray(before)) {
        before = [before];
      }
      options = (0, _helpers.mergeOptions)({ omit: before.length, remove: true }, options);
      delete options.use;
      delete options.fallback;
      return [this.loader(options)].concat(before, loader).map(_helpers.getLoaderObject);
    }
  }, {
    key: 'apply',
    value: function apply(compiler) {
      var _this3 = this;

      var options = this.options;
      compiler.plugin('this-compilation', function (compilation) {
        var extractCompilation = new _ExtractTextPluginCompilation2.default();
        compilation.plugin('normal-module-loader', function (loaderContext, module) {
          loaderContext[NS] = function (content, opt) {
            if (options.disable) {
              return false;
            }
            if (!Array.isArray(content) && content != null) {
              throw new Error(`Exported value was not extracted as an array: ${JSON.stringify(content)}`);
            }
            module[NS] = {
              content,
              options: opt || {}
            };
            return options.allChunks || module[`${NS}/extract`]; // eslint-disable-line no-path-concat
          };
        });
        var filename = _this3.filename;
        var id = _this3.id;
        var extractedChunks = void 0;
        var toRemoveModules = void 0;
        compilation.plugin('optimize-tree', function (chunks, modules, callback) {
          extractedChunks = chunks.map(function () {
            return new _Chunk2.default();
          });
          toRemoveModules = [];
          chunks.forEach(function (chunk, i) {
            var extractedChunk = extractedChunks[i];
            extractedChunk.index = i;
            extractedChunk.originalChunk = chunk;
            extractedChunk.name = chunk.name;
            extractedChunk.entrypoints = chunk.entrypoints;
            chunk.chunks.forEach(function (c) {
              extractedChunk.addChunk(extractedChunks[chunks.indexOf(c)]);
            });
            chunk.parents.forEach(function (c) {
              extractedChunk.addParent(extractedChunks[chunks.indexOf(c)]);
            });
          });
          _async2.default.forEach(chunks, function (chunk, callback) {
            // eslint-disable-line no-shadow
            var extractedChunk = extractedChunks[chunks.indexOf(chunk)];
            var shouldExtract = !!(options.allChunks || (0, _helpers.isInitialOrHasNoParents)(chunk));
            _async2.default.forEach(chunk.modules.slice(), function (module, callback) {
              // eslint-disable-line no-shadow
              var meta = module[NS];
              if (meta && (!meta.options.id || meta.options.id === id)) {
                var wasExtracted = Array.isArray(meta.content);
                if (shouldExtract !== wasExtracted) {
                  var newModule = ExtractTextPlugin.cloneModule(module);
                  newModule[`${NS}/extract`] = shouldExtract; // eslint-disable-line no-path-concat
                  compilation.buildModule(newModule, false, newModule, null, function (err) {
                    if (err) {
                      compilation.errors.push(err);
                      return callback();
                    }
                    meta = newModule[NS];
                    var identifier = module.identifier();
                    // Error out if content is not an array and is not null
                    if (!Array.isArray(meta.content) && meta.content != null) {
                      err = new Error(`${identifier} doesn't export content`);
                      compilation.errors.push(err);
                      return callback();
                    }
                    if (meta.content) {
                      extractCompilation.addResultToChunk(identifier, meta.content, module, extractedChunk);
                      if (toRemoveModules[identifier]) {
                        toRemoveModules[identifier].chunks.push(chunk);
                      } else {
                        toRemoveModules[identifier] = {
                          module: newModule,
                          moduleToRemove: module,
                          chunks: [chunk]
                        };
                      }
                    }
                    callback();
                  });
                } else {
                  if (meta.content) {
                    extractCompilation.addResultToChunk(module.identifier(), meta.content, module, extractedChunk);
                  }
                  callback();
                }
              } else callback();
            }, function (err) {
              if (err) return callback(err);
              callback();
            });
          }, function (err) {
            if (err) return callback(err);
            extractedChunks.forEach(function (extractedChunk) {
              if ((0, _helpers.isInitialOrHasNoParents)(extractedChunk)) {
                _this3.mergeNonInitialChunks(extractedChunk);
              }
            }, _this3);
            extractedChunks.forEach(function (extractedChunk) {
              if (!(0, _helpers.isInitialOrHasNoParents)(extractedChunk)) {
                extractedChunk.modules.slice().forEach(function (module) {
                  extractedChunk.removeModule(module);
                });
              }
            });
            compilation.applyPlugins('optimize-extracted-chunks', extractedChunks);
            callback();
          });
        });

        compilation.plugin('optimize-module-ids', function (modules) {
          modules.forEach(function (module) {
            var data = toRemoveModules[module.identifier()];
            if (data) {
              var oldModuleId = module.id;
              var newModule = ExtractTextPlugin.cloneModule(module);
              newModule.id = oldModuleId;
              newModule._source = data.module._source; // eslint-disable-line no-underscore-dangle
              data.chunks.forEach(function (chunk) {
                chunk.removeModule(data.moduleToRemove);
                var deps = data.moduleToRemove.dependencies;
                deps.forEach(function (d) {
                  if (d.module && d.module.loaders.length > 0) {
                    chunk.removeModule(d.module);
                  }
                });
                chunk.addModule(newModule);
              });
            }
          });
        });

        compilation.plugin('additional-assets', function (callback) {
          extractedChunks.forEach(function (extractedChunk) {
            if (extractedChunk.modules.length) {
              extractedChunk.modules.sort(function (a, b) {
                if (!options.ignoreOrder && (0, _helpers.isInvalidOrder)(a, b)) {
                  compilation.errors.push(new _OrderUndefinedError2.default(a.getOriginalModule()));
                  compilation.errors.push(new _OrderUndefinedError2.default(b.getOriginalModule()));
                }
                return (0, _helpers.getOrder)(a, b);
              });
              var chunk = extractedChunk.originalChunk;
              var source = _this3.renderExtractedChunk(extractedChunk);

              var getPath = function getPath(format) {
                return compilation.getPath(format, {
                  chunk
                }).replace(/\[(?:(\w+):)?contenthash(?::([a-z]+\d*))?(?::(\d+))?\]/ig, function () {
                  // eslint-disable-line func-names
                  return _loaderUtils2.default.getHashDigest(source.source(), arguments[1], arguments[2], parseInt(arguments[3], 10));
                });
              };

              var file = (0, _helpers.isFunction)(filename) ? filename(getPath) : getPath(filename);

              compilation.assets[file] = source;
              chunk.files.push(file);
            }
          }, _this3);
          callback();
        });
      });
    }
  }], [{
    key: 'loader',
    value: function loader(options) {
      return { loader: require.resolve('./loader'), options };
    }
  }, {
    key: 'cloneModule',
    value: function cloneModule(module) {
      return new _NormalModule2.default(module.request, module.userRequest, module.rawRequest, module.loaders, module.resource, module.parser);
    }
  }]);

  return ExtractTextPlugin;
}();

ExtractTextPlugin.extract = ExtractTextPlugin.prototype.extract.bind(ExtractTextPlugin);

exports.default = ExtractTextPlugin;