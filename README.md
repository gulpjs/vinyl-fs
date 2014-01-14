# vinyl-fs [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url] [![Dependency Status](https://david-dm.org/wearefractal/vinyl.png?theme=shields.io)](https://david-dm.org/wearefractal/vinyl)

## Information

<table>
<tr> 
<td>Package</td><td>vinyl-fs</td>
</tr>
<tr>
<td>Description</td>
<td>Vinyl adapter for the file system</td>
</tr>
<tr>
<td>Node Version</td>
<td>>= 0.9</td>
</tr>
</table>

## Usage

```javascript
var es = require('event-stream');
var fs = require('vinyl-fs');

var log = function(file, cb) {
  console.log(file.path);
  cb(null, file);
};

fs.src(["./js/**/*.js", "!./js/vendor/*.js"])
  .pipe(es.map(log))
  .pipe(fs.dest("./output"));
```

## API

### src(globs[, opt])

- Takes a glob string or an array of glob strings as the first argument.
- Possible options for the second argument:
  - buffer - `true` or `false` if you want to buffer the file.
    - Default value is `true`
    - `false` will make file.contents a paused Stream
  - read - `true` or `false` if you want the file to be read or not. Useful for stuff like `rm`ing files.
    - Default value is `true`
    - `false` will disable writing the file to disk via `.dest()`
  - Any glob-related options are documented in [glob-stream] and [node-glob]
- Returns a Readable/Writable stream.
- On write the stream will simply pass items through.
- This stream emits matching [vinyl] File objects

### watch(globs[, opt, cb])

This is just [glob-watcher]

- Takes a glob string or an array of glob strings as the first argument.
- Possible options for the second argument:
  - Any options are passed to [gaze]
- Returns an EventEmitter
  - 'changed' event is emitted on each file change
- Optionally calls the callback on each change event

### dest(folder[, opt])

- Takes a folder path as the first argument.
- Possible options for the second argument:
  - cwd - Specify the working directory the folder is relative to. Default is `process.cwd()`
- Returns a Readable/Writable stream.
- On write the stream will save the [vinyl] File to disk at the folder/cwd specified.
- After writing the file to disk it will be emitted from the stream so you can keep piping these around

## LICENSE

(MIT License)

Copyright (c) 2013 Fractal <contact@wearefractal.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

[glob-stream]: https://github.com/wearefractal/glob-stream
[node-glob]: https://github.com/isaacs/node-glob
[gaze]: https://github.com/shama/gaze
[glob-watcher]: https://github.com/shama/gaze
[vinyl]: https://github.com/wearefractal/vinyl
[npm-url]: https://npmjs.org/package/vinyl-fs
[npm-image]: https://badge.fury.io/js/vinyl-fs.png
[travis-url]: https://travis-ci.org/wearefractal/vinyl-fs
[travis-image]: https://travis-ci.org/wearefractal/vinyl-fs.png?branch=master
[coveralls-url]: https://coveralls.io/r/wearefractal/vinyl-fs
[coveralls-image]: https://coveralls.io/repos/wearefractal/vinyl-fs/badge.png
[depstat-url]: https://david-dm.org/wearefractal/vinyl-fs
[depstat-image]: https://david-dm.org/wearefractal/vinyl-fs.png