import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation
import os

@available(iOS 16.0, *)
class FlowStateMonitor: DeviceActivityMonitor {
    let store = ManagedSettingsStore()
    private let logger = Logger(subsystem: "com.karthik.flowstate", category: "FlowStateMonitor")
    
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        logger.log("THRESHOLD REACHED: \(event.rawValue) for activity \(activity.rawValue)")
        
        // This is called when the user reaches their hourly limit
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        
        // Retrieve the saved selection (encoded as Data)
        if let selectionData = sharedDefaults?.data(forKey: "selectedApps") {
            let decoder = JSONDecoder()
            if let selection = try? decoder.decode(FamilyActivitySelection.self, from: selectionData) {
                logger.log("Applying shields to \(selection.applicationTokens.count) apps and \(selection.categoryTokens.count) categories")
                // Apply the shield
                store.shield.applications = selection.applicationTokens
                store.shield.applicationCategories = .specific(selection.categoryTokens)
                logger.log("Shields applied successfully")
            } else {
                logger.error("Failed to decode selection from UserDefaults")
            }
        } else {
            logger.error("No selectedApps found in shared UserDefaults")
        }
    }
    
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        logger.log("INTERVAL STARTED: \(activity.rawValue). Clearing shields.")
        // Reset shield at the start of every hour
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        logger.log("Shields cleared for new interval")
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        logger.log("INTERVAL ENDED: \(activity.rawValue)")
    }
}
