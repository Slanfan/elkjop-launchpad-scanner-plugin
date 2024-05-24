elkjopScanner = {

  timer: null,

  beep: {
        error: new Audio('https://cdn.jsdelivr.net/gh/slanfan/elkjop-launchpad-scanner-plugin@master/audio/beep.error.wav'),
        success: new Audio('https://cdn.jsdelivr.net/gh/slanfan/elkjop-launchpad-scanner-plugin@master/audio/beep.success.wav'),
  },

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

  setScanMode: () => {
      console.log('[scanner.setScanMode] checking if BarcodeReaderPlugin is available...')
      if (typeof BarcodeReaderPlugin !== 'undefined') {
          console.log('[scanner.setScanMode] plugin available, check scan mode...')
          console.log(`[scanner.setScanMode] scan mode set to ${elk.scanner.config.selectedScanMode}`)

          if (elk.scanner.config.selectedScanMode === null || elk.scanner.config.selectedScanMode === undefined) {
              elk.scanner.config.selectedScanMode = elk.scanner.scanMode.ONE_SHOT
          }

          // define the scan properties
          const scanProperties = [
              // fixed settings
              BarcodeReaderPlugin.PropertyString.PROPERTY_EAN_13_CHECK_DIGIT_TRANSMIT_ENABLED, true,
              BarcodeReaderPlugin.PropertyString.PROPERTY_EAN_8_CHECK_DIGIT_TRANSMIT_ENABLED, true,
              BarcodeReaderPlugin.PropertyString.PROPERTY_UPC_A_CHECK_DIGIT_TRANSMIT_ENABLED, true,
              BarcodeReaderPlugin.PropertyString.PROPERTY_UPC_E_CHECK_DIGIT_TRANSMIT_ENABLED, true,
              BarcodeReaderPlugin.PropertyString.PROPERTY_QR_CODE_ENABLED, true, // --> trying to ignore QR Codes
              BarcodeReaderPlugin.PropertyString.PROPERTY_GS1_128_ENABLED, true,
              BarcodeReaderPlugin.PropertyString.PROPERTY_CODE_93_ENABLED, true,
              BarcodeReaderPlugin.PropertyString.PROPERTY_NOTIFICATION_GOOD_READ_ENABLED, true, // This should be disabled when we solve the sounds
              BarcodeReaderPlugin.PropertyString.PROPERTY_NOTIFICATION_BAD_READ_ENABLED, true,  // This should be disabled when we solve the sounds
              BarcodeReaderPlugin.PropertyString.PROPERTY_NOTIFICATION_VIBRATE_ENABLED, true,   // This should be disabled when we solve the sounds
              BarcodeReaderPlugin.PropertyString.PROPERTY_DATA_PROCESSOR_SYMBOLOGY_PREFIX, BarcodeReaderPlugin.PropertyString.DATA_PROCESSOR_SYMBOLOGY_ID_AIM,

              // center decode
              BarcodeReaderPlugin.PropertyString.PROPERTY_CENTER_DECODE, elk.scanner.config.centerDecode,
              // trigger mode
              BarcodeReaderPlugin.PropertyString.PROPERTY_TRIGGER_SCAN_MODE, BarcodeReaderPlugin.PropertyString[elk.scanner.config.scanModes.find(i => i.id === elk.scanner.config.selectedScanMode).propertyString],
          ]

          console.log(`[scanner.setScanMode] scanProperties`, scanProperties)
          console.log(`[scanner.setScanMode] calling BarcodeReaderPlugin.setProperties`)

          // Apply properties to scanner
          BarcodeReaderPlugin.setProperties(
              scanProperties,
              function() {
                  console.log(`[scanner.setScanMode] properties set successfully`)
                  // add to scan log
                  logScanning('PLUGIN', `${elk.scanner.config.selectedScanMode} activated`)

                  // notify the user
                  sap.m.MessageToast.show(`Scan mode changed to ${elk.scanner.config.selectedScanMode}`, {
                      duration: 2000
                  })

                  // if continuous, open scan and select interface
                  if (elk.scanner.config.selectedScanMode === elk.scanner.scanMode.CONTINUOUS) {
                      console.log(`[scanner.setScanMode] scan mode ${elk.scanner.config.selectedScanMode}, let's open the UI for continuous scanning`)
                      scanner.openContinuousInterface()
                  }
              },
              function(error) {
                  console.log(`[scanner.setScanMode] error setting properties`)
                  console.error(error)
                  alert(error)
              }
          )

      }
  },

  setScannerProperty: function(barcodeContent) {
      if (typeof BarcodeReaderPlugin === undefined) {
          console.log('[scanner.setScannerProperty] BarcodeReaderPlugin not initialized')
          return
      }

      // get all the content after "CONFIG::""
      const config = barcodeContent.substring(8).split(',')
      const property = BarcodeReaderPlugin.PropertyString[config[0]]
      const value = config[1] === 'true'
              ? true
              : config[1] === 'false'
                  ? false
                  : config[1]
      console.log(`[scanner.setScannerProperty] about to set property ${property} to: ${value}`)

      const props = [property,value]
      console.log('[scanner.setScannerProperty] property to set', props)

      // Apply properties to scanner
      BarcodeReaderPlugin.setProperties(
          props,
          function(event) {
              console.log(event)
              console.log(`[scanner.setScannerProperty] properties set successfully`)
              sap.m.MessageToast.show(`⚙️ ${property} set to ${value}`)
          },
          function(error) {
              console.log(`[scanner.setScannerProperty] error setting properties`)
              console.error(error)
              alert(error)
          }
      );
  },

  log: [],

  barcodeTypes: [
    {
        code: 'A',
        type: 'Code39',
        colorScheme: 9,
    },
    {
        code: 'C',
        type: 'Code128',
        colorScheme: 9,
    },
    {
        code: 'd',
        type: 'Data Matrix',
        colorScheme: 2,
    },
    {
        code: 'E',
        type: 'EAN/UPC',
        colorScheme: 8,
    },
    {
        code: 'Q',
        type: 'QR Code',
        colorScheme: 1,
    },
    {
        code: 'I',
        type: 'Interleaved 2 of 5',
        colorScheme: 1,
    },
    {
        code: 'F',
        type: 'Codabar',
        colorScheme: 1,
    },
    {
        code: 'G',
        type: 'Code93',
        colorScheme: 9,
    },
    {
        code: 'M',
        type: 'MSI',
        colorScheme: 1,
    },
    {
        code: 'e',
        type: 'GS1 Databar',
        colorScheme: 1,
    },
    {
        code: 'X',
        type: 'Special',
        colorScheme: 1,
    },
    {
        code: 'z',
        type: 'Aztec',
        colorScheme: 1,
    },
    {
        code: 'U',
        type: 'Maxicode',
        colorScheme: 1,
    },
    {
        code: 'L',
        type: 'PDF417',
        colorScheme: 1,
    },
  ],

  barcodeTypeCode: {
    A: 'A',
    C: 'C',
    d: 'd',
    E: 'E',
    Q: 'Q',
    I: 'I',
    F: 'F',
    G: 'G',
    M: 'M',
    e: 'e',
    X: 'X',
    z: 'z',
    U: 'U',
    L: 'L',
  },

  notificationType: {
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
  },
  scanMode: {
    ONE_SHOT: 'ONE_SHOT',
    READ_ON_RELEASE: 'READ_ON_RELEASE',
    CONTINUOUS: 'CONTINUOUS',
    READ_ON_SECOND_RELEASE: 'READ_ON_SECOND_RELEASE',
  },

  config: {
    enabled: false,
    blockScanning: false,
    selectedScanMode: 'ONE_SHOT',
    centerDecode: true,
    typeCheck: true,
    expectedBarcodeTypeCheck: false,
    expectedBarcodeTypeCodes: ['E', 'C', 'A'],
    singleScan: true,
    onlyAcceptIMEI: false,
    continuousMultiSelect: false,
    // confirmation of serial numbers should be set to default but can be toggled off and if off
    // the confirmation dialog should not show and the serial number should be recorded without
    // a confirmation from the user
    confirmSerial: true,
    scanModes: [{
        id: 'ONE_SHOT',
        text: 'One Shot',
        propertyString: 'TRIGGER_SCAN_MODE_ONESHOT',
      },
      {
        id: 'READ_ON_RELEASE',
        text: 'Read on Release',
        propertyString: 'TRIGGER_SCAN_MODE_READ_ON_RELEASE',
      },
      {
        id: 'READ_ON_SECOND_RELEASE',
        text: 'Read on second trigger press',
        propertyString: 'TRIGGER_SCAN_MODE_READ_ON_SECOND_TRIGGER_PRESS',
      },
      {
        id: 'CONTINUOUS',
        text: 'Continuous',
        propertyString: 'TRIGGER_SCAN_MODE_CONTINUOUS',
      },
    ],
  },

}
