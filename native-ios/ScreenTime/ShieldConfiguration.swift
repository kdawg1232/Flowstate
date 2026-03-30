import ManagedSettings
import ManagedSettingsUI
import UIKit

// Shield Configuration Extension - provides custom UI for blocked apps
// This class is instantiated by iOS when a shield needs to be displayed
// NOTE: Class name must match NSExtensionPrincipalClass in Info.plist
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    
    private func makeConfiguration() -> ShieldConfiguration {
        let appIcon: UIImage? = {
            if let path = Bundle.main.path(forResource: "ShieldIcon", ofType: "png"),
               let img = UIImage(contentsOfFile: path) {
                return img
            }
            return UIImage(named: "ShieldIcon") ?? UIImage(systemName: "bolt.fill")
        }()
        
        // backgroundColor is applied *through* the blur material; nil blur uses the system
        // default (light). A dark material + black tint yields a true dark shield background.
        return ShieldConfiguration(
            backgroundBlurStyle: .systemThickMaterialDark,
            backgroundColor: UIColor(white: 0, alpha: 1),
            icon: appIcon,
            title: ShieldConfiguration.Label(
                text: "FLOWSTATE",
                color: UIColor(red: 6/255, green: 182/255, blue: 212/255, alpha: 1.0)
            ),
            subtitle: ShieldConfiguration.Label(
                text: "You've reached your hourly limit.\nEarn more screen time with reps.",
                color: UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1.0)
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Enter FlowState",
                color: .white
            ),
            primaryButtonBackgroundColor: UIColor(red: 6/255, green: 182/255, blue: 212/255, alpha: 1.0),
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Dismiss",
                color: UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1.0)
            )
        )
    }
    
    override func configuration(shielding application: Application) -> ShieldConfiguration {
        return makeConfiguration()
    }
    
    override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
        return makeConfiguration()
    }
    
    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        return makeConfiguration()
    }
    
    override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
        return makeConfiguration()
    }
}
