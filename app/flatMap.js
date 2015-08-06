var _ = require('lodash')

module.exports = (xs, f) => _(xs).map(f).flatten().value()