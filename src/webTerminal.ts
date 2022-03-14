import { ByteLengthParser } from 'serialport';
import * as vscode from 'vscode';
// import { WebSocket } from 'isomorphic-ws';
// const WebSocket = require('isomorphic-ws')
// import websocket = require('websocket');
import { MicroPythonDevice } from 'micropython-ctl';
// import WebSocket = require('ws');
// import { ClientOptions } from 'ws';


export class WebTerminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;

	private closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;

	// private connection;
	// private parser = new ByteLengthParser({length: 1});
	// private portMap;
	// private portPath;
    private url;
    private passWord;
    private binaryState = 0;

	handleInput(data: string): void {

    }

	constructor(url: string, passWord: string) {
        this.url = url;
        this.passWord = passWord;

        (async () => {
            const micropython = new MicroPythonDevice();

            // Connect to micropython device
            await micropython.connectNetwork(url, passWord);
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

        // class MyConfig implements ClientOptions {
        //     followRedirects = true;
        //     protocal = ['http', 'ws'];
        //     maxRedirects = 100;
        //     origin = 'null';
        //     headers = ['test']: 'test';
        // }

        // this.connection = new WebSocket(url, new MyConfig());

        // console.log(this.connection);
        // let ws = this.connection;
        // ws.onopen = function open() {
        //     console.log('connected');
        //     ws.send(Date.now());
        // };
        
        // ws.onclose = function close() {
        // console.log('disconnected');
        // };
        
        // ws.onmessage = function incoming(data: any) {
        // console.log(`Roundtrip time: ${Date.now() - data} ms`);
        
        // setTimeout(function timeout() {
        //     ws.send(Date.now());
        // }, 500);
        // };
    }

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        console.log('testing');
	}

	close(): void {
		// this.portMap.delete(this.portPath);
		// terminalMap.delete(this.portPath);
	}
}