import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";
import { TerminalWrapper, pickPort } from "./terminal";
import { WebTerminal } from "./webTerminal";
// import { MicroPythonDevice } from "micropython-ctl";
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

  context.subscriptions.push(
    vscode.commands.registerCommand("emp.terminal.webrepl", async () => {
      // new WebTerminal('192.168.137.167', '810975');
      // new WebTerminal('192.168.137.135', '810975');
      const micropython = new MicroPythonDevice();
      await micropython.connectNetwork('192.168.219.173', '810975', 5);
      const output = await micropython.runScript('print("hello world")');
      console.log('runScript output: ', output);
    })
  );

}

export function deactivate() {}
