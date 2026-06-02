## MODIFIED Requirements

### Requirement: User opens clipboard text in Plannotator
The system SHALL allow a user to open the current clipboard text in Plannotator from the Chrome extension popup after an explicit user action, and SHALL display the launched Plannotator session in a new active tab adjacent to the initiating tab in the current Chrome window.

#### Scenario: Clipboard text is sent to Plannotator
- **WHEN** the user opens the Chrome extension popup, confirms the clipboard preview, and clicks the action to open the clipboard in Plannotator
- **THEN** the extension sends the clipboard text to the native host and the native host starts a Plannotator annotate session for that text
- **AND** the extension opens the Plannotator session URL in a new active Chrome tab adjacent to the tab where the extension action was invoked

#### Scenario: Empty clipboard is rejected
- **WHEN** the user attempts to open clipboard content and the clipboard text is empty or whitespace-only
- **THEN** the extension reports that there is no clipboard text to review and MUST NOT invoke the native host

#### Scenario: Plannotator URL is unavailable
- **WHEN** the native host fails or exits before publishing a Plannotator session URL
- **THEN** the extension reports that Plannotator could not be opened and MUST NOT create a Chrome tab for the failed session

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
