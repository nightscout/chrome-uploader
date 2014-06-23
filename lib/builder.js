var pickFiles     = require('broccoli-static-compiler');
var mergeTrees    = require('broccoli-merge-trees');
var moveFile      = require('broccoli-file-mover');
var compileES6    = require('broccoli-es6-concatenator');

module.exports = Builder;

function Builder() {
  this.name = 'chromadex';

  this.trees = {
    app: 'app',
    lib: 'lib',
    tests: 'tests',
    vendor: 'vendor'
  };
}

Builder.prototype.publicFolder = function() {
  return 'public';
}

Builder.prototype.testIndex = function() {
  return pickFiles(this.trees.tests, {
    files: ['index.html'],
    srcDir: '/',
    destDir: '/tests'
  });
}

Builder.prototype._es6Loader = function() {
  return pickFiles(this.trees.vendor, {
    files: ['loader.js'],
    srcDir: '/loader',
    destDir: '/assets/'
  });
}

Builder.prototype._processedAppTree = function() {
  return pickFiles(this.trees.app, {
    srcDir: '/',
    destDir: this.name
  });
}

Builder.prototype._processedTestsTree = function() {
  return pickFiles(this.trees.tests, {
    srcDir: '/',
    destDir: this.name
  });
}

Builder.prototype._processedVendorTree = function() {
  return pickFiles(this.trees.tests, {
    srcDir: '/',
    destDir: 'vendor/'
  });
}

Builder.prototype.appAndDependencies = function() {
  var app = this._processedAppTree();
  var tests = this._processedTestsTree();
  var vendor = this._processedVendorTree();
  var loader = this._es6Loader();

  var sourceTrees = [app, vendor, tests, loader];

  return mergeTrees(sourceTrees, {
    overwrite: true,
    description: 'TreeMerger (appAndDependencies)'
  });
}

Builder.prototype.testDependencies = function() {
  return pickFiles(this.trees.vendor, {
    srcDir: '/qunit/qunit',
    files: [
      'qunit.css', 'qunit.js'
    ],
    destDir: '/assets/'
  });
}

Builder.prototype.javascript = function() {
  var appAndDependencies = this.appAndDependencies();

  return compileES6(appAndDependencies, {
    loaderFile: 'assets/loader.js',
    ignoredModules: [],
    inputFiles: [
      this.name + '/**/*.js'
    ],
    wrapInEval: false,
    outputFile: '/' + this.name + '.js'
  });
}

Builder.prototype.toArray = function() {
  var sourceTrees = [
    this.javascript(),
    this.publicFolder(),
    this.testIndex(),
    this.testDependencies()
  ];

  return sourceTrees;
}

Builder.prototype.toTree = function() {
  return mergeTrees(this.toArray(), {
    overwrite: true,
    description: 'TreeMerger (allTrees)'
  });
}
