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
            // "Enter FlowState" — shared defaults (fallback) + foreground host app via URL scheme
            let path = "profile-dismiss"
            openApp(path: path)
            // Do not call completionHandler until after openURL: .close ends the extension; if it runs
            // before the async main block, that block never executes.
            openHostAppIfPossible(path: path, completionHandler: completionHandler)
            
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

    /// Runtime `UIApplication` + `open` so the host app can be foregrounded via `flowstate://`.
    private func openHostAppIfPossible(path: String, completionHandler: @escaping (ShieldActionResponse) -> Void) {
        guard let url = URL(string: "flowstate://\(path)") else {
            completionHandler(.close)
            return
        }
        DispatchQueue.main.async {
            guard let appClass = NSClassFromString("UIApplication") else {
                completionHandler(.close)
                return
            }
            let appClassObject = appClass as AnyObject
            let sel = NSSelectorFromString("sharedApplication")
            guard appClassObject.responds(to: sel),
                  let raw = appClassObject.perform(sel),
                  let application = raw.takeUnretainedValue() as? UIApplication else {
                completionHandler(.close)
                return
            }
            application.open(url, options: [:]) { _ in
                completionHandler(.close)
            }
        }
    }
}
