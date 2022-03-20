import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";

import { ConnectionHandler, getIpAddr, DeviceType, DeviceId, getSerialPort } from "./connectionHandler";
// import { EmpTerminal, TerminalHandler } from "./terminal";
import { EmpTerminal, TerminalWrapper } from "./terminal";
import { PortItem, PortProvider } from "./portView";
import { ESPToolWrapper } from "./esptool";
import { ConnectionUtil } from "./connection";


export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  // This map is used to hold map<port-path, port> 
  // let portMap = new Map();

  const terminalWrapper = new TerminalWrapper();
  // const terminalHandler = new TerminalHandler();

  context.subscriptions.push(
    vscode.commands.registerCommand("emp.terminal.launch", async () => {
      terminalWrapper.createSerialTerminal();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("emp.terminal.webrepl", async () => {
      terminalWrapper.createWebTerminal();
    })
  );

  const portView = new PortProvider(context);
  const esptoolWrapper = new ESPToolWrapper(context);
  const connectionUtil = new ConnectionUtil(context);
  
  portView.register();
  esptoolWrapper.register();
  connectionUtil.register();
}

export function deactivate() {}
