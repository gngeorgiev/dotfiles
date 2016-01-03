/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
var goPath_1 = require('./goPath');
var dmp = require('diff-match-patch');
var EDIT_DELETE = 0;
var EDIT_INSERT = 1;
var EDIT_REPLACE = 2;
var Edit = (function () {
    function Edit(action, start) {
        this.action = action;
        this.start = start;
        this.text = "";
    }
    Edit.prototype.apply = function () {
        switch (this.action) {
            case EDIT_INSERT:
                return vscode.TextEdit.insert(this.start, this.text);
            case EDIT_DELETE:
                return vscode.TextEdit.delete(new vscode.Range(this.start, this.end));
            case EDIT_REPLACE:
                return vscode.TextEdit.replace(new vscode.Range(this.start, this.end), this.text);
        }
    };
    return Edit;
})();
var GoFormatter = (function () {
    function GoFormatter() {
        this.formatCommand = "goreturns";
        var formatTool = vscode.workspace.getConfiguration('go')['formatTool'];
        if (formatTool) {
            this.formatCommand = formatTool;
        }
    }
    GoFormatter.prototype.provideDocumentFormattingEdits = function (document) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var filename = document.fileName;
            var formatCommandBinPath = goPath_1.getBinPath(_this.formatCommand);
            cp.execFile(formatCommandBinPath, [filename], {}, function (err, stdout, stderr) {
                try {
                    if (err && err.code == "ENOENT") {
                        vscode.window.showInformationMessage("The '" + formatCommandBinPath + "' command is not available.  Please check your go.formatTool user setting and ensure it is installed.");
                        return resolve(null);
                    }
                    if (err)
                        return reject("Cannot format due to syntax errors.");
                    var text = stdout.toString();
                    var d = new dmp.diff_match_patch();
                    var diffs = d.diff_main(document.getText(), text);
                    var line = 0;
                    var character = 0;
                    var edits = [];
                    var edit = null;
                    for (var i = 0; i < diffs.length; i++) {
                        var start = new vscode.Position(line, character);
                        // Compute the line/character after the diff is applied.
                        for (var curr = 0; curr < diffs[i][1].length; curr++) {
                            if (diffs[i][1][curr] != '\n') {
                                character++;
                            }
                            else {
                                character = 0;
                                line++;
                            }
                        }
                        switch (diffs[i][0]) {
                            case dmp.DIFF_DELETE:
                                if (edit == null) {
                                    edit = new Edit(EDIT_DELETE, start);
                                }
                                else if (edit.action != EDIT_DELETE) {
                                    return reject("cannot format due to an internal error.");
                                }
                                edit.end = new vscode.Position(line, character);
                                break;
                            case dmp.DIFF_INSERT:
                                if (edit == null) {
                                    edit = new Edit(EDIT_INSERT, start);
                                }
                                else if (edit.action == EDIT_DELETE) {
                                    edit.action = EDIT_REPLACE;
                                }
                                // insert and replace edits are all relative to the original state
                                // of the document, so inserts should reset the current line/character
                                // position to the start.		
                                line = edit.start.line;
                                character = edit.start.character;
                                edit.text += diffs[i][1];
                                break;
                            case dmp.DIFF_EQUAL:
                                if (edit != null) {
                                    edits.push(edit.apply());
                                    edit = null;
                                }
                                break;
                        }
                    }
                    if (edit != null) {
                        edits.push(edit.apply());
                    }
                    return resolve(edits);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    };
    return GoFormatter;
})();
exports.GoFormatter = GoFormatter;
//# sourceMappingURL=format.js.map