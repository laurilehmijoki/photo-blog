var React = require('react')
React.initializeTouchEvents(true)
var pages = require('./pages')
var basePage = require('./components/basePage/basePage')
var _ = require('lodash')

var currentPage = _(pages)
    .values()
    .find(({path}) => {
        var pathRegExp = path instanceof RegExp ? path : new RegExp(`^${path}$`)
        return pathRegExp.test(document.location.pathname)
    })

var App = React.createClass({
    componentWillMount: function() {
        var component = this
        component.props.modelStream.onValue(model => component.setState({model}))
    },
    render: function() {
        var component = this
        return component.state ? basePage(currentPage, component.state.model) : <span/>
    }
})

window.onload = function() {
    var modelStream = currentPage.modelStream(window.INITIAL_MODEL)
    React.render(<App modelStream={modelStream}/>, document)
}
