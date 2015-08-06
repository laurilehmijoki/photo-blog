var React = require('react')
var Bacon = require('baconjs')
var {postDate} = require('../../i18n')
var classnames = require('classnames')
var _ = require('lodash')
var i = require('../../i18n')
var {postUrl} = require('./postUrl')
var flatMap = require('../../flatMap')
var inBrowser = require('../../inBrowser')
var {publishChangesText, cancelChangesText, addPhotosText, newImageFragmentInProgressText} = require('../../i18n')
var {renderComments, commentAuthorNameInput, commentTextInput, savedComment, commentBeingSaved} = require('./comments')
var {httpPutResponse} = require('../../../bacon-superagent')
var {
    TextFragment,
    textFragmentInput,
    newTextFragment,
    fragmentFocusAppliedOnTextFragment,
    deleteTextFragment
} = require('./textFragment')
var {imagesFragment, imageDragStarted, imageDragEnded, imageDragMoved} = require('./imagesFragment')
var {
    youtubeFragment,
    youtubeDragStarted,
    youtubeDragMoved,
    youtubeDragEnded,
    youtubePromptTextInput,
    youtubeTextInputBlurred,
    newYoutubeFragment,
    youtubeTextInput
} = require('./youtubeFragment')
var {
    adminControls,
    uploadImageButtonClicked,
    appendToImageFragmentClicked,
    cancelChanges,
    textButtonClicked,
    updatedPost,
    youtubeButtonClicked
} = require('./adminControls')
var {persistAuthorNickname} = require('./authorNickname')

var {newImageFragment, fileUploadsForNewImageFragment, fileUploadsForAppendingIntoFragment, additionsIntoImageFragment} = require('./imageUpload')

var textPlaceholderClicked = new Bacon.Bus()
var youtubePlaceholderClicked = new Bacon.Bus()

var renderPlaceholdersAndPrompts = (model, newFragmentIndex) =>
    [
        <label
            className={classnames({
                post__placeholder: true,
                post__placeholder__clickable: true,
                post__placeholder__visible: model.placeholder == 'newImageFragmentPlaceholder',
                post__placeholder__hidden: model.placeholder != 'newImageFragmentPlaceholder'
            })}
            key="1">
            <input
                type="file"
                multiple
                className="post__fileInput"
                onChange={evt => fileUploadsForNewImageFragment.push({files: evt.target.files, newFragmentIndex})}/>
            <i className="fa fa-image post__image__placeholder"/>
        </label>,
        <span
            onClick={() => youtubePlaceholderClicked.push(newFragmentIndex)}
            className={classnames({
                post__placeholder: true,
                post__placeholder__clickable: true,
                post__placeholder__visible: model.placeholder == 'youtubePlaceholder',
                post__placeholder__hidden: model.placeholder != 'youtubePlaceholder'
            })}
            key="2">
            <i className="fa fa-youtube"/>
        </span>,
        <span
            className="post__youtubePrompt"
            style={{display: model.showYoutubePromptAtIndex === newFragmentIndex ? 'block' : 'none'}}
            key="3">
            {youtubeTextInput(model.youtubePromptTextInput, newFragmentIndex)}
        </span>,
        <span
            onClick={() => textPlaceholderClicked.push(newFragmentIndex)}
            title={i.addText}
            className={classnames({
                post__placeholder: true,
                post__placeholder__clickable: true,
                post__placeholder__visible: model.placeholder == 'textPlaceholder',
                post__placeholder__hidden: model.placeholder != 'textPlaceholder'
            })}
            key="4">
            <i className="fa fa-pencil"/>
        </span>
    ]

