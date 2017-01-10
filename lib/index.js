module.exports = function(output) {
    return {
        install: function(less, pluginManager) {
            let variables = output || Object.create(null);
            let map = new Map();

            let visitor = require('./visitor')(less);
            pluginManager.addVisitor(new visitor(map));

            let collector = require('./collector')(less);
            pluginManager.addVisitor(new collector(map));

            let printer = {
                process: function(css, opts) {
                    map.forEach((v, k) => {
                        if (v['value']) {
                            variables[k] = v['value'];
                        }
                    });

                    let b64Map = new Buffer(JSON.stringify(variables)).toString('base64');
                    css += `\n/*# georgeMappingURL=data:application/json;charset=utf-8;base64,${b64Map} */`;

                    return css;
                }
            };
            pluginManager.addPostProcessor(printer);
        }
    };
};
