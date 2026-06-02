## Requirements

### Requirement: User opens clipboard text in Plannotator
The system SHALL allow a user to open the current clipboard text in Plannotator from the Chrome extension popup after an explicit user action, and SHALL display the launched Plannotator session in a new active tab adjacent to the initiating tab in the current Chrome window.

#### Scenario: Clipboard text is sent to Plannotator
- **WHEN** the user opens the Chrome extension popup, confirms the clipboard preview, and clicks the action to open the clipboard in Plannotator
- **THEN** the extension sends the clipboard text to the native host and the native host starts a Plannotator annotate session for that text
- **AND** the extension opens the Plannotator session URL in a new active Chrome tab adjacent to the tab where the extension action was invoked

#### Scenario: Plannotator URL is unavailable
- **WHEN** the native host fails or exits before publishing a Plannotator session URL
- **THEN** the extension reports that Plannotator could not be opened and MUST NOT create a Chrome tab for the failed session

#### Scenario: Empty clipboard is rejected
- **WHEN** the user attempts to open clipboard content and the clipboard text is empty or whitespace-only
- **THEN** the extension reports that there is no clipboard text to review and MUST NOT invoke the native host

### Requirement: Integration avoids provider page modification
The system MUST NOT inject controls into web AI provider pages or extract message content from provider page DOM for this workflow.

#### Scenario: User visits a supported AI web page
- **WHEN** the user is on Gemini, ChatGPT, Claude, or another web AI page
- **THEN** the extension does not add buttons to the page and does not inspect the page DOM for assistant messages

#### Scenario: User copies through provider UI
- **WHEN** the user copies an AI response using the provider's own copy behavior
- **THEN** the extension treats the resulting clipboard text as the only message content source

### Requirement: Native host uses explicit request protocol
The native host SHALL accept a structured Native Messaging request for clipboard annotation, reject unsupported or invalid requests, publish the Plannotator session URL before the final annotation result, and return the final annotation decision when the Plannotator session ends.

#### Scenario: Valid annotation request
- **WHEN** the native host receives a message with type `annotateClipboard`, non-empty text, and optional source metadata
- **THEN** it launches the Plannotator annotate workflow with that text and waits for the annotation session result
- **AND** it publishes a structured ready message containing the Plannotator session URL before the final annotation result is available

#### Scenario: Invalid request type
- **WHEN** the native host receives a message with an unsupported type
- **THEN** it returns an error response and MUST NOT launch Plannotator

#### Scenario: Oversized request
- **WHEN** the native host receives clipboard text larger than the configured maximum
- **THEN** it returns an error response and MUST NOT launch Plannotator

#### Scenario: Final annotation result
- **WHEN** the user submits feedback, approves, or dismisses the Plannotator session
- **THEN** the native host returns a structured final response representing the resulting feedback or no-feedback decision

### Requirement: Feedback returns to the clipboard
The system SHALL copy submitted Plannotator annotation feedback back to the user's clipboard through the extension after the native host returns it.

#### Scenario: User submits annotation feedback
- **WHEN** the user submits annotations in the Plannotator session
- **THEN** the native host returns the exported feedback to the extension and the extension copies that feedback to the clipboard

#### Scenario: User exits without feedback
- **WHEN** the user exits the Plannotator session without submitting feedback
- **THEN** the extension reports that no feedback was returned and MUST NOT overwrite the clipboard with an empty response

### Requirement: Chrome Native Messaging installation is documented
The system SHALL provide installation instructions or scripts that register the native host manifest for Chrome using the expected `apps/chrome/chrome-native-host` host entry in development and the production native-host release artifact for end users.

#### Scenario: User installs the Chrome workflow
- **WHEN** the user follows the production Chrome workflow installation instructions
- **THEN** Chrome can launch the Plannotator native host from the published extension
- **AND** the registered Native Messaging manifest allows the production Chrome extension ID

#### Scenario: Developer installs the Chrome workflow
- **WHEN** a developer follows the local Chrome workflow installation instructions with an unpacked extension ID
- **THEN** Chrome can launch the Plannotator native host from the unpacked extension

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
