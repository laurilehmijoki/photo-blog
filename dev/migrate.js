var {connection} = require('../app/mysqlConnection')
var {s3, s3Bucket, putS3Object, calcS3Key} = require('../app/aws/s3')
var Bacon = require('baconjs')
var fs = require('fs')
var path = require('path')
var _ = require('lodash')
var cheerio = require('cheerio')

var legacyMysqlDb = require('mysql').createConnection({
    host     : process.env.LEGACY_DB_HOST || '127.0.0.1',
    port     : process.env.LEGACY_DB_PORT || 3456,
    database : process.env.LEGACY_DB_NAME || (() => {throw "Missing required env " + LEGACY_DB_NAME}),
    user     : process.env.LEGACY_DB_USER || 'root',
    password : process.env.LEGACY_DB_PASS || '',
    timezone : 'Europe/Helsinki'
});


// In the database the post content is stored as raw HTML. Parse the HTML here and return model that we can use more flexibly.
var parseLegacyPost = ({id, title, created_at, text, author_nickname}) => {
    var $ = cheerio.load(text)
    var expectedYoutubeFragments = $('iframe[src*="youtube.com"]').get().length
    var fragments = $('p').map((i, elem) => {
        var $images = $(elem).find('img')
        var $youtubeVideos = $(elem).find('iframe[src*="youtube.com"]')
        if ($images.length > 0) {
            if ($images.text()) throw `Post ${title} has an image fragment that contains text: ${$(elem).html()}`
            return [{
                type: 'image',
                images: $images.map((i, elem) => ({
                    imageId: $(elem).attr('src').match("/images/(\\d+)")[1]
                })).get()
            }]
        } else if ($youtubeVideos.length > 0) {
            if ($youtubeVideos.text()) throw `Post ${title} has an youtube fragment that contains text: ${$(elem).html()}`
            return $youtubeVideos.map((i, elem) => {
                return {
                    type: 'youtube',
                    youtubeId: require('url').parse($(elem).attr('src')).pathname.match("/embed/((\\w|-)+)")[1],
                    width: $(elem).attr('width'),
                    height: $(elem).attr('height')
                }
            }).get()
        } else {
            return [{
                type: 'text',
                text: $(elem).text().trim()
            }]
        }
    }).get()
    if (expectedYoutubeFragments != fragments.filter(({type}) => type == 'youtube').length) {
        console.error(`Post ${id} contains invalid youtube data. Please fix the original post.`)
        process.exit(1)
    }
    return {id, title, created_at, fragments: _.flatten(fragments), author_nickname}
}

function listObjects(Marker = undefined, objectKeys = []) {
    return Bacon
        .fromNodeCallback(s3, 'listObjects', { Bucket: s3Bucket, Marker})
        .flatMap(({IsTruncated, Contents}) => {
            var s3Keys = Contents.map(({Key}) => Key)
            return IsTruncated ?
                listObjects(_.last(s3Keys), s3Keys) :
                s3Keys
        })
        .map(s3Keys => objectKeys.concat(s3Keys))
}

var s3ObjectKeys = () => listObjects().doAction(s3Keys => console.log('Found', s3Keys.length, 'keys on the S3 bucket'))

var imagesFromMysql = (function() {
    function alternativeImageTitle(imageTitle) {
        var match = imageTitle.match(/Photo (\d+)\.(\d+)\.(\d+) (\d+)\.(\d+)\.(\d+)\.(\w+)/)
        if (!match) {
            return undefined
        } else {
            var [fileName, day, month, year, hours, minutes, seconds, extension] = match
            var padWithZero = n => n < 10 ? `0${n}` : `${n}`
            return `${year}-${padWithZero(month)}-${padWithZero(day)} ${padWithZero(hours)}.${minutes}.${seconds}.${extension}`
        }
    }
    var allDropboxFiles = (() => {
        var listFiles = dir => _.flatten(fs.readdirSync(dir).map(file => {
            var absPath = `${dir}/${file}`
            return fs.statSync(absPath).isFile() ? [absPath] : listFiles(absPath)
        }))
        return listFiles('/Users/llehmijo/Dropbox/Photos-Linus')
    })()
    return Bacon
        .fromNodeCallback(legacyMysqlDb, 'query', `select * from images`)
        .map(images => images.map(image => {
            var dropboxFile = _.find(allDropboxFiles, f => path.basename(f) == image.title || path.basename(f) == alternativeImageTitle(image.title))
            if (!dropboxFile) {
                console.warn("No dropbox file found for", image.title)
            }
            return _.assign(image, {
                resolveData: () => dropboxFile ? fs.readFileSync(dropboxFile) : image.data
            })
        }))
        .toProperty()
})()

var validatePosts = posts => {
    posts.forEach(({id, title, text}) => {
        var $ = cheerio.load(text)
        $('p').each((i, elem) => {
            if ($(elem).find('img').length && $(elem).text() && $(elem).text().trim()) {
                console.warn(`Post ${title} (${id}) has both img and text in same p`)
            }
        })
    })
}

