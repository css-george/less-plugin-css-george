function getIndex(node) {
    if (node.getIndex) {
        return node.getIndex();
    } else {
        return node.index;
    }
}

function currentFileInfo(node) {
    if (node.fileInfo) {
        return node.fileInfo();
    } else {
        return node.currentFileInfo;
    }
}


class GeorgeVisitor {
    constructor(less, map) {
        this._less = less;
        this._visitor = new this._less.visitors.Visitor(this);
        this._exportNext = false;
        this._fallbackValues = map;
    }

    get isReplacing() {
        return true;
    }

    get isPreEvalVisitor() {
        return true;
    }

    run(root) {
        return this._visitor.visit(root);
    }

    visitComment(node, visitArgs) {
        if (node.value.match(/\@export/)) {
            this._exportNext = true;
            return;
        }

        return node;
    }

    // Compat with Less 2.x
    visitRule(node, visitArgs) {
        return this.visitDeclaration(node, visitArgs, this._less.tree.Rule);
    }

    visitDeclaration(node, visitArgs, type=this._less.tree.Declaration) {
        if (node.variable && this._exportNext) {
            const varName = node.name.substring(1);

            this._fallbackValues.set(varName, node.value);
            this._exportNext = false;

            const call = new this._less.tree.Call("var", [new this._less.tree.Keyword('--' + varName), node.value], getIndex(node), currentFileInfo(node));
            return new type(node.name, call, node.important, node.merge, getIndex(node), currentFileInfo(node), node.inline);
        }

        return node;
    }
}


module.exports = class CSSGeorgePlugin {
    constructor(options) {
        this.options = options || {};
    }


    install(less, pluginManager) {
        const exports = new Map();
        const values = Object.create(null);

        pluginManager.addVisitor(new GeorgeVisitor(less, exports));

        less.functions.functionRegistry.add('var', function(...args) {
            const [name, value] = args.map(_ => _.toCSS());

            if (exports.has(name.substring(2))) {
                values[name.substring(2)] = value;
            }
        });

        pluginManager.addPostProcessor({
            process: (css, opts) => {
                const b64Map = Buffer.from(JSON.stringify(values)).toString('base64');

                if (this.options.fallback) {
                    css = css.replace(/^.*var\(.*\).*$/mg, function(line) {
                        return line.replace(/var\(.+?,\W?(.+?(?=\))(?!\){2,}))\)/g, '$1') + '\n' + line;
                    });
                }

                css += `\n/*# georgeMappingURL=data:application/json;charset=utf-8;base64,${b64Map} */`;

                return css;
            }
        });
    }


    /* node:coverage ignore next 8 */ // help/usage output
    printUsage() {
        console.log('');
        console.log('CSS George Plugin');
        console.log('specify plugin with --css-george');
        console.log('To include safe variable fallbacks for older browsers (which may break sourcemaps), specify fallback=true:');
        console.log('\t--css-george="fallback=true"');
        console.log('');
    }


    setOptions(options) {
        this.options = {};
        const pairs = (options && options.split(',')) || [];

        pairs.forEach(flag => {
            const [name, value] = flag.split('=');
            this.options[name] = value === 'true';
        });
    }
};
