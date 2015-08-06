var persistAuthorNickname = nickname => localStorage.setItem('authorNickname', nickname)
var authorNickname = () => localStorage.getItem('authorNickname')

module.exports = {
    persistAuthorNickname,
    authorNickname
}