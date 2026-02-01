import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import Combine
import SwiftUI
import os

@available(iOS 16.0, *)
@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {
    private let center = AuthorizationCenter.shared
    private let store = ManagedSettingsStore()
    private let activityCenter = DeviceActivityCenter()
    private var cancellables = Set<AnyCancellable>()
    private let logger = Logger(subsystem: "com.karthik.flowstate", category: "ScreenTimeModule")
    
    // For storing the selection across calls
    private var selection = FamilyActivitySelection() {
        didSet {
            logger.log("Selection updated. Apps: \(self.selection.applicationTokens.count), Categories: \(self.selection.categoryTokens.count)")
            saveSelection(selection)
        }
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override init() {
        super.init()
        logger.log("ScreenTimeModule initialized")
        logger.log("Initial authorization status: \(self.center.authorizationStatus.rawValue)")
    }

    private func saveSelection(_ selection: FamilyActivitySelection) {
        logger.log("Saving selection to shared UserDefaults")
        let defaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        let encoder = JSONEncoder()
        if let encoded = try? encoder.encode(selection) {
            defaults?.set(encoded, forKey: "selectedApps")
            logger.log("Selection successfully saved")
        } else {
            logger.error("Failed to encode selection")
        }
    }

    @objc
    func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("requestAuthorization called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        logger.log("Requesting Screen Time authorization...")
        Task {
            do {
                try await center.requestAuthorization(for: .individual)
                logger.log("Authorization success: \(self.center.authorizationStatus == .approved)")
                resolve(true)
            } catch {
                logger.error("Authorization failed: \(error.localizedDescription)")
                reject("AUTH_FAILED", "Failed to authorize Screen Time: \(error.localizedDescription)", error)
            }
        }
    }

    @objc
    func setScreenTimeBudget(_ minutes: Int, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("setScreenTimeBudget called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        logger.log("Setting Screen Time budget to \(minutes) minutes")
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(minutes, forKey: "hourlyQuota")
        
        // If minutes are high (e.g. 60), we remove any existing shield immediately
        if minutes >= 60 {
            logger.log("Minutes >= 60, clearing existing shields")
            store.shield.applications = nil
            store.shield.applicationCategories = nil
        }

        if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty {
            logger.error("setScreenTimeBudget called with EMPTY selection. Shielding will not work until apps/categories are chosen.")
        }
        
        let hourlySchedule = DeviceActivitySchedule(
            intervalStart: DateComponents(minute: 0),
            intervalEnd: DateComponents(minute: 59),
            repeats: true
        )
        
        logger.log("Configuring DeviceActivityEvent with threshold: \(minutes)m")
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            .reachedLimit: DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: minutes)
            )
        ]
        
        do {
            logger.log("Starting monitoring for .hourlyBudget")
            try activityCenter.startMonitoring(.hourlyBudget, during: hourlySchedule, events: events)
            logger.log("Monitoring started successfully")
            resolve(nil)
        } catch {
            logger.error("Failed to start monitoring: \(error.localizedDescription)")
            reject("MONITOR_FAILED", "Failed to start monitoring: \(error.localizedDescription)", error)
        }
    }

    @objc
    func selectAppsToRestrict(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("selectAppsToRestrict called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        logger.log("Opening FamilyActivityPicker...")
        DispatchQueue.main.async {
            let picker = FamilyActivityPicker(selection: Binding(
                get: { self.selection },
                set: { self.selection = $0 }
            ))
            
            let hostingController = UIHostingController(rootView: picker)
            let rootVC = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }?
                .rootViewController

            if let vc = rootVC {
                vc.present(hostingController, animated: true)
                self.logger.log("Picker presented")
                resolve(true)
            } else {
                self.logger.error("Failed to find root view controller to present picker")
                reject("NO_ROOT_VC", "Could not find root view controller", nil)
            }
        }
    }

    @objc
    func getUsedMinutes(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("getUsedMinutes called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        let used = sharedDefaults?.integer(forKey: "usedMinutes") ?? 0
        logger.log("Used minutes requested: \(used)")
        resolve(used)
    }

    @objc
    func clearShield(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("clearShield called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        logger.log("Clearing all shields...")
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        logger.log("All shields cleared successfully")
        resolve(true)
    }
}

extension DeviceActivityName {
    static let dailyBudget = Self("dailyBudget")
    static let hourlyBudget = Self("hourlyBudget")
}

extension DeviceActivityEvent.Name {
    static let reachedLimit = Self("reachedLimit")
}
