/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
var path = require('path');
var goPath_1 = require('./goPath');
var util_1 = require('./util');
var GoReferenceProvider = (function () {
    function GoReferenceProvider() {
    }
    GoReferenceProvider.prototype.provideReferences = function (document, position, options, token) {
        var _this = this;
        return vscode.workspace.saveAll(false).then(function () {
            return _this.doFindReferences(document, position, options, token);
        });
    };
    GoReferenceProvider.prototype.doFindReferences = function (document, position, options, token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var filename = _this.canonicalizeForWindows(document.fileName);
            var cwd = path.dirname(filename);
            var workspaceRoot = vscode.workspace.rootPath;
            // get current word
            var wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return resolve([]);
            }
            var textAtPosition = document.getText(wordRange);
            var wordLength = textAtPosition.length;
            var start = wordRange.start;
            var possibleDot = "";
            if (start.character > 0) {
                possibleDot = document.getText(new vscode.Range(start.line, start.character - 1, start.line, start.character));
            }
            if (possibleDot == ".") {
                var previousWordRange = document.getWordRangeAtPosition(new vscode.Position(start.line, start.character - 1));
                var textAtPreviousPosition = document.getText(previousWordRange);
                wordLength += textAtPreviousPosition.length + 1;
            }
            var offset = util_1.byteOffsetAt(document, position);
            var gofindreferences = goPath_1.getBinPath("go-find-references");
            cp.execFile(gofindreferences, ["-file", filename, "-offset", offset.toString(), "-root", workspaceRoot], {}, function (err, stdout, stderr) {
                try {
                    if (err && err.code == "ENOENT") {
                        vscode.window.showInformationMessage("The 'go-find-references' command is not available.  Use 'go get -v github.com/lukehoban/go-find-references' to install.");
                        return resolve(null);
                    }
                    var lines = stdout.toString().split('\n');
                    var results = [];
                    for (var i = 0; i < lines.length; i += 2) {
                        var line = lines[i];
                        var match = /(.*):(\d+):(\d+)/.exec(lines[i]);
                        if (!match)
                            continue;
                        var _ = match[0], file = match[1], lineStr = match[2], colStr = match[3];
                        var referenceResource = vscode.Uri.file(path.resolve(cwd, file));
                        var range = new vscode.Range(+lineStr - 1, +colStr - 1, +lineStr - 1, +colStr + wordLength - 1);
                        results.push(new vscode.Location(referenceResource, range));
                    }
                    resolve(results);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    };
    GoReferenceProvider.prototype.canonicalizeForWindows = function (filename) {
        // convert backslashes to forward slashes on Windows
        // otherwise go-find-references returns no matches
        if (/^[a-z]:\\/.test(filename))
            return filename.replace(/\\/g, '/');
        return filename;
    };
    return GoReferenceProvider;
})();
exports.GoReferenceProvider = GoReferenceProvider;
//# sourceMappingURL=goReferences.js.map