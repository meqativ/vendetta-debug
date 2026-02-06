// Suppress Node.js warning about experimental fetch API
// Ref: https://github.com/nodejs/node/issues/30810#issuecomment-1383184769
let WebSocketServer, colors;
try {
  WebSocketServer = (await import("ws")).WebSocketServer;
  colors = (await import("ansi-colors")).default;
} catch (err) {
  console.error(
    "You forgot to install the dependencies.\n" +
      "https://github.com/meqativ/vendetta-debug#installing"
  );
  process.exit(1);
}
import { hostname } from "node:os";
import repl from "node:repl";
import { parseArgs } from "node:util";
import * as fs from "node:fs/promises";
let defaults = {};
try {
	defaults = JSON.parse(await fs.readFile("./defaults.json"))
} catch (e) {
	console.error(
		"Invalid defaults.json"
	)	
	console.error(e)
	process.exit(1)
}
let isPrompting = false;
const args = parseArgs({
  options: {
    h: {
      type: "boolean",
    },
    help: {
      type: "boolean",
    },
    silent: {
      type: "string",
      default: `${defaults?.silent ?? "0"}`,
    },
    port: {
      type: "string",
      default: `${defaults?.port ?? "9090"}`,
    },
    onConnectedPath: {
      type: "string",
      default: defaults?.onConnectedPath,
    },
    client: {
      type: "string",
      default: defaults?.client ?? "Vendetta",
    },
    clientName: {
      type: "string",
      default: defaults?.clientName ?? "Vendetta",
    },
    clientColor: {
      type: "string",
      default: defaults?.clientColor ?? "cyan",
    },
    noStyle: {
      type: "boolean",
      default: defaults?.noStyle ?? false,
    },
  },
});
if (args.values.noStyle) colors.enabled = false;

if (args?.values.help || args?.values?.h) {
  let cmdlu = (await import("command-line-usage")).default;
	const { generate } = await import("./help.js");
	console.log(generate(cmdlu));
  process.exit(0);
}
// parse client,, stuff; TODO: decide whether COLORS below args parsing part looks better
let client = args.values.client;
const supportedClients = ["enmity", "vendetta", "none"];
if (!supportedClients.includes(client.toLowerCase())) {
  throw new Error(
    `The option "client" has a unsupported client. It should be: ${
      supportedClients.length === 2
        ? supportedClients.join(" or ")
        : supportedClients.slice(0, -1).join(", ") +
          " or " +
          supportedClients.slice(-1)
    }`
  );
}
let clientColor;
if (
  args.values.clientColor !== "none" &&
  !Object.values(colors.keys)
    .filter((prop) => Array.isArray(prop))
    .flat()
    .includes(args.values.clientColor)
) {
  throw new Error(`The option "clientColor" has an invalid color`);
} else {
  if (client.toLowerCase() === "vendetta") clientColor = "cyan";
  if (client.toLowerCase() === "enmity") clientColor = "blue";
  clientColor = args.values.clientColor;
}
let clientName;
if (client.toLowerCase() === "vendetta") clientName = "Vendetta";
if (client.toLowerCase() === "enmity") clientName = "Enmity";
clientName = args.values.clientName;
const COLORS = {
  client: {
    info: clientColor === "none" ? (t) => t : colors[clientColor],
    warning: colors.yellow,
    error: colors.red,
  },
  debugger: {
    info: colors.magenta.bold,
    warning: colors.yellow.bold,
    error: colors.red.bold,
  },
};

// Parse arguments
const silentLvl = Number(args?.values?.silent ?? 0);
if (Number.isNaN(silentLvl))
  throw new Error('The option "silent" should be a number.');
if (silentLvl > 2 || silentLvl < 0)
  throw new Error('The option "silent" should in range 0-2.');

const wssPort = Number(args?.values?.port ?? 9090);
if (Number.isNaN(wssPort))
  throw new Error('The option "port" should be a number.');

const onConnectedPath = args?.values?.onConnectedPath;
let onConnectedCode = undefined;
if (typeof onConnectedPath !== "undefined") {
  await fs.access(onConnectedPath, fs.constants.R_OK).catch((e) => {
    console.log(`The path in "onConnectedPath" is not accessible`);
    console.error(e);
    process.exit(e.errno);
  });
  onConnectedCode = await fs.readFile(onConnectedPath, "utf-8");
  if (onConnectedCode === "")
    debuggerWarning(`The file in "onConnectedPath" is empty`);
}

// Utility functions for more visually pleasing logs
// Get out of user input area first if prompt is currently being shown
function colorise(message, source, color) {
  return color(`[${source}] `) + message;
}
function safeLog(data) {
  console.log((isPrompting ? "\n" : "") + data);
}

function discordColorise(data) {
  let { message, level } = JSON.parse(data);
  // Normal logs don't need extra colorization
  switch (level) {
    case 0: // Info
      message = COLORS.client.info(message);
      break;
    case 2: // Warning
      message = COLORS.client.warning(message);
      break;
    case 3: // Error
      message = COLORS.client.error(message);
      break;
  }
  return colorise(message, clientName, COLORS.client.info);
}
function discordLog(message) {
  return safeLog(silentLvl === 2 ? message : discordColorise(message));
}

function debuggerColorise(message) {
  return colorise(message, "Debugger", COLORS.debugger.info);
}
function debuggerLog(message) {
  safeLog(silentLvl === 2 ? message : debuggerColorise(message));
}
function debuggerWarning(message) {
  safeLog(colorise(message, "Debugger", COLORS.debugger.warning));
}
function debuggerError(error, isReturning) {
  safeLog(colorise("Error", "Debugger", COLORS.debugger.error));
  if (isReturning) {
    return error;
  }
  console.error(error);
}

// Display welcome message and basic instructions
if (silentLvl < 1)
  console.log(
    colors.bold(
      `👉 Welcome to the debugger. (${client}; ${COLORS.client.info(
        clientName
      )})\n`
    ) +
      "Press Ctrl+C to exit.\n" +
      "How to connect to the debugger: https://github.com/meqativ/vendetta-debug/blob/master/README.md#connecting"
  );

// Create websocket server and REPL, and wait for connection
const wss = new WebSocketServer({ port: wssPort });
wss.on("listening", (ws) => {
  if (silentLvl < 2)
    debuggerLog(`Listening for connections on port ${wss.address().port}`);
});
wss.on("connection", (ws) => {
  if (silentLvl < 2)
    debuggerLog(
      `Connected to ${client} over websocket, starting debug session`
    );
	console.log("meow?")
  isPrompting = false; // REPL hasn't been created yet
  let finishCallback;

  // Handle logs returned from Discord client via the websocket
  ws.on("message", (data) => {
    try {
      if (finishCallback) {
        finishCallback(null, data);
        finishCallback = undefined;
      } else {
        discordLog(data);
      }
    } catch (e) {
      debuggerError(e, false);
    }
    isPrompting = true;
    rl.displayPrompt();
  });

  // Create the REPL
  console.log(Object.getOwnPropertyNames(repl))
  const rl = repl.start({
    eval: (inputRaw, ctx, filename, cb) => {
      try {
        if (!inputRaw.trim()) {
          cb();
        } else {
          isPrompting = false;
          let input = inputRaw;
          if (client.toLowerCase() === "vendetta") {
            input = `const res=(0, eval)(${JSON.stringify(
              inputRaw
            )});let out=vendetta.metro.findByProps("inspect").inspect(res,{showHidden:true});if(out!=="undefined")console.log(out);res`;
          } else if (client.toLowerCase() === "enmity") {
            input = `const res=(0, eval)(${JSON.stringify(
              inputRaw
            )});console.log(enmity.modules.getByProps("inspect").inspect(res,{showHidden:true}));if(res!=="undefined")console.log(res);res`;
          }
          ws.send(input);
          finishCallback = cb;
        }
      } catch (e) {
        cb(e);
      }
    },
    writer: (data) => {
      return data instanceof Error
        ? debuggerError(data, true)
        : discordColorise(data);
    },
  });
  rl.setupHistory("~/.config/vendetta-debug/.replHistory", (err, repl) => {
    if (err) return debuggerError(err);
    if (silentLvl < 2) debuggerLog("Prompt history loaded");
  });
  isPrompting = true; // Now the REPL exists and is prompting the user for input

  rl.on("close", () => {
    if (silentLvl < 2) debuggerLog("Closing debugger, press Ctrl+C to exit");
  });

  ws.on("close", () => {
    if (silentLvl < 2) debuggerLog("Websocket has been closed");
    isPrompting = false;
    rl.close();
  });
  if (onConnectedCode) ws.send(onConnectedCode);
});
