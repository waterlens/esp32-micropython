import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";
import { ConnectionHandler, getIpAddr, DeviceType, DeviceId, getSerialPort } from "./connectionHandler";
import { EmpTerminal } from "./terminal";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  // This map is used to hold map<port-path, port> 
  // let portMap = new Map();

  const portView = new PortProvider();
  const downloadUtil = new DownloadUtil();
  const connectionHandler = new ConnectionHandler();

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
      let serialPortNumber = await getSerialPort();
      console.log(serialPortNumber);
      let device = await connectionHandler.takeDevice({deviceType: DeviceType.serialDevice, devicePath: serialPortNumber});
      let terminal: vscode.Pseudoterminal = new EmpTerminal(device);
      let terminalWrapper = vscode.window.createTerminal({
        name: "Serial: " + serialPortNumber,
        pty: terminal,
      });
      terminalWrapper.show();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("emp.terminal.webrepl", async () => {
      let ipAddr = await getIpAddr();
      console.log(ipAddr);
      let device = await connectionHandler.takeDevice(new DeviceId(DeviceType.webDevice, ipAddr));
      let terminal: vscode.Pseudoterminal = new EmpTerminal(device);
      let terminalWrapper = vscode.window.createTerminal({
        name: "ws://" + ipAddr + ":8266",
        pty: terminal,
      });
      terminalWrapper.show();
    })
  );

}

export function deactivate() {}
