/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var debugSession_1 = require('./common/debugSession');
var handles_1 = require('./common/handles');
var fs_1 = require('fs');
var path_1 = require('path');
var child_process_1 = require('child_process');
var json_rpc2_1 = require('json-rpc2');
var goPath_1 = require('../goPath');
require("console-stamp")(console);
// This enum should stay in sync with https://golang.org/pkg/reflect/#Kind
var GoReflectKind;
(function (GoReflectKind) {
    GoReflectKind[GoReflectKind["Invalid"] = 0] = "Invalid";
    GoReflectKind[GoReflectKind["Bool"] = 1] = "Bool";
    GoReflectKind[GoReflectKind["Int"] = 2] = "Int";
    GoReflectKind[GoReflectKind["Int8"] = 3] = "Int8";
    GoReflectKind[GoReflectKind["Int16"] = 4] = "Int16";
    GoReflectKind[GoReflectKind["Int32"] = 5] = "Int32";
    GoReflectKind[GoReflectKind["Int64"] = 6] = "Int64";
    GoReflectKind[GoReflectKind["Uint"] = 7] = "Uint";
    GoReflectKind[GoReflectKind["Uint8"] = 8] = "Uint8";
    GoReflectKind[GoReflectKind["Uint16"] = 9] = "Uint16";
    GoReflectKind[GoReflectKind["Uint32"] = 10] = "Uint32";
    GoReflectKind[GoReflectKind["Uint64"] = 11] = "Uint64";
    GoReflectKind[GoReflectKind["Uintptr"] = 12] = "Uintptr";
    GoReflectKind[GoReflectKind["Float32"] = 13] = "Float32";
    GoReflectKind[GoReflectKind["Float64"] = 14] = "Float64";
    GoReflectKind[GoReflectKind["Complex64"] = 15] = "Complex64";
    GoReflectKind[GoReflectKind["Complex128"] = 16] = "Complex128";
    GoReflectKind[GoReflectKind["Array"] = 17] = "Array";
    GoReflectKind[GoReflectKind["Chan"] = 18] = "Chan";
    GoReflectKind[GoReflectKind["Func"] = 19] = "Func";
    GoReflectKind[GoReflectKind["Interface"] = 20] = "Interface";
    GoReflectKind[GoReflectKind["Map"] = 21] = "Map";
    GoReflectKind[GoReflectKind["Ptr"] = 22] = "Ptr";
    GoReflectKind[GoReflectKind["Slice"] = 23] = "Slice";
    GoReflectKind[GoReflectKind["String"] = 24] = "String";
    GoReflectKind[GoReflectKind["Struct"] = 25] = "Struct";
    GoReflectKind[GoReflectKind["UnsafePointer"] = 26] = "UnsafePointer";
})(GoReflectKind || (GoReflectKind = {}));
;
var Delve = (function () {
    function Delve(mode, program, args, cwd, env, buildFlags, init) {
        var _this = this;
        this.connection = new Promise(function (resolve, reject) {
            var serverRunning = false;
            var dlv = goPath_1.getBinPath("dlv");
            console.log("Using dlv at: ", dlv);
            if (!fs_1.existsSync(dlv)) {
                return reject("Cannot find Delve debugger. Ensure it is in your `GOPATH/bin` or `PATH`.");
            }
            var dlvEnv = null;
            if (env) {
                dlvEnv = {};
                for (var k in process.env) {
                    dlvEnv[k] = process.env[k];
                }
                for (var k in env) {
                    dlvEnv[k] = env[k];
                }
            }
            var dlvArgs = [mode || "debug"];
            if (mode == "exec") {
                dlvArgs = dlvArgs.concat([program]);
            }
            dlvArgs = dlvArgs.concat(['--headless=true', '--listen=127.0.0.1:2345', '--log']);
            if (buildFlags) {
                dlvArgs = dlvArgs.concat(['--build-flags=' + buildFlags]);
            }
            if (init) {
                dlvArgs = dlvArgs.concat(['--init=' + init]);
            }
            if (args) {
                dlvArgs = dlvArgs.concat(['--'].concat(args));
            }
            var dlvCwd = path_1.dirname(program);
            try {
                if (fs_1.lstatSync(program).isDirectory()) {
                    dlvCwd = program;
                }
            }
            catch (e) { }
            _this.debugProcess = child_process_1.spawn(dlv, dlvArgs, {
                cwd: dlvCwd,
                env: dlvEnv,
            });
            function connectClient() {
                var client = json_rpc2_1.Client.$create(2345, '127.0.0.1');
                client.connectSocket(function (err, conn) {
                    if (err)
                        return reject(err);
                    // Add a slight delay to avoid issues on Linux with
                    // Delve failing calls made shortly after connection. 
                    setTimeout(function () {
                        return resolve(conn);
                    }, 200);
                });
            }
            _this.debugProcess.stderr.on('data', function (chunk) {
                var str = chunk.toString();
                console.log(str);
                if (_this.onstderr) {
                    _this.onstderr(str);
                }
                if (!serverRunning) {
                    serverRunning = true;
                    connectClient();
                }
            });
            _this.debugProcess.stdout.on('data', function (chunk) {
                var str = chunk.toString();
                console.log(str);
                if (_this.onstdout) {
                    _this.onstdout(str);
                }
            });
            _this.debugProcess.on('close', function (code) {
                //TODO: Report `dlv` crash to user. 
                console.error("Process exiting with code: " + code);
            });
            _this.debugProcess.on('error', function (err) {
                reject(err);
            });
        });
    }
    Delve.prototype.call = function (command, args, callback) {
        this.connection.then(function (conn) {
            conn.call('RPCServer.' + command, args, callback);
        }, function (err) {
            callback(err, null);
        });
    };
    Delve.prototype.callPromise = function (command, args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.then(function (conn) {
                conn.call('RPCServer.' + command, args, function (err, res) {
                    if (err)
                        return reject(err);
                    resolve(res);
                });
            }, function (err) {
                reject(err);
            });
        });
    };
    Delve.prototype.close = function () {
        this.debugProcess.kill();
    };
    return Delve;
})();
var GoDebugSession = (function (_super) {
    __extends(GoDebugSession, _super);
    function GoDebugSession(debuggerLinesStartAt1, isServer) {
        var _this = this;
        if (isServer === void 0) { isServer = false; }
        _super.call(this, debuggerLinesStartAt1, isServer);
        this._variableHandles = new handles_1.Handles();
        this.threads = new Set();
        this.debugState = null;
        this.delve = null;
        this.breakpoints = new Map();
        this.initialBreakpointsSetPromise = new Promise(function (resolve, reject) { return _this.signalInitialBreakpointsSet = resolve; });
    }
    GoDebugSession.prototype.initializeRequest = function (response, args) {
        console.log("InitializeRequest");
        this.sendResponse(response);
        console.log("InitializeResponse");
        this.sendEvent(new debugSession_1.InitializedEvent());
        console.log("InitializeEvent");
    };
    GoDebugSession.prototype.launchRequest = function (response, args) {
        var _this = this;
        // Launch the Delve debugger on the program
        this.delve = new Delve(args.mode, args.program, args.args, args.cwd, args.env, args.buildFlags, args.init);
        this.delve.onstdout = function (str) {
            _this.sendEvent(new debugSession_1.OutputEvent(str, 'stdout'));
        };
        this.delve.onstderr = function (str) {
            _this.sendEvent(new debugSession_1.OutputEvent(str, 'stderr'));
        };
        this.delve.connection.then(function () {
            return _this.initialBreakpointsSetPromise;
        }).then(function () {
            if (args.stopOnEntry) {
                _this.sendEvent(new debugSession_1.StoppedEvent("breakpoint", 0));
                console.log("StoppedEvent('breakpoint')");
                _this.sendResponse(response);
            }
            else {
                _this.continueRequest(response);
            }
        }, function (err) {
            _this.sendErrorResponse(response, 3000, "Failed to continue: '{e}'", { e: err.toString() });
            console.log("ContinueResponse");
        });
    };
    GoDebugSession.prototype.disconnectRequest = function (response, args) {
        console.log("DisconnectRequest");
        this.delve.close();
        _super.prototype.disconnectRequest.call(this, response, args);
        console.log("DisconnectResponse");
    };
    GoDebugSession.prototype.setExceptionBreakPointsRequest = function (response, args) {
        console.log("ExceptionBreakPointsRequest");
        // Wow - this is subtle - it appears that this event will always get 
        // sent during intiail breakpoint initialization even if there are not
        // user breakpoints - so we use this as the indicator to signal 
        // that breakpoints have been set and we can continue
        this.signalInitialBreakpointsSet();
        this.sendResponse(response);
        console.log("ExceptionBreakPointsResponse");
    };
    GoDebugSession.prototype.setBreakPointsRequest = function (response, args) {
        var _this = this;
        console.log("SetBreakPointsRequest");
        if (!this.breakpoints.get(args.source.path)) {
            this.breakpoints.set(args.source.path, []);
        }
        var file = args.source.path;
        var existingBPs = this.breakpoints.get(file);
        Promise.all(this.breakpoints.get(file).map(function (existingBP) {
            console.log("Clearing: " + existingBP.id);
            return _this.delve.callPromise('ClearBreakpoint', [existingBP.id]);
        })).then(function () {
            console.log("All cleared");
            return Promise.all(args.lines.map(function (line) {
                console.log("Creating on: " + file + ":" + line);
                return _this.delve.callPromise('CreateBreakpoint', [{ file: file, line: line }]).catch(function (err) { return null; });
            }));
        }).then(function (newBreakpoints) {
            console.log("All set:" + JSON.stringify(newBreakpoints));
            var breakpoints = newBreakpoints.map(function (bp, i) {
                if (bp) {
                    return { verified: true, line: bp.line };
                }
                else {
                    return { verified: false, line: args.lines[i] };
                }
            });
            _this.breakpoints.set(args.source.path, newBreakpoints.filter(function (x) { return !!x; }));
            return breakpoints;
        }).then(function (breakpoints) {
            response.body = { breakpoints: breakpoints };
            _this.sendResponse(response);
            console.log("SetBreakPointsResponse");
        }, function (err) {
            _this.sendErrorResponse(response, 2002, "Failed to set breakpoint: '{e}'", { e: err.toString() });
            console.error(err);
        });
    };
    GoDebugSession.prototype.threadsRequest = function (response) {
        var _this = this;
        console.log("ThreadsRequest");
        this.delve.call('ListGoroutines', [], function (err, goroutines) {
            if (err) {
                console.error("Failed to get threads.");
                return _this.sendErrorResponse(response, 2003, "Unable to display threads: '{e}'", { e: err.toString() });
            }
            console.log(goroutines);
            var threads = goroutines.map(function (goroutine) {
                return new debugSession_1.Thread(goroutine.id, goroutine.userCurrentLoc.function ? goroutine.userCurrentLoc.function.name : (goroutine.userCurrentLoc.file + "@" + goroutine.userCurrentLoc.line));
            });
            response.body = { threads: threads };
            _this.sendResponse(response);
            console.log("ThreadsResponse");
            console.log(threads);
        });
    };
    GoDebugSession.prototype.stackTraceRequest = function (response, args) {
        var _this = this;
        console.log("StackTraceRequest");
        this.delve.call('StacktraceGoroutine', [{ id: args.threadId, depth: args.levels }], function (err, locations) {
            if (err) {
                console.error("Failed to produce stack trace!");
                return _this.sendErrorResponse(response, 2004, "Unable to produce stack trace: '{e}'", { e: err.toString() });
            }
            console.log(locations);
            var stackFrames = locations.map(function (location, i) {
                return new debugSession_1.StackFrame(i, location.function ? location.function.name : "<unknown>", new debugSession_1.Source(path_1.basename(location.file), _this.convertDebuggerPathToClient(location.file)), location.line, 0);
            });
            response.body = { stackFrames: stackFrames };
            _this.sendResponse(response);
            console.log("StackTraceResponse");
        });
    };
    GoDebugSession.prototype.scopesRequest = function (response, args) {
        var _this = this;
        console.log("ScopesRequest");
        this.delve.call('ListLocalVars', [{ goroutineID: this.debugState.currentGoroutine.id, frame: args.frameId }], function (err, locals) {
            if (err) {
                console.error("Failed to list local variables.");
                return _this.sendErrorResponse(response, 2005, "Unable to list locals: '{e}'", { e: err.toString() });
            }
            console.log(locals);
            _this.delve.call('ListFunctionArgs', [{ goroutineID: _this.debugState.currentGoroutine.id, frame: args.frameId }], function (err, args) {
                if (err) {
                    console.error("Failed to list function args.");
                    return _this.sendErrorResponse(response, 2006, "Unable to list args: '{e}'", { e: err.toString() });
                }
                console.log(args);
                var vars = args.concat(locals);
                var scopes = new Array();
                var localVariables = {
                    name: "Local",
                    addr: 0,
                    type: "",
                    realType: "",
                    kind: 0,
                    value: "",
                    len: 0,
                    cap: 0,
                    children: vars,
                    unreadable: ""
                };
                scopes.push(new debugSession_1.Scope("Local", _this._variableHandles.create(localVariables), false));
                response.body = { scopes: scopes };
                _this.sendResponse(response);
                console.log("ScopesResponse");
            });
        });
    };
    GoDebugSession.prototype.convertDebugVariableToProtocolVariable = function (v, i) {
        if (v.kind == GoReflectKind.Ptr || v.kind == GoReflectKind.UnsafePointer) {
            if (v.children[0].addr == 0) {
                return {
                    result: "nil <" + v.type + ">",
                    variablesReference: 0
                };
            }
            else if (v.children[0].type == "void") {
                return {
                    result: "void",
                    variablesReference: 0
                };
            }
            else {
                return {
                    result: "<" + v.type + ">",
                    variablesReference: v.children[0].children.length > 0 ? this._variableHandles.create(v.children[0]) : 0
                };
            }
        }
        else if (v.kind == GoReflectKind.Slice) {
            return {
                result: "<" + v.type.substring(7) + ">",
                variablesReference: this._variableHandles.create(v)
            };
        }
        else if (v.kind == GoReflectKind.Array) {
            return {
                result: "<" + v.type + ">",
                variablesReference: this._variableHandles.create(v)
            };
        }
        else if (v.kind == GoReflectKind.String) {
            return {
                result: v.unreadable ? ("<" + v.unreadable + ">") : ('"' + v.value + '"'),
                variablesReference: 0
            };
        }
        else {
            return {
                result: v.value || ("<" + v.type + ">"),
                variablesReference: v.children.length > 0 ? this._variableHandles.create(v) : 0
            };
        }
    };
    GoDebugSession.prototype.variablesRequest = function (response, args) {
        var _this = this;
        console.log("VariablesRequest");
        var vari = this._variableHandles.get(args.variablesReference);
        var variables;
        if (vari.kind == GoReflectKind.Array || vari.kind == GoReflectKind.Map) {
            variables = vari.children.map(function (v, i) {
                var _a = _this.convertDebugVariableToProtocolVariable(v, i), result = _a.result, variablesReference = _a.variablesReference;
                return {
                    name: "[" + i + "]",
                    value: result,
                    variablesReference: variablesReference
                };
            });
        }
        else {
            variables = vari.children.map(function (v, i) {
                var _a = _this.convertDebugVariableToProtocolVariable(v, i), result = _a.result, variablesReference = _a.variablesReference;
                return {
                    name: v.name,
                    value: result,
                    variablesReference: variablesReference
                };
            });
        }
        console.log(JSON.stringify(variables, null, ' '));
        response.body = { variables: variables };
        this.sendResponse(response);
        console.log("VariablesResponse");
    };
    GoDebugSession.prototype.handleReenterDebug = function (reason) {
        var _this = this;
        if (this.debugState.exited) {
            this.sendEvent(new debugSession_1.TerminatedEvent());
            console.log("TerminatedEvent");
        }
        else {
            // [TODO] Can we avoid doing this? https://github.com/Microsoft/vscode/issues/40#issuecomment-161999881
            this.delve.call('ListGoroutines', [], function (err, goroutines) {
                if (err) {
                    console.error("Failed to get threads.");
                }
                // Assume we need to stop all the threads we saw before...
                var needsToBeStopped = new Set();
                _this.threads.forEach(function (id) { return needsToBeStopped.add(id); });
                for (var _i = 0; _i < goroutines.length; _i++) {
                    var goroutine = goroutines[_i];
                    // ...but delete from list of threads to stop if we still see it
                    needsToBeStopped.delete(goroutine.id);
                    if (!_this.threads.has(goroutine.id)) {
                        // Send started event if it's new
                        _this.sendEvent(new debugSession_1.ThreadEvent('started', goroutine.id));
                    }
                    _this.threads.add(goroutine.id);
                }
                // Send existed event if it's no longer there
                needsToBeStopped.forEach(function (id) {
                    _this.sendEvent(new debugSession_1.ThreadEvent('exited', id));
                    _this.threads.delete(id);
                });
                _this.sendEvent(new debugSession_1.StoppedEvent(reason, _this.debugState.currentGoroutine.id));
                console.log("StoppedEvent('" + reason + "')");
            });
        }
    };
    GoDebugSession.prototype.continueRequest = function (response) {
        var _this = this;
        console.log("ContinueRequest");
        this.delve.call('Command', [{ name: 'continue' }], function (err, state) {
            if (err) {
                console.error("Failed to continue.");
            }
            console.log(state);
            _this.debugState = state;
            _this.handleReenterDebug("breakpoint");
        });
        this.sendResponse(response);
        console.log("ContinueResponse");
    };
    GoDebugSession.prototype.nextRequest = function (response) {
        var _this = this;
        console.log("NextRequest");
        this.delve.call('Command', [{ name: 'next' }], function (err, state) {
            if (err) {
                console.error("Failed to next.");
            }
            console.log(state);
            _this.debugState = state;
            _this.handleReenterDebug("step");
        });
        this.sendResponse(response);
        console.log("NextResponse");
    };
    GoDebugSession.prototype.stepInRequest = function (response) {
        var _this = this;
        console.log("StepInRequest");
        this.delve.call('Command', [{ name: 'step' }], function (err, state) {
            if (err) {
                console.error("Failed to step.");
            }
            console.log(state);
            _this.debugState = state;
            _this.handleReenterDebug("step");
        });
        this.sendResponse(response);
        console.log("StepInResponse");
    };
    GoDebugSession.prototype.stepOutRequest = function (response) {
        console.error('Not yet implemented: stepOutRequest');
        this.sendErrorResponse(response, 2000, "Step out is not yet supported");
    };
    GoDebugSession.prototype.pauseRequest = function (response) {
        console.error('Not yet implemented: pauseRequest');
        this.sendErrorResponse(response, 2000, "Pause is not yet supported");
    };
    GoDebugSession.prototype.evaluateRequest = function (response, args) {
        var _this = this;
        console.log("EvaluateRequest");
        var evalSymbolArgs = {
            symbol: args.expression,
            scope: {
                goroutineID: this.debugState.currentGoroutine.id,
                frame: args.frameId
            }
        };
        this.delve.call('EvalSymbol', [evalSymbolArgs], function (err, variable) {
            if (err) {
                console.error("Failed to eval expression: ", JSON.stringify(evalSymbolArgs, null, ' '));
                return _this.sendErrorResponse(response, 2009, "Unable to eval expression: '{e}'", { e: err.toString() });
            }
            response.body = _this.convertDebugVariableToProtocolVariable(variable, 0);
            _this.sendResponse(response);
            console.log("EvaluateResponse");
        });
    };
    return GoDebugSession;
})(debugSession_1.DebugSession);
debugSession_1.DebugSession.run(GoDebugSession);
//# sourceMappingURL=goDebug.js.map