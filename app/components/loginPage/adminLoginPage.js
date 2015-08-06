var React = require('react')
var Bacon = require('baconjs')
var i = require('../../i18n')

module.exports = {
    renderPage: (model = {}) =>
        <body className="loginPage section section__padded">
            <main>
                <form method="post">
                    <input autoFocus={true} className="loginPage__input" name="username" type="text" placeholder={i.loginPlaceholder}/>
                    <input className="loginPage__input" name="password" type="password" placeholder={i.passwordPlaceholder}/>
                    {model.adminLoginFailed ? <div className="loginPage__loginFailed">{i.loginFailedText}</div> : undefined}
                    <button className="loginPage__submit button button__primary button__big" type="submit">{i.loginButtonText}</button>
                </form>
            </main>
        </body>,
    modelStream: Bacon.once
}
