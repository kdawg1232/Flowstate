import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import Combine
import SwiftUI

@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {
    private let center = AuthorizationCenter.shared
    private let store = ManagedSettingsStore()
    private let activityCenter = DeviceActivityCenter()
    private var cancellables = Set<AnyCancellable>()
    
    // For storing the selection across calls
    private var selection = FamilyActivitySelection() {
        didSet {
            saveSelection(selection)
        }
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return true
    }

    private func saveSelection(_ selection: FamilyActivitySelection) {
        let defaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        let encoder = JSONEncoder()
        if let encoded = try? encoder.encode(selection) {
            defaults?.set(encoded, forKey: "selectedApps")
        }
    }

    @objc
    func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                try await center.requestAuthorization(for: .individual)
                resolve(true)
            } catch {
                reject("AUTH_FAILED", "Failed to authorize Screen Time", error)
            }
        }
    }

    @objc
    func setScreenTimeBudget(_ minutes: Int, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(minutes, forKey: "hourlyQuota")
        
        // If minutes are high (e.g. 60), we remove any existing shield immediately
        if minutes >= 60 {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
        }
        
        let hourlySchedule = DeviceActivitySchedule(
            intervalStart: DateComponents(minute: 0),
            intervalEnd: DateComponents(minute: 59),
            repeats: true
        )
        
        // Create an event with a threshold
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            .reachedLimit: DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: minutes)
            )
        ]
        
        do {
            try activityCenter.startMonitoring(.hourlyBudget, during: hourlySchedule, events: events)
            resolve(nil)
        } catch {
            reject("MONITOR_FAILED", "Failed to start monitoring", error)
        }
    }

    @objc
    func selectAppsToRestrict(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let picker = FamilyActivityPicker(selection: Binding(
                get: { self.selection },
                set: { self.selection = $0 }
            ))
            
            let hostingController = UIHostingController(rootView: picker)
            if let rootVC = UIApplication.shared.keyWindow?.rootViewController {
                rootVC.present(hostingController, animated: true)
                resolve(true)
            } else {
                reject("NO_ROOT_VC", "Could not find root view controller", nil)
            }
        }
    }

    @objc
    func getUsedMinutes(_ resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        let used = sharedDefaults?.integer(forKey: "usedMinutes") ?? 0
        resolve(used)
    }
}

extension DeviceActivityName {
    static let dailyBudget = Self("dailyBudget")
    static let hourlyBudget = Self("hourlyBudget")
}

extension DeviceActivityEvent.Name {
    static let reachedLimit = Self("reachedLimit")
}
