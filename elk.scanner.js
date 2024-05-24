elkjopScanner = {

    version: '1.0.2',

    timer: null,

    beep: {
        error: new Audio('https://cdn.jsdelivr.net/gh/slanfan/elkjop-launchpad-scanner-plugin/audio/beep.error.wav'),
        success: new Audio('https://cdn.jsdelivr.net/gh/slanfan/elkjop-launchpad-scanner-plugin/audio/beep.success.wav'),
    },

    handleReadSuccess: undefined,

    handleReadFailure: undefined,

    startBarcodeReading: () => {
        console.log('Starting barcode reader')
        if (typeof BarcodeReaderPlugin !== 'undefined') {
            BarcodeReaderPlugin.createReader(elkjopScanner.barcodeReadingStarted, elkjopScanner.barcodeReadingFailedToStart)
        }
        else {
            console.error('BarcodeReaderPlugin not found')
        }
    },
    stopBarcodeReading: () => {
        console.log('Stopping barcode reader')
        if (typeof BarcodeReaderPlugin !== 'undefined') {
            BarcodeReaderPlugin.closeReader()
        }
        else {
            console.error('BarcodeReaderPlugin not found')
        }
    },
    barcodeReadingStarted: () => {
        console.log('Barcode reading started, adding listeners')
        BarcodeReaderPlugin.addBarcodeListener(elkjopScanner.barcodeReadCallback, elkjopScanner.barcodeFailureCallback)
        elkjopScanner.setScanMode()
    },
    barcodeReadingFailedToStart: (errorMsg) => {
        // Reader most likely already created. No need to show message
        console.error('Barcode reading failed to start', errrorMsg)
    },
    barcodeReadCallback: (barcodeData) => {

        if (!elkjopScanner.config.enabled) {
            sap.m.MessageToast.show(`Reader disabled`, {
                duration: 4000
            })
            return
        }

        const barcodeContent = barcodeData.substring(3).replace(/[^ -~]+/g, '')
        const barcodeTypeCode = barcodeData.substring(1, 2)
        const barcodeType = elkjopScanner.barcodeTypes.find(e => e.code === barcodeTypeCode).type
        const scanData = {
            barcodeType,
            barcodeTypeCode,
            barcodeContent,
            colorScheme: elkjopScanner.barcodeTypes.find(e => e.code === barcodeTypeCode).colorScheme,
            selected: false,
        }
        console.log('[barcodeReadCallback] -->', {
            scanData,
            expectedBarcodeTypeCheck: elkjopScanner.config.expectedBarcodeTypeCheck,
            expectedBarcodeTypeCodes: elkjopScanner.config.expectedBarcodeTypeCodes,
            continuouslyScannedItems: elkjopScanner.continuouslyScannedItems,
        })

        // check if config QR Code scanned
        if (barcodeTypeCode === elkjopScanner.barcodeTypeCode.Q && barcodeContent.substring(0,8) === 'CONFIG::') {
            elkjopScanner.setScannerProperty(barcodeContent)
            return
        }

        // Scanning IS blocked
        if (elkjopScanner.config.blockScanning) {

            // add to scan log
            logScanning(barcodeType, barcodeContent, 'Error')

            // show notification
            elkjopScanner.barcodeNotification(elkjopScanner.notificationType.ERROR, {
                duration: 1500
            })

            return

        }


        // Create a log entry
        const logEntry = {
            timestamp: Date.now(),
            scanData: scanData,
        }

        // Append log entry to the log array
        elkjopScanner.log.push(logEntry)
        console.log('Scanner read:', logEntry)

        // Barcode was successfully scanned
        elkjopScanner.handleReadSuccess(scanData)

    },

    barcodeFailureCallback: (failureTimestamp) => {
        // Barcode was not successfully scanned e.g. user released scan button before barcode was ready
        if (sap.n && sap.n.currentView.sViewName !== 'ZMM_MERCHMAINT') {
            return
        }
        elkjopScanner.handleReadFailure(failureTimestamp)
    },

    setScanMode: () => {
        console.log('[scanner.setScanMode] checking if BarcodeReaderPlugin is available...')
        if (typeof BarcodeReaderPlugin !== 'undefined') {
            console.log('[scanner.setScanMode] plugin available, check scan mode...')
            console.log(`[scanner.setScanMode] scan mode set to ${elkjopScanner.config.selectedScanMode}`)

            if (elkjopScanner.config.selectedScanMode === null || elkjopScanner.config.selectedScanMode === undefined) {
                elkjopScanner.config.selectedScanMode = elkjopScanner.scanMode.ONE_SHOT
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
                BarcodeReaderPlugin.PropertyString.PROPERTY_CENTER_DECODE, elkjopScanner.config.centerDecode,
                // trigger mode
                BarcodeReaderPlugin.PropertyString.PROPERTY_TRIGGER_SCAN_MODE, BarcodeReaderPlugin.PropertyString[elkjopScanner.config.scanModes.find(i => i.id === elkjopScanner.config.selectedScanMode).propertyString],
            ]

            console.log(`[scanner.setScanMode] scanProperties`, scanProperties)
            console.log(`[scanner.setScanMode] calling BarcodeReaderPlugin.setProperties`)

            // Apply properties to scanner
            BarcodeReaderPlugin.setProperties(
                scanProperties,
                function () {
                    console.log(`[scanner.setScanMode] properties set successfully`)

                    // notify the user
                    sap.m.MessageToast.show(`Scan mode changed to ${elkjopScanner.config.selectedScanMode}`, {
                        duration: 2000
                    })

                    // if continuous, open scan and select interface
                    if (elkjopScanner.config.selectedScanMode === elkjopScanner.scanMode.CONTINUOUS) {
                        console.log(`[scanner.setScanMode] scan mode ${elkjopScanner.config.selectedScanMode}, let's open the UI for continuous scanning`)
                        scanner.openContinuousInterface()
                    }
                },
                function (error) {
                    console.log(`[scanner.setScanMode] error setting properties`)
                    console.error(error)
                    alert(error)
                }
            )

        }
    },

    setScannerProperty: function (barcodeContent) {
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

        const props = [property, value]
        console.log('[scanner.setScannerProperty] property to set', props)

        // Apply properties to scanner
        BarcodeReaderPlugin.setProperties(
            props,
            function (event) {
                console.log(event)
                console.log(`[scanner.setScannerProperty] properties set successfully`)
                sap.m.MessageToast.show(`⚙️ ${property} set to ${value}`)
            },
            function (error) {
                console.log(`[scanner.setScannerProperty] error setting properties`)
                console.error(error)
                alert(error)
            }
        );
    },

    setSingleScan: (mode) => {
        console.log(`[scanner.setSingleScan] --> changing singleScan mode from ${elkjopScanner.config.singleScan} to ${mode}`)
        scanner.config.singleScan = mode
    },

    getSingleScan: () => {
        return elkjopScanner.config.singleScan
    },

    barcodeNotification: function (type, config) {

        return new Promise((resolve) => {

            console.log(`[scanner.barcodeNotification] --> Method called with data:`, { type, config })
            // create the flash element and append it to the app.

            if (config === undefined) {
                config = {
                    showSplash: true,
                    duration: 200,
                }
            }

            // declare splash screen style class
            let splashStyleClass = ''
            let vibration = []

            switch (type) {
                case elkjopScanner.notificationType.ERROR:
                    // vibrate the device
                    vibration = [165, 50, 165, 50, 165, 50, 100, 35, 350]
                    // set the flash class
                    splashStyleClass = 'SCAN-FLASH-ERROR'
                    // sound a beep
                    try {
                        elkjopScanner.beep.error.play()
                    }
                    catch (e) {
                        console.log(`[scanner-barcodeNotification] --> error playing Audio`)
                    }
                    break

                case elkjopScanner.notificationType.SUCCESS:
                    // vibrate the device
                    vibration = [200]
                    // sound a beep
                    try {
                        elkjopScanner.beep.success.play()
                    }
                    catch (e) {
                        console.log(`[scanner-barcodeNotification] --> error playing Audio`)
                    }
                    //set the flash class
                    splashStyleClass = 'SCAN-FLASH-SUCCESS'
                    break

                case elkjopScanner.notificationType.WARNING:
                    // vibrate the device
                    vibration = [200, 75, 200]
                    // show 'warning' message toast
                    sap.m.MessageToast.show('No barcode data read', {
                        duration: 3000
                    })
                    // set the flash class
                    splashStyleClass = 'SCAN-FLASH-WARNING'
                    break

            }


            // show screen splash
            if (config.showSplash ? config.showSplash : true && !elkjopScanner.continuousScanUI.isOpen()) {

                const firstBodyElement = document.getElementById('body').childNodes[0]

                if (firstBodyElement) {

                    if (elkjopScanner.timer !== null) {
                        clearTimeout(elkjopScanner.timer)
                    }

                    let splash = document.getElementById('elkjopScannerSplash')
                    if (splash !== null) {
                        splash.classList.remove('SCAN-FLASH-WARNING')
                        splash.classList.remove('SCAN-FLASH-ERROR')
                        splash.classList.remove('SCAN-FLASH-SUCCESS')
                        splash.classList.add(splashStyleClass)
                    }
                    else {
                        splash = document.createElement('div')
                        splash.classList.add(splashStyleClass)
                        splash.setAttribute('id', 'elkjopScannerSplash')
                        document.body.insertBefore(splash, firstBodyElement)

                    }

                    elkjopScanner.timer = setTimeout(() => splash.parentNode.removeChild(splash), config.duration ? config.duration : 200)

                }
                else {
                    console.log(`[scanner.barcodeNotification] --> Document body does not contain any elements, can't show splash screen!`)
                }
            }

            // vibrate
            navigator.vibrate(vibration)

        })

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

    continuousScanList: new sap.m.List('continuousScanList', {
        sticky: ['HeaderToolbar', 'InfoToolbar'],
        selectionChange: () => {
            if (elkjopScanner.continuousScanUI.getEndButton()) {
                const endButton = elkjopScanner.continuousScanUI.getEndButton()
                endButton.setEnabled(elkjopScanner.continuousScanList.getModel().oData.items.filter(i => i.selected).length > 0)
            }
        }
    }),
    continuouslyScannedItems: [],
    continuouslyScannedItemTemplate: null,
    continuousScanUI: new sap.m.Dialog('continuousScanUI', {
        stretch: true,
        title: 'Scan and Select',
        beforeOpen: () => {
            elkjopScanner.setBlocked(true)
        },
        afterClose: () => {
            elkjopScanner.setBlocked(false)
        },
        beginButton: new sap.m.Button({
            text: 'Close',
            press: function () {
                elkjopScanner.closeContinuousInterface()
            }
        }),
    }),

    setEnabled: (mode) => {
        console.log(`[scanner.setEnabled] --> changing scanner enabled from ${elkjopScanner.config.enabled} to ${mode}`)
        elkjopScanner.config.enabled = mode
    },
    setBlocked: (mode) => {
        console.log(`[scanner.setBlocked] --> changing blocked mode from ${elkjopScanner.config.blockScanning} to ${mode}`)
        elkjopScanner.config.blockScanning = mode
    },

}
