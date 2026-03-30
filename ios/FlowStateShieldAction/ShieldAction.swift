import ManagedSettings
import ManagedSettingsUI
import Foundation

// Shield Action Extension - handles button taps on the shield
// NOTE: Class name must match NSExtensionPrincipalClass in Info.plist
class ShieldActionExtension: ShieldActionDelegate {
    
    override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        handleAction(action, completionHandler: completionHandler)
    }
    
    override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        handleAction(action, completionHandler: completionHandler)
    }
    
    override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        handleAction(action, completionHandler: completionHandler)
    }
    
    private func handleAction(_ action: ShieldAction, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            // "Enter FlowState" - navigate to profile tab with hold-to-dismiss modal
            openApp(path: "profile-dismiss")
            completionHandler(.close)
            
        case .secondaryButtonPressed:
            // "Dismiss" - just close the shield overlay
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    private func openApp(path: String?) {
        // App extensions can't open URLs directly
        // Store the intent in shared UserDefaults for the main app to read
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(path ?? "home", forKey: "pendingDeepLink")
        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "pendingDeepLinkTimestamp")
    }
}
