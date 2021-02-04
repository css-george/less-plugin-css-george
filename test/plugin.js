const test = require('tap').test;
const plugin = require('../index.js');

test('setOptions', function(t) {
    const george = new plugin();
    t.ok(Object.keys(george.options).length === 0, 'has no options');

    george.setOptions();
    t.ok(Object.keys(george.options).length === 0, 'sets no options');

    george.setOptions('fallback=true,fakeoption=false');
    t.ok(george.options.fallback === true, 'sets a truthy option');
    t.ok(george.options.fakeoption === false, 'sets a falsy option');

    t.end();
});

function runOutputTests(less) {
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



    test(`less v${less.version.join('.')}`, function(wrapper) {
        wrapper.test('simple annotation', async function(t) {
            const input = `
                /* @export */ @variable: blue;
            `;

            const result = await process(input);

            t.ok(result.match(/georgeMappingURL=\S+/), 'has a mapping URL');

            const mapping = parseMapping(result);

            t.ok(mapping['variable'] === 'blue', 'maps the exported variable');
            t.end();
        });


        wrapper.test('multiple variables', async function(t) {
            const input = `
                @not-exported: none;
                /* @export */ @variable: blue;
                /*@export*/ @div-color: red;

                div {
                    --foo: 30px;
                    /* @export */ background: lime;

                    /* Not exported */ color: @div-color;
                    /* @export */ border-color: @variable;
                    padding: var(--foo); // Not a Less variable
                }
            `;

            const mapping = await processAndParse(input);

            t.ok(Object.keys(mapping).length === 2, 'has the right number of exported variables');
            t.ok(!mapping.hasOwnProperty('not-exported'), 'excludes non-exported variables');
            t.ok(!mapping.hasOwnProperty('foo'), 'excludes non-less variables');
            t.ok(mapping['div-color'] === 'red', 'includes all exported variables');
            t.end();
        });


        wrapper.test('fallback support', async function(t) {
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

        wrapper.end();
    });
}

runOutputTests(require('less2'));
runOutputTests(require('less3'));
runOutputTests(require('less4'));
