import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { SerialPortStream } from "@serialport/stream";
import { ByteLengthParser } from "serialport";
import {
  SetOptions,
  BindingInterface,
  PortInterfaceFromBinding,
  OpenOptionsFromBinding,
} from "@serialport/bindings-interface";
import { TestRunRequest, window } from "vscode";
import * as path from 'path';
import * as vscode from 'vscode';
import { maxHeaderSize } from "http";

export function showAvailablePorts() {
  const portList = SerialPort.list();
  portList.then((ports) => console.log(ports));
}

export class EmpTerminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;

	

	private closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	private port;
	private parser;
	private portMap;

	handleInput(data: string): void {
		this.port?.write(data);
	}

	constructor(portMap: Map<string, SerialPort>, portPath: string) {
		this.portMap = portMap;

		this.port = portMap.get(portPath);
		// this.parser = new ReadlineParser({ delimiter: "\r\n" });
		this.parser = new ByteLengthParser({length: 1});
		this.port?.pipe(this.parser);


		this.parser.on("error", (err) => {
			this.writeEmitter.fire("Error: " + err.toString() + "\r\n");
		});

		this.parser.on("open", () => {
			this.writeEmitter.fire("Serial Connected: " + portPath + "\r\n");
		});

		this.parser.on("data", (data) => {
			this.writeEmitter.fire(data.toString());
		});
	}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {


		const portList = SerialPort.list();
		let pathName = "";
		portList.then((ports) => {
			if (ports.length > 1) {
				this.writeEmitter.fire("Please select");
				for (let port of ports) {
					this.writeEmitter.fire(port.path);
				}
			} else {

			}
		});
		console.log('it is open');
	}

	close(): void {

	}
}

let terminalMap = new Map();

export class TerminalWrapper {
	terminal;
	portPath;

	constructor(portMap: Map<string, SerialPort>, portPath: string) {
		this.portPath = portPath;
		if (!terminalMap.has(portPath)) {
			this.terminal = (<any>vscode.window).createTerminal({
				name: 'Serial: ' + portPath,
				pty: new EmpTerminal(portMap, portPath),
			});
			terminalMap.set(portPath, this.terminal);
		} else {
			this.terminal = terminalMap.get(portPath);
		}

	}

	show() {
		this.terminal.show();
	}
}

class PortPickItem implements vscode.QuickPickItem{
	label: string;
	constructor(name: string) {
		this.label = name;
	}
}


// Pop up a quick pick window, let user to choose a serial port path
// It the port is not connected yet, add the port to the path
export function pickPort(portMap: Map<string, SerialPort>) {
	const quickPick = vscode.window.createQuickPick();
	const portList = SerialPort.list();
	portList.then((ports) => {
		quickPick.items = ports.map(port => new PortPickItem(port.path));
	});
	quickPick.onDidHide(() => quickPick.dispose());
	quickPick.onDidChangeSelection(
		selection => {
			let portPath = selection[0].label;
			quickPick.dispose();
			if (!portMap.has(portPath)) {
				portMap.set(portPath, new SerialPort({
					path: portPath,
					baudRate: 115200,
					hupcl: false,
				}));
			}
			new TerminalWrapper(portMap, portPath).show();

		}
	);
	quickPick.show();
}
