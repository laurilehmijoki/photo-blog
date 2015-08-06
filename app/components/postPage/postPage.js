var React = require('react')
var Bacon = require('baconjs')
var header = require('../header/header')
var {renderPost, postStream, postPageTitle} = require('../post/post')

module.exports = {
    pageTitle: model => postPageTitle(model),
    renderPage: model =>
        <body>
            {header}
            {renderPost(model)}
        </body>,
    modelStream: model => Bacon.once(model).merge(postStream(model).toEventStream())
}