var renderFragment = model => (fragment, fragmentIndex) => {
    var {needsPadding, renderFragment} = {
        image: {
            needsPadding: false,
            renderFragment: () => imagesFragment(model, fragment, fragmentIndex)
        },
        text: {
            needsPadding: true,
            renderFragment: () =>
                model.isAdmin ?
                    <TextFragment
                        fragment={fragment}
                        fragmentIndex={fragmentIndex}
                        nextFocusedFragmentIndex={model.nextFocusedFragmentIndex}/>
                    :
                    <p className="post__textContainer">{fragment.text}</p>
        },
        youtube: {
            needsPadding: false,
            renderFragment: () => youtubeFragment(fragment, model)
        }
    }[fragment.type]

    return (
        <div className={classnames({section: true, section__padded: needsPadding})} key={fragmentIndex}>
            {renderFragment()}
            {renderPlaceholdersAndPrompts(model, fragmentIndex)}
        </div>
    )
}

var postTitleInput = new Bacon.Bus()
var postAuthorNicknameInput = new Bacon.Bus()
postAuthorNicknameInput.onValue(persistAuthorNickname)

var documentClicks = inBrowser ? Bacon.fromEventTarget(document, 'click') : Bacon.never()

var renderPost = model => {
    var {post} = model
    var textInput = (className, value, onChangeBus) =>
        <input
            className={className}
            onFocus={evt => {
                if (!model.isAdmin) { evt.target.blur() }
            }}
            onKeyUp={event => {
                var enterKeyCode = 13
                if (event.keyCode == enterKeyCode) {
                    event.target.blur()
                }
            }}
            size={value.length}
            onChange={evt => onChangeBus.push(evt.target.value.replace(/\n/, '')) }
            value={value}/>
    return (
        <div>
            <main className={classnames({post__withAdminPage: model.isAdmin })}>
                <article className="post">
                    <section className="section section__padded">
                        {textInput('post__title', post.title, postTitleInput)}
                    </section>
                    <section className="section section__padded">
                        <div className="post__date">{postDate(post.createdAt)}</div>
                        {textInput('post__author', post.authorNickname, postAuthorNicknameInput)}
                    </section>
                    <div className="post__body">
                        {_.isEmpty(post.fragments) ?
                            renderPlaceholdersAndPrompts(model, 0) :
                            post.fragments.map(renderFragment(model))
                        }
                    </div>
                </article>
                {renderComments(model, model.comments)}
            </main>
            { model.isAdmin ? adminControls(model) : undefined }
        </div>
    )
}

var addFragment = (post, newFragmentIndex, newFragment) => {
    var fragments = _.isEmpty(post.fragments) ?
        [newFragment] :
        flatMap(post.fragments, (fragment, index) =>
            index == newFragmentIndex ? [fragment, newFragment] : [fragment]
        )
    return _.assign(_.cloneDeep(post), { fragments })
}

var userWantsToDeleteDraggedItem = ({screenXDelta}) => Math.abs(screenXDelta) > 50

var postPageTitle = model => model.post.title

