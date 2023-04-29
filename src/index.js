let attentionAt = Date.now()

setInterval(() => {
	const el = document.getElementById("timer")
	const diff = attentionAt - Date.now()
	if (diff < 600 * 4 && diff >= 0) {
		el.className = "attention"
	} else {
		el.className = ""
	}
	el.textContent = diff < 0 ? `0 s` : `${(diff / 1000).toFixed(1)} s`
}, 50)

window.electronAPI.onPhaseChange((_, phase) => {
	document.getElementById("phase").textContent = phase
	console.log(phase)
})

window.electronAPI.onAttackCount((_, attack) => {
	document.getElementById("spec").textContent = attack.untilSpecial
	const el = document.getElementById("atk")
	el.textContent = attack.untilSpecial === 0 ? "spec" : attack.number
	el.className = attack.type
	attentionAt = attack.attentionIn + Date.now()
})

window.electronAPI.onTickCounter((_, tick) => {
	document.getElementById("tick").textContent = tick
})

document.getElementById("panel-start").onclick = () =>
	window.electronAPI.sendEvent("phase")
document.getElementById("panel-mage").onclick = () =>
	window.electronAPI.sendEvent("first-mage")
document.getElementById("panel-ranged").onclick = () =>
	window.electronAPI.sendEvent("first-ranged")
document.getElementById("panel-ff").onclick = () =>
	window.electronAPI.sendEvent("fast-forward")
document.getElementById("panel-undo").onclick = () =>
	window.electronAPI.sendEvent("undo")
document.getElementById("tick").onclick = () =>
	window.electronAPI.sendEvent("reset-vent")
