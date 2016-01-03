'use strict';
var cp = require('child_process');
var vscode = require('vscode');
var goPath_1 = require('./goPath');
function goInstall(packages) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("No editor is active.");
        return;
    }
    var channel = vscode.window.createOutputChannel('Go');
    channel.clear();
    channel.show(2);
    var args = ['install', '-v', packages.join(' ')];
    var proc = cp.spawn(goPath_1.getGoRuntimePath(), args, { env: process.env, cwd: vscode.workspace.rootPath });
    proc.stdout.on('data', function (chunk) { return channel.append(chunk.toString()); });
    proc.stderr.on('data', function (chunk) { return channel.append(chunk.toString()); });
    proc.on('close', function (code) {
        if (code) {
            channel.append("Error: Install failed.");
        }
        else {
            channel.append("Success: Install completed.");
        }
    });
}
exports.goInstall = goInstall;
//# sourceMappingURL=goInstall.js.map