var urlSanitise = postTitle =>
    encodeURIComponent(
        postTitle
            .replace(/ä/gi, 'a')
            .replace(/ö/gi, 'o')
            .replace(/ä/gi, 'a')
            .replace(/\s+/gi, '-')
            .replace(/,/gi, '.')
            .replace(/,/gi, '.')
            .toLowerCase()
    )

var postUrl = (postId, postTitle) => `/${urlSanitise(postTitle)}/p/${postId}`

var postRoutePath = new RegExp("/.+?/p/(\\d+)")

var findPostId = req => req.params[0]

module.exports = {
    postUrl, postRoutePath, findPostId
}