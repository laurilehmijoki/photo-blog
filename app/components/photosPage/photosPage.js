var React = require('react')
var Bacon = require('baconjs')
var _  = require('lodash')
var {postUrl} = require('../post/postUrl')
var header = require('../header/header')

var imagesPerRow = 3

module.exports = {
    renderPage: model =>
        <body className="photosPage">
            {header}
            <main className="photosPage__photosList section">
                {
                    _(model.images)
                        .map(image => {
                            var swapWidthAndHeight = _.contains([5,6,7,8], image.exifOrientation)
                            return _.assign(image, {
                                width: swapWidthAndHeight ? image.height : image.width,
                                height: swapWidthAndHeight ? image.width : image.height
                            })
                        })
                        .chunk(imagesPerRow)
                        .map(imagesInChunk => {
                            var chunkHeight = _.min(imagesInChunk.map(({height}) => height))
                            var scaledImages = imagesInChunk.map(image => {
                                var scalingRatio = image.height > chunkHeight ?
                                    chunkHeight / image.height :
                                    1
                                return _.assign(image, {
                                    scaledHeight: image.height * scalingRatio,
                                    scaledWidth: image.width * scalingRatio
                                })
                            })
                            var scaledTotalWidth = scaledImages.reduce(
                                (memo, {scaledWidth}) => memo + scaledWidth,
                                0
                            )
                            return scaledImages.map(image => _.assign(image, {
                                imageCellWidth: `${image.scaledWidth / scaledTotalWidth * 100}%`
                            }))
                        })
                        .flatten()
                        .map(({postId, postTitle, imageId, imageCellWidth}, index) =>
                            <a
                                href={postUrl(postId, postTitle) + `#image-${imageId}`}
                                className="photosPage__photosList__imageContainer"
                                style={{width: imageCellWidth}}
                                key={index}>
                                <img src={`/images/${imageId}?width=300`}/>
                            </a>
                        )
                        .value()
                }
            </main>
        </body>,
    modelStream: Bacon.once
}
