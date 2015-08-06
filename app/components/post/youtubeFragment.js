var React = require('react')
var Bacon = require('baconjs')
var _ = require('lodash')
var inBrowser = require('../../inBrowser')
var i = require('../../i18n')
var {httpGetResponse} = require('../../../bacon-superagent')
var queryString = require('query-string')
var classnames = require('classnames')

var youtubeDragStarted = new Bacon.Bus()
var youtubeDragMoved = new Bacon.Bus()
var youtubeDragEnd = new Bacon.Bus()

var youtubeDragEnded = youtubeDragStarted.zip(youtubeDragEnd).map(([start, end]) => {
    var youtubeId = end.youtubeId
    return { youtubeId, screenXDelta: end.screenX - start.screenX }
})

var dragCoords = evt => ({screenX: evt.screenX, screenY: evt.screenY})
var touchCoords = evt => ({screenX: evt.changedTouches[0].screenX, screenY: evt.changedTouches[0].screenY})

var beingDragged = (youtubeVideoBeingDragged, youtubeId) => youtubeVideoBeingDragged && youtubeVideoBeingDragged.youtubeId == youtubeId

var draggedYoutubeVideoStyle = (youtubeVideoBeingDragged, youtubeId) =>
    beingDragged(youtubeVideoBeingDragged, youtubeId) ?
    {
        transform: `translate(${youtubeVideoBeingDragged.dragCurrentX - youtubeVideoBeingDragged.dragStartX}px, ${youtubeVideoBeingDragged.dragCurrentY - youtubeVideoBeingDragged.dragStartY}px)`,
        transition: 'none'
    }
    : {}

var youtubeFragment = ({youtubeId, width, height}, {isAdmin, youtubeVideoBeingDragged}) => (
    <div
        className="post__youtubeContainer"
        style={draggedYoutubeVideoStyle(youtubeVideoBeingDragged, youtubeId)}>
        <iframe src={`//youtube.com/embed/${youtubeId}`} width={width} height={height} frameBorder={0}/>
        {isAdmin ?
            <i
                className="fa fa-bars post__youtubeContainer__dragHandle"
                draggable="true"
                onDragStart={evt => youtubeDragStarted.push(_.assign({youtubeId}, dragCoords(evt)))}
                onTouchStart={evt => youtubeDragStarted.push(_.assign({youtubeId}, touchCoords(evt)))}

                onDrag={evt => youtubeDragMoved.push(_.assign({youtubeId}, dragCoords(evt)))}
                onTouchMove={evt => youtubeDragMoved.push(_.assign({youtubeId}, touchCoords(evt)))}

                onDragEnd={evt => youtubeDragEnd.push(_.assign({youtubeId}, dragCoords(evt)))}
                onTouchEnd={evt => youtubeDragEnd.push(_.assign({youtubeId}, touchCoords(evt)))}
                />
            : undefined}
    </div>
)

var parseUrl = url => {
    if (!inBrowser) return {}
    var parser = document.createElement('a')
    parser.href = url
    var {protocol, hostname, pathname, search} = parser
    return {protocol, hostname, pathname, search}
}

var isValidYoutubeUrl = url => {
    var {protocol, hostname, pathname, search} = parseUrl(url)
    var queryParams = queryString.parse(search)
    return (
        /https?/.test(protocol) &&
        hostname == 'www.youtube.com' &&
        pathname == '/watch' &&
        Object.keys(queryParams).length == 1 &&
        !_.isEmpty(queryParams.v) &&
        queryParams.v.length > 4
    )
}
var youtubePromptInput = new Bacon.Bus()
var youtubeTextInputBlurred = new Bacon.Bus()
var newYoutubeFragment = youtubePromptInput.flatMap(({textInput, newFragmentIndex}) =>
    Bacon
        .once(textInput)
        .filter(isValidYoutubeUrl)
        .map(parseUrl)
        .map('.search')
        .map(queryString.parse)
        .map('.v')
        .flatMap(youtubeVideoId => httpGetResponse({url: `/youtube/video/${youtubeVideoId}/properties`}))
        .map('.body')
        .map(({youtubeId, width, height}) => ({
            newFragmentIndex,
            newYoutubeFragment: {
                youtubeId,
                width,
                height,
                type: 'youtube'
            }
        }))
)

var youtubeTextInput = (textInput, newFragmentIndex) =>
    <input
        type="text"
        className={classnames({
            post__youtubePrompt__input: true,
            post__youtubePrompt__input__invalid:
                textInput && !isValidYoutubeUrl(textInput),
            post__youtubePrompt__input__valid:
                textInput && isValidYoutubeUrl(textInput),
            post__youtubePrompt__input__empty:
                !textInput
        })}
        onBlur={() => youtubeTextInputBlurred.push(false)}
        value={textInput}
        onChange={evt => {
            if (!isValidYoutubeUrl(textInput)) {
                youtubePromptInput.push({textInput: evt.target.value, newFragmentIndex})
            }
        }}
        placeholder={i.youtubePlaceholder}/>

module.exports = {
    youtubeFragment,
    youtubeDragStarted,
    youtubeDragMoved,
    youtubeDragEnded,
    youtubePromptTextInput: youtubePromptInput.map('.textInput'),
    isValidYoutubeUrl,
    youtubeTextInputBlurred,
    newYoutubeFragment,
    youtubeTextInput
}