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
        // Load any previously saved selection
        loadSelection()
    }

    private func loadSelection() {
        let defaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        logger.log("Loading selection from shared defaults: \(defaults != nil)")
        if let data = defaults?.data(forKey: "selectedApps") {
            let decoder = JSONDecoder()
            if let savedSelection = try? decoder.decode(FamilyActivitySelection.self, from: data) {
                // Set without triggering didSet (to avoid re-saving)
                self.selection = savedSelection
                logger.log("Loaded saved selection: \(savedSelection.applicationTokens.count) apps, \(savedSelection.categoryTokens.count) categories")
            } else {
                logger.error("Failed to decode saved selection")
            }
        } else {
            logger.log("No saved selection found")
        }
    }

    private func saveSelection(_ selection: FamilyActivitySelection) {
        logger.log("Saving selection to shared UserDefaults")
        let defaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        logger.log("Shared defaults available: \(defaults != nil)")
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
        logger.log("Shared defaults available: \(sharedDefaults != nil)")
        sharedDefaults?.set(minutes, forKey: "hourlyQuota")
        
        // If selection is empty, try to load from UserDefaults FIRST
        if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty {
            logger.log("Selection is empty, attempting to load from UserDefaults...")
            loadSelection()
        }
        
        if selection.applicationTokens.isEmpty && selection.categoryTokens.isEmpty && selection.webDomainTokens.isEmpty {
            logger.error("setScreenTimeBudget called with EMPTY selection. Shielding will not work until apps/categories are chosen.")
        } else {
            logger.log("Selection has \(self.selection.applicationTokens.count) apps and \(self.selection.categoryTokens.count) categories")
            logger.log("Selection web domains: \(self.selection.webDomainTokens.count)")
        }
        
        // If minutes are high (unlimited / full hour), remove any existing shield immediately
        if minutes >= 60 {
            logger.log("Minutes >= 60 (unlimited), clearing existing shields")
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
        }
        
        // If minutes is 0, apply shields immediately (don't wait for monitor)
        if minutes == 0 && (!selection.applicationTokens.isEmpty || !selection.categoryTokens.isEmpty || !selection.webDomainTokens.isEmpty) {
            logger.log("Minutes == 0, applying shields immediately (apps=\(self.selection.applicationTokens.count), categories=\(self.selection.categoryTokens.count), webDomains=\(self.selection.webDomainTokens.count))")
            store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
            store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
            store.shield.webDomains = selection.webDomainTokens.isEmpty ? nil : selection.webDomainTokens
            logger.log("Shields applied from main app")
        }
        
        let hourlySchedule = DeviceActivitySchedule(
            intervalStart: DateComponents(minute: 0),
            intervalEnd: DateComponents(minute: 59),
            repeats: true
        )
        
        logger.log("Configuring DeviceActivityEvent with threshold: \(minutes)m per hour")
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            .reachedLimit: DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: minutes)
            )
        ]
        logger.log("Event configured: apps=\(self.selection.applicationTokens.count), categories=\(self.selection.categoryTokens.count), webDomains=\(self.selection.webDomainTokens.count)")
        
        do {
            // Stop any legacy daily monitoring from older app versions
            activityCenter.stopMonitoring([.dailyBudget])
            logger.log("Starting monitoring for .hourlyBudget")
            try activityCenter.startMonitoring(.hourlyBudget, during: hourlySchedule, events: events)
            logger.log("Monitoring started successfully")
            resolve(nil)
        } catch {
            logger.error("Failed to start monitoring: \(error.localizedDescription)")
            reject("MONITOR_FAILED", "Failed to start monitoring: \(error.localizedDescription)", error)
        }
    }

    private var pickerResolve: RCTPromiseResolveBlock?

    @objc
    func selectAppsToRestrict(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("selectAppsToRestrict called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        logger.log("Opening FamilyActivityPicker...")
        DispatchQueue.main.async {
            self.pickerResolve = resolve
            let picker = FamilyActivityPicker(selection: Binding(
                get: { self.selection },
                set: { self.selection = $0 }
            ))
            
            let hostingController = UIHostingController(rootView: picker)
            hostingController.presentationController?.delegate = self
            
            let rootVC = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }?
                .rootViewController

            if let vc = rootVC {
                vc.present(hostingController, animated: true)
                self.logger.log("Picker presented, waiting for dismissal")
            } else {
                self.logger.error("Failed to find root view controller to present picker")
                self.pickerResolve = nil
                reject("NO_ROOT_VC", "Could not find root view controller", nil)
            }
        }
    }

    private func resolvePickerWithCount() {
        let count = selection.applicationTokens.count + selection.categoryTokens.count + selection.webDomainTokens.count
        logger.log("Picker dismissed. Selected items: \(count)")
        pickerResolve?(count)
        pickerResolve = nil
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
    func getPendingDeepLink(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        let link = sharedDefaults?.string(forKey: "pendingDeepLink")
        let timestamp = sharedDefaults?.double(forKey: "pendingDeepLinkTimestamp") ?? 0
        
        if let link = link, timestamp > 0 {
            let age = Date().timeIntervalSince1970 - timestamp
            // Only return links created within the last 5 minutes
            if age < 300 {
                sharedDefaults?.removeObject(forKey: "pendingDeepLink")
                sharedDefaults?.removeObject(forKey: "pendingDeepLinkTimestamp")
                logger.log("Returning pending deep link: \(link)")
                resolve(link)
                return
            }
        }
        
        sharedDefaults?.removeObject(forKey: "pendingDeepLink")
        sharedDefaults?.removeObject(forKey: "pendingDeepLinkTimestamp")
        resolve(nil)
    }

    @objc
    func clearShield(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        guard #available(iOS 16.0, *) else {
            logger.error("clearShield called on unsupported iOS version")
            reject("UNSUPPORTED_IOS", "Screen Time requires iOS 16.0 or later", nil)
            return
        }
        logger.log("Clearing all shields and stopping monitoring...")
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        activityCenter.stopMonitoring([.dailyBudget, .hourlyBudget])
        logger.log("Shields cleared and monitoring stopped")
        resolve(true)
    }
}

@available(iOS 16.0, *)
extension ScreenTimeModule: UIAdaptivePresentationControllerDelegate {
    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        resolvePickerWithCount()
    }
}

extension DeviceActivityName {
    static let dailyBudget = Self("dailyBudget")
    static let hourlyBudget = Self("hourlyBudget")
}

extension DeviceActivityEvent.Name {
    static let reachedLimit = Self("reachedLimit")
}
