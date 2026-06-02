## ADDED Requirements

### Requirement: Native host is released from GitHub
The system SHALL build and publish Chrome workflow release artifacts through GitHub Releases.

#### Scenario: Maintainer creates a release
- **WHEN** a maintainer creates a release tag for the Chrome workflow
- **THEN** GitHub Actions builds the native host artifact and attaches it to the GitHub Release
- **AND** the release includes checksum metadata for the published artifact

#### Scenario: Release build includes extension artifact
- **WHEN** the Chrome release workflow runs
- **THEN** it also builds a Chrome extension package suitable for GitHub Release unpacked-extension distribution
- **AND** the release includes checksum metadata for the extension artifact

### Requirement: Chrome extension installer downloads release artifacts
The system SHALL provide a curl-installable script that downloads the ClipMark Chrome extension from GitHub Releases and installs the unpacked extension files into a stable local directory.

#### Scenario: User installs extension files from release
- **WHEN** the user runs the documented Chrome extension install command
- **THEN** the installer downloads the selected or latest extension release artifact
- **AND** the installer verifies the checksum metadata for the extension artifact
- **AND** the installer unpacks the extension into the documented local extension directory
- **AND** the installer prints the manual browser steps required to load the unpacked extension

#### Scenario: User pins an extension release version
- **WHEN** the user passes a version option to the Chrome extension installer
- **THEN** the installer downloads and installs the extension artifact for that release version

### Requirement: Combined Chrome workflow installer
The system SHALL provide a documented release installer path that installs both the unpacked extension files and the Chrome Native Messaging host for macOS and Linux.

#### Scenario: User runs the combined release installer
- **WHEN** the user runs the documented combined Chrome workflow install command
- **THEN** the installer installs the extension files from GitHub Releases
- **AND** the installer installs the native host release artifact
- **AND** the installer writes the Native Messaging manifest with the release extension ID
- **AND** the installer prints the manual `Load unpacked` browser steps

### Requirement: Native host installer downloads release artifacts
The system SHALL provide a curl-installable script that downloads the Chrome native host from GitHub Releases and installs it locally.

#### Scenario: User installs native host from release
- **WHEN** the user runs the documented install command
- **THEN** the installer downloads the selected or latest native host release artifact
- **AND** the installer verifies the checksum when checksum metadata is available
- **AND** the installer writes the Native Messaging manifest to the platform-appropriate Chrome host location

#### Scenario: User pins a release version
- **WHEN** the user passes a version option to the native host installer
- **THEN** the installer downloads and installs the native host artifact for that release version

### Requirement: Native host uses installed Plannotator CLI
The native host SHALL invoke the user's installed `plannotator` command and MUST NOT bundle the Plannotator CLI or browser UI.

#### Scenario: Plannotator CLI is installed
- **WHEN** the Chrome extension sends a valid clipboard annotation request to the native host
- **THEN** the native host invokes the installed `plannotator annotate-last --stdin --gate --json` command for the annotation workflow

#### Scenario: Plannotator CLI is missing
- **WHEN** the native host or installer cannot find an installed `plannotator` command
- **THEN** it reports a clear error with the standard Plannotator CLI installation command

### Requirement: Native host installer supports production and development extension IDs
The native host installer SHALL use the GitHub Release extension ID by default and SHALL allow developers to override it for unpacked-extension testing.

#### Scenario: User runs production install
- **WHEN** the user runs the documented production native host install command
- **THEN** the installer writes a Native Messaging manifest whose `allowed_origins` includes the GitHub Release extension ID

#### Scenario: Developer runs local install
- **WHEN** a developer passes an explicit extension ID to the installer
- **THEN** the installer writes a Native Messaging manifest whose `allowed_origins` includes that supplied extension ID

### Requirement: Downstream repository preserves upstream relationship
The system SHALL document and support a downstream Git repository setup where the original Plannotator repository remains `upstream` and the packaging repository is `origin`.

#### Scenario: Maintainer prepares the packaging repository
- **WHEN** the maintainer creates the downstream GitHub repository for Chrome packaging work
- **THEN** the local repository can push to the downstream repository as `origin`
- **AND** the original Plannotator repository remains available as `upstream` for future synchronization
