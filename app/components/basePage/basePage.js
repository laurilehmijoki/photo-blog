var React = require('react')

var title = (pageTitle, model) => {
    switch (typeof pageTitle) {
        case 'function': return pageTitle(model)
        case 'string': return pageTitle
        default: return process.env.SITE_NAME
    }
}

var checksumQueryParam = checksum => checksum ? `checksum=${checksum}` : ''

module.exports = ({renderPage, pageTitle}, model) => (
    <html>
        <head>
            <title>{title(pageTitle, model)}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
            <link rel="stylesheet" href={`/generated/style.css?${checksumQueryParam(model.styleCssChecksum)}`}/>
            <script type="text/javascript" dangerouslySetInnerHTML={{__html:
                `window.INITIAL_MODEL = ${JSON.stringify(model)}`
            }}/>
            <script src={`/generated/bundle.js?${checksumQueryParam(model.bundleJsChecksum)}`} async/>
        </head>
        {renderPage(model)}
    </html>
)