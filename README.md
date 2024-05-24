# elkjop-launchpad-scanner-plugin

Copy and Paste the below code into your application in a separate script file
```
function handleReadSuccess(data) {
    // define your logic for handling barcode reads here
}
function handleReadFailure(timestamp) {
    console.error(`Failed to read barcode data. ${timestamp}`)
}
const scannerScript = document.createElement('script')
scannerScript.src = 'https://cdn.jsdelivr.net/gh/slanfan/elkjop-launchpad-scanner-plugin@master/elk.scanner.js'
scannerScript.onload = () => {
    console.log('Elkjøp Launchpad Scanner Script loaded successfully')
    if (typeof elkjopScanner === 'undefined') {
        console.error('scanner object or scanner.text function is not defined')
        return
    }
    elk.scanner = elkjopScanner
    elk.scanner.handleReadSuccess = handleReadSuccess
    elk.scanner.handleReadFailure = handleReadFailure
}
scannerScript.onerror = () => {
    console.error('Error loading script:', url)
}
document.head.appendChild(scannerScript)
```
At the very end of you script or in the end of the last script file, add this code snippet to load the plugin
```
// On Honeywell devices, listen for scan when opening app
if (sap.n) {
    sap.n.Shell.attachBeforeDisplay(() => {
        if (elk && elk.scanner) {
            elk.scanner.stopBarcodeReading()
            elk.scanner.startBarcodeReading()
        }
    })
    sap.n.Shell.attachBeforeClose(() => {
        if (elk && elk.scanner) {
            elk.scanner.stopBarcodeReading()
        }
    })
}
```
