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

    get isReplacing() { return true; }
    get isPreEvalVisitor() { return true; }

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
            let varName = node.name.substring(1);

            this._fallbackValues.set(varName, node.value);
            this._exportNext = false;

            let call = new this._less.tree.Call("var", [new this._less.tree.Keyword('--' + varName), node.value], getIndex(node), currentFileInfo(node));
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
        let exports = new Map();
        let values = Object.create(null);

        pluginManager.addVisitor(new GeorgeVisitor(less, exports));

        less.functions.functionRegistry.add('var', function(...args) {
            let [name, value] = args.map(_ => _.value);

            if (exports.has(name.substring(2)) >= 0) {
                values[name.substring(2)] = value;
            }
        });


        pluginManager.addPostProcessor({
            process: (css, opts) => {
                let b64Map = new Buffer(JSON.stringify(values)).toString('base64');

                if (this.options.fallback) {
                    css = css.replace(/^.*var\(.*\).*$/mg, function(line) {
                        return line.replace(/var\(.+?,\W?(.+?(?=\)))\)/g, '$1') + '\n' + line;
                    });
                }

                css += `\n/*# georgeMappingURL=data:application/json;charset=utf-8;base64,${b64Map} */`;

                return css;
            }
        });
    }


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
        let pairs = options.split(',');

        pairs.forEach(flag => {
            let [name, value] = flag.split('=');
            this.options[name] = value === 'true';
        });
    }
};
