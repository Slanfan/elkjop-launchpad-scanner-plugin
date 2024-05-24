elkjopScanner = {

  handleReadSuccess: undefined,

  handleReadFailure: undefined,

  startBarcodeReading: () => {
    if (typeof BarcodeReaderPlugin !== 'undefined') {
      BarcodeReaderPlugin.createReader(elk.scanner.barcodeReadingStarted, elk.scanner.barcodeReadingFailedToStart)
    }
  },
  stopBarcodeReading: () => {
    if (typeof BarcodeReaderPlugin !== 'undefined') {
      BarcodeReaderPlugin.closeReader()
    }
  },
  barcodeReadingStarted: () => {
    BarcodeReaderPlugin.addBarcodeListener(elk.scanner.barcodeReadCallback, elk.scanner.barcodeFailureCallback)
  },
  barcodeReadingFailedToStart: (errorMsg) => {
    // Reader most likely already created. No need to show message
  },
  barcodeReadCallback: (barcodeData) => {

    // Create a log entry
    const logEntry = {
        timestamp: Date.now(),
        value: barcodeData,
        page: Nav.getCurrentPage().sId,
        refillMode: RefillMode.getSelectedKey(),
    }

    // Append log entry to the log array
    elk.scanner.log.push(logEntry)
    console.log('Scanner read:', logEntry)

    // Barcode was successfully scanned
    handleReadSuccess(barcodeData)
  
  },

  barcodeFailureCallback: (failureTimestamp) => {
    // Barcode was not successfully scanned e.g. user released scan button before barcode was ready
    if (sap.n && sap.n.currentView.sViewName !== 'ZMM_MERCHMAINT') {
      return
    }
    elk.scanner.handleReadFailure(failureTimestamp)
  },

  log: [],

}
