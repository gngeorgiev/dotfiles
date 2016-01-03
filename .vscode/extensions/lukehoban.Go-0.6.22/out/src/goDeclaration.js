/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
var goPath_1 = require('./goPath');
var util_1 = require('./util');
var GoDefinitionProvider = (function () {
    function GoDefinitionProvider() {
    }
    GoDefinitionProvider.prototype.provideDefinition = function (document, position, token) {
        return new Promise(function (resolve, reject) {
            var wordAtPosition = document.getWordRangeAtPosition(position);
            var offset = util_1.byteOffsetAt(document, position);
            var godef = goPath_1.getBinPath("godef");
            // Spawn `godef` process
            var p = cp.execFile(godef, ["-t", "-i", "-f", document.fileName, "-o", offset.toString()], {}, function (err, stdout, stderr) {
                try {
                    if (err && err.code == "ENOENT") {
                        vscode.window.showInformationMessage("The 'godef' command is not available.  Use 'go get -u github.com/rogpeppe/godef' to install.");
                    }
                    if (err)
                        return resolve(null);
                    var result = stdout.toString();
                    var lines = result.split('\n');
                    // TODO: Goto def on a package name import will return juts a plain
                    // path to a folder here - can we go to a folder?
                    var match = /(.*):(\d+):(\d+)/.exec(lines[0]);
                    if (!match)
                        return resolve(null);
                    var _ = match[0], file = match[1], line = match[2], col = match[3];
                    var definitionResource = vscode.Uri.file(file);
                    var range = new vscode.Range(+line - 1, +col - 1, +line - 1, +col - 1);
                    return resolve(new vscode.Location(definitionResource, range));
                }
                catch (e) {
                    reject(e);
                }
            });
            p.stdin.end(document.getText());
        });
    };
    return GoDefinitionProvider;
})();
exports.GoDefinitionProvider = GoDefinitionProvider;
//# sourceMappingURL=goDeclaration.js.map