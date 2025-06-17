#import "StripeTerminalBridge.h"
#import <StripeTerminal/StripeTerminal.h>

@interface StripeTerminalBridge () <SCPDiscoveryDelegate, SCPBluetoothReaderDelegate, SCPTerminalDelegate>
@property (nonatomic, strong) SCPCancelable *discoveryCancelable;
@property (nonatomic, strong) NSString *locationId;
@property (nonatomic, strong) SCPReader *connectedReader;
@end

@implementation StripeTerminalBridge

RCT_EXPORT_MODULE();

- (instancetype)init {
    if (self = [super init]) {
        [SCPTerminal shared].delegate = self;
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"readersDiscovered",
        @"readerConnected",
        @"readerDisconnected",
        @"terminalError",
        @"connectionStatusChanged",
        @"paymentStatusChanged"
    ];
}

// Initialize Terminal with connection token
RCT_EXPORT_METHOD(initializeTerminal:(NSString *)connectionToken
                  locationId:(NSString *)locationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    self.locationId = locationId;
    
    // Already initialized check
    if ([SCPTerminal shared].connectionStatus != SCPConnectionStatusNotConnected) {
        resolve(@{@"initialized": @YES});
        return;
    }
    
    // Set log level for debugging
    [SCPTerminal shared].logLevel = SCPLogLevelVerbose;
    
    resolve(@{@"initialized": @YES, @"locationId": locationId});
}

// Discover M2 readers via Bluetooth
RCT_EXPORT_METHOD(discoverReaders:(BOOL)simulated
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self.discoveryCancelable) {
            [self.discoveryCancelable cancel:^(NSError * _Nullable error) {
                // Ignore cancellation error
            }];
        }
        
        SCPDiscoveryConfiguration *config;
        if (simulated) {
            config = [[SCPBluetoothScanDiscoveryConfiguration alloc] initWithSimulated:YES];
        } else {
            config = [[SCPBluetoothScanDiscoveryConfiguration alloc] initWithSimulated:NO];
        }
        
        self.discoveryCancelable = [[SCPTerminal shared] discoverReaders:config
                                                                delegate:self
                                                              completion:^(NSError * _Nullable error) {
            if (error) {
                [self sendEventWithName:@"terminalError" body:@{
                    @"error": error.localizedDescription,
                    @"code": @(error.code)
                }];
                reject(@"discovery_failed", error.localizedDescription, error);
            } else {
                resolve(@{@"completed": @YES});
            }
        }];
    });
}

// Connect to a reader
RCT_EXPORT_METHOD(connectReader:(NSDictionary *)readerInfo
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *serialNumber = readerInfo[@"serialNumber"];
        if (!serialNumber) {
            reject(@"invalid_reader", @"Reader serial number is required", nil);
            return;
        }
        
        // Find the reader from discovered readers
        // Note: In a real implementation, you'd store discovered readers
        // For now, we'll create a reader object from the info
        
        if (!self.locationId) {
            reject(@"no_location", @"Location ID is required for Bluetooth readers", nil);
            return;
        }
        
        // Create connection config
        SCPBluetoothConnectionConfiguration *connectionConfig = 
            [[SCPBluetoothConnectionConfiguration alloc] initWithLocationId:self.locationId];
        
        // For this example, we need the actual reader object from discovery
        // You would typically store these during discovery
        reject(@"not_implemented", @"Full native implementation requires storing discovered readers", nil);
    });
}

// Cancel discovery
RCT_EXPORT_METHOD(cancelDiscovery:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    if (self.discoveryCancelable) {
        [self.discoveryCancelable cancel:^(NSError * _Nullable error) {
            if (error) {
                reject(@"cancel_failed", error.localizedDescription, error);
            } else {
                resolve(@{@"cancelled": @YES});
            }
        }];
        self.discoveryCancelable = nil;
    } else {
        resolve(@{@"cancelled": @YES});
    }
}

// Disconnect reader
RCT_EXPORT_METHOD(disconnectReader:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    [[SCPTerminal shared] disconnectReader:^(NSError * _Nullable error) {
        if (error) {
            reject(@"disconnect_failed", error.localizedDescription, error);
        } else {
            resolve(@{@"disconnected": @YES});
        }
    }];
}

#pragma mark - SCPDiscoveryDelegate

- (void)terminal:(SCPTerminal *)terminal didUpdateDiscoveredReaders:(NSArray<SCPReader *> *)readers {
    NSMutableArray *readerList = [NSMutableArray array];
    
    for (SCPReader *reader in readers) {
        [readerList addObject:@{
            @"serialNumber": reader.serialNumber ?: @"",
            @"label": reader.label ?: @"",
            @"batteryLevel": reader.batteryLevel ?: [NSNull null],
            @"deviceType": [self stringForDeviceType:reader.deviceType],
            @"simulated": @(reader.simulated),
            @"id": reader.stripeId ?: @"", // This should not be null for proper readers
            @"status": [self stringForReaderStatus:reader.status]
        }];
    }
    
    [self sendEventWithName:@"readersDiscovered" body:@{@"readers": readerList}];
}

#pragma mark - SCPBluetoothReaderDelegate

- (void)reader:(SCPReader *)reader didReportAvailableUpdate:(SCPReaderSoftwareUpdate *)update {
    // Handle reader updates
}

- (void)reader:(SCPReader *)reader didStartInstallingUpdate:(SCPReaderSoftwareUpdate *)update cancelable:(SCPCancelable *)cancelable {
    // Handle update installation
}

- (void)reader:(SCPReader *)reader didReportReaderSoftwareUpdateProgress:(float)progress {
    // Handle update progress
}

- (void)reader:(SCPReader *)reader didFinishInstallingUpdate:(SCPReaderSoftwareUpdate *)update error:(NSError *)error {
    // Handle update completion
}

#pragma mark - SCPTerminalDelegate

- (void)terminal:(SCPTerminal *)terminal didChangeConnectionStatus:(SCPConnectionStatus)status {
    [self sendEventWithName:@"connectionStatusChanged" body:@{
        @"status": [self stringForConnectionStatus:status]
    }];
}

- (void)terminal:(SCPTerminal *)terminal didReportUnexpectedReaderDisconnect:(SCPReader *)reader {
    [self sendEventWithName:@"readerDisconnected" body:@{
        @"unexpected": @YES,
        @"reader": @{
            @"serialNumber": reader.serialNumber ?: @""
        }
    }];
}

#pragma mark - Helper Methods

- (NSString *)stringForDeviceType:(SCPDeviceType)deviceType {
    switch (deviceType) {
        case SCPDeviceTypeStripeM2:
            return @"stripeM2";
        case SCPDeviceTypeStripeS700:
            return @"stripeS700";
        case SCPDeviceTypeWisePosE:
            return @"wisePosE";
        default:
            return @"unknown";
    }
}

- (NSString *)stringForReaderStatus:(SCPReaderNetworkStatus)status {
    switch (status) {
        case SCPReaderNetworkStatusOnline:
            return @"online";
        case SCPReaderNetworkStatusOffline:
            return @"offline";
        default:
            return @"unknown";
    }
}

- (NSString *)stringForConnectionStatus:(SCPConnectionStatus)status {
    switch (status) {
        case SCPConnectionStatusConnected:
            return @"connected";
        case SCPConnectionStatusConnecting:
            return @"connecting";
        case SCPConnectionStatusNotConnected:
            return @"notConnected";
        default:
            return @"unknown";
    }
}

@end