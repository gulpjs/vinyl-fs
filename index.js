module.exports = {
  src: require('./lib/createInputStream'),
  dest: require('./lib/createOutputStream'),
  watch: require('glob-watcher')
};