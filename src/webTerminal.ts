import { ByteLengthParser, InterByteTimeoutParser } from 'serialport';
import * as vscode from 'vscode';
// import { WebSocket } from 'isomorphic-ws';
// const WebSocket = require('isomorphic-ws')
// import websocket = require('websocket');
import { MicroPythonDevice } from 'micropython-ctl';
// import WebSocket = require('ws');
// import { ClientOptions } from 'ws';

export function pickWebDevice(micropythonDeviceMap: Map<string, MicroPythonDevice>) {
    const ipBar = vscode.window.createInputBox();
    let ipAddr: string;
    ipBar.onDidChangeValue((val: string) => {
        ipAddr = val;
    });
    ipBar.onDidAccept(() => {
        ipBar.dispose();
        enterPassword(micropythonDeviceMap, ipAddr);
    });
    ipBar.onDidHide(() => {
        console.log(ipAddr);
    });
    ipBar.show();
}

function enterPassword(micropythonDeviceMap: Map<string, MicroPythonDevice>, ipAddr: string) {
    const passwordBar = vscode.window.createInputBox();
    let password: string;
    passwordBar.password = true;
    passwordBar.onDidChangeValue((val: string) => {
        password = val;
    });
    passwordBar.onDidAccept(() => {
        passwordBar.dispose();

    });
    passwordBar.onDidHide(() => {
        console.log(password);
    });
    passwordBar.show();
}

export class WebTerminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;

	private closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	// private connection;
	// private parser = new ByteLengthParser({length: 1});
	// private portMap;
	// private portPath;
    private ipAddr;
    private passWord;
    private binaryState = 0;

	handleInput(data: string): void {

    }

	constructor(micropythonDeviceMap: Map<string, MicroPythonDevice>, ipAddr: string, passWord: string) {
        this.ipAddr = ipAddr;
        this.passWord = passWord;

        (async () => {
            const micropython = new MicroPythonDevice();

            // Connect to micropython device
            await micropython.connectNetwork("ws://" + ipAddr + ":8266", passWord);
            // await micropython.connectSerial('/dev/ttyUSB0')

            // Run a Python script and capture the output
            const output = await micropython.runScript('import os; print(os.listdir())');
            console.log('runScript output:', output);

            // List all files in the root
            const files = await micropython.listFiles();
            console.log('files:', files);
            // Close
            // await micropython.close()
        })();
    }

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        console.log('testing');
	}

	close(): void {
		// this.portMap.delete(this.portPath);
		// terminalMap.delete(this.portPath);
	}
}