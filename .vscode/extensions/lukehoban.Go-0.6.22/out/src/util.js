function byteOffsetAt(document, position) {
    var offset = document.offsetAt(position);
    var text = document.getText();
    var byteOffset = 0;
    for (var i = 0; i < offset; i++) {
        var clen = Buffer.byteLength(text[i]);
        byteOffset += clen;
    }
    return byteOffset;
}
exports.byteOffsetAt = byteOffsetAt;
function parseFilePrelude(text) {
    var lines = text.split('\n');
    var ret = { imports: [], pkg: null };
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.match(/^(\s)*package(\s)+/)) {
            ret.pkg = { start: i, end: i };
        }
        if (line.match(/^(\s)*import(\s)+\(/)) {
            ret.imports.push({ kind: "multi", start: i, end: -1 });
        }
        if (line.match(/^(\s)*import(\s)+[^\(]/)) {
            ret.imports.push({ kind: "single", start: i, end: i });
        }
        if (line.match(/^(\s)*\)/)) {
            if (ret.imports[ret.imports.length - 1].end == -1) {
                ret.imports[ret.imports.length - 1].end = i;
            }
        }
        if (line.match(/^(\s)*(func|const|type|var)/)) {
            break;
        }
    }
    return ret;
}
exports.parseFilePrelude = parseFilePrelude;
//# sourceMappingURL=util.js.map