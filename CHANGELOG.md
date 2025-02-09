# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-02-08

### Added

- Added the ability to delete history, both from Egghead and chrome.

- Added import/export for databases, which are just sqlite databases that can be used w/ other SQLite tooling.

- Added ability to see "source sessions" in the session detail page.

### Changed

- Switched backend to use OPFS + `offscreen` API instead of the previous IndexedDB-based backend. This is a backwards-imcompontabile change but improves search performance dramatically.

- Redesigned UI w/ shadcn

### Fixed

- Fixed reliability issues around capturing link opens, including new tabs.

- Fixed reliability issues around link opening from the history page.

## [1.0.4] - 2023-07-30

### Added

- Added platform and version to the "About" page.

- Added release flow instructions to the documentation.

## [1.0.3] - 2023-04-03

### Changed

- Fixed an issue with query string parsing where words containing operator like `notebook` (containing `not`) would not be parsed correctly.

## [1.0.2] - 2022-08-09

## Changed

- Webpack changes in order to avoid any unsafe `eval`, which firefox gives lots of warnings about.

## [1.0.1] - 2022-08-29

### Added

- Retention policy setting so that history data does not grow arbitrarily.

- Warning when queries are less than 3 characters so that users know to lengthen their search. Search terms less than 3 characters long will always return no results because of the `trigram` tokenizer.

### Changed

- Performance improvements to allow the initial crawl to complete successfully in systems with a large amount of history.

## [1.0.0] - 2022-08-23

### Added

- Initial release of egghead to the chrome web store
