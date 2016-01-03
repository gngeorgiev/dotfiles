/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode_1 = require('vscode');
var cp = require('child_process');
var goPath_1 = require('./goPath');
var util_1 = require('./util');
var GoHoverProvider = (function () {
    function GoHoverProvider() {
    }
    GoHoverProvider.prototype.provideHover = function (document, position, token) {
        return new Promise(function (resolve, reject) {
            var filename = document.fileName;
            var offset = util_1.byteOffsetAt(document, position);
            var godef = goPath_1.getBinPath("godef");
            // Spawn `godef` process
            var p = cp.execFile(godef, ["-t", "-i", "-f", filename, "-o", offset.toString()], {}, function (err, stdout, stderr) {
                try {
                    if (err && err.code == "ENOENT") {
                        vscode_1.window.showInformationMessage("The 'godef' command is not available.  Use 'go get -u github.com/rogpeppe/godef' to install.");
                    }
                    if (err)
                        return resolve(null);
                    var result = stdout.toString();
                    var lines = result.split('\n');
                    lines = lines.map(function (line) {
                        if (line.indexOf('\t') == 0) {
                            line = line.slice(1);
                        }
                        return line.replace(/\t/g, '  ');
                    });
                    lines = lines.filter(function (line) { return line.length != 0; });
                    if (lines.length > 10)
                        lines[9] = "...";
                    var text;
                    if (lines.length > 1) {
                        text = lines.slice(1, 10).join('\n');
                        text = text.replace(/\n+$/, '');
                    }
                    else {
                        text = lines[0];
                    }
                    var hover = new vscode_1.Hover({ language: 'go', value: text });
                    return resolve(hover);
                }
                catch (e) {
                    reject(e);
                }
            });
            p.stdin.end(document.getText());
        });
    };
    return GoHoverProvider;
})();
exports.GoHoverProvider = GoHoverProvider;
//# sourceMappingURL=goExtraInfo.js.map