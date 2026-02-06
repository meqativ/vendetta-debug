# Vendetta Debugger

A remote debugger for [Vendetta](https://github.com/vendetta-mod) and other mods (Kettu, ShiggyCord, Raincord, Enmity), forked from [@colin273/enmity-debugger](https://github.com/colin273/enmity-debug). This connects over a websocket to the Discord app with a supported mod installed and allows you to execute JavaScript in the Discord app from the command line. The REPL in this debugger is a slightly modified version of the [default REPL in Node.js](https://nodejs.org/api/repl.html), including the same commands and some support for multi-line code snippets.

## Installing

0. Install Bun (node also works)
Follow the instructions @ https://bun.sh/

1. Download the debugger
```bash
git clone https://github.com/meqativ/vendetta-debug && cd vendetta-debug
```

2. Install the dependencies
```bash
bun install
```

## Running

To start the debugger, run the index.js file from the `vendetta-debug` folder:

```bash
bun run ./index.js
```

For help on the options, `--help` or [look here](options.md).

## Connecting
> **Note**
> This guide is only applicable to Vendetta

<details>

<summary> 0. Make sure you have the Vendetta developer settings enabled. </summary>

---
1. Open the you tab
2. Locate and press the button to open the "General" page
![A screenshot with highlights for steps 1 & 2](readmeAssets/General.png)
3. Locate and enable "Developer Settings"
![A screenshot with highlights for step 3](readmeAssets/Developer_Settings.png)</br>
---

</details>

1. Open the Developer page
![A screenshot with highlights for step 2](readmeAssets/Developer.png)
2. Fill in your Debugger URL
3. Locate and press the "Connect to debug websocket" button
![A screenshot with highlights for steps 2 & 3](readmeAssets/URL_and_connect.png)
4. :tada: It should connect now and show this in your console
``[Debugger] Connected to Discord over websocket, starting debug session``

### Auto-connect
You can use an option in the devkitplus ([Direct](https://vd-plugins.github.io/proxy/redstonekasi.github.io/vendetta-plugins/devkitplus/) | [Vendetta › #plugins › 💬](https://discord.com/channels/1015931589865246730/1092870826145091655)) plugin, to connect when Vendetta loads up.

0. Install the plugin
1. Open the plugin's settings
2. Enable "Auto debugger"
(You need to fill in the ["Debugger URL"](https://github.com/meqativ/vendetta-debug#:~:text=Fill%20in%20your%20Debug%20URL) for it to connect properly)

## Quitting

Once you have finished debugging and closed the debugger REPL, press `Ctrl+C` on your keyboard to quit the CLI.

