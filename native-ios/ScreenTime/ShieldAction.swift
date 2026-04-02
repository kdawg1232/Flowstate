import ManagedSettings
import ManagedSettingsUI
import Foundation
import UserNotifications

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
            let path = "profile-dismiss"
            writePendingDeepLink(path: path)
            scheduleOpenAppNotification {
                completionHandler(.close)
            }
            
        case .secondaryButtonPressed:
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    private func writePendingDeepLink(path: String) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(path, forKey: "pendingDeepLink")
        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "pendingDeepLinkTimestamp")
    }

    /// iOS does not allow extensions to programmatically open other apps (UIApplication.shared
    /// doesn't exist in extension processes). Instead, we schedule an immediate local notification
    /// that, when tapped by the user, opens FlowState. The pending deep-link stored in shared
    /// UserDefaults ensures the app shows the dismiss-restrictions flow on launch.
    private func scheduleOpenAppNotification(completion: @escaping () -> Void) {
        let content = UNMutableNotificationContent()
        content.title = "Enter FlowState"
        content.body = "Tap to open the app"
        content.sound = .default
        content.userInfo = ["deepLink": "profile-dismiss"]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "flowstate-open-app",
            content: content,
            trigger: trigger
        )
        
        UNUserNotificationCenter.current().add(request) { _ in
            completion()
        }
    }
}
