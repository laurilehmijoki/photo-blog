var React = require('react')
var Bacon = require('baconjs')
var header = require('../header/header')
var _ = require('lodash')
var {postUrl} = require('../post/postUrl')
var i = require('../../i18n')

module.exports = {
    renderPage: model =>
        <body className="postsPage">
            {header}
            <main>
                <ul className="postsPage__postsList">
                    {model.postsAndPhotos.map(({postId, postTitle, postImages, postCreatedAt}, index) =>
                        <li className="postsPage__postsList__post section" key={index}>
                            <a className="postsPage__postsList__post__container" href={postUrl(postId, postTitle)}>
                                <div className="postsPage__postsList__post__cell">
                                    <h2 className="postsPage__postsList__post__title">{postTitle}</h2>
                                    <div className="postsPage__postsList__post__date">{i.postDate(postCreatedAt)}</div>
                                </div>
                                {_.take(postImages, 1).map(({imageId}, index) =>
                                    <span className="postsPage__postsList__post__cell postsPage__postsList__post__cell__image" key={index}>
                                        <img src={`/images/${imageId}?width=100`}/>
                                    </span>
                                )}
                            </a>
                        </li>
                    )}
                </ul>
            </main>
        </body>,
    modelStream: Bacon.once
}
