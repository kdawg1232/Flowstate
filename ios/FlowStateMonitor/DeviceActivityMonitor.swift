import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

// Device Activity Monitor Extension - monitors device activity and applies shields
// NOTE: Class name must match NSExtensionPrincipalClass in Info.plist
class FlowStateMonitor: DeviceActivityMonitor {
    let store = ManagedSettingsStore()
    
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        
        // Record that the user hit their daily quota so the app can display it
        let quota = sharedDefaults?.integer(forKey: "dailyQuota") ?? 0
        sharedDefaults?.set(quota, forKey: "usedMinutes")
        
        if let selectionData = sharedDefaults?.data(forKey: "selectedApps") {
            let decoder = JSONDecoder()
            if let selection = try? decoder.decode(FamilyActivitySelection.self, from: selectionData) {
                store.shield.applications = selection.applicationTokens
                store.shield.applicationCategories = .specific(selection.categoryTokens)
                store.shield.webDomains = selection.webDomainTokens
            }
        }
    }
    
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // Reset shield and usage counter at the start of each new day
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(0, forKey: "usedMinutes")
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
    }
}
