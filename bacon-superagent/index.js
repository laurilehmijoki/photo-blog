var Bacon = require('baconjs')
var request = require('superagent')

var httpResponse = method => ({url, body, headers = {}}) => Bacon
    .fromCallback(httpReady => {
        var req = request[method](url)
        Object.keys(headers).forEach(headerName => {
            req.set(headerName, headers[headerName])
        })
        if (body) {
            req.send(body)
        }
        req.end((err, response) => httpReady({err, response}))
    })
    .flatMap(({err, response}) => {
        var error = response.status >= 400 ? { error: response.text, code: response.status } : err ? { error: err } : undefined
        return error ? new Bacon.Error(error) : response
    })

module.exports = {
    httpResponse,
    httpPostResponse: httpResponse('post'),
    httpPutResponse: httpResponse('put'),
    httpGetResponse: httpResponse('get')
}
