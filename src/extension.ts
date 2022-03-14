import { MicroPythonDevice } from "micropython-ctl";
import * as vscode from "vscode";
import { DownloadUtil } from "./downloadUtil";
import { PortProvider } from "./portView";
import { ConnectionHandler, getIpAddr, DeviceType, DeviceId, getSerialPort } from "./connectionHandler";

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
      const micropython = new MicroPythonDevice()

      // Connect to micropython device over network
      // await micropython.connectNetwork('DEVICE_IP', 'WEBREPL_PASSWORD')

      // Or connect to micropython device over serial interface
      await micropython.connectSerial(serialPortNumber)

      // Run a Python script and capture the output
      const output = await micropython.runScript('import os; print(os.listdir())')
      console.log('runScript output:', output)

      // List all files in the root
      const files = await micropython.listFiles()
      console.log('files:', files)

      // Get file contents
      const fileContents = await micropython.getFile('boot.py')
      console.log(fileContents)

      // Set a terminal (REPL) data handler, and send data to the REPL
      micropython.onTerminalData = (data) => process.stdout.write(data)
      micropython.sendData('\x03\x02')  // Ctrl+C and Ctrl+B to enter friendly repl and print version
      // connectionHandler.takeDevice(new DeviceId(DeviceType.serialDevice, serialPortNumber));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("emp.terminal.webrepl", async () => {
      let ipAddr = await getIpAddr();
      console.log(ipAddr);
      connectionHandler.takeDevice(new DeviceId(DeviceType.webDevice, ipAddr));
    })
  );

}

export function deactivate() {}
