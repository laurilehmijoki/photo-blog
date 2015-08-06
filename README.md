# A personal blog


## Tech

* Node.js
* React
* Bacon.js
* Unidirectional flow with Bacon and React
* The server and the client use the same code (isomorphic app)

## Installation

Install image manipulation tools:

    brew install imagemagick
    brew install graphicsmagick

If imagemagick gives strange errors, try reinstalling it.

## Usage

    npm start

## Deploy

    ./deploy.sh

## Using Varnish in development

1. Install Varnish: `brew install varnish`
2. Run Varnish: `/usr/local/opt/varnish/sbin/varnishd -a localhost:2222 -d -f dev/varnish.vcl`
3. Enter `start` into the Varnish console
4. Go to <http://localhost:2222>

## License

MIT

Author Lauri Lehmijoki
