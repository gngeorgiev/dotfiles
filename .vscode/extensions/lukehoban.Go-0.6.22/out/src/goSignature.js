/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode_1 = require('vscode');
var goDeclaration_1 = require("./goDeclaration");
var GoSignatureHelpProvider = (function () {
    function GoSignatureHelpProvider() {
    }
    GoSignatureHelpProvider.prototype.provideSignatureHelp = function (document, position, token) {
        var parenthesesPosition = this.lastParentheses(document, position);
        if (parenthesesPosition == null) {
            return null;
        }
        var callerPos = this.previousTokenPosition(document, parenthesesPosition);
        return goDeclaration_1.definitionLocation(document, callerPos).then(function (res) {
            var result = new vscode_1.SignatureHelp();
            var text = res.lines[1];
            var nameEnd = text.indexOf(" ");
            var sigStart = nameEnd + 5;
            var si = new vscode_1.SignatureInformation(text.substring(0, nameEnd) + text.substring(sigStart), "");
            result.signatures = [si];
            result.activeSignature = 0;
            result.activeParameter = 0;
            return result;
        });
    };
    GoSignatureHelpProvider.prototype.previousTokenPosition = function (document, position) {
        while (position.character > 0) {
            var word = document.getWordRangeAtPosition(position);
            if (word) {
                return word.start;
            }
            position = position.translate(0, -1);
        }
        return null;
    };
    GoSignatureHelpProvider.prototype.lastParentheses = function (document, position) {
        // TODO: handle double '(('
        var currentLine = document.lineAt(position.line).text.substring(0, position.character);
        var lastIndex = currentLine.lastIndexOf("(");
        if (lastIndex < 0)
            return null;
        return new vscode_1.Position(position.line, lastIndex);
    };
    return GoSignatureHelpProvider;
})();
exports.GoSignatureHelpProvider = GoSignatureHelpProvider;
//# sourceMappingURL=goSignature.js.map