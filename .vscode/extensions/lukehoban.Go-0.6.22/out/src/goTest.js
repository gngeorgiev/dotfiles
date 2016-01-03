'use strict';
var cp = require('child_process');
var path = require('path');
var vscode = require('vscode');
var util = require('util');
var goPath_1 = require('./goPath');
/**
* Executes the unit test at the primary cursor using `go test`. Output
* is sent to the 'Go' channel.
*
* @param timeout a ParseDuration formatted timeout string for the tests.
*
* TODO: go test returns filenames with no path information for failures,
* so output doesn't produce navigable line references.
*/
function testAtCursor(timeout) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("No editor is active.");
        return;
    }
    getTestFunctions(editor.document.uri).then(function (testFunctions) {
        var testFunction;
        // Find any test function containing the cursor.
        for (var _i = 0; _i < testFunctions.length; _i++) {
            var func = testFunctions[_i];
            var selection = editor.selection;
            if (selection && func.location.range.contains(selection.start)) {
                testFunction = func;
                break;
            }
        }
        ;
        if (!testFunction) {
            vscode.window.setStatusBarMessage('No test function found at cursor.', 5000);
            return;
        }
        return goTest({
            timeout: timeout,
            dir: path.dirname(editor.document.fileName),
            functions: [testFunction.name]
        });
    }).then(null, function (err) {
        console.error(err);
    });
}
exports.testAtCursor = testAtCursor;
/**
 * Runs all tests in the package of the source of the active editor.
 *
 * @param timeout a ParseDuration formatted timeout string for the tests.
 */
function testCurrentPackage(timeout) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("No editor is active.");
        return;
    }
    goTest({
        timeout: timeout,
        dir: path.dirname(editor.document.fileName)
    }).then(null, function (err) {
        console.error(err);
    });
}
exports.testCurrentPackage = testCurrentPackage;
/**
 * Runs all tests in the source of the active editor.
 *
 * @param timeout a ParseDuration formatted timeout string for the tests.
 */
function testCurrentFile(timeout) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("No editor is active.");
        return;
    }
    getTestFunctions(editor.document.uri).then(function (testFunctions) {
        return goTest({
            timeout: timeout,
            dir: path.dirname(editor.document.fileName),
            functions: testFunctions.map(function (func) { return func.name; })
        });
    }).then(null, function (err) {
        console.error(err);
    });
}
exports.testCurrentFile = testCurrentFile;
/**
 * Runs go test and presents the output in the 'Go' channel.
 *
 * @param config the test execution configuration.
 */
function goTest(config) {
    return new Promise(function (resolve, reject) {
        var channel = vscode.window.createOutputChannel('Go');
        channel.clear();
        channel.show(2);
        var args = ['test', '-v', '-timeout', config.timeout];
        if (config.functions) {
            args.push('-run');
            args.push(util.format('^%s$', config.functions.join('|')));
        }
        var proc = cp.spawn(goPath_1.getGoRuntimePath(), args, { env: process.env, cwd: config.dir });
        proc.stdout.on('data', function (chunk) { return channel.append(chunk.toString()); });
        proc.stderr.on('data', function (chunk) { return channel.append(chunk.toString()); });
        proc.on('close', function (code) {
            if (code) {
                channel.append("Error: Tests failed.");
            }
            else {
                channel.append("Success: Tests passed.");
            }
            resolve(code == 0);
        });
    });
}
/**
 * Returns all Go unit test functions in the given source file.
 *
 * @param the URI of a Go source file.
 * @return test function symbols for the source file.
 */
function getTestFunctions(uri) {
    return vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri).then(function (res) {
        var testFunctions = [];
        for (var _i = 0; _i < res.length; _i++) {
            var obj = res[_i];
            var sym = newSymbolInformation(obj);
            if (sym.kind == vscode.SymbolKind.Function && /Test.*/.exec(sym.name)) {
                testFunctions.push(sym);
            }
        }
        return testFunctions;
    });
}
/**
* Converts the output of the vscode.executeDocumentSymbolProvider command to
* a vscode.SymbolInformation.
*
* Warning: This implementation is far from complete.
*
* TODO: This shouldn't be necessary; see https://github.com/Microsoft/vscode/issues/769
*
* @param obj an object returned from executeDocumentSymbolProvider.
* @return the converted SymbolInformation.
*/
function newSymbolInformation(obj) {
    var kind;
    switch (obj.type) {
        case 'function':
            kind = vscode.SymbolKind.Function;
    }
    var startPosition = new vscode.Position(obj.range.startLineNumber, obj.range.startColumn);
    var endPosition = new vscode.Position(obj.range.endLineNumber, obj.range.endColumn);
    var range = new vscode.Range(startPosition, endPosition);
    return new vscode.SymbolInformation(obj.label, kind, range, null, obj.containerName);
}
//# sourceMappingURL=goTest.js.map