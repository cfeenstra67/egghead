# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Updated license to MIT

- Switched package manager to `pnpm`

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
