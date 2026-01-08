import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

class FlowStateMonitor: DeviceActivityMonitor {
    let store = ManagedSettingsStore()
    
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        
        // This is called when the user reaches their hourly limit
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        
        // Retrieve the saved selection (encoded as Data)
        if let selectionData = sharedDefaults?.data(forKey: "selectedApps") {
            let decoder = JSONDecoder()
            if let selection = try? decoder.decode(FamilyActivitySelection.self, from: selectionData) {
                // Apply the shield
                store.shield.applications = selection.applicationTokens
                store.shield.applicationCategories = .specific(selection.categoryTokens)
            }
        }
    }
    
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // Reset shield at the start of every hour
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }
}