var postStream = model => Bacon.update(model,
    [
        Bacon.mergeAll(
            postTitleInput.map(title => ({title})),
            postAuthorNicknameInput.map(authorNickname => ({authorNickname}))
        )
    ], (m, postPatchUpdate) => {
        var model = _.cloneDeep(m)
        return _.assign(model, {post: _.assign(model.post, postPatchUpdate)})
    },

    [textFragmentInput], (m, {fragmentText, fragmentIndex}) => {
        var model = _.cloneDeep(m)
        var post = _.assign(model.post, {
            fragments: model.post.fragments.map(
                (fragment, index) => index == fragmentIndex ? _.assign(fragment, {text: fragmentText}) : fragment
            )
        })
        return _.assign(model, {post})
    },
    [newTextFragment], (m, newFragmentIndex) => {
        var model = _.cloneDeep(m)
        var post = _.assign(model.post, {
            fragments: flatMap(
                model.post.fragments,
                (fragment, index) => index == newFragmentIndex - 1 ? [fragment, {type: 'text', text: ''}] : [fragment]
            )
        })
        return _.assign(model, {
            post,
            nextFocusedFragmentIndex: newFragmentIndex
        })
    },
    [deleteTextFragment], (m, indexToDelete) => {
        var model = _.cloneDeep(m)
        var post = _.assign(model.post, {
            fragments: flatMap(
                model.post.fragments,
                (fragment, index) => index == indexToDelete ? [] : [fragment]
            )
        })
        return _.assign(model, {post, nextFocusedFragmentIndex: indexToDelete === 0 ? 0 : indexToDelete - 1})
    },
    [fragmentFocusAppliedOnTextFragment], model => _.omit(model, 'nextFocusedFragmentIndex'),
    [
        updatedPost
            .flatMap(model => httpPutResponse({url: postUrl(model.post.id, model.post.title), body: model}).map('.body'))
    ], (model, postFromDatabase) => (
        _.assign(_.cloneDeep(model), {post: _.cloneDeep(postFromDatabase), publishedPost: postFromDatabase})
    ),
    [cancelChanges], model => _.assign(_.cloneDeep(model), {post: model.publishedPost}),
    [fileUploadsForNewImageFragment], model => _.assign(_.cloneDeep(model), {newImageFragmentInProgress: true}),
    [fileUploadsForAppendingIntoFragment], model => _.assign(_.cloneDeep(model), {addingIntoExistingImageFragmentInProgress: true}),
    [newImageFragment], (m, {newImageFragment, newFragmentIndex}) => {
        var model = _.cloneDeep(m)
        var post = addFragment(model.post, newFragmentIndex, newImageFragment)
        return _.assign(model, {
            post,
            newImageFragmentInProgress: false,
            placeholder: undefined
        })
    },
    [additionsIntoImageFragment], (m, {newImages, targetImageFragment}) => {
        var model = _.cloneDeep(m)
        var fragments = model.post.fragments.map(fragment =>
            _.isEqual(fragment, targetImageFragment) ?
                _.assign(fragment, {
                    images: fragment.images.concat(newImages)
                })
                : fragment
        )
        var post = _.assign(model.post, { fragments})
        return _.assign(model, {
            post,
            addingIntoExistingImageFragmentInProgress: false,
            placeholder: undefined
        })
    },
    [uploadImageButtonClicked], model => (
        _.assign(_.cloneDeep(model), {placeholder: 'newImageFragmentPlaceholder'})
    ),
    [appendToImageFragmentClicked], model => (
        _.assign(_.cloneDeep(model), {placeholder: 'appendToImagePlaceholder'})
    ),
    [
        documentClicks.filter(targetElem => {
            var isPlaceholder = elem => {
                return _.contains(elem.className, 'post__placeholder') || elem.parentNode ? isPlaceholder(elem.parentNode) : false
            }
            return isPlaceholder(targetElem) == false
        })
    ], model => (
        _.assign(_.cloneDeep(model), {placeholder: undefined})
    ),
    [imageDragEnded.filter(model.isAdmin).filter(userWantsToDeleteDraggedItem)], (m, {imageId}) => {
        var model = _.cloneDeep(m)
        var post = _.assign(model.post, {
            fragments: flatMap(model.post.fragments, fragment => {
                if (fragment.type == 'image') {
                    var images = fragment.images.filter(image => image.imageId != imageId)
                    return _.isEmpty(images) ? [] : _.assign(fragment, {images})
                } else {
                    return [fragment]
                }
            })
        })
        return _.assign(model, {post})
    },
    [
        imageDragStarted
            .flatMap(
                dragStart => imageDragMoved
                    .throttle(1000 / 60)
                    .map(({imageId, screenX, screenY}) => ({
                        imageId,
                        dragStartX: dragStart.screenX,
                        dragStartY: dragStart.screenY,
                        dragCurrentX: screenX,
                        dragCurrentY: screenY
                    }))
                    .filter(({dragCurrentX, dragCurrentY}) => dragCurrentX != 0 && dragCurrentY != 0) // For some reason Chrome sends (0,0) on drag end
                    .takeUntil(imageDragEnded)
                    .mapEnd({dragEnded: true})
            )
    ], (m, imageBeingDragged) => {
        var model = _.cloneDeep(m)
        return imageBeingDragged.dragEnded ?
            _.omit(model, 'imageBeingDragged') :
            _.assign(model, { imageBeingDragged})
    },
    [
        youtubeDragStarted
            .flatMap(
                dragStart => youtubeDragMoved
                    .throttle(1000 / 60)
                    .map(({youtubeId, screenX, screenY}) => ({
                        youtubeId,
                        dragStartX: dragStart.screenX,
                        dragStartY: dragStart.screenY,
                        dragCurrentX: screenX,
                        dragCurrentY: screenY
                    }))
                    .filter(({dragCurrentX, dragCurrentY}) => dragCurrentX != 0 && dragCurrentY != 0) // For some reason Chrome sends (0,0) on drag end
                    .takeUntil(youtubeDragEnded)
                    .mapEnd({dragEnded: true})
        )
    ], (m, youtubeVideoBeingDragged) => {
        var model = _.cloneDeep(m)
        return youtubeVideoBeingDragged.dragEnded ?
            _.omit(model, 'youtubeVideoBeingDragged') :
            _.assign(model, { youtubeVideoBeingDragged})
    },
    [youtubeDragEnded.filter(userWantsToDeleteDraggedItem)], (m, {youtubeId}) => {
        var model = _.cloneDeep(m)
        var post = _.assign(model.post, {
            fragments: model.post.fragments.filter(fragment => fragment.youtubeId != youtubeId)
        })
        return _.assign(model, {post})
    },
    [youtubeButtonClicked], model => (
        _.assign(_.cloneDeep(model), {
            placeholder: 'youtubePlaceholder'
        })
    ),
    [youtubeTextInputBlurred], model => (
        _.assign(_.cloneDeep(model), {
            showYoutubePromptAtIndex: undefined,
            youtubePromptTextInput: undefined
        })
    ),
    [youtubePlaceholderClicked], (model, newFragmentIndex) => (
        _.assign(_.cloneDeep(model), {
            placeholder: undefined,
            showYoutubePromptAtIndex: newFragmentIndex
        })
    ),
    [youtubePromptTextInput], (model, youtubePromptTextInput) => (
        _.assign(_.cloneDeep(model), { youtubePromptTextInput})
    ),
    [newYoutubeFragment], (m, {newYoutubeFragment, newFragmentIndex}) => {
        var model = _.cloneDeep(m)
        var post = addFragment(model.post, newFragmentIndex, newYoutubeFragment)
        return _.assign(model, {post, showYoutubePromptAtIndex: undefined })
    },
    [commentAuthorNameInput], (model, commentAuthorName) => (
        _.assign(_.cloneDeep(model), { commentAuthorName })
    ),
    [commentTextInput], (model, commentText) => (
        _.assign(_.cloneDeep(model), { commentText })
    ),
    [savedComment], (model, {comments, createdCommentId}) => (
        _.assign(_.cloneDeep(model), { comments, createdCommentId, commentText: undefined })
    ),
    [commentBeingSaved.changes()], (model, commentBeingSaved) => (
        _.assign(_.cloneDeep(model), {commentBeingSaved})
    ),
    [textButtonClicked], model => (
        _.assign(_.cloneDeep(model), {placeholder: 'textPlaceholder'})
    ),
    [textPlaceholderClicked], (m, newFragmentIndex) => {
        var model = _.cloneDeep(m)
        var post = addFragment(model.post, newFragmentIndex, {type: 'text', text: ''})
        return _.assign(model, {
            post,
            placeholder: undefined,
            nextFocusedFragmentIndex: newFragmentIndex
        })
    }
)
    .doAction(model => document.title = postPageTitle(model))
    .doAction(model =>
        history.replaceState({}, postPageTitle(model), postUrl(model.post.id, model.post.title)+document.location.hash)
    )

module.exports = {
    renderPost,
    postStream,
    postPageTitle
}