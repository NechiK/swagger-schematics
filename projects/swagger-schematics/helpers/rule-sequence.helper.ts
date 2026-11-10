import { Rule, SchematicContext, Tree, callRule } from '@angular-devkit/schematics';

/**
 * Runs the rules one after another, each on the tree the previous one returned.
 *
 * Use it in place of the devkit's `chain()` for a list that grows with the API
 * document (one rule per generated file). `chain()` wraps each rule's observable
 * in the next one's, so subscribing to the result goes one level deeper per rule
 * and a document with about a thousand schemas overflowed the stack
 * (`RangeError: Maximum call stack size exceeded`). Here every rule finishes
 * before the next one starts, so the depth doesn't depend on the number of rules.
 */
export function runRulesInSequence(rules: Rule[]): Rule {
    return async (initialTree: Tree, context: SchematicContext): Promise<Tree> => {
        let tree = initialTree;
        for (const rule of rules) {
            tree = await runRule(rule, tree, context);
        }
        return tree;
    };
}

/** The tree a rule ends with. `callRule` gives an observable; rxjs is the devkit's dependency, not ours. */
function runRule(rule: Rule, tree: Tree, context: SchematicContext): Promise<Tree> {
    return new Promise<Tree>((resolve, reject) => {
        let result = tree;
        callRule(rule, tree, context).subscribe({
            next: value => { result = value; },
            error: reject,
            complete: () => resolve(result)
        });
    });
}
