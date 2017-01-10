module.exports = function(less) {

    class GeorgeCollector {
        constructor(map) {
            this._visitor = new less.visitors.Visitor(this);
            this._exportedVariables = map;
        }

        get isReplacing() { return false; }
        get isPreEvalVisitor() { return false; }

        run(root) {
            this._exportedVariables.forEach((v, k) => {
                if (v['type'] === 'Variable' && v['variable']) {
                    let variable = root.variable(v['variable']);
                    v['value'] = variable.value.toCSS();
                } else {
                    let variable = root.variable('@' + k);
                    let value = /^var\(--[a-zA-Z0-9_-]+, (\S+)\)/.exec(variable.value.toCSS());

                    if (value.length > 1) {
                        v['value'] = value[1];
                    }
                }
            });

            return this._visitor.visit(root);
        }
    }

    return GeorgeCollector;
}