var dbMigration =
    Bacon
        .combineAsArray(
            Bacon.fromNodeCallback(legacyMysqlDb, 'query', 'select * from posts').doAction(validatePosts),
            Bacon.fromNodeCallback(legacyMysqlDb, 'query', 'select * from comments'),
            imagesFromMysql,
            s3ObjectKeys()
        )
        .flatMap(([posts, comments, mysqlImages, s3ImageKeys]) =>
            Bacon
                .fromArray(mysqlImages)
                .map(({id, resolveData, title, created_at, content_type}) => ({
                    mysqlId: id,
                    s3Key: calcS3Key(resolveData())
                }))
                .flatMap(
                    candidate => _.contains(s3ImageKeys, candidate.s3Key) ?
                    candidate :
                    new Bacon.Error(`The calculated S3 key ${candidate.s3Key} for image ${candidate.mysqlId} does not exist on the S3 bucket`)
                )
                .fold({}, (memo, {mysqlId, s3Key}) => {
                    memo[mysqlId] = s3Key
                    return memo
                })
                .map(mysqlS3Maps => ({
                    posts, comments, mysqlS3Maps, mysqlImages
                }))
        )
        .flatMap(({posts, comments, mysqlS3Maps, mysqlImages}) =>
            Bacon
                .fromArray(mysqlImages)
                .flatMapWithConcurrencyLimit(require('os').cpus().length, ({id, resolveData}) =>
                    Bacon
                        .fromNodeCallback(require('gm').subClass({imageMagick: true})(resolveData()), 'identify')
                        .map(({size, Properties}) => ({
                            imageId: id, width: size.width, height: size.height, exifOrientation: parseInt(Properties['exif:Orientation'])
                        }))
                        .doLog('identify')

                )
                .fold({}, (memo, x) => {
                    memo[x.imageId] = x
                    return memo
                })
                .map(identifiedImages => ({
                    posts, comments, mysqlS3Maps, identifiedImages
                }))
        )
        .flatMap(({posts, comments, mysqlS3Maps, identifiedImages}) => {
            return Bacon
                .fromArray(posts)
                .map(parseLegacyPost)
                .flatMap(function (post) {
                    var fragmentInserts = _(post.fragments).map((fragment, fragmentOrdinal) => {
                        switch (fragment.type) {
                            case 'text':
                                return [[
                                    'insert into text_fragments set ?',
                                    {
                                        fragmentOrdinal,
                                        text: fragment.text,
                                        postId: post.id
                                    }
                                ]]
                            case 'image':
                                return fragment.images
                                    .map((image, imageOrdinal) => {
                                        var s3Key = mysqlS3Maps[image.imageId]
                                        return [
                                            'insert into image_fragments set ?',
                                            {
                                                fragmentOrdinal,
                                                imageOrdinal,
                                                imageId: s3Key,
                                                width: identifiedImages[image.imageId].width,
                                                height: identifiedImages[image.imageId].height,
                                                exifOrientation: identifiedImages[image.imageId].exifOrientation || null,
                                                postId: post.id
                                            }
                                        ]
                                    })
                            case 'youtube':
                                return [[
                                    'insert into youtube_fragments set ?',
                                    {
                                        fragmentOrdinal,
                                        youtubeId: fragment.youtubeId,
                                        width: fragment.width,
                                        height: fragment.height,
                                        postId: post.id
                                    }
                                ]]
                            default: throw "Unrecognised fragment type" + fragment.type

                        }
                    }).flatten().value()
                    var commentInserts = comments.filter(({post_id}) => post_id == post.id).map(
                        comment => [
                            'insert into comments set ?',
                            {
                                comment: comment.body,
                                authorNickname: comment.commenter,
                                createdAt: comment.created_at,
                                postId: post.id
                            }
                        ]
                    )
                    return Bacon
                        .fromNodeCallback(
                            connection,
                            'query',
                            'insert into posts set ?',
                            {
                                id: post.id,
                                title: post.title,
                                createdAt: post.created_at,
                                updatedAt: post.updated_at,
                                published: 1,
                                authorNickname: post.author_nickname
                            }
                        )
                        .doAction(() => console.log(`Migrated post ${post.title}`))
                        .flatMap(
                            Bacon.fromArray(fragmentInserts.concat(commentInserts)).flatMap(([sql, sqlParams]) => Bacon.fromNodeCallback(connection, 'query', sql, sqlParams))
                        )
                        .doError(e => console.error(`Failed to migrate post ${post.title}`, e))
                })
        })
        .flatMap(Bacon.fromNodeCallback(connection, 'end'))

function uploadImages() {
    var imageS3Uploads = Bacon
        .combineAsArray(imagesFromMysql, s3ObjectKeys())
        .flatMap(([images, s3Keys]) =>
            Bacon
                .fromArray(images)
                .flatMapWithConcurrencyLimit(
                    10,
                    ({content_type, title, created_at, resolveData}) => {
                        var imageData = resolveData()
                        return _.contains(s3Keys, calcS3Key(imageData)) ?
                            Bacon.once(`Image ${title} already exists on the S3 bucket ${s3Bucket}`) :
                            putS3Object(title, created_at, imageData, content_type).map(`Uploaded image ${title}`)
                    }
                )
        )
    return imageS3Uploads
        .doAction(report => console.log(report))
        .fold(
            [],
            (memo, report) => memo.concat(report)

        )
}

module.exports = uploadImages().flatMap(dbMigration)

