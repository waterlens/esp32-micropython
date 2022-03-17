import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";
import { ConnectionHandler, getIpAddr, DeviceType, DeviceId, getSerialPort } from "./connectionHandler";
// import { EmpTerminal, TerminalHandler } from "./terminal";
import { EmpTerminal } from "./terminal";

export function activate(context: vscode.ExtensionContext) {
  console.log('"esp32-micropython" is now active!');
  // This map is used to hold map<port-path, port> 
  // let portMap = new Map();

  const portView = new PortProvider();
  const downloadUtil = new DownloadUtil();
  const connectionHandler = new ConnectionHandler();
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
      let serialPortNumber = await getSerialPort();
      console.log(serialPortNumber);
      let deviceId = new DeviceId(DeviceType.serialDevice, serialPortNumber);
      let device = await connectionHandler.takeDevice(deviceId);
      // let terminal = terminalHandler.getTerminal(deviceId, device);
      let terminal = vscode.window.createTerminal({
				name: "Serial: " + deviceId.devicePath,
				pty: new EmpTerminal(device),
      });
      terminal.show();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("emp.terminal.webrepl", async () => {
      let ipAddr = await getIpAddr();
      let deviceId = new DeviceId(DeviceType.webDevice, ipAddr);
      console.log(ipAddr);
      let device = await connectionHandler.takeDevice(deviceId);
      // let terminal = terminalHandler.getTerminal(deviceId, device);
      let terminal = vscode.window.createTerminal({
				name: "ws://" + deviceId.devicePath + ":8266",
				pty: new EmpTerminal(device),
      });
      terminal.show();
    })
  );

}

export function deactivate() {}
