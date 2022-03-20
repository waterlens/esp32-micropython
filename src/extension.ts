import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";
import { ConnectionHandler, getIpAddr, DeviceType, DeviceId, getSerialPort } from "./connectionHandler";
// import { EmpTerminal, TerminalHandler } from "./terminal";
import { EmpTerminal, TerminalWrapper } from "./terminal";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  // This map is used to hold map<port-path, port> 
  // let portMap = new Map();

  const portView = new PortProvider();
  const downloadUtil = new DownloadUtil();
  const terminalWrapper = new TerminalWrapper();
  // const terminalHandler = new TerminalHandler();

  vscode.window.registerTreeDataProvider("emp.port", portView);
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.port.refresh", () =>
      portView.refresh()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("emp.download.esptool", () =>
      downloadUtil.downloadESPTool()
    )
  );

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

}

export function deactivate() {}
