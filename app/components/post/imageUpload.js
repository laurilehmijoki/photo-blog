var Bacon = require('baconjs')
var _ = require('lodash')
var {httpPostResponse} = require('../../../bacon-superagent')

var fileUploadsForNewImageFragment = new Bacon.Bus()
var fileUploadsForAppendingIntoFragment = new Bacon.Bus()

var uploadedImage = file => {
    var reader = new FileReader();
    reader.readAsArrayBuffer(file)
    return Bacon
        .fromCallback(onData => {
            reader.onloadend = evt => {
                onData(reader.result)
            }
        })
        .flatMap(uploadData => httpPostResponse({
            url: '/images',
            body: uploadData,
            headers: {
                'content-type': file.type,
                'original-file-name': file.name,
                'original-file-last-modified': file.lastModified
            }
        }))
        .flatMap('.body')
}
var uploadsStream = files => {
    var uploads = _.range(0, files.length)
        .map(fileIndex => files[fileIndex])
        .map(uploadedImage)
    return Bacon.combineAsArray(uploads)
}
var newImageFragment = fileUploadsForNewImageFragment
    .flatMap(({files, newFragmentIndex}) => uploadsStream(files).map(newImages => ({newImages, newFragmentIndex})))
    .map(({newImages, newFragmentIndex}) => ({
        newFragmentIndex,
        newImageFragment: {
            images: newImages,
            type: 'image'
        }
    }))
var additionsIntoImageFragment = fileUploadsForAppendingIntoFragment
    .flatMap(({files, targetImageFragment}) =>
        uploadsStream(files).map(newImages => ({
            newImages, targetImageFragment
        }))
)

module.exports = {
    newImageFragment,
    fileUploadsForNewImageFragment,
    fileUploadsForAppendingIntoFragment,
    additionsIntoImageFragment
}
