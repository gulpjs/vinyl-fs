var streams = ['stream', 'streamx', 'readable-stream'];

function describeStreams(name, suite) {
  streams.forEach(function (moduleName) {
    var stream = require(moduleName);

    describe(name + ' (using ' + moduleName + ')', function () {
      suite(stream);
    });
  });
}

module.exports = describeStreams;
