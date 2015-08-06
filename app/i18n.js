var lang = 'fi'
require("moment/locale/fi")
var moment = require('moment')

var texts = lang => ({
    postDate: date => date ? moment(date).locale(lang).format('LL') : undefined,
    timeFromX: date => date ? moment(date).locale(lang).from(new Date()) : undefined,
    nextPage: {
        fi: 'Seuraava sivu',
        en: 'Next page'
    }[lang],
    previousPage: {
        fi: 'Edellinen sivu',
        en: 'Previous page'
    }[lang],
    allPhotos: {
        fi: 'Kaikki valokuvat',
        en: 'All photos'
    }[lang],
    allPosts: {
        fi: 'Kaikki kirjoitukset',
        en: 'All photos'
    }[lang],
    loginPlaceholder: {
        fi: 'Käyttäjätunnus',
        en: 'Username'
    }[lang],
    passwordPlaceholder: {
        fi: 'Salasana',
        en: 'password'
    }[lang],
    loginButtonText: {
        fi: 'Kirjaudu sisään',
        en: 'Log in'
    }[lang],
    loginFailedText: {
        fi: 'Kirjautuminen epäonnistui – kokeile uudelleen',
        en: 'Login failed – please try again'
    }[lang],
    youtubePlaceholder: {
        fi: 'Syötä YouTube-osoite (esim. https://www.youtube.com/watch?v=abcdefg)',
        en: 'Enter YouTube address (e.g. https://www.youtube.com/watch?v=abcdefg)'
    }[lang],
    publishPostText: {
        fi: 'Julkaise kirjoitus',
        en: 'Publish post'
    }[lang],
    unpublishPostText: {
        fi: 'Piilota kirjoitus',
        en: 'Unpublish post'
    }[lang],
    newPostTitle: {
        fi: 'Kirjoituksen otsikko',
        en: 'New post'
    }[lang],
    addYoutubeVideo: {
        fi: 'Lisää YouTube-video',
        en: 'Add YouTube video'
    }[lang],
    addNewPost: {
        fi: 'Lisää uusi kirjoitus',
        en: 'Add new post'
    }[lang],
    addNewPhoto: {
        fi: 'Lisää uusi kuva',
        en: 'Add new photo'
    }[lang],
    appendPhotoIntoGroup: {
        fi: 'Lisää kuva ryhmään',
        en: 'Add photo into group'
    }[lang],
    cancelChanges: {
        fi: 'Peruuta muutokset',
        en: 'Cancel changes'
    }[lang],
    addText: {
        fi: 'Lisää teksti',
        en: 'Add text'
    }[lang],
    saveChanges: {
        fi: 'Tallenna muutokset',
        en: 'Save changes'
    }[lang],
    addComment: {
        fi: 'Lisää kommentti',
        en: 'Add comment'
    }[lang],
    yourName: {
        fi: 'Sinun nimesi',
        en: 'Your name'
    }[lang],
    answerToFriendQuestions: {
        fi: 'Lähetä vastaukset',
        en: 'Send answers'
    }[lang],
    friendLoginFailed: {
        fi: 'Tunnistautuminen epäonnistui – ole hyvä ja yritä uudelleen',
        en: 'Authentication failed – please try again'
    }[lang],
    commentTextPlaceholder: {
        fi: 'Kirjoita kommentti tähän',
        en: 'White comment here'
    }[lang],
    commentIsBeingSaved: {
        fi: 'Tallennetaan kommenttia...',
        en: 'Saving comment...'
    }[lang],
    latestPost: {
        fi: 'Uusin kirjoitus',
        en: 'Latest post'
    }[lang],
    highlightedImage: {
        fi: 'Yllätyskuva',
        en: 'A surprise picture'
    }[lang],
    highlightedVideo: {
        fi: 'Yllätysvideo',
        en: 'A surprise video'
    }[lang],
    showAllPhotos: {
        fi: 'Näytä kaikki valokuvat',
        en: 'Show all photos'
    }[lang],
    showNextVideo: {
        fi: 'Näytä seuraava video',
        en: 'Show next video'
    }[lang],
    showAllPosts: {
        fi: 'Näytä kaikki kirjoitukset',
        en: 'Show all posts'
    }[lang],
    authorCreatedPost: (title, authorNickname) => (
        {
            fi: `${title} (${authorNickname})`,
            en: `${title} (${authorNickname})`
        }[lang]
    ),
    authorCommentedPost: (title, authorNickname) => (
        {
            fi: `${authorNickname} kommentoi kirjoitusta ${title}`,
            en: `${authorNickname} commented post ${title}`
        }[lang]
    ),
    latestNews: {
        fi: 'Viimeisimmät päivitykset',
        en: 'Latest updates'
    }[lang]
})

module.exports = texts(lang)
