// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
	onPhaseChange: (callback) => ipcRenderer.on("phase", callback),
	onAttackCount: (callback) => ipcRenderer.on("attack", callback),
	onTickCounter: (callback) => ipcRenderer.on("tick", callback),

	sendEvent: (event) => ipcRenderer.send(event, {}),
})
