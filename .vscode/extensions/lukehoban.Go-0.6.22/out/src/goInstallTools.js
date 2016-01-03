/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var fs = require('fs');
var cp = require('child_process');
var goStatus_1 = require('./goStatus');
var goPath_1 = require('./goPath');
function setupGoPathAndOfferToInstallTools() {
    var goroot = vscode.workspace.getConfiguration('go')['goroot'];
    if (goroot) {
        process.env["GOROOT"] = goroot;
    }
    var gopath = vscode.workspace.getConfiguration('go')['gopath'];
    if (gopath) {
        process.env["GOPATH"] = gopath;
    }
    if (!process.env["GOPATH"]) {
        var info = "GOPATH is not set as an environment variable or via `go.gopath` setting in Code";
        goStatus_1.showGoStatus("GOPATH not set", "go.gopathinfo", info);
        vscode.commands.registerCommand("go.gopathinfo", function () {
            vscode.window.showInformationMessage(info);
            goStatus_1.hideGoStatus();
        });
        return;
    }
    // Offer to install any missing tools
    var tools = {
        gorename: "golang.org/x/tools/cmd/gorename",
        gocode: "github.com/nsf/gocode",
        goreturns: "sourcegraph.com/sqs/goreturns",
        godef: "github.com/rogpeppe/godef",
        golint: "github.com/golang/lint/golint",
        "go-find-references": "github.com/lukehoban/go-find-references",
        "go-outline": "github.com/lukehoban/go-outline"
    };
    var keys = Object.keys(tools);
    Promise.all(keys.map(function (tool) { return new Promise(function (resolve, reject) {
        var toolPath = goPath_1.getBinPath(tool);
        fs.exists(toolPath, function (exists) {
            resolve(exists ? null : tools[tool]);
        });
    }); })).then(function (res) {
        var missing = res.filter(function (x) { return x != null; });
        if (missing.length > 0) {
            goStatus_1.showGoStatus("Analysis Tools Missing", "go.promptforinstall", "Not all Go tools are available on the GOPATH");
            vscode.commands.registerCommand("go.promptforinstall", function () {
                promptForInstall(missing);
                goStatus_1.hideGoStatus();
            });
        }
    });
    function promptForInstall(missing) {
        var item = {
            title: "Install",
            command: function () {
                var channel = vscode.window.createOutputChannel('Go');
                channel.show();
                missing.forEach(function (tool) {
                    cp.exec("go get -u -v " + tool, { env: process.env }, function (err, stdout, stderr) {
                        channel.append(stdout.toString());
                        channel.append(stderr.toString());
                        if (err) {
                            channel.append('exec error: ' + err);
                        }
                    });
                });
            }
        };
        vscode.window.showInformationMessage("Some Go analysis tools are missing from your GOPATH.  Would you like to install them?", item).then(function (selection) {
            if (selection) {
                selection.command();
            }
        });
    }
}
exports.setupGoPathAndOfferToInstallTools = setupGoPathAndOfferToInstallTools;
//# sourceMappingURL=goInstallTools.js.map