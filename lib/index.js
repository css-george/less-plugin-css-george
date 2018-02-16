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
    constructor(map) {
        this._visitor = new less.visitors.Visitor(this);
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
        return this.visitDeclaration(node, visitArgs, less.tree.Rule);
    }

    visitDeclaration(node, visitArgs, type=less.tree.Declaration) {
        if (node.variable && this._exportNext) {
            let varName = node.name.substring(1);

            this._fallbackValues.set(varName, node.value);
            this._exportNext = false;

            let call = new less.tree.Call("var", [new less.tree.Keyword('--' + varName), node.value], getIndex(node), currentFileInfo(node));
            return new type(node.name, call, node.important, node.merge, getIndex(node), currentFileInfo(node), node.inline);
        }

        return node;
    }
}


module.exports = function(output) {
    return {
        install: function(less, pluginManager) {
            let exports = new Map();
            let values = Object.create(null);

            pluginManager.addVisitor(new GeorgeVisitor(exports));

            less.functions.functionRegistry.add('var', function(...args) {
                let [name, value] = args.map(_ => _.value);

                if (exports.has(name.substring(2)) >= 0) {
                    values[name.substring(2)] = value;
                }
            });


            pluginManager.addPostProcessor({
                process: function(css, opts) {
                    let b64Map = new Buffer(JSON.stringify(values)).toString('base64');
                    css += `\n/*# georgeMappingURL=data:application/json;charset=utf-8;base64,${b64Map} */`;

                    return css;
                }
            });
        }
    };
};
