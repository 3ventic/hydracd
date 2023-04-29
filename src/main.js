const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron")
const path = require("path")

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
	app.quit()
}

/** @type {BrowserWindow} */
let mainWindow

const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 150,
		height: 100,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
		fullscreenable: false,
		minimizable: true,
		autoHideMenuBar: true,
		alwaysOnTop: true,
		frame: false,
		titlebarStyle: "hidden",
		transparent: true,
	})

	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, "index.html"))

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()
}

const State = Object.freeze({
	NOT_STARTED: "none",
	PHASE_1: 1,
	PHASE_2: 2,
	PHASE_3: 3,
	PHASE_4: 4,
})

// Attack speed 4
// setin koko 3 -> 1
// aloittaa vastakkaisella

const tickDelay = 600
const ticksBetweenAttacks = () => {
	if (state === State.PHASE_4) {
		return 4
	}
	return 6
}
const phaseDelays = new Map()
phaseDelays.set(State.PHASE_1, 9)
phaseDelays.set(State.PHASE_2, 8)
phaseDelays.set(State.PHASE_3, 6)
const phaseThreeSpecialDelay = 27

let state = State.NOT_STARTED
let startedWith = null
let attacksUntilSpecial = 0
let intId = -1
let phaseChangeDelay = 0
let attacks = 0
let attackType = false
let tick = 0
let attackTick = 0
let attackSetSize = () => {
	if (state === State.PHASE_4) {
		return 1
	}
	return 3
}

let ventTick = 0
function ventTicker() {
	setInterval(() => {
		ventTick = (ventTick + 1) % 8
		mainWindow?.webContents?.send("tick", ventTick)
	}, tickDelay)
}
ventTicker()

function attackTypeLabel() {
	switch (startedWith) {
		case null:
			return attackType
		case "r":
			return attackType ? "m" : "r"
		case "m":
			return attackType ? "r" : "m"
	}
}

function sendToRenderer() {
	const millisecondsUntilSpecial =
		attacksUntilSpecial * ticksBetweenAttacks() * tickDelay
	const millisecondsUntilAttackTypeChange =
		(attackSetSize() - attacks) * ticksBetweenAttacks() * tickDelay
	let ms = Math.min(millisecondsUntilAttackTypeChange, millisecondsUntilSpecial)
	if (attacksUntilSpecial === 0) {
		ms = millisecondsUntilAttackTypeChange + ticksBetweenAttacks()
	}
	const attentionIn = phaseChangeDelay * tickDelay + ms

	mainWindow?.webContents?.send("attack", {
		number: attacks + 1,
		type: attackTypeLabel(),
		untilSpecial: attacksUntilSpecial,
		attentionIn: attentionIn,
	})
}
sendToRenderer()

function setAttackOnNextTick() {
	attackTick = (tick + 1) % ticksBetweenAttacks()
	sendToRenderer()
}

function startLoop() {
	tick = 0
	attacks = 0
	attackType = false
	attackTick = 0

	intId = setInterval(() => {
		tick++
		if (phaseChangeDelay) {
			phaseChangeDelay--
			if (phaseChangeDelay === 0) {
				setAttackOnNextTick()
			}
			return
		}
		const isAttackTick = tick % ticksBetweenAttacks() === attackTick
		if (isAttackTick) {
			const isSpecial = attacksUntilSpecial === 0
			if (isSpecial) {
				attacksUntilSpecial = 9
				if (state === State.PHASE_3) {
					phaseChangeDelay = phaseThreeSpecialDelay
				}
			} else {
				attacks++
				attacksUntilSpecial--
				if (attacks === attackSetSize()) {
					attackType = !attackType
					attacks = 0
				}
			}
			sendToRenderer()
		}
	}, tickDelay)
}

function moveToNextState() {
	attacksUntilSpecial = 3
	if (phaseDelays.has(state)) {
		phaseChangeDelay = phaseDelays.get(state)
	}
	switch (state) {
		case State.NOT_STARTED:
			state = State.PHASE_1
			startedWith = null
			startLoop()
			break
		case State.PHASE_1:
			state = State.PHASE_2
			break
		case State.PHASE_2:
			state = State.PHASE_3
			break
		case State.PHASE_3:
			state = State.PHASE_4
			if (attacks !== 0) {
				attackType = !attackType
			}
			attacks = 0
			break
		case State.PHASE_4:
			state = State.NOT_STARTED
			clearInterval(intId)
			break
		default:
			console.error("invalid state")
			break
	}
	mainWindow?.webContents?.send("phase", state)
	sendToRenderer()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
	function handleMage() {
		startedWith = "m"
	}
	function handleRanged() {
		startedWith = "r"
	}
	function undo() {
		attacks--
		if (attacks < 0) {
			attackType = !attackType
			attacks = attackSetSize() - 1
		}
		sendToRenderer()
	}
	function resetVent() {
		ventTick = 0
		mainWindow?.webContents?.send("tick", ventTick)
	}
	ipcMain.on("first-mage", handleMage)
	ipcMain.on("first-ranged", handleRanged)
	ipcMain.on("undo", undo)
	ipcMain.on("reset-vent", resetVent)
	ipcMain.on("fast-forward", setAttackOnNextTick)
	ipcMain.on("phase", moveToNextState)
	globalShortcut.register("F6", moveToNextState)
	globalShortcut.register("F7", handleMage)
	globalShortcut.register("F8", handleRanged)
	globalShortcut.register("F9", setAttackOnNextTick)
	globalShortcut.register("F10", undo)
	globalShortcut.register("F11", resetVent)
	createWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit()
	}
})

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
	}
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
