import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";

import { ConnectionHandler, getIpAddr, DeviceType, DeviceId, getSerialPort } from "./connectionHandler";
// import { EmpTerminal, TerminalHandler } from "./terminal";
import { EmpTerminal, TerminalWrapper } from "./terminal";
import { PortItem, PortProvider } from "./portView";
import { ESPToolWrapper } from "./esptool";
import { ConnectionUtil } from "./connection";
import { LanguageSupport } from "./language";
import { WebreplTreeView } from "./webreplView";


export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  // This map is used to hold map<port-path, port> 
  // let portMap = new Map();

  const terminalWrapper = new TerminalWrapper(context);
  const portView = new PortProvider(context);
  const esptoolWrapper = new ESPToolWrapper(context);
  const connectionUtil = new ConnectionUtil(context);
  const languageSupport = new LanguageSupport(context);
  const webreplTreeView = new WebreplTreeView(context);
  
  portView.register();
  esptoolWrapper.register();
  connectionUtil.register();
  languageSupport.register();
  terminalWrapper.register();
  webreplTreeView.register();
}

export function deactivate() {}
