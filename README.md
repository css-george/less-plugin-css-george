less-plugin-css-george
======================

A plugin for [Less](http://lesscss.org/) to allow runtime manipulation of
variables.

This plugin will replace Less variables with native CSS variables, and annotate
the resulting CSS file so that the values can be edited at runtime using the
CSS George editor.  This is intended as a tool for designers working with
theming systems to experiment with colour palettes at a variable level, which
is often more broad than individual style rules as edited in the browser
developer tools.

This plugin should **not be used in production CSS** since browser support for
CSS variables is not yet widespread, and it currently provides **no fallback**.
Please read the Known Limitations below.


Installation
------------

Installation is easy via npm:

```
npm install --save-dev less-plugin-css-george
```

Usage
-----

### Marking variables for export

In your .less files, you can add special comments to flag Less variables to be
exported as runtime-editable CSS variables.  The special comment syntax is the
word `@export` preceeding the variable declaration.

There are a few valid ways of adding the comment, as shown below:

```less
/* @export */ @header-bg: #ffffff;

// @export
@navbar-text: #333333;

/*@export*/ @navbar-height: 56px;
```


### Compiling with Exported Variables

Once you've installed the css-george plugin, you can simply add `--css-george`
to your `lessc` command and it will generate an output .css file with the
exported variables defined as CSS variables.

Example:

```
lessc --css-george ./src/less/main.less ./www/css/style.css
```

In Less 3, you can also load the plugin with the `@plugin` directive in your
less file:

```
@plugin 'css-george';
```


### Compiling with Hardcoded Fallback values

For browsers that don't support native CSS variables, you can tell the
css-george plugin to export a property twice: once with the original value
hardcoded, and again with the custom property. Be aware that this may cause
sourcemaps to become inaccurate.

```
lessc --css-george="fallback=true" ./src/less/main.less ./www/css/style.css
```

In Less 3, you can also specify this via the `@plugin` directive:

```
@plugin (fallback=true) 'css-george';
```


Known Limitations
-----------------

* Because the Less variables are replaced at compile-time with CSS expressions,
  Less functions that expect colour values will fail.  In particular, functions
  like `darken`, `lighten`, and `fade` are incompatible with native CSS
  variables.

* For similar reasons, the native math support in Less will be unable to
  perform compile-time calculations with native CSS variables. As a workaround,
  you can use the CSS `calc()` feature.

* CSS variable support is only in bleeding edge browsers right now:  
  * Chrome 49+
  * Firefox 31+
  * Safari 9.1+
  * Edge 15+
  * iOS 9.3+
  * Android 5.0+

* Colours must be defined in hexadecimal notation for the colour picker widget
  in the CSS George editor to work.  Non hexadecimal colours will be editable
  via a text input.


Contributing
------------

Contributions of bug reports, feature requests, and pull requests are greatly
appreciated!

Please note that this project is released with a [Contributor Code of
Conduct](https://github.com/css-george/less-plugin-css-george/blob/master/CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.


Licence
-------

Copyright © 2017 Darryl Pogue
Licensed under the MIT Licence.
