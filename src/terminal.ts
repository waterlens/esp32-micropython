import { SerialPort } from "serialport";
import { DeviceId, DeviceType, EmpDevice } from "./connectionHandler";
import * as vscode from 'vscode';
import { WebTerminal } from "./webTerminal";
import { getIpAddr, getSerialPort, ConnectionHandler } from "./connectionHandler";
import { ChildProcess } from "child_process";
import { dir } from "console";
import { createWriteStream } from "fs";
import { Stream } from "stream";

export function showAvailablePorts() {
  const portList = SerialPort.list();
  portList.then((ports) => console.log(ports));
}

export class EmpTerminal implements vscode.Pseudoterminal {
	writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;

	closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	private device: EmpDevice;
    private mpremoteHandle: ChildProcess | undefined;
    private officialHandle: ChildProcess | undefined;
    private usingMpremote: boolean;
    private usingOfficial: boolean;

	handleInput(data: string): void {
        this.device.sendData(data);
	}

	constructor(device: EmpDevice) {
		this.device = device;
        this.usingMpremote = false;
        this.usingOfficial = false;
		device.attachTerminal(this);
	}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {

	}

	close(): void {
		this.device.detachTerminal(this);
	}

    overTake(handle: ChildProcess, showOutput?: boolean): void {
        this.usingMpremote = true; 
        this.mpremoteHandle = handle;
        if (showOutput === undefined || showOutput === true) {
            handle.stdout?.on('data', (data) => {
                this.writeEmitter.fire(data);
            });
        }
    }

    serialOverTake() {
        this.usingMpremote = false;
    }

    officialOverTake(handle: ChildProcess, showOutput?: boolean): void {
        this.usingOfficial = true;
        this.mpremoteHandle = handle;
        if (showOutput === undefined || showOutput === true) {
            handle.stdout?.on('data', (data) => {
                this.writeEmitter.fire(data.toString().replace("\n", "\r\n"));
            });
        }
    }

    selfMaintainedOverTake(): void {
        this.usingOfficial = false;
    }
}

export class TerminalWrapper {
	private static connectionHandler = new ConnectionHandler();
    private static idTerminalListMap: Map<string, [EmpTerminal]> = new Map();
    private static idDeviceMap: Map<string, EmpDevice> = new Map();
    private static webDeviceList: Map<string, EmpDevice> = new Map();

    constructor(private context: vscode.ExtensionContext) {}



    register() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand("emp.terminal.launch", async () => {
                TerminalWrapper.createSerialTerminal();
            })
        );

        this.context.subscriptions.push(
            vscode.commands.registerCommand("emp.terminal.webrepl", async () => {
                TerminalWrapper.createWebTerminal();
            })
        );
    }

	static async createSerialTerminal(serialPort?: string) {
		let serialPortNumber = serialPort || await getSerialPort();
		console.log(serialPortNumber);
		let deviceId = new DeviceId(DeviceType.serialDevice, serialPortNumber);
		let device = await this.connectionHandler.takeDevice(deviceId);
		// let terminal = terminalHandler.getTerminal(deviceId, device);
        TerminalWrapper.idDeviceMap.set(serialPortNumber, device);
        let pty = new EmpTerminal(device);
		let terminal = vscode.window.createTerminal({
					name: "Serial: " + deviceId.devicePath,
					pty: pty,
		});
        if (TerminalWrapper.idTerminalListMap.has(serialPortNumber)) {
            TerminalWrapper.idTerminalListMap.get(serialPortNumber)?.push(pty);
        } else {
            TerminalWrapper.idTerminalListMap.set(serialPortNumber, [pty]);
        }
		terminal.show();
	}	

	static async createWebTerminal(ip?: string) {
        let ipAddr = ip || await getIpAddr();
        let deviceId = new DeviceId(DeviceType.webDevice, ipAddr);
        // console.log(ipAddr);
        let device = await TerminalWrapper.connectionHandler.takeDevice(deviceId);
        // let terminal = terminalHandler.getTerminal(deviceId, device);
        TerminalWrapper.idDeviceMap.set(ipAddr, device);
        TerminalWrapper.webDeviceList.set(ipAddr, device);
        let pty = new EmpTerminal(device);
        let terminal = vscode.window.createTerminal({
                    name: "ws://" + deviceId.devicePath + ":8266",
                    pty: pty,
        });
        if (TerminalWrapper.idTerminalListMap.has(ipAddr)) {
            TerminalWrapper.idTerminalListMap.get(ipAddr)?.push(pty);
        } else {
            TerminalWrapper.idTerminalListMap.set(ipAddr, [pty]);
        }
        terminal.show();
    }

    static suspendSerialDevice(port: string) {
        // let token = new DeviceId(DeviceType.serialDevice, port);
        let device = TerminalWrapper.idDeviceMap.get(port);
        device?.suspend();
    }

    static suspendWebDevice(ip: string) {
        let device = TerminalWrapper.idDeviceMap.get(ip);
        device?.suspend();
    }

    // actually, this is get file list..
    static getDeviceFiles(address: string, type: DeviceType, path?: string): void {
        let device = TerminalWrapper.idDeviceMap.get(address);
        if (!device) {
            if (type = DeviceType.serialDevice) {
                this.createSerialTerminal(address);
            } else {
                this.createWebTerminal(address);
            }
            device = TerminalWrapper.idDeviceMap.get(address);
        }
        if (device) {
            device.getFiles();
        } else {

        }
    }

    // // this function download remote file to local folder, so we can edit them directly
    // static downloadFile(fileName: string) {
    //     vscode.window.showInformationMessage("trying to open" + fileName);
    // }

    static letMpremoteTakeOver(port: string, handle: ChildProcess, showOutput?: boolean) {
        // let token = new DeviceId(DeviceType.serialDevice, port);
        let list = TerminalWrapper.idTerminalListMap.get(port);
        if (list) {
            for (let i of list) {
                i.overTake(handle, showOutput);
            }
        }
    }

    static letSerialTakeOver(port: string) {
        let list = TerminalWrapper.idTerminalListMap.get(port);
        if (list) {
            for (let i of list) {
                i.serialOverTake();
            }
        }
    }

    static letOfficialTakeOver(ip: string, handle: ChildProcess, showOutput?: boolean) {
        let list = TerminalWrapper.idTerminalListMap.get(ip);
        if (list) {
            for (let i of list) {
                i.officialOverTake(handle, showOutput);
            }
        }
    }

    static letSelfMaintainedTakeOver(ip: string) {
        let list = TerminalWrapper.idTerminalListMap.get(ip);
        if (list) {
            for (let i of list) {
                i.selfMaintainedOverTake();
            }
        }
    }

    static wakenSerialDevice(port: string, executeFile: boolean) {
        let device = TerminalWrapper.idDeviceMap.get(port);
        device?.waken(executeFile);
    }

    static wakenWebDevice(port: string, executeFile: boolean) {
        let device = TerminalWrapper.idDeviceMap.get(port);
        device?.waken(executeFile);
    }

    static getWebDeviceList() {
        let ret = Array.from(TerminalWrapper.webDeviceList.keys());
        return ret;
    }
}