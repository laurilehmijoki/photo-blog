var React = require('react')
var Bacon = require('baconjs')
var i = require('../../i18n')
var _ = require('lodash')
var {postUrl} = require('../post/postUrl')
var header = require('../header/header')
var moment = require('moment')
var {httpGetResponse} = require('../../../bacon-superagent')

var firstImage = post => {
    var imageFragments = post.fragments.filter(({type}) => type == 'image')
    return _(imageFragments)
        .map(({images}) => images)
        .flatten()
        .first()
}

var imageDimensions = ({maxWidth, width, height}) => {
    var height = (height / width) * maxWidth
    return {
        width: Math.min(maxWidth, width),
        height: Math.min(height, height)
    }
}

var imageElem = ({imageId, width, height}, maxWidth, classes) =>
    <img
        src={`/images/${imageId}?width=${maxWidth}`}
        style={_.assign(imageDimensions({maxWidth, width, height}))}
        className={classes}/>

var latestPost = post =>
    post ?
        <div className="section section__padded">
            <h2 className="frontPage__subheader">{i.latestPost}</h2>
            <div className="frontPage__latestPost">
                {firstImage(post) ?
                    <a href={postUrl(post.id, post.title)} className="frontPage__latestPost__imageContainer">
                        {imageElem(
                            firstImage(post),
                            300,
                            'frontPage__latestPost__imageContainer__image'
                        )}
                    </a>
                    : undefined
                }
                <a href={postUrl(post.id, post.title)}>
                    <h3 className="frontPage__latestPost__postTitle">{post.title}</h3>
                </a>
                <div className="frontPage__latestPost__signature">{post.authorNickname} – {i.timeFromX(post.createdAt)}</div>
                <a className="frontPage__showAllPosts clearBoth showAllPosts" href="/posts">{i.showAllPosts}</a>
            </div>
        </div>
        : undefined

var highlightedImage = image =>
    image ?
        <div>
            <section className="section section__padded">
                <h2 className="frontPage__subheader">{i.highlightedImage}</h2>
            </section>
            <section className="section">
                <a className="frontPage__highlightedPhoto" href={`${postUrl(image.postId, '-')}#image-${image.imageId}`}>
                    <img
                        className="frontPage__highlightedPhoto__image"
                        style={{height: image.height}}
                        src={`/images/${image.imageId}?width=700`}/>
                </a>
            </section>
            <section className="section section__padded">
               <a className="frontPage__showAllPhotos clearBoth showAllPhotos" href="/photos">{i.showAllPhotos}</a>
            </section>
        </div>
        : undefined

var nextVideoClicked = new Bacon.Bus()
var highlightedVideo = video =>
    video ?
        <div>
            <section className="section section__padded">
                <h2 className="frontPage__subheader">{i.highlightedVideo}</h2>
            </section>
            <section className="section frontPage__highlightedVideo">
                <iframe
                    src={`//youtube.com/embed/${video.youtubeId}`}
                    width={video.width}
                    height={video.height}
                    frameBorder={0}
                    className="frontPage__highlightedVideo__iframe"/>
            </section>
            <section className="section section__padded">
                <span
                    className="frontPage__showNextVideo clearBoth showNextVideo"
                    onClick={() =>  nextVideoClicked.push()}>
                    {i.showNextVideo}
                </span>
            </section>
        </div>
        : undefined

var newsIcon = newsType => {
    switch (newsType) {
        case 'post': return <i className="fa fa-pencil frontPage__latestNews__icon"/>
        case 'comment': return <i className="fa fa-comment-o frontPage__latestNews__icon"/>
        default: return undefined
    }
}
var latestNews = news =>
    _.isEmpty(news) ?
        undefined :
        <div className="section section__padded">
            <h2 className="frontPage__subheader">{i.latestNews}</h2>
            <ul className="frontPage__latestNews">
                {news.map(({link, linkText, createdAt, newsType}, index) =>
                    <li className="frontPage__latestNews__item" key={index}>
                        <a href={link}>
                            {newsIcon(newsType)}
                            <span className="frontPage__latestNews__item__linkText">{linkText}</span>
                            <span className="frontPage__latestNews__item__createdAt"> – {i.timeFromX(createdAt)}</span>
                        </a>
                    </li>
                )}
            </ul>
        </div>

var frontPageStream = model => Bacon.update(model,
    [nextVideoClicked.flatMap(() => httpGetResponse({url: '/youtube/random'}).map('.body'))], (model, highlightedVideo) => (
        _.assign(_.cloneDeep(model), {highlightedVideo})
    )
)

module.exports = {
    renderPage: model =>
        <body className="frontPage">
            {header}
            {latestPost(model.latestPost)}
            {highlightedImage(model.highlightedImage)}
            {highlightedVideo(model.highlightedVideo)}
            {latestNews(model.latestNews)}
        </body>,
    modelStream: frontPageStream
}