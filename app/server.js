var express = require('express')
var compression = require('compression')
var app = express()
var React = require('react')
var Bacon = require('baconjs')
var {postUrl} = require('./components/post/postUrl')
var basePage = require('./components/basePage/basePage')
var pages = require('./pages')
var {connection} = require('./mysqlConnection')
var sessions = require('client-sessions')
var bodyParser = require('body-parser')
var moment = require('moment')
var _ = require('lodash')
var i = require('./i18n')
var {putS3Object, imageFromS3} = require('./aws/s3')
var {SESSION_KEY, ADMIN_PASSWORD, FRIEND_ANSWER_1, FRIEND_ANSWER_2} = require('./serverSettings')

app.use(compression({threshold: 512}))

app.use(function(req, res, next) {
    var {v, checksum} = req.query
    var cachedResponse = (v || checksum) && process.env.NODE_ENV == 'production'
    if (cachedResponse) {
        var days = n => 60 * 60 * 24 * n
        res.setHeader('cache-control', `public, max-age=${days(365)}`)
    } else {
        res.setHeader('cache-control', 'no-cache, no-store, max-age=0')
    }
    next()
})

var sessionSettings = cookieName => ({
    cookieName,
    secret: SESSION_KEY,
    duration: 1000 * 60 * 60 * 24 * 365,
    cookie: {
        path: '/',
        httpOnly: true
    }
})

app.use(sessions(sessionSettings('adminSession')))
app.use(sessions(sessionSettings('friendSession')))

function requireAdmin(req, res, next) {
    if (isAdmin(req)) {
        next()
    } else {
        res.redirect(pages.adminLoginPage.path)
    }
}

function requireFriend(req, res, next) {
    var isFriendlyUser = isAdmin(req) || req.friendSession.authenticatedAsFriend === true
    var isLoggingInAsFriend = req.originalUrl == pages.friendLoginPage.path
    if (isFriendlyUser || isLoggingInAsFriend) {
        next()
    } else {
        res.redirect(pages.friendLoginPage.path + `?next=${req.originalUrl}`)
    }
}

app.get(pages.frontPage.path, requireFriend, function(req, res, next) {
    var maxLatestNews = 6
    var latestPost = Bacon.combineAsArray(
        queryResponse(`select * from posts where published=1 order by createdAt desc limit 1`)
            .flatMap(posts => _.isEmpty(posts) ? undefined : postById(posts[0].id, isAdmin(req))),
        queryResponse(`select imageId, postId, height from image_fragments where postId in (select id from posts where published=1) order by RAND() limit 1`) // Note that "order by RAND()" can be slow on large sets of data
            .map(images => _.isEmpty(images) ? undefined : _.first(images)),
        randomYoutubeVideo(),
        Bacon
            .combineAsArray(
                queryResponse(`select id, title, authorNickname, createdAt from posts where published=1 order by createdAt desc limit ${maxLatestNews}`).map(posts =>
                    posts.map(({id, title, authorNickname, createdAt}) => ({
                        link: postUrl(id, title),
                        linkText: i.authorCreatedPost(title, authorNickname),
                        createdAt,
                        newsType: 'post'
                    }))
                ),
                queryResponse(`select comments.id as commentId, comments.authorNickname, comments.createdAt as commentCreatedAt, posts.title as postTitle, posts.id as postId from comments join posts on comments.postId = posts.id where comments.id order by comments.createdAt desc limit ${maxLatestNews}`).map(comments =>
                    comments.map(({commentId, authorNickname, commentCreatedAt, postTitle, postId}) => ({
                        link: `${postUrl(postId, postTitle)}#comment-${commentId}`,
                        linkText: i.authorCommentedPost(postTitle, authorNickname),
                        createdAt: commentCreatedAt,
                        newsType: 'comment'
                    }))
                )
            )
            .map(([latestPosts, latestComments]) =>
                _(latestPosts.concat(latestComments)).sortBy('createdAt').reverse().take(maxLatestNews).value()
            )
    )
    latestPost.onError(next)
    latestPost.onValues(function(latestPost, highlightedImage, highlightedVideo, latestNews) {
        res.send(React.renderToString(basePage(pages.frontPage, pageModel({latestPost, highlightedImage, highlightedVideo, latestNews}))))
    })
})

app.get(pages.postPage.path, requireFriend, function(req, res, next) {
    var postId = pages.postPage.findPostId(req)
    var pageHtml = Bacon
        .combineAsArray(postById(postId, isAdmin(req)), comments(postId))
        .map(([post, comments]) => basePage(pages.postPage, pageModel({
            post,
            isAdmin: isAdmin(req),
            publishedPost: isAdmin(req) ? post : undefined,
            comments
        })))
        .map(React.renderToString)
    pageHtml.onError(next)
    pageHtml.onValue(function(html) {
        res.send(html)
    })
})

var inTransaction = stream =>
    Bacon
        .fromNodeCallback(connection, 'beginTransaction')
        .flatMap(stream)
        .flatMapError(sqlErr => Bacon.fromNodeCallback(connection, 'rollback').flatMap(new Bacon.Error(sqlErr)))
        .flatMap(transactionResult => Bacon.fromNodeCallback(connection, 'commit').map(transactionResult))

app.post('/posts', requireAdmin, function(req, res, next) {
    var newPostTitle = i.newPostTitle
    var newPost = inTransaction(Bacon
        .fromNodeCallback(connection, 'query', "insert into posts set ?", {
            title: newPostTitle,
            authorNickname: req.query.authorNickname || i.yourName,
            published: 0
        })
        .map(({insertId}) => insertId)
    )
    newPost.onError(next)
    newPost.onValue(newPostId => {
        res.redirect(postUrl(newPostId, newPostTitle))
    })
})

app.put(pages.postPage.path, requireAdmin, bodyParser.json({type: 'application/json'}), function(req, res, next) {
    var payloadJson = req.body
    if (_.isEmpty(payloadJson)) {
        res.status(400).send('Invalid post content')
        return
    }
    var postId = pages.postPage.findPostId(req)
    var {post} = payloadJson
    var fragments = post.fragments.map((fragment, fragmentOrdinal) => {
        switch(fragment.type) {
            case 'text':
                return [{
                    tableName: 'text_fragments',
                    insertParams: {
                        fragmentOrdinal,
                        text: fragment.text,
                        postId
                    }
                }]
            case 'image':
                return fragment.images.map(({imageId, width, height, exifOrientation}, imageOrdinal) => ({
                    tableName: 'image_fragments',
                    insertParams: {
                        fragmentOrdinal,
                        imageOrdinal,
                        imageId,
                        width,
                        height,
                        exifOrientation,
                        postId
                    }
                }))
            case 'youtube':
                return [{
                    tableName: 'youtube_fragments',
                    insertParams: {
                        fragmentOrdinal,
                        youtubeId: fragment.youtubeId,
                        width: fragment.width,
                        height: fragment.height,
                        postId
                    }
                }]
            default: throw "Unrecognised fragment type " + fragment.type
        }
    })
    var updatedPost = inTransaction(
        Bacon
            .combineAsArray(
                Bacon.fromNodeCallback(connection, 'query', `delete from text_fragments where postId=${postId}`),
                Bacon.fromNodeCallback(connection, 'query', `delete from image_fragments where postId=${postId}`),
                Bacon.fromNodeCallback(connection, 'query', `delete from youtube_fragments where postId=${postId}`)
            )
            .flatMap(
                Bacon.fromNodeCallback(connection, 'query', `update posts set ? where id=${postId}`, {
                    title: post.title,
                    authorNickname: post.authorNickname,
                    published: post.published ? 1 : 0,
                    updatedAt: new Date()
                })
            )
            .flatMap(
                Bacon
                    .fromArray(_.flatten(fragments))
                    .flatMap(
                        ({tableName, insertParams}) => Bacon.fromNodeCallback(connection, 'query', `insert into ${tableName} set ?`, insertParams)
                    )
                    .fold([], () => 'ok')
            )
    ).flatMap(postById(postId, isAdmin(req)))
    updatedPost.onError(next)
    updatedPost.onValue(function(postFromDatabase) {
        res.json(postFromDatabase)
    })
})

app.post('/comments', requireFriend, bodyParser.json({type: 'application/json'}), function(req, res, next) {
    var {postId, commentAuthorName, commentText} = req.body
    var updatedComments = Bacon
        .fromNodeCallback(
            connection,
            'query',
            'insert into comments set ?',
            {
                authorNickname: commentAuthorName,
                comment: commentText,
                postId: postId
            }
        )
        .flatMap(({insertId}) =>
            comments(postId).map(comments => ({comments, createdCommentId: insertId}))
        )
    updatedComments.onError(next)
    updatedComments.onValue(commentsJson => res.json(commentsJson))
})

app.get(pages.postsPage.path, requireFriend, function(req, res, next) {
    var pageHtml = postsWithPhotos()
        .map(postsAndPhotos => basePage(pages.postsPage, pageModel({postsAndPhotos})))
        .map(React.renderToString)
    pageHtml.onError(next)
    pageHtml.onValue(function(html) {
        res.send(html)
    })
})

app.get(pages.photosPage.path, requireFriend, function(req, res, next) {
    var pageHtml = queryResponse(
            `select
                image_fragments.imageId,
                image_fragments.width,
                image_fragments.height,
                image_fragments.exifOrientation,
                posts.id as postId,
                posts.title as postTitle
                from image_fragments join posts on image_fragments.postId = posts.id order by posts.createdAt desc`
        )
        .map(images => basePage(pages.photosPage, pageModel({images})))
        .map(React.renderToString)
    pageHtml.onError(next)
    pageHtml.onValue(function(html) {
        res.send(html)
    })
})

app.get('/youtube/video/:youtubeId/properties', requireAdmin, function(req, res, next) {
    var cheerio = require('cheerio')
    var {httpGetResponse} = require('../bacon-superagent')
    var youtubeId = req.params.youtubeId
    var youtube = httpGetResponse({url: `https://www.youtube.com/watch?v=${youtubeId}`})
        .map('.text')
        .map(cheerio.load)
        .map($ => ({
            youtubeId,
            width: parseInt($('meta[property="og:video:width"]').attr('content')),
            height: parseInt($('meta[property="og:video:height"]').attr('content'))
        }))
        .doLog('Retrieved video properties from www.youtube.com')
    youtube.onError(next)
    youtube.onValue(videoProperties => res.json(videoProperties))
})

app.get('/youtube/random', requireFriend, function(req, res, next) {
    var youtubeVideo = randomYoutubeVideo()
    youtubeVideo.onError(next)
    youtubeVideo.onValue(video => res.json(video))
})

var randomYoutubeVideo = () =>
    queryResponse(`select youtubeId, width, height from youtube_fragments where postId in (select id from posts where published=1) order by RAND() limit 1`) // Note that "order by RAND()" can be slow on large sets of data
        .map(videos => _.isEmpty(videos) ? undefined : _.first(videos))

var imageDownloads = 0
function concurrencyLimit(limit) { return (req, res, next) => {
    if (imageDownloads <= limit) {
        imageDownloads += 1;
        next()
    } else {
        setTimeout(
            () => concurrencyLimit(limit)(req, res, next),
            5
        )
    }
}}

/**
 * Throttle concurrent image downloads, because image magick consumes quite a lot of memory and can crash machines with no swap space (e.g., AWS EC2 micro instances)
 */
var maxSimultaneousImageDownloads = require('os').cpus().length
app.get('/images/:id', concurrencyLimit(maxSimultaneousImageDownloads), function(req, res, next) {
    var imageWidth = parseInt(req.query.width) || undefined
    var image = imageFromS3(req.params.id, imageWidth)
        .doError(() => {
            imageDownloads -= 1
        })
        .doAction(() => {
            imageDownloads -= 1
        })

    image.onError(next)
    image
        .onValue(function({contentType, data}) {
            res.setHeader('content-type', contentType)
            var days = n => 60 * 60 * 24 * n
            res.setHeader('cache-control', `public, max-age=${days(365)}`)
            res.send(data)
        })
})

app.post('/images', requireAdmin, bodyParser.raw({type: 'image/*', limit: '50mb'}), function(req, res, next) {
    var gm = require('gm').subClass({imageMagick: true})
    var fileName = req.headers['original-file-name']
    var lastModified = req.headers['original-file-last-modified']
    var contentType = req.headers['content-type']
    var s3Upload = Bacon.combineAsArray(
        putS3Object(fileName, lastModified, req.body, contentType),
        Bacon.fromNodeCallback(gm(req.body), 'identify')
    )
    s3Upload.onError(next)
    s3Upload.onValues(({s3Key}, {size, Properties}) => res.json({
        imageId: s3Key,
        width: size.width,
        height: size.height,
        exifOrientation: parseInt(Properties['exif:Orientation']) || null
    }))
})

app.get(pages.adminLoginPage.path, function(req, res, next) {
    res.send(React.renderToString(basePage(pages.adminLoginPage, pageModel({}))))
})

var isAdmin = req => req.adminSession.authenticatedAsAdmin
app.post(pages.adminLoginPage.path, bodyParser.urlencoded({extended: true}), function(req, res, next) {
    var {username, password} = req.body
    if (username == 'admin' && password === ADMIN_PASSWORD) {
        req.adminSession.authenticatedAsAdmin = true
        res.redirect('/')
    } else {
        res.send(React.renderToString(basePage(pages.adminLoginPage, pageModel({adminLoginFailed: true}))))
    }
})

app.get(pages.friendLoginPage.path, function(req, res, next) {
    res.send(React.renderToString(basePage(pages.friendLoginPage, pageModel({}))))
})

app.post(pages.friendLoginPage.path, bodyParser.urlencoded({extended: true}), function(req, res, next) {
    var {q1_answer, q2_answer} = req.body
    if (q1_answer.toUpperCase() === FRIEND_ANSWER_1.toUpperCase() && q2_answer.toUpperCase() === FRIEND_ANSWER_2.toUpperCase()) {
        req.friendSession.authenticatedAsFriend = true
        var nextUrl = require('url').parse(req.query.next)
        res.redirect(nextUrl && nextUrl.pathname ? nextUrl.pathname : '/')
    } else {
        res.send(React.renderToString(basePage(pages.friendLoginPage, pageModel({friendLoginFailed: true}))))
    }
})

app.use('/generated',express.static(__dirname + '/../.generated'))
app.use(express.static(__dirname + '/static'))

var pageModel = (() => {
    var fs = require('fs')
    var checksum = path => {
        var {mtime, size} = fs.statSync(path)
        return `${mtime.getTime()}-${size}`
    }
    var bundleJsChecksum = checksum(`${__dirname}/../.generated/bundle.js`)
    var styleCssChecksum = checksum(`${__dirname}/../.generated/style.css`)
    return model => _.assign(model, {bundleJsChecksum, styleCssChecksum})
})()

var queryResponse = queryString =>
    Bacon.fromNodeCallback(
        connection,
        'query',
        queryString
    )

var postById = (postId, isAdmin) => Bacon
    .combineAsArray(
        queryResponse(
            `select id, title, published, createdAt, authorNickname from posts where id=${parseInt(postId)} ${isAdmin ? '' : ' and published=1 '}`
        )
            .flatMap(posts => posts.length != 1 ? new Bacon.Error("Could not find the post you were looking for") : _.first(posts))
            .map(post => _.assign(post, {published: post.published == 1}))
        ,
        queryResponse(
            `select text, fragmentOrdinal from text_fragments where postId=${parseInt(postId)}`
        ),
        queryResponse(
            `select * from image_fragments where postId=${parseInt(postId)}`
        ),
        queryResponse(
            `select youtubeId, width, height, fragmentOrdinal from youtube_fragments where postId=${parseInt(postId)}`
        )
    )
    .flatMap(([post, textFragments, imageFragments, youtubeFragments]) => {
        var fragments =
            []
            .concat(textFragments.map(fragment => _.assign(fragment, {type: 'text'})))
            .concat(
                _(imageFragments)
                    .groupBy('fragmentOrdinal')
                    .reduce(
                        (memo, imagesInFragment, fragmentOrdinal) =>
                            memo.concat({
                                type: 'image',
                                images: _.sortBy(imagesInFragment, 'imageOrdinal'),
                                fragmentOrdinal: parseInt(fragmentOrdinal)
                            })
                        ,
                        []
                    )
            )
            .concat(youtubeFragments.map(fragment => _.assign(fragment, {type: 'youtube'})))
        var sortedFragments = _(fragments).flatten().sortBy('fragmentOrdinal').value()
        return _.assign(post, {fragments: sortedFragments})
    })

var comments = postId => queryResponse(`select id, authorNickname, comment from comments where postId=${parseInt(postId)} order by createdAt asc`)

var postsWithPhotos = () =>
    Bacon
        .combineAsArray(
            queryResponse(`select id, title, createdAt from posts where published=1 order by createdAt desc`),
            queryResponse(`select postId, imageId from image_fragments`).map(imageFragments =>
                _.groupBy(imageFragments, 'postId')
            )
        )
        .map(([posts, imageFragmentsByPostId]) =>
            posts.map(post => ({
                postId: post.id,
                postTitle: post.title,
                postCreatedAt: post.createdAt,
                postImages: _.flatten(imageFragmentsByPostId[post.id])
            }))
        )

var httpPort = process.env.PORT || 2000
app.listen(httpPort, function() {
    console.log(`Server started at ${httpPort}`)
})
