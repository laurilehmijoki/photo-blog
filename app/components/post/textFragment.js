var React = require('react')
var Bacon = require('baconjs')
var _ = require('lodash')

var textFragmentInput = new Bacon.Bus()
var newTextFragment = new Bacon.Bus()
var fragmentFocusAppliedOnTextFragment = new Bacon.Bus()
var deleteTextFragment = new Bacon.Bus()

var TextFragment = React.createClass({
    propTypes: {
        fragmentIndex: React.PropTypes.number.isRequired,
        fragment: React.PropTypes.shape({
            type: React.PropTypes.oneOf(['text']),
            text: React.PropTypes.string
        }).isRequired
    },
    componentDidUpdate: function(prevProps, prevState) {
        var component = this
        var focusIsOnThisFragment = component.props.nextFocusedFragmentIndex === component.props.fragmentIndex
        var focusChanged = prevProps.nextFocusedFragmentIndex !== component.props.nextFocusedFragmentIndex
        if (focusIsOnThisFragment && focusChanged) {
            React.findDOMNode(component.refs.fragmentTextEditor).focus()
            fragmentFocusAppliedOnTextFragment.push()
        }
    },
    componentDidMount: function() {
        var component = this
        if (component.props.fragmentIndex == component.props.nextFocusedFragmentIndex) {
            React.findDOMNode(component.refs.fragmentTextEditor).focus()
            fragmentFocusAppliedOnTextFragment.push()
        }
    },
    render: function() {
        var component = this
        var {fragment, fragmentIndex} = component.props
        return (
            <div className="post__textContainer post__expandingArea">
                <pre><span>{fragment.text}</span><br/></pre>
                <textarea
                    ref="fragmentTextEditor"
                    onKeyUp={event => {
                        var enterKeyCode = 13
                        var backspaceKeyCode = 8
                        if (event.keyCode == enterKeyCode) {
                            newTextFragment.push(fragmentIndex + 1)
                        }
                        if (event.keyCode == backspaceKeyCode && _.isEmpty(fragment.text)) {
                            deleteTextFragment.push(fragmentIndex)
                        }
                    }}
                    onChange={event => {
                        var oldInput = fragment.text
                        var newInput = event.target.value
                        var hasChanged = newInput.replace(/\n/, '') != oldInput
                        if (hasChanged) {
                            textFragmentInput.push({fragmentText: event.target.value, fragmentIndex})
                        }
                    }}
                    value={fragment.text}/>
            </div>
        )
    }
})

module.exports = {
    TextFragment,
    textFragmentInput,
    newTextFragment,
    fragmentFocusAppliedOnTextFragment,
    deleteTextFragment
}