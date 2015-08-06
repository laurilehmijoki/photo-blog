var photosPage = require('./components/photosPage/photosPage')
var postPage = require('./components/postPage/postPage')
var {postRoutePath, findPostId} = require('./components/post/postUrl')
var postsPage = require('./components/postsPage/postsPage')
var frontPage = require('./components/frontPage/frontPage')
var adminLoginPage = require('./components/loginPage/adminLoginPage')
var friendLoginPage = require('./components/loginPage/friendLoginPage')
var _ = require('lodash')

var pages = {
    photosPage: _.assign(
        {
            path: '/photos'
        },
        photosPage
    ),
    postPage: _.assign(
        {
            path: postRoutePath,
            findPostId
        },
        postPage
    ),
    postsPage: _.assign(
        {
            path: '/posts'
        },
        postsPage
    ),
    adminLoginPage: _.assign(
        {
            path: '/admin-login'
        },
        adminLoginPage
    ),
    friendLoginPage: _.assign(
        {
            path: '/friend-login'
        },
        friendLoginPage
    ),
    frontPage: _.assign(
        {
            path: '/'
        },
        frontPage
    ),
}

module.exports = pages