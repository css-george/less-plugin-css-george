const test = require('node:test');
const plugin = require('../index.js');

test('setOptions', function(t) {
    const george = new plugin();
    t.assert.equal(Object.keys(george.options).length, 0, 'has no options');

    george.setOptions();
    t.assert.equal(Object.keys(george.options).length, 0, 'sets no options');

    george.setOptions('fallback=true,fakeoption=false');
    t.assert.equal(george.options.fallback, true, 'sets a truthy option');
    t.assert.equal(george.options.fakeoption, false, 'sets a falsy option');
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



    test(`less v${less.version.join('.')}`, async function(wrapper) {
        await wrapper.test('simple annotation', async function(t) {
            const input = `
                /* @export */ @variable: blue;
            `;

            const result = await process(input);

            t.assert.match(result, /georgeMappingURL=\S+/, 'has a mapping URL');

            const mapping = parseMapping(result);

            t.assert.equal(mapping['variable'], 'blue', 'maps the exported variable');
        });


        await wrapper.test('multiple variables', async function(t) {
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

            t.assert.equal(Object.keys(mapping).length, 2, 'has the right number of exported variables');
            t.assert.ok(!mapping.hasOwnProperty('not-exported'), 'excludes non-exported variables');
            t.assert.ok(!mapping.hasOwnProperty('foo'), 'excludes non-less variables');
            t.assert.equal(mapping['div-color'], 'red', 'includes all exported variables');
        });


        await wrapper.test('fallback support', async function(t) {
            const input = `
                /* @export */ @variable: blue;

                body {
                    color: @variable;
                }
            `;

            const result = await process(input, { fallback: true });

            t.assert.match(result, /color:\s*blue/, 'includes fallback value');
            t.assert.match(result, /color:\s*var\(/, 'includes variable value');
        });
    });
}

runOutputTests(require('less2'));
runOutputTests(require('less3'));
runOutputTests(require('less4'));
