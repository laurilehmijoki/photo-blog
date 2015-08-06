var React = require('react')
var Bacon = require('baconjs')
var _ = require('lodash')
var i = require('../../i18n')
var {authorNickname, persistAuthorNickname} = require('./authorNickname')
var classnames = require('classnames')
var {httpPostResponse} = require('../../../bacon-superagent')

var Comment = React.createClass({
    componentDidMount: function() {
        var component = this
        var {id, createdCommentId} = component.props
        if (id == createdCommentId) {
            document.location.hash = `comment-${id}`
        }
    },
    render: function() {
        var component = this
        var {id, commentAuthor, commentText, createdCommentId} = component.props
        return (
            <div
                className={classnames({
                    post__comments__comment: true,
                    post__comments__comment__created: id == createdCommentId
                })}
                id={`comment-${id}`}>
                <a href={`#comment-${id}`}>
                    <div className="post__comments__comment__author">{commentAuthor}:</div>
                </a>
                {commentText.split("\n").map((commentLine, index) =>
                    <div className="post__comments__comment__paragraph" key={index}>{commentLine}</div>)
                }
            </div>
        )
    }
})

var commentAuthorNameInput = new Bacon.Bus()
commentAuthorNameInput.onValue(persistAuthorNickname)
var commentTextInput = new Bacon.Bus()
var saveCommentClicked = new Bacon.Bus()

var AuthorInput = React.createClass({
    componentDidMount: function() {
        if (authorNickname()) {
            commentAuthorNameInput.push(authorNickname())
        }
    },
    render: function() {
        return (
            <input
                className="post__comments__authorInput"
                type="text"
                onChange={evt => commentAuthorNameInput.push(evt.target.value.replace(/\n/, ''))}
                value={this.props.inputValue}
                placeholder={i.yourName}/>
        )
    }
})

var CommentTextInput = React.createClass({
    inputChanged: function(textInput) {
        var component = this
        component.adjustTextareaHeight()
        commentTextInput.push(textInput)
    },
    adjustTextareaHeight: function() {
        var component = this
        var node = React.findDOMNode(component.refs.textInput)
        if (node.scrollHeight > node.clientHeight) {
            node.style.height = node.scrollHeight+'px'
        }
    },
    render: function() {
        var component = this
        return (
            <textarea
                ref="textInput"
                value={component.props.inputValue || ''}
                onChange={evt => component.inputChanged(evt.target.value)}
                placeholder={i.commentTextPlaceholder}
                className="post__comments__textInput"/>
        )
    }
})

var isValidComment = (commentAuthorName, commentText) => _.size(commentAuthorName) >= 2 && _.size(commentText) >= 2
var renderComments = ({post, commentAuthorName, commentText, createdCommentId, commentBeingSaved}, comments) =>
    <div className="post__comments section">
        { comments.map(({id, authorNickname, comment}, index) => <Comment key={index} id={id} commentAuthor={authorNickname} commentText={comment} createdCommentId={createdCommentId}/>) }
        <div className="post__comments__addComment">
            <AuthorInput inputValue={commentAuthorName}/>
            <CommentTextInput inputValue={commentText}/>
            <button
                className={classnames({
                    button: true,
                    button__primary: true,
                    button__small: true,
                    button__disabled: !isValidComment(commentAuthorName, commentText)
                })}
                disabled={!isValidComment(commentAuthorName, commentText)}
                onClick={() => saveCommentClicked.push({postId: post.id, commentAuthorName, commentText})}>
                {commentBeingSaved ? i.commentIsBeingSaved : i.addComment}
            </button>
        </div>
    </div>

var savedComment = saveCommentClicked
    .throttle(1000 /* prevent double clicks */)
    .flatMap(({postId, commentText, commentAuthorName}) => httpPostResponse({url: '/comments', body: {postId, commentText, commentAuthorName}}))
    .map('.body')

var commentBeingSaved = saveCommentClicked.map(true).merge(savedComment.map(false).mapError(false)).toProperty(false)

module.exports = {
    renderComments,
    commentAuthorNameInput,
    commentTextInput,
    savedComment,
    commentBeingSaved
}