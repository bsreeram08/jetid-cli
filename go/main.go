package main

import (
	"crypto/rand"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

//go:embed bundle.js
var bundleJS string

func stripShebang(s string) string {
	if strings.HasPrefix(s, "#!") {
		if idx := strings.IndexByte(s, '\n'); idx >= 0 {
			return s[idx+1:]
		}
	}
	return s
}

func main() {
	vm := goja.New()

	// ── process ──────────────────────────────────────────────────────────────
	process := vm.NewObject()

	argv := make([]interface{}, 1+len(os.Args))
	argv[0] = "node"
	for i, a := range os.Args {
		argv[i+1] = a
	}
	process.Set("argv", vm.ToValue(argv))

	process.Set("exit", func(call goja.FunctionCall) goja.Value {
		code := 0
		if len(call.Arguments) > 0 {
			code = int(call.Argument(0).ToInteger())
		}
		os.Exit(code)
		return goja.Undefined()
	})

	execPath, _ := os.Executable()
	process.Set("execPath", vm.ToValue(execPath))

	envObj := vm.NewObject()
	for _, e := range os.Environ() {
		if i := strings.IndexByte(e, '='); i >= 0 {
			envObj.Set(e[:i], vm.ToValue(e[i+1:]))
		}
	}
	process.Set("env", envObj)
	vm.Set("process", process)

	// ── console ───────────────────────────────────────────────────────────────
	console := vm.NewObject()
	makeWriter := func(w io.Writer) func(goja.FunctionCall) goja.Value {
		return func(call goja.FunctionCall) goja.Value {
			parts := make([]string, len(call.Arguments))
			for i, a := range call.Arguments {
				switch v := a.Export().(type) {
				case nil:
					parts[i] = "undefined"
				case string:
					parts[i] = v
				case bool:
					if v {
						parts[i] = "true"
					} else {
						parts[i] = "false"
					}
				case *big.Int:
					parts[i] = v.String()
				default:
					b, _ := json.Marshal(v)
					parts[i] = string(b)
				}
			}
			fmt.Fprintln(w, strings.Join(parts, " "))
			return goja.Undefined()
		}
	}
	console.Set("log", makeWriter(os.Stdout))
	console.Set("error", makeWriter(os.Stderr))
	console.Set("warn", makeWriter(os.Stderr))
	vm.Set("console", console)

	// ── crypto ────────────────────────────────────────────────────────────────
	cryptoObj := vm.NewObject()
	cryptoObj.Set("getRandomValues", func(call goja.FunctionCall) goja.Value {
		obj := call.Argument(0).ToObject(vm)
		n := int(obj.Get("length").ToInteger())
		buf := make([]byte, n)
		rand.Read(buf)
		for i := 0; i < n; i++ {
			obj.Set(strconv.Itoa(i), vm.ToValue(int(buf[i])))
		}
		return call.Argument(0)
	})
	vm.Set("crypto", cryptoObj)

	// ── fetch (synchronous HTTP, returns resolved Promise) ────────────────────
	vm.Set("fetch", func(call goja.FunctionCall) goja.Value {
		urlStr := call.Argument(0).String()

		req, err := http.NewRequest("GET", urlStr, nil)
		if err != nil {
			p, _, rej := vm.NewPromise()
			rej(vm.ToValue(err.Error()))
			return vm.ToValue(p)
		}
		if len(call.Arguments) > 1 {
			if opts, ok := call.Argument(1).Export().(map[string]interface{}); ok {
				if h, ok := opts["headers"].(map[string]interface{}); ok {
					for k, v := range h {
						req.Header.Set(k, fmt.Sprintf("%v", v))
					}
				}
			}
		}

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			p, _, rej := vm.NewPromise()
			rej(vm.ToValue(err.Error()))
			return vm.ToValue(p)
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		bodyStr := string(body)
		code := resp.StatusCode

		respObj := vm.NewObject()
		respObj.Set("ok", vm.ToValue(code >= 200 && code < 300))
		respObj.Set("status", vm.ToValue(code))
		respObj.Set("json", func(goja.FunctionCall) goja.Value {
			p, res, _ := vm.NewPromise()
			var v interface{}
			json.Unmarshal([]byte(bodyStr), &v)
			res(vm.ToValue(v))
			return vm.ToValue(p)
		})
		respObj.Set("text", func(goja.FunctionCall) goja.Value {
			p, res, _ := vm.NewPromise()
			res(vm.ToValue(bodyStr))
			return vm.ToValue(p)
		})

		p, res, _ := vm.NewPromise()
		res(vm.ToValue(respObj))
		return vm.ToValue(p)
	})

	// ── util module (parseArgs polyfill) ──────────────────────────────────────
	utilMod := vm.NewObject()
	parseArgsFn, err := vm.RunString(`(function(config) {
		var options = config.options || {};
		var allowPositionals = config.allowPositionals !== false;
		var args = config.args || [];
		var values = {}, positionals = [];
		for (var k in options) {
			values[k] = options[k].type === "boolean" ? false : undefined;
		}
		var shorts = {};
		for (var k in options) {
			if (options[k].short) shorts[options[k].short] = k;
		}
		var i = 0;
		while (i < args.length) {
			var arg = args[i];
			if (arg === "--") { i++; while (i < args.length) positionals.push(args[i++]); break; }
			if (arg.startsWith("--")) {
				var eq = arg.indexOf("="), name, val;
				if (eq !== -1) { name = arg.slice(2, eq); val = arg.slice(eq + 1); }
				else { name = arg.slice(2); val = null; }
				if (options[name]) {
					if (options[name].type === "boolean") {
						values[name] = true;
					} else {
						if (val !== null) {
							values[name] = val;
						} else if (i + 1 < args.length && !args[i+1].startsWith("-")) {
							values[name] = args[++i];
						} else {
							values[name] = undefined;
						}
					}
				}
			} else if (arg.startsWith("-") && arg.length === 2) {
				var s = arg[1], n = shorts[s];
				if (n) {
					if (options[n].type === "boolean") values[n] = true;
					else if (i + 1 < args.length && !args[i+1].startsWith("-")) values[n] = args[++i];
				}
			} else if (allowPositionals) {
				positionals.push(arg);
			}
			i++;
		}
		return { values: values, positionals: positionals };
	})`)
	if err != nil {
		fmt.Fprintln(os.Stderr, "failed to compile parseArgs:", err)
		os.Exit(1)
	}
	utilMod.Set("parseArgs", parseArgsFn)

	// ── child_process module ──────────────────────────────────────────────────
	cpMod := vm.NewObject()
	cpMod.Set("spawnSync", func(call goja.FunctionCall) goja.Value {
		name := call.Argument(0).String()
		var cargs []string
		if len(call.Arguments) > 1 {
			if arr, ok := call.Argument(1).Export().([]interface{}); ok {
				for _, a := range arr {
					cargs = append(cargs, fmt.Sprintf("%v", a))
				}
			}
		}
		cmd := exec.Command(name, cargs...)
		if len(call.Arguments) > 2 {
			if opts, ok := call.Argument(2).Export().(map[string]interface{}); ok {
				if opts["stdio"] == "inherit" {
					cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
				}
			}
		}
		status := 0
		if err := cmd.Run(); err != nil {
			if ex, ok := err.(*exec.ExitError); ok {
				status = ex.ExitCode()
			} else {
				status = 1
			}
		}
		res := vm.NewObject()
		res.Set("status", vm.ToValue(status))
		return res
	})

	// ── require ───────────────────────────────────────────────────────────────
	requireFn := func(call goja.FunctionCall) goja.Value {
		switch call.Argument(0).String() {
		case "util":
			return utilMod
		case "child_process":
			return cpMod
		default:
			panic(vm.NewTypeError("Unknown module: " + call.Argument(0).String()))
		}
	}
	vm.Set("require", requireFn)

	// ── run bundle ────────────────────────────────────────────────────────────
	// The CJS bundle is (function(exports, require, module, __filename, __dirname) { ... })
	// Invoke it with our require implementation.
	script := stripShebang(bundleJS)
	wrapper := `(function(){var e={};var m={exports:e};(` +
		script +
		`)(e,require,m,"jetid","/");})();`

	_, runErr := vm.RunString(wrapper)
	if runErr != nil {
		if ex, ok := runErr.(*goja.Exception); ok {
			fmt.Fprintln(os.Stderr, ex.Value().String())
		} else {
			fmt.Fprintln(os.Stderr, runErr.Error())
		}
		os.Exit(1)
	}
}
