var assert = require('assert');
var fs = require('fs-extra');
var path = require('path');
var vscode = require('vscode');
var goExtraInfo_1 = require('../src/goExtraInfo');
var goSuggest_1 = require('../src/goSuggest');
var fixtureSrc = "package main\n\nimport ( \n\t\"fmt\"\n)\nfunc print(txt string) {\n\tfmt.Println(txt)\n}\nfunc main() {\n\tprint(\"Hello\")\n}";
suite("Go Extension Tests", function () {
    var gopath = process.env['GOPATH'];
    var repoPath = path.join(gopath, 'src', '___testrepo');
    var fixturePath = path.join(repoPath, 'test', 'testfixture');
    var fixture = path.join(fixturePath, "test.go");
    suiteSetup(function () {
        assert.ok(gopath !== null, "GOPATH is not defined");
        assert.ok(!fs.existsSync(repoPath), 'fixture path already exists');
        fs.mkdirsSync(fixturePath);
        fs.writeFileSync(fixture, fixtureSrc);
    });
    suiteTeardown(function () {
        fs.removeSync(repoPath);
    });
    test("Test Hover Provider", function (done) {
        var provider = new goExtraInfo_1.GoHoverProvider();
        var testCases = [
            [new vscode.Position(3, 3), '/usr/local/go/src/fmt'],
            [new vscode.Position(8, 6), 'main func()'],
            [new vscode.Position(6, 2), 'import (fmt "fmt")'],
            [new vscode.Position(6, 6), 'Println func(a ...interface{}) (n int, err error)'],
            [new vscode.Position(9, 3), 'print func(txt string)']
        ];
        var uri = vscode.Uri.file(fixture);
        vscode.workspace.openTextDocument(uri).then(function (textDocument) {
            var promises = testCases.map(function (_a) {
                var position = _a[0], expected = _a[1];
                return provider.provideHover(textDocument, position, null).then(function (res) {
                    assert.equal(res.contents.length, 1);
                    assert.equal(expected, res.contents[0].value);
                });
            });
            return Promise.all(promises);
        }, function (err) {
            assert.ok(false, "error in OpenTextDocument " + err);
        }).then(function () { return done(); }, done);
    });
    test("Test Completion", function (done) {
        var provider = new goSuggest_1.GoCompletionItemProvider();
        var testCases = [
            [new vscode.Position(1, 0), []],
            [new vscode.Position(4, 1), ['main', 'print', 'fmt']],
            [new vscode.Position(6, 4), ['fmt']],
            [new vscode.Position(7, 0), ['main', 'print', 'fmt', 'txt']]
        ];
        var uri = vscode.Uri.file(fixture);
        vscode.workspace.openTextDocument(uri).then(function (textDocument) {
            var promises = testCases.map(function (_a) {
                var position = _a[0], expected = _a[1];
                return provider.provideCompletionItems(textDocument, position, null).then(function (items) {
                    assert.deepEqual(expected, items.map(function (x) { return x.label; }));
                });
            });
            return Promise.all(promises);
        }, function (err) {
            assert.ok(false, "error in OpenTextDocument " + err);
        }).then(function () { return done(); }, done);
    });
});
//# sourceMappingURL=go.test.js.map