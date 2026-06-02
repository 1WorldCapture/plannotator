## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Native host installer supports production and development extension IDs
The native host installer SHALL use the GitHub Release extension ID by default and SHALL allow developers to override it for unpacked-extension testing.

#### Scenario: User runs production install
- **WHEN** the user runs the documented production native host install command
- **THEN** the installer writes a Native Messaging manifest whose `allowed_origins` includes the GitHub Release extension ID

#### Scenario: Developer runs local install
- **WHEN** a developer passes an explicit extension ID to the installer
- **THEN** the installer writes a Native Messaging manifest whose `allowed_origins` includes that supplied extension ID
