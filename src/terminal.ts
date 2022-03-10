import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { SerialPortStream } from "@serialport/stream";
import {
  SetOptions,
  BindingInterface,
  PortInterfaceFromBinding,
  OpenOptionsFromBinding,
} from "@serialport/bindings-interface";
import { TestRunRequest, window } from "vscode";

export function showAvailablePorts() {
  const portList = SerialPort.list();
  portList.then((ports) => console.log(ports));
}

export function launchTerminal() {
  showAvailablePorts();
  const parser = new ReadlineParser({ delimiter: "\r\n" });
  const port = new SerialPort({
    path: "COM4",
    baudRate: 115200,
    hupcl: false,
  });
  let output = window.createOutputChannel("ESP Terminal");
  port.pipe(parser);
  parser.on("error", (err) => {
    output.appendLine("Error: " + err);
  });
  parser.on("open", () => output.appendLine("Port opened"));
  parser.on("data", (data) => output.appendLine(data.toString()));
  port.write("help()\r\n");
  port.write("import machine\r\n");
  port.write("machine.soft_reset()\r\n");
}
