/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
var path = require('path');
var os = require('os');
var goPath_1 = require('./goPath');
if (!goPath_1.getGoRuntimePath()) {
    vscode.window.showInformationMessage("No 'go' binary could be found on PATH or in GOROOT.");
}
function check(filename, goConfig) {
    var gobuild = !goConfig['buildOnSave'] ? Promise.resolve([]) : new Promise(function (resolve, reject) {
        var buildFlags = goConfig['buildFlags'] || [];
        var tmppath = path.normalize(path.join(os.tmpdir(), "go-code-check"));
        var cwd = path.dirname(filename);
        var args = ["build", "-o", tmppath].concat(buildFlags, ["."]);
        if (filename.match(/_test.go$/i)) {
            args = ['test', '-copybinary', '-o', tmppath, '-c', '.'];
        }
        cp.execFile(goPath_1.getGoRuntimePath(), args, { cwd: cwd }, function (err, stdout, stderr) {
            try {
                if (err && err.code == "ENOENT") {
                    vscode.window.showInformationMessage("The 'go' compiler is not available.  Install Go from http://golang.org/dl/.");
                    return resolve([]);
                }
                var lines = stderr.toString().split('\n');
                var ret = [];
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i][0] == '\t' && ret.length > 0) {
                        ret[ret.length - 1].msg += "\n" + lines[i];
                        continue;
                    }
                    var match = /([^:]*):(\d+)(:\d+)?: (.*)/.exec(lines[i]);
                    if (!match)
                        continue;
                    var _ = match[0], file = match[1], lineStr = match[2], charStr = match[3], msg = match[4];
                    var line = +lineStr;
                    ret.push({ file: path.resolve(cwd, file), line: line, msg: msg, severity: "error" });
                }
                resolve(ret);
            }
            catch (e) {
                reject(e);
            }
        });
    });
    var golint = !goConfig['lintOnSave'] ? Promise.resolve([]) : new Promise(function (resolve, reject) {
        var cwd = path.dirname(filename);
        var golint = goPath_1.getBinPath("golint");
        var lintFlags = goConfig['lintFlags'] || [];
        cp.execFile(golint, lintFlags.concat([filename]), { cwd: cwd }, function (err, stdout, stderr) {
            try {
                if (err && err.code == "ENOENT") {
                    vscode.window.showInformationMessage("The 'golint' command is not available.  Use 'go get -u github.com/golang/lint/golint' to install.");
                    return resolve([]);
                }
                var lines = stdout.toString().split('\n');
                var ret = [];
                for (var i = 0; i < lines.length; i++) {
                    var match = /(.*):(\d+):(\d+): (.*)/.exec(lines[i]);
                    if (!match)
                        continue;
                    var _ = match[0], file = match[1], lineStr = match[2], colStr = match[3], msg = match[4];
                    var line = +lineStr;
                    ret.push({ file: path.resolve(cwd, file), line: line, msg: msg, severity: "warning" });
                }
                resolve(ret);
            }
            catch (e) {
                reject(e);
            }
        });
    });
    var govet = !goConfig['vetOnSave'] ? Promise.resolve([]) : new Promise(function (resolve, reject) {
        var cwd = path.dirname(filename);
        var vetFlags = goConfig['vetFlags'] || [];
        cp.execFile(goPath_1.getGoRuntimePath(), ["tool", "vet"].concat(vetFlags, [filename]), { cwd: cwd }, function (err, stdout, stderr) {
            try {
                if (err && err.code == "ENOENT") {
                    vscode.window.showInformationMessage("The 'go tool vet' compiler is not available.  Install Go from http://golang.org/dl/.");
                    return resolve([]);
                }
                var lines = stderr.toString().split('\n');
                var ret = [];
                for (var i = 0; i < lines.length; i++) {
                    var match = /(.*):(\d+): (.*)/.exec(lines[i]);
                    if (!match)
                        continue;
                    var _ = match[0], file = match[1], lineStr = match[2], msg = match[3];
                    var line = +lineStr;
                    ret.push({ file: path.resolve(cwd, file), line: line, msg: msg, severity: "warning" });
                }
                resolve(ret);
            }
            catch (e) {
                reject(e);
            }
        });
    });
    return Promise.all([gobuild, golint, govet]).then(function (resultSets) { return [].concat.apply([], resultSets); });
}
exports.check = check;
//# sourceMappingURL=goCheck.js.map