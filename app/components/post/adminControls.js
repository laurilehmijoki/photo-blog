var React = require('react')
var Bacon = require('baconjs')
var classnames = require('classnames')
var _ = require('lodash')
var i = require('../../i18n')
var {authorNickname} = require('./authorNickname')

var {fileUploadsForAppendingIntoFragment} = require('./imageUpload')

var hasPendingChanges = model => !_.isEqual(model.post, model.publishedPost)

var youtubeButtonClicked = new Bacon.Bus()
var uploadImageButtonClicked = new Bacon.Bus()
var appendToImageFragmentClicked = new Bacon.Bus()
var cancelChanges = new Bacon.Bus()
var updatedPost = new Bacon.Bus()
var textButtonClicked = new Bacon.Bus()

var adminControls = model => (
    <div className="post__adminControls section">
        <form id="newPostForm" method="post"/>
        <button
            onClick={() => {
                document.getElementById('newPostForm').action = '/posts?authorNickname=' + authorNickname()
                document.getElementById('newPostForm').submit()
            }}
            disabled={hasPendingChanges(model)}
            title={i.addNewPost}
            className={classnames({
                button:true,
                button__secondary: !hasPendingChanges(model),
                button__disabled: hasPendingChanges(model),
                button__small: true
                })}>
            <i className="fa fa-plus"/>
        </button>
        <button
            onClick={evt => {
                evt.stopPropagation()
                textButtonClicked.push()
            }}
            title={i.addText}
            className={classnames({
                button:true,
                button__secondary: true,
                button__small: true
                })}>
            <i className="fa fa-pencil"/>
        </button>
        <button
            onClick={evt => {
                evt.stopPropagation()
                youtubeButtonClicked.push()
            }}
            title={i.addYoutubeVideo}
            className={classnames({
                button:true,
                button__secondary: true,
                button__small: true
                })}>
            <i className="fa fa-youtube"/>
        </button>
        <button
            onClick={evt => {
                evt.stopPropagation()
                uploadImageButtonClicked.push()
            }}
            title={i.addNewPhoto}
            className="post__uploadPhotoButton button button__secondary button__small">
            <i className={classnames({
                fa: true,
                'fa-spin': model.newImageFragmentInProgress,
                'fa-spinner': model.newImageFragmentInProgress,
                'fa-image': !model.newImageFragmentInProgress
            })}/>
        </button>
        <span
            className={classnames({
                post__uploadPhotoButton: true, button: true, button__secondary: true, button__small: true,
                button__disabled: _.isEmpty(model.post.fragments.filter(({type}) => type == 'image'))
            })}
            onClick={evt => {
                evt.stopPropagation()
                appendToImageFragmentClicked.push()
            }}
            title={i.appendPhotoIntoGroup}>
            {(() => {
                var classes = classnames({
                    fa: true,
                    post__appendToImageFragment: true,
                    'fa-spin': model.addingIntoExistingImageFragmentInProgress,
                    'fa-spinner': model.addingIntoExistingImageFragmentInProgress,
                    'fa-image': !model.addingIntoExistingImageFragmentInProgress
                })
                return (
                    <span>
                        <i className={classes}/>
                        <i className={classes} style={model.addingIntoExistingImageFragmentInProgress ? {display: 'none'} : {}}/>
                    </span>
                )
            })()}
        </span>
        <button
            onClick={() => cancelChanges.push()}
            disabled={!hasPendingChanges(model)}
            title={i.cancelChanges}
            className={classnames({
                button:true,
                button__secondary: hasPendingChanges(model),
                button__disabled: !hasPendingChanges(model),
                button__small: true
                })}>
            <i className="fa fa-undo"/>
        </button>
        <button
            onClick={() => updatedPost.push(model)}
            disabled={!hasPendingChanges(model)}
            title={i.saveChanges}
            className={classnames({
                button:true,
                button__primary: hasPendingChanges(model),
                button__disabled: !hasPendingChanges(model),
                button__small: true
                })}>
            <i className="fa fa-floppy-o"/>
        </button>
        {(() => {
            var mayChangePublishStatus = !hasPendingChanges(model)
            var mayNotChangePublishStatus = !mayChangePublishStatus
            var showPublishButton = mayChangePublishStatus && !model.post.published
            var showUnpublisButton = mayChangePublishStatus && model.post.published
            return (
                <button
                    onClick={() => {
                        var m = _.cloneDeep(model)
                        var post = _.assign(m.post, { published: !m.post.published})
                        updatedPost.push(_.assign(m, {post}))
                    }}
                    disabled={mayNotChangePublishStatus}
                    title={showPublishButton ? i.publishPostText : showUnpublisButton ? i.unpublishPostText : undefined}
                    className={classnames({
                        button: true,
                        button__secondary: showPublishButton || showUnpublisButton,
                        button__disabled: mayNotChangePublishStatus,
                        button__small: true
                        })}>
                    <i className={classnames({
                        fa: true,
                        'fa-circle': true,
                        post__adminControls__unpublish: showUnpublisButton,
                        post__adminControls__publish: showPublishButton
                    })}/>
                </button>
            )
        })()}
    </div>
)

module.exports = {
    adminControls,
    uploadImageButtonClicked,
    appendToImageFragmentClicked,
    cancelChanges,
    updatedPost,
    youtubeButtonClicked,
    textButtonClicked
}