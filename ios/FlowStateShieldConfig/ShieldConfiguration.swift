import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 16.0, *)
class ShieldConfigurationExtension: ShieldConfigurationDataSource {
    
    private func makeConfiguration() -> ShieldConfiguration {
        return ShieldConfiguration(
            backgroundBlurStyle: .systemMaterialDark,
            backgroundColor: UIColor(red: 2/255, green: 6/255, blue: 23/255, alpha: 1.0), // slate-950
            icon: UIImage(systemName: "bolt.fill"),
            title: ShieldConfiguration.Label(
                text: "FLOWSTATE",
                color: UIColor(red: 6/255, green: 182/255, blue: 212/255, alpha: 1.0) // cyan-500
            ),
            subtitle: ShieldConfiguration.Label(
                text: "You've reached your hourly limit.\nEarn more screen time with reps.",
                color: UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1.0) // slate-400
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Enter FlowState",
                color: .white
            ),
            primaryButtonBackgroundColor: UIColor(red: 6/255, green: 182/255, blue: 212/255, alpha: 1.0), // cyan-500
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Dismiss Restriction",
                color: UIColor(red: 148/255, green: 163/255, blue: 184/255, alpha: 1.0) // slate-400
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
