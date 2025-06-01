# Changelog

### [4.0.1](https://www.github.com/gulpjs/vinyl-fs/compare/v4.0.0...v4.0.1) (2025-06-01)


### Bug Fixes

* Avoid Node.js deprecation warning for `fs.Stats` ([#358](https://www.github.com/gulpjs/vinyl-fs/issues/358)) ([3ed0c3f](https://www.github.com/gulpjs/vinyl-fs/commit/3ed0c3f104fec5f05ffc68f198fdc0aae7a68efe))
* Avoid transcoding streaming output with default options ([#360](https://www.github.com/gulpjs/vinyl-fs/issues/360)) ([7b6dcd3](https://www.github.com/gulpjs/vinyl-fs/commit/7b6dcd3561cee6cae2e90ae9096cb1ca31953db5))

## [4.0.0](https://www.github.com/gulpjs/vinyl-fs/compare/v3.0.3...v4.0.0) (2023-06-11)


### ⚠ BREAKING CHANGES

* Prefer symlink property set on Vinyl object over its path (#345)
* Avoid error and reflect filesystem stat if futimes not implemented (#341)
* Consider the greater of ctime & mtime when comparing since option (#340)
* Normalize repository, dropping node <10.13 support
* Switch stream implementation to streamx (#333)
* Default to `utf8` decoding and encoding. Add `encoding` option to change (#287)

### Features

* Consider the greater of ctime & mtime when comparing since option ([#340](https://www.github.com/gulpjs/vinyl-fs/issues/340)) ([9f907ba](https://www.github.com/gulpjs/vinyl-fs/commit/9f907ba92c71b336b5f82be3881b72328bcea4d7))
* Convert Windows-style paths in `src()` to proper globs ([910c8a5](https://www.github.com/gulpjs/vinyl-fs/commit/910c8a521834d5aa9dec5a83102b59ba5c531e08))
* Prefer symlink property set on Vinyl object over its path ([#345](https://www.github.com/gulpjs/vinyl-fs/issues/345)) ([0ac27a2](https://www.github.com/gulpjs/vinyl-fs/commit/0ac27a284e9e02530b1865b2574c03943cec7446))
* Replace lazystream with streamx Composer ([#344](https://www.github.com/gulpjs/vinyl-fs/issues/344)) ([a80dae3](https://www.github.com/gulpjs/vinyl-fs/commit/a80dae30d7fb1c0f51acc00170648792f740b54b))
* Switch stream implementation to streamx ([#333](https://www.github.com/gulpjs/vinyl-fs/issues/333)) ([910c8a5](https://www.github.com/gulpjs/vinyl-fs/commit/910c8a521834d5aa9dec5a83102b59ba5c531e08))
* Test against streams from core, streamx, and readable-stream ([910c8a5](https://www.github.com/gulpjs/vinyl-fs/commit/910c8a521834d5aa9dec5a83102b59ba5c531e08))
* Default to `utf8` decoding and encoding. Add `encoding` option to change (#287)

### Bug Fixes

* Add regression test for negative relative globs ([#343](https://www.github.com/gulpjs/vinyl-fs/issues/343)) ([ebe6498](https://www.github.com/gulpjs/vinyl-fs/commit/ebe6498124294306a7491958aebf0d3a184bdf11))
* Avoid error and reflect filesystem stat if futimes not implemented ([#341](https://www.github.com/gulpjs/vinyl-fs/issues/341)) ([9ba20fd](https://www.github.com/gulpjs/vinyl-fs/commit/9ba20fd04a6c3a0f191134d60ea6c525259fa237))
* Correct regression with src using arrays of globs ([#342](https://www.github.com/gulpjs/vinyl-fs/issues/342)) ([5659934](https://www.github.com/gulpjs/vinyl-fs/commit/565993435f9d15712ade3c7c422030d3022f3742))
* Reference correct property name in integration testing ([#320](https://www.github.com/gulpjs/vinyl-fs/issues/320)) ([df245a4](https://www.github.com/gulpjs/vinyl-fs/commit/df245a40f5dbe37ca620ee71f1a7930cfccb5e42))
* Workaround symlink stat bug in Node 10 on Windows ([910c8a5](https://www.github.com/gulpjs/vinyl-fs/commit/910c8a521834d5aa9dec5a83102b59ba5c531e08))


### Miscellaneous Chores

* Normalize repository, dropping node <10.13 support ([910c8a5](https://www.github.com/gulpjs/vinyl-fs/commit/910c8a521834d5aa9dec5a83102b59ba5c531e08))
