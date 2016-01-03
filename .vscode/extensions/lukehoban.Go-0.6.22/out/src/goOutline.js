/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
var goPath_1 = require('./goPath');
var GoDocumentSymbolProvider = (function () {
    function GoDocumentSymbolProvider() {
        this.goKindToCodeKind = {
            "package": vscode.SymbolKind.Package,
            "import": vscode.SymbolKind.Namespace,
            "variable": vscode.SymbolKind.Variable,
            "type": vscode.SymbolKind.Interface,
            "function": vscode.SymbolKind.Function
        };
    }
    GoDocumentSymbolProvider.prototype.provideDocumentSymbols = function (document, token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var filename = document.fileName;
            var positionAt = function (offset) { return document.positionAt(offset); };
            var convertToCodeSymbols = function (decls, symbols, containerName) {
                decls.forEach(function (decl) {
                    var symbolInfo = new vscode.SymbolInformation(decl.label, _this.goKindToCodeKind[decl.type], new vscode.Range(positionAt(decl.start), positionAt(decl.end - 1)), undefined, containerName);
                    symbols.push(symbolInfo);
                    if (decl.children) {
                        convertToCodeSymbols(decl.children, symbols, decl.label);
                    }
                });
            };
            var gooutline = goPath_1.getBinPath("go-outline");
            // Spawn `go-outline` process
            var p = cp.execFile(gooutline, ["-f", filename], {}, function (err, stdout, stderr) {
                try {
                    if (err && err.code == "ENOENT") {
                        vscode.window.showInformationMessage("The 'go-outline' command is not available.  Use 'go get -u github.com/lukehoban/go-outline' to install.");
                    }
                    if (err)
                        return resolve(null);
                    var result = stdout.toString();
                    var decls = JSON.parse(result);
                    var symbols = [];
                    convertToCodeSymbols(decls, symbols, "");
                    return resolve(symbols);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    };
    return GoDocumentSymbolProvider;
})();
exports.GoDocumentSymbolProvider = GoDocumentSymbolProvider;
//# sourceMappingURL=goOutline.js.map