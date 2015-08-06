var React = require('react')
var Bacon = require('baconjs')
var i = require('../../i18n')

module.exports = {
    renderPage: (model = {}) =>
        <body className="loginPage section section__padded">
            <main>
                <form method="post">
                    <label className="loginPage__input__label" htmlFor="q1">{process.env.FRIEND_QUESTION_1}</label>
                    <input id="q1" className="loginPage__input loginPage__input__friendQuestion" name="q1_answer" type="text"/>
                    <label className="loginPage__input__label" htmlFor="q2">{process.env.FRIEND_QUESTION_2}</label>
                    <input id="q2" className="loginPage__input loginPage__input__friendQuestion" name="q2_answer" type="text"/>
                    {model.friendLoginFailed ? <div className="loginPage__loginFailed">{i.friendLoginFailed}</div> : undefined}
                    <button className="loginPage__submit button button__primary button__big" type="submit">{i.answerToFriendQuestions}</button>
                </form>
            </main>
        </body>,
    modelStream: Bacon.once
}
