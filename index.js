// jshint esversion:6
// jshint ignore:start
const axios = require('axios')
const http = require('http')
const url = require('url')

const translationCount = 6

let originalText
let originalLanguage

const apiKey = 'trnsl.1.1.20171008T131614Z.a64f46c8e27e5fb1.f97d045c6897bb518e230158f23e124334693338'
const apiUrl = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}`
const apiLangsUrl = `https://translate.yandex.net/api/v1.5/tr.json/getLangs?key=${apiKey}`

const allowedOrigins = ['http://127.0.0.1:8080', 'http://localhost:8080', 'http://filip.novotny.je'];

http.createServer(function (req, res) {
    if (req.url === '/favicon.ico') {
        return
    }

    const parsedURL = url.parse(req.url, true)
    const query = parsedURL.query

    var errors = []
    if (!('text' in query)) {
        errors.push("Please specify a query. (URL parameter 'text')")
    }
    if (!('lang' in query)) {
        errors.push("Please specify the query language (URL parameter 'lang')")
    }
    if (errors.length) {
        const obj = {
            status: "error",
            messages: errors
        }
        res.end(JSON.stringify(obj))
        return
    } else {
        originalText = parsedURL.query.text
        originalLanguage = { code: parsedURL.query.lang}
    }


    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset="utf-8"')

    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
    }

    getLangPairs().then((pairs) => {
        getTranslations(pairs).then((translations) => {
            res.end(JSON.stringify(translations))
        })
    })
}).listen(process.env.PORT || 5000)


const getTranslations = async (langPairs) => {
    var arr = new Array(translationCount)
    arr[0] = await getTranslation(originalText, originalLanguage, langPairs[0].to)

    for (let i = 1; i < translationCount; i++) {
        arr[i] = await getTranslation(arr[i - 1].text, langPairs[i].from, langPairs[i].to)
    }

    return arr
}


const getTranslation = async (text, from, to) => {
    text = encodeURI(text)
    fromCode = encodeURI(from.code)
    toCode = encodeURI(to.code)


    const item = await axios.get(apiUrl + '&text=' + text + '&lang=' + fromCode + '-' + toCode)
        .catch((e) => {
            console.error(e)
        })
        .then((response) => {
            return {
                from: from,
                to: to,
                text: response.data.text[0]
            }
        })

    return item
}

async function getLangPairs () {
    const langs = await axios.get(apiLangsUrl + '&ui=' + originalLanguage.code)
        .catch((e) => {
            console.error(e)
        })
        .then((response) => {
            originalLanguage.name = response.data.langs[originalLanguage.code]

            const validLangs = Object.keys(response.data.langs)
                .filter(val => val !== originalLanguage.code)
                .slice(0, translationCount)
            const keys = shuffle(validLangs)

            let result = []
            keys.forEach(key => {
                result.push({
                    code: key,
                    name: response.data.langs[key]
                })
            })

            return result
        })

    let result = []
    let lastTo
    for (let i = 0, n = langs.length * 2; i < n; i++) {
        let from, to
        if (i % 2 === 0) {
            from = originalLanguage
            to = langs[0]
            langs.shift()
        } else {
            from = lastTo
            to = originalLanguage
        }
        result.push({
            from: from,
            to: to
        })
        lastTo = to
    }

    return result

    function shuffle (a) {
        var j, x, i
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1))
            x = a[i]
            a[i] = a[j]
            a[j] = x
        }
        return a
    }
}
