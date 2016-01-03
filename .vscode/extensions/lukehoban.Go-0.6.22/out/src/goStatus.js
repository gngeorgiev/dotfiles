/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var goMode_1 = require('./goMode');
var vscode = require('vscode');
var statusBarEntry;
function showHideStatus() {
    if (!statusBarEntry) {
        return;
    }
    if (!vscode.window.activeTextEditor) {
        statusBarEntry.hide();
        return;
    }
    if (vscode.languages.match(goMode_1.GO_MODE, vscode.window.activeTextEditor.document)) {
        statusBarEntry.show();
        return;
    }
    statusBarEntry.hide();
}
exports.showHideStatus = showHideStatus;
function hideGoStatus() {
    statusBarEntry.dispose();
}
exports.hideGoStatus = hideGoStatus;
function showGoStatus(message, command, tooltip) {
    statusBarEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    statusBarEntry.text = message;
    statusBarEntry.command = command;
    statusBarEntry.color = 'yellow';
    statusBarEntry.tooltip = tooltip;
    statusBarEntry.show();
}
exports.showGoStatus = showGoStatus;
//# sourceMappingURL=goStatus.js.map