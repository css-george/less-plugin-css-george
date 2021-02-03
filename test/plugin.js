const test = require('tap').test;
const less = require('less');
const plugin = require('../index.js');

// Helper functions
async function process(inputSrc, options) {
    const result = await less.render(inputSrc, { plugins: [new plugin(options)] });
    return result.css;
}

function parseMapping(compiledSrc) {
    var matches = compiledSrc.match(/georgeMappingURL=(\S+)/);

    if (matches && matches[1]) {
        const mapUrl = matches[1];
        const split = mapUrl.split(',');

        if (split[0].match(/^data:/)) {
            return JSON.parse(Buffer.from(split[1], 'base64').toString('utf-8'));
        }
    }

    throw new Error("Unable to parse mapping URL");
}

async function processAndParse(inputSrc, options) {
    return parseMapping(await process(inputSrc, options));
}



test('simple annotation', async function(t) {
    const input = `
        /* @export */ @variable: blue;
    `;

    const result = await process(input);

    t.ok(result.match(/georgeMappingURL=\S+/), 'has a mapping URL');

    const mapping = parseMapping(result);

    t.ok(mapping['variable'] === 'blue', 'maps the exported variable');
    t.end();
});


test('multiple variables', async function(t) {
    const input = `
        @not-exported: none;
        /* @export */ @variable: blue;
        /*@export*/ @div-color: red;

        div {
            /* @export */ background: lime;

            /* Not exported */ color: @div-color;
            /* @export */ border-color: @variable;
        }
    `;

    const mapping = await processAndParse(input);

    t.ok(Object.keys(mapping).length === 2, 'has the right number of exported variables');
    t.ok(!mapping.hasOwnProperty('not-exported'), 'excludes non-exported variables');
    t.ok(mapping['div-color'] === 'red', 'includes all exported variables');
    t.end();
});


test('fallback support', async function(t) {
    const input = `
        /* @export */ @variable: blue;

        body {
            color: @variable;
        }
    `;

    const result = await process(input, { fallback: true });

    t.ok(result.match(/color:\s*blue/), 'includes fallback value');
    t.ok(result.match(/color:\s*var\(/), 'includes variable value');
    t.end();
});
