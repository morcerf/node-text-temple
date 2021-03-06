var fs = require('fs');
var path = require('path');
var config = require('./config.js');
var compiler = require('./compiler.js');

/**
 * Method to test whether the given path has the correct text-temple file
 * extension name. This is only a string matching test, no file existence or
 * file encoding test.
 *
 * @param {String} filePath The file path to be tested.
 * @return {Boolean} True if the file path has the correct extension, false
 * otherwise.
 */
function hasCorrectExtension(filePath) {
  return (path.extname(filePath) === config.extName) ? true : false;
}

/**
 * Method to make sure the given path is absolute. An absolute path will always
 * resolve to the same location, regardless of the working directory (the path
 * starts with '/' for unix-based systems). If the given path is relative (not
 * absolute), it will be considered to be relative to the directory of the main
 * file (not directory of this function).
 *
 * @param {String} filePath The file path to be made absolute.
 * @return {String} The absolute path after the process.
 */
function absolutizePath(filePath) {
  if (!require.main) {
    // Script is imported to a console session, do nothing to filePath
    return filePath;
  }
  return path.resolve(path.dirname(require.main.filename), filePath);
}

/**
 * Method to write vanilla string to vanila text files. Can be called both in
 * Sync or Async way, depending if callback is supplied as the last param.
 * 
 * @param {String} filePath The file path of the resulting file. If relative,
 * will be 'absolutized' first.
 * @param {String} text The text to be written to the file.
 * @param {Function} callback The callback should have the signature
 * callback(error). This is optional and the method will run synchronously if
 * this is not provided.
 * @throws {Error} Will throw error if writing to filePath fails.
 */
function writeTextToFile(filePath, text, callback) {
  // Make sure supplied path is absolute
  var absFilePath = absolutizePath(filePath);
  // Do writing to file
  if (callback) {
    // Async version
    fs.writeFile(absFilePath, text, function(err, res) {
      if (err) return callback(err);
      callback();
    });
  } else {
    // Sync version
    fs.writeFileSync(absFilePath, text);  
  }
}

/**
 * Method that will do template compilation. Currently supports variable
 * injection, un-nested EACH loops and un-nested IF conditionals. Currently
 * uses a one-pass approach where when an EACH or IF block is found, the 
 * closing token is assumed to be the nearest {{/each}} or {{/if}} token.
 * Note that for the EACH loops, that specific variable must be an array of 
 * Objects.
 *
 * @param {String} templateString The template in string format.
 * @param {Object} data The data parameters that will replace a matching
 * template placeholder.
 * @return {String} The resulting string after the template compilation.
 */
function compileString(templateString, data) {
  var res = compiler.compile(templateString, data);
  return res;
}

/**
 * Method to compile the given template file with the given data parameters.
 * The supplied paths (templateFile and resultFile) can be absolute or relative,
 * but relative paths will be 'absolutized' first (refer to absolutizePath()
 * method). Can be called both synchronously or asynchronously, depending if
 * a callback is supplied as the last parameter.
 * Note: this method overwrites the file that has the same path as the given
 * resultFile path.
 *
 * @param {String} templateFile The path of the template file. If the supplied
 * path is relative, it will be assumed that the given directory is relative
 * to the main file's directory. See absolutizePath() for more info.
 * @param {Object} data The data parameters that will replace a matching
 * template placeholder.
 * @param {String} resultFile The compilation result will be written to this
 * path. If the supplied path is relative, it will be assumed that the given
 * directory is relative to the main file's directory. See absolutizePath() for
 * more info.
 * @param {Function} callback The callback should have the signature
 * callback(error). This is optional and the method will run synchronously if
 * this is not provided.
 * @throws {Error} If the file has an extension other than the extName in
 * config.js (currently '.tmpl'), will throw (File: wrong extension name).
 * @throws {Error} Will thow error if reading from templateFile or writing to
 * resultFile fails.
 */
function compileFile(templateFile, data, resultFile, callback) {
  // Normalize template file
  var templatePath = absolutizePath(templateFile);
  var resultPath = absolutizePath(resultFile);
  var error;
  var result;

  // Make sure template file has the correct extension or no extension
  if (path.extname(templatePath) === '') {
    // No extension, then add extension
    templatePath += config.extName;
  } else if (!hasCorrectExtension(templatePath)) {
    // File has got wrong extension name
    error = new Error('File: wrong extension name');
    if (callback) return callback(error);
    throw error;
  }

  // Do read file, compile, and write to file
  if (callback) {
    // Asyc version
    fs.readFile(templatePath, {encoding: 'utf8'}, function(err, res) {
      if (err) return callback(err);
      result = compileString(res, data);
      fs.writeFile(resultPath, result, function(err, res) {
        if (err) return callback(err);
        callback();
      });
    });
  } else {
    // Sync version
    var templateString = fs.readFileSync(templatePath, {encoding: 'utf8'});
    result = compileString(templateString, data);
    fs.writeFileSync(resultPath , result);
  }
}

// Exports
module.exports = {
  hasCorrectExtension: hasCorrectExtension,
  absolutizePath: absolutizePath,
  writeTextToFile: writeTextToFile,
  compileString: compileString,
  compileFile: compileFile, 
}
