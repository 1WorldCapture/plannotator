## ADDED Requirements

### Requirement: Chrome extension is prepared for Web Store submission
The system SHALL provide production Chrome Web Store submission materials for the Chrome clipboard annotation extension.

#### Scenario: Maintainer prepares a store submission
- **WHEN** a maintainer packages the Chrome extension for Chrome Web Store review
- **THEN** the repository provides listing copy, permission rationale, privacy/security disclosure text, reviewer instructions, and required visual asset guidance for the submission

#### Scenario: Reviewer evaluates extension behavior
- **WHEN** a Chrome Web Store reviewer examines the extension
- **THEN** the submission materials explain that the extension only reads clipboard text after explicit user action, does not inject provider-page controls, uses Native Messaging only to launch local Plannotator, and opens the local Plannotator URL in an adjacent Chrome tab

### Requirement: Production extension ID is captured for Native Messaging
The system SHALL treat the Chrome Web Store production extension ID as a required configuration value for production Native Messaging installation.

#### Scenario: Store item receives a stable ID
- **WHEN** the Chrome Web Store item has a production extension ID
- **THEN** the production native-host installer and documentation use that ID in the Native Messaging `allowed_origins` entry

#### Scenario: Development extension remains unpacked
- **WHEN** a developer loads the extension unpacked from a local build
- **THEN** the native-host installer still accepts an explicit development extension ID for local testing

## MODIFIED Requirements

### Requirement: Chrome Native Messaging installation is documented
The system SHALL provide installation instructions or scripts that register the native host manifest for Chrome using the expected `apps/chrome/chrome-native-host` host entry in development and the production native-host release artifact for end users.

#### Scenario: User installs the Chrome workflow
- **WHEN** the user follows the production Chrome workflow installation instructions
- **THEN** Chrome can launch the Plannotator native host from the published extension
- **AND** the registered Native Messaging manifest allows the production Chrome extension ID

#### Scenario: Developer installs the Chrome workflow
- **WHEN** a developer follows the local Chrome workflow installation instructions with an unpacked extension ID
- **THEN** Chrome can launch the Plannotator native host from the unpacked extension
