# elkjop-launchpad-scanner-plugin

Make sure your application has its namespace recorded in the very first script file
```
if (!sap.elk) {
    sap.elk = {}
}
sap.elk['<INSERT-APPLICATION-NAME-HERE>'] = {
    id: '<INSERT-APPLICATION-NAME-HERE>',
    view: this,
}
const elk = sap.elk['<INSERT-APPLICATION-NAME-HERE>']
```

Copy and Paste the below code into your application in a separate script file
```
function handleReadSuccess(data) {
    // define your logic for handling barcode reads here
}
function handleReadFailure(timestamp) {
    console.error(`Failed to read barcode data. ${timestamp}`)
}
const scannerScript = document.createElement('script')
scannerScript.src = 'https://cdn.jsdelivr.net/gh/slanfan/elkjop-launchpad-scanner-plugin@main/elk.scanner.js'
scannerScript.onload = () => {
    console.log('Elkjøp Launchpad Scanner Script loaded successfully')
    if (typeof elkjopScanner === 'undefined') {
        console.error('scanner object or scanner.text function is not defined')
        return
    }
    elk.scanner = elkjopScanner
    elk.scanner.handleReadSuccess = handleReadSuccess
    elk.scanner.handleReadFailure = handleReadFailure
    
    // On Honeywell devices, listen for scan when opening app
    if (sap.n) {
        console.log('Mobile device, init barcode reader')
        // add listener to activate scanner for this app when displayed
        sap.n.Shell.attachBeforeDisplay(() => {
            if (elk && elk.scanner) {
                elk.scanner.stopBarcodeReading()
                elk.scanner.startBarcodeReading()
            }
        })
        // add listener to deactivate scanner for this app when closed
        sap.n.Shell.attachBeforeClose(() => {
            if (elk && elk.scanner) {
                elk.scanner.stopBarcodeReading()
            }
        })
        // activate scanner on startup
        if (elk && elk.scanner) {
            elk.scanner.stopBarcodeReading()
            elk.scanner.startBarcodeReading()
        }
    }
    else {
        console.log('Non-mobile device, skipping barcode reader initialization')
    }
    
}
scannerScript.onerror = () => {
    console.error('Error loading script:', url)
}
document.head.appendChild(scannerScript)
```
