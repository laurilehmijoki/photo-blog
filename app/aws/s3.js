var {AWS_REGION, S3_BUCKET} = require('../serverSettings')
var {AWS} = require('./aws')
var crypto = require('crypto')
var Bacon = require('baconjs')
var _ = require('lodash')
var gm = require('gm').subClass({imageMagick: true})

var s3 = new AWS.S3()

var calcS3Key = fileContents => crypto.createHash('sha256').update(fileContents).digest('hex').toString()

var putS3ObjectWithKey = ({s3Key, body, contentType, metadata, storageClass}) => {
    var putObject = () => Bacon
        .fromNodeCallback(s3, 'putObject', {
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: body,
            ContentType: contentType,
            Metadata: metadata,
            StorageClass: storageClass
        })
        .map({s3Key})
    return putObject()
        .flatMapError(error =>
            error.code == 'NoSuchBucket' ?
                Bacon
                    .fromNodeCallback(s3, 'createBucket', {
                        Bucket: S3_BUCKET,
                        CreateBucketConfiguration: {
                            LocationConstraint: AWS_REGION
                        }
                    })
                    .doAction(() => console.log(`Created bucket ${S3_BUCKET} in region ${AWS_REGION}`))
                    .flatMap(putObject)
                : error
        )
}

var putS3Object = (fileName, lastModified, body, contentType) =>
    putS3ObjectWithKey({
        s3Key: calcS3Key(body),
        body,
        contentType,
        metadata: {
            'original-file-name': fileName,
            'original-file-last-modified': lastModified
        }
    })

var s3bjectByKey = Key => Bacon.fromNodeCallback(s3, 'getObject', { Bucket: S3_BUCKET, Key })

var imageFromS3 = (imageId, imageWidth) => {
    var convertImage = ({ContentType, Body}) => {
        var autoOrientedImage = gm(Body).autoOrient()
        var image = imageWidth ? autoOrientedImage.resize(imageWidth) : autoOrientedImage
        return Bacon.fromNodeCallback(image, 'toBuffer').map(imageData => ({
            imageData, contentType: ContentType
        }))
    }
    var manipulatedImageKey = [imageId, 'autoOrient'].concat(imageWidth ? `width${imageWidth}` : []).join(',')
    return s3bjectByKey(manipulatedImageKey)
        .flatMapError(e =>
            e.code == 'NoSuchKey' ?
                s3bjectByKey(imageId)
                    .doAction(() => console.log(_.trunc(manipulatedImageKey, 10), 'not found on S3, converting...'))
                    .flatMap(convertImage)
                    .doAction(() => console.log('Storing converted image into S3:', _.trunc(manipulatedImageKey, 10)))
                    .flatMap(({imageData, contentType}) => putS3ObjectWithKey({
                        s3Key: manipulatedImageKey,
                        body: imageData,
                        contentType,
                        storageClass: 'REDUCED_REDUNDANCY' // We can store the manipulated images in reduced redundancy, because we have a way to automatically reconstruct such images from the original image
                    }))
                    .flatMap(() => s3bjectByKey(manipulatedImageKey))
                : new Bacon.Error(e)
        )
        .map(({Body, ContentType}) => ({
            contentType: ContentType,
            data: Body
        }))
}

module.exports = {
    putS3Object,
    imageFromS3,
    calcS3Key,
    s3,
    s3Bucket: S3_BUCKET
}