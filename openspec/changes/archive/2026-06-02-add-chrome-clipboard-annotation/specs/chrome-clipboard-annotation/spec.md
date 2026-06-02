## ADDED Requirements

### Requirement: User opens clipboard text in Plannotator
The system SHALL allow a user to open the current clipboard text in Plannotator from the Chrome extension popup after an explicit user action.

#### Scenario: Clipboard text is sent to Plannotator
- **WHEN** the user opens the Chrome extension popup, confirms the clipboard preview, and clicks the action to open the clipboard in Plannotator
- **THEN** the extension sends the clipboard text to the native host and the native host opens a Plannotator annotate session for that text

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
The native host SHALL accept a structured Native Messaging request for clipboard annotation and reject unsupported or invalid requests.

#### Scenario: Valid annotation request
- **WHEN** the native host receives a message with type `annotateClipboard`, non-empty text, and optional source metadata
- **THEN** it launches the Plannotator annotate workflow with that text and waits for the annotation session result

#### Scenario: Invalid request type
- **WHEN** the native host receives a message with an unsupported type
- **THEN** it returns an error response and MUST NOT launch Plannotator

#### Scenario: Oversized request
- **WHEN** the native host receives clipboard text larger than the configured maximum
- **THEN** it returns an error response and MUST NOT launch Plannotator

### Requirement: Feedback returns to the clipboard
The system SHALL copy submitted Plannotator annotation feedback back to the user's clipboard through the extension after the native host returns it.

#### Scenario: User submits annotation feedback
- **WHEN** the user submits annotations in the Plannotator session
- **THEN** the native host returns the exported feedback to the extension and the extension copies that feedback to the clipboard

#### Scenario: User exits without feedback
- **WHEN** the user exits the Plannotator session without submitting feedback
- **THEN** the extension reports that no feedback was returned and MUST NOT overwrite the clipboard with an empty response

### Requirement: Chrome Native Messaging installation is documented
The system SHALL provide installation instructions or scripts that register the native host manifest for Chrome using the expected `apps/chrome/chrome-native-host` host entry.

#### Scenario: User installs the Chrome workflow
- **WHEN** the user follows the Chrome workflow installation instructions
- **THEN** Chrome can launch the Plannotator native host from the extension
