## 1. Repository Setup

- [x] 1.1 Create the downstream GitHub repository for Chrome packaging and confirm its owner/name.
- [x] 1.2 Rename the existing `origin` remote for `https://github.com/backnotprop/plannotator.git` to `upstream`.
- [x] 1.3 Add the downstream repository as `origin` and verify fetch/push remotes.
- [x] 1.4 Push the current branch and tags needed for release workflow testing to the downstream repository.

## 2. Chrome Web Store Submission Package

- [x] 2.1 Audit `apps/chrome/chrome-extension/manifest.json` for production name, description, version, permissions, and reviewer-facing clarity.
- [x] 2.2 Build the production Chrome extension package and verify the zip only includes files needed by Chrome Web Store.
- [x] 2.3 Create Chrome Web Store listing copy covering purpose, workflow, native-host requirement, privacy posture, and support URL.
- [x] 2.4 Create reviewer instructions explaining clipboard access, `nativeMessaging`, tab opening, and how to install/register the native host during review.
- [x] 2.5 Prepare screenshot/icon/promo asset guidance or assets required for the store listing.
- [ ] 2.6 Submit or draft the Chrome Web Store item and record the production extension ID once available.

## 3. Native Host Release Workflow

- [x] 3.1 Add a GitHub Actions workflow that builds the Chrome extension package and Chrome native host artifact on release tags.
- [x] 3.2 Attach the Chrome extension package, native host artifact, and checksum files to the GitHub Release.
- [x] 3.3 Ensure the workflow can be run manually for release-candidate validation without publishing a final release.
- [x] 3.4 Document required GitHub repository settings, release permissions, and any secrets.

## 4. Native Host Installer

- [x] 4.1 Add a public install script that downloads a selected or latest native host artifact from GitHub Releases.
- [x] 4.2 Add checksum verification for downloaded native host artifacts.
- [x] 4.3 Install the native host into a stable user-local directory.
- [ ] 4.4 Write the Chrome Native Messaging manifest with the production extension ID by default.
- [x] 4.5 Preserve a development override for explicit unpacked extension IDs.
- [x] 4.6 Detect a missing installed `plannotator` command and show the standard Plannotator CLI install command.
- [x] 4.7 Cover macOS and Linux manifest locations, and either implement Windows registry registration or document Windows as intentionally deferred.

## 5. Native Host Runtime Alignment

- [x] 5.1 Verify the released native host invokes the installed `plannotator annotate-last --stdin --gate --json` command rather than bundled Plannotator code.
- [x] 5.2 Verify native-host errors for missing Plannotator CLI, invalid requests, ready timeout, and final response parsing remain clear in the extension popup.
- [x] 5.3 Add or update tests for production extension ID defaults and development extension ID overrides.

## 6. Documentation and Verification

- [x] 6.1 Update `apps/chrome/README.md` with production install flow, development flow, release artifacts, and Web Store/native-host separation.
- [x] 6.2 Update marketing docs or install docs with the Chrome extension workflow and native-host install command.
- [x] 6.3 Run Chrome extension tests and native-host tests.
- [ ] 6.4 Run a manual end-to-end check with the packaged extension, installed native host, and installed Plannotator CLI.
- [x] 6.5 Run `openspec validate prepare-chrome-store-and-native-host-release --strict`.
