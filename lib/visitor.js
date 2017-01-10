module.exports = function(less) {

    class GeorgeVisitor {
        constructor(map) {
            this._visitor = new less.visitors.Visitor(this);
            this._shouldExport = false;
            this._exportedVariables = map;

            this.currentExport = null;
        }

        get isReplacing() { return true; }
        get isPreEvalVisitor() { return true; }

        run(root) {
            return this._visitor.visit(root);
        }

        visitComment(node, visitArgs) {
            if (node.value.match(/\@export/)) {
                this.currentExport = {};
                return;
            }

            return node;
        }

        visitRule(node, visitArgs) {
            if (node.variable && this.currentExport) {
                let varName = node.name.substring(1);

                this.currentExport['name'] = varName;

                let call = new less.tree.Call("var", [new less.tree.Keyword('--' + varName), node.value], node.index || 0, node.currentFileInfo);
                return new less.tree.Rule(node.name, call, node.important, node.merge, node.index, node.currentFileInfo, node.inline);
            }

            return node;
        }


        visitRuleOut(node, visitArgs) {
            if (this.currentExport) {
                this._exportedVariables.set(this.currentExport['name'], this.currentExport);
            }

            this.currentExport = null;
        }


        visitExpression(node, visitArgs) {
            if (this.currentExport) {
                if (node.value.length === 1) {
                    this.currentExport['type'] = node.value[0].type;

                    if (node.value[0].type === 'Variable') {
                        this.currentExport['variable'] = node.value[0].name;
                    }
                } else {
                    console.warn(`Non exportable variable value for ${this.currentExport['name']}`);
                    this.currentExport = null;
                }
            }

            return node;
        }
    }

    return GeorgeVisitor;
}
