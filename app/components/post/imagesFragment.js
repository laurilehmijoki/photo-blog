var React = require('react')
var Bacon = require('baconjs')
var flatMap = require('../../flatMap')
var _ = require('lodash')
var classnames = require('classnames')
var imageUpload = require('./imageUpload')

var shouldShowPlaceholderImage = (postModel, fragmentIndex, isLastInImageFragment) =>
    postModel.placeholder == 'appendToImagePlaceholder' &&
    isLastInImageFragment

var imageDragStarted = new Bacon.Bus()
var imageDragMoved = new Bacon.Bus()
var imageDragEnd = new Bacon.Bus()

var imageDragEnded = imageDragStarted.zip(imageDragEnd).map(([start, end]) => {
    var imageId = end.imageId
    return { imageId, screenXDelta: end.screenX - start.screenX }
})

var beingDragged = ({imageBeingDragged}, imageId) => imageBeingDragged && imageBeingDragged.imageId == imageId

var draggedImageStyle = (imageId, {imageBeingDragged}) =>
    beingDragged({imageBeingDragged}, imageId) ?
    {
        transform: `translate(${imageBeingDragged.dragCurrentX - imageBeingDragged.dragStartX}px, ${imageBeingDragged.dragCurrentY - imageBeingDragged.dragStartY}px)`,
        transition: 'none'
    }
    : {}

var dragCoords = evt => ({screenX: evt.screenX, screenY: evt.screenY})
var touchCoords = evt => ({screenX: evt.changedTouches[0].screenX, screenY: evt.changedTouches[0].screenY})

var imageElem = (imageId, postModel, index) =>
    <img
        src={`/images/${imageId}?width=700`}
        onClick={() => {
            var win = window.open(`/images/${imageId}`, '_blank')
            win.focus()
        }}
        id={`image-${imageId}`}
        className={classnames({
            post__image: true,
            post__image__draggable: postModel.isAdmin && !beingDragged(postModel, imageId),
            post__image__beingDragged: beingDragged(postModel, imageId)
        })}
        style={draggedImageStyle(imageId, postModel)}

        onDragStart={evt => imageDragStarted.push(_.assign({imageId}, dragCoords(evt)))}
        onTouchStart={evt => imageDragStarted.push(_.assign({imageId}, touchCoords(evt)))}

        onDrag={evt => imageDragMoved.push(_.assign({imageId}, dragCoords(evt)))}
        onTouchMove={evt => imageDragMoved.push(_.assign({imageId}, touchCoords(evt)))}

        onDragEnd={evt => imageDragEnd.push(_.assign({imageId}, dragCoords(evt)))}
        onTouchEnd={evt => imageDragEnd.push(_.assign({imageId}, touchCoords(evt)))}

        key={index}/>

var imagesFragment = (postModel, fragment, fragmentIndex) => (
    <div className="post__imageContainer">
        { flatMap(fragment.images, ({imageId}, index) => {
            var img = imageElem(imageId, postModel, index)
            var isLastInImageFragment = index == fragment.images.length - 1
            return shouldShowPlaceholderImage(postModel, fragmentIndex, isLastInImageFragment) ?
                [
                    img,
                    <label className="post__placeholder post__placeholder__clickable" key="placeholderImage">
                        <input
                            type="file"
                            multiple
                            className="post__fileInput"
                            onChange={evt => imageUpload.fileUploadsForAppendingIntoFragment.push({files: evt.target.files, targetImageFragment: fragment})}/>
                        <i className="fa fa-image post__image__placeholder post__image__placeholder__inImageContainer"/>
                    </label>
                ]
                :
                [img]
        })}
    </div>
)

module.exports = {
    imagesFragment,
    imageDragEnded,
    imageDragMoved,
    imageDragStarted
}