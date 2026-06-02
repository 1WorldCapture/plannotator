## MODIFIED Requirements

### Requirement: Chrome Native Messaging installation is documented
The system SHALL provide installation instructions or scripts that register the native host manifest for Chrome using the expected `apps/chrome/chrome-native-host` host entry in development and the production native-host release artifact for end users.

#### Scenario: User installs the Chrome workflow
- **WHEN** the user follows the production Chrome workflow installation instructions
- **THEN** Chrome can launch the Plannotator native host from the GitHub Release unpacked extension
- **AND** the registered Native Messaging manifest allows the GitHub Release extension ID

#### Scenario: Developer installs the Chrome workflow
- **WHEN** a developer follows the local Chrome workflow installation instructions with an unpacked extension ID
- **THEN** Chrome can launch the Plannotator native host from the unpacked extension

### Requirement: Production extension ID is captured for Native Messaging
The system SHALL treat the GitHub Release unpacked extension ID as a required configuration value for production Native Messaging installation.

#### Scenario: Release extension has a stable ID
- **WHEN** the release extension package is built for GitHub Releases
- **THEN** the package includes the manifest configuration required for Chrome to assign the documented stable extension ID when loaded unpacked
- **AND** the production native-host installer and documentation use that ID in the Native Messaging `allowed_origins` entry

#### Scenario: Development extension remains unpacked
- **WHEN** a developer loads the extension unpacked from a local build
- **THEN** the native-host installer still accepts an explicit development extension ID for local testing

## REMOVED Requirements

### Requirement: Chrome extension is prepared for Web Store submission
**Reason**: Chrome Web Store publishing is no longer the intended production distribution path for ClipMark.
**Migration**: Use GitHub Releases distribution requirements and keep any Web Store materials as optional reference documentation outside the production install contract.
