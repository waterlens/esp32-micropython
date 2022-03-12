import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";
import { TerminalWrapper, pickPort } from "./terminal";
// import { CustomBuildTaskProvider } from "./terminal";


export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  // This map is used to hold map<port-path, port> 
  let portMap = new Map();

  const portView = new PortProvider();
  const downloadUtil = new DownloadUtil();

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

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("emp.terminal.connect", (portPath: string) => {
  //     // new TerminalWrapper(portMap, portPath)
  //   })
  // );

  context.subscriptions.push(
   vscode.commands.registerCommand("emp.terminal.launch", async () => 
      {
        pickPort(portMap);
        console.log(portMap);
      }
    )
  );

}

export function deactivate() {}
