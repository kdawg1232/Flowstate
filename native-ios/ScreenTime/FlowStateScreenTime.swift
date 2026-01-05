import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import Combine

@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {
    private let center = AuthorizationCenter.shared
    private let store = ManagedSettingsStore()
    private let activityCenter = DeviceActivityCenter()
    
    @objc static func requiresMainQueueSetup() -> Bool {
        return true
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
        sharedDefaults?.set(minutes, forKey: "allocatedMinutes")
        
        // If minutes > usedMinutes, ensure shield is removed
        let used = sharedDefaults?.integer(forKey: "usedMinutes") ?? 0
        if minutes > used {
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
        }

        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        
        let threshold = DeviceActivityThreshold(duration: Double(minutes) * 60)
        
        do {
            // Overwrites previous monitoring for .dailyBudget
            try activityCenter.startMonitoring(.dailyBudget, recurring: true, schedule: schedule, threshold: threshold)
            resolve(nil)
        } catch {
            reject("MONITOR_FAILED", "Failed to start monitoring", error)
        }
    }

    @objc
    func selectAppsToRestrict(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        // This usually requires showing a View Controller which is harder in a pure native module.
        // In a real Expo app, we'd use a custom view or a callback to the main thread.
        DispatchQueue.main.async {
            // Placeholder: In a real implementation, we'd present FamilyActivityPicker
            // For now, return empty as we are waiting for the picker bridge.
            resolve([])
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
}
