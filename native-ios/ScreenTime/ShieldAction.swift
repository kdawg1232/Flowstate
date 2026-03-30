import ManagedSettings
import ManagedSettingsUI
import Foundation
import UIKit

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
            // "Enter FlowState" — shared defaults (fallback) + attempt to foreground host app via URL scheme
            let path = "profile-dismiss"
            openApp(path: path)
            openHostAppIfPossible(path: path)
            completionHandler(.close)
            
        case .secondaryButtonPressed:
            // "Dismiss" - just close the shield overlay
            completionHandler(.close)
            
        @unknown default:
            completionHandler(.close)
        }
    }
    
    private func openApp(path: String?) {
        let sharedDefaults = UserDefaults(suiteName: "group.com.karthik.flowstate")
        sharedDefaults?.set(path ?? "home", forKey: "pendingDeepLink")
        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "pendingDeepLinkTimestamp")
    }

    /// Shield extensions cannot use `UIApplication.shared`. Use runtime dispatch so the host app can open for the deep link.
    private func openHostAppIfPossible(path: String) {
        guard let url = URL(string: "flowstate://\(path)") else { return }
        DispatchQueue.main.async {
            guard let appClass = NSClassFromString("UIApplication") else { return }
            let appClassObject = appClass as AnyObject
            let sel = NSSelectorFromString("sharedApplication")
            guard appClassObject.responds(to: sel),
                  let raw = appClassObject.perform(sel) else { return }
            guard let application = raw.takeUnretainedValue() as? UIApplication else { return }
            application.open(url, options: [:], completionHandler: nil)
        }
    }
}
