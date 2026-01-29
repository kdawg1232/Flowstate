import ManagedSettings
import ManagedSettingsUI
import Foundation
import os

@available(iOS 16.0, *)
class ShieldActionExtension: ShieldActionDelegate {
    private let logger = Logger(subsystem: "com.karthik.flowstate", category: "ShieldAction")
    
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
            // "Enter FlowState" - open the main app
            logger.log("Primary button: Opening FlowState app")
            openApp(path: nil)
            completionHandler(.close)
            
        case .secondaryButtonPressed:
            // "Dismiss Restriction" - open app to the dismiss screen
            logger.log("Secondary button: Opening FlowState dismiss screen")
            openApp(path: "dismiss")
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    private func openApp(path: String?) {
        var urlString = "flowstate://"
        if let path = path {
            urlString += path
        }
        
        guard let url = URL(string: urlString) else { return }
        
        // App extensions can't open URLs directly, but we can use a shared container
        // to signal the intent, or use the newer approach with NSExtensionContext
        // For now, we'll store the intent and the shield closing will allow the user to tap the app
        
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(path ?? "home", forKey: "pendingDeepLink")
        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "pendingDeepLinkTimestamp")
    }
}
