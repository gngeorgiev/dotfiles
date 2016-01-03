/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
var goPath_1 = require('./goPath');
var util_1 = require('./util');
var GoRenameProvider = (function () {
    function GoRenameProvider() {
    }
    GoRenameProvider.prototype.provideRenameEdits = function (document, position, newName, token) {
        var _this = this;
        return vscode.workspace.saveAll(false).then(function () {
            return _this.doRename(document, position, newName, token);
        });
    };
    GoRenameProvider.prototype.doRename = function (document, position, newName, token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var filename = _this.canonicalizeForWindows(document.fileName);
            var offset = util_1.byteOffsetAt(document, position);
            var gorename = goPath_1.getBinPath("gorename");
            cp.execFile(gorename, ["-offset", filename + ":#" + offset, "-to", newName], {}, function (err, stdout, stderr) {
                try {
                    if (err && err.code == "ENOENT") {
                        vscode.window.showInformationMessage("The 'gorename' command is not available.  Use 'go get golang.org/x/tools/cmd/gorename' to install.");
                        return Promise.resolve(null);
                    }
                    if (err)
                        return reject("Cannot rename due to errors: " + err);
                    // TODO: 'gorename' makes the edits in the files out of proc.
                    // Would be better if we could get the list of edits.
                    return Promise.resolve(null);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    };
    GoRenameProvider.prototype.canonicalizeForWindows = function (filename) {
        // capitalization of the GOPATH root must match GOPATH exactly
        var gopath = process.env['GOPATH'];
        if (!gopath)
            return filename;
        if (filename.toLowerCase().substring(0, gopath.length) != gopath.toLowerCase())
            return filename;
        return gopath + filename.slice(gopath.length);
    };
    return GoRenameProvider;
})();
exports.GoRenameProvider = GoRenameProvider;
//# sourceMappingURL=goRename.js.map