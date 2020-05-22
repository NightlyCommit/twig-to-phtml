import {
    TwingEnvironment,
    TwingFunction,
    TwingLoaderArray,
    TwingNode,
    TwingNodeComment,
    TwingNodeExpression,
    TwingNodeExpressionArray,
    TwingNodeExpressionAssignName,
    TwingNodeExpressionBinary,
    TwingNodeExpressionBinaryAdd,
    TwingNodeExpressionBinaryAnd,
    TwingNodeExpressionBinaryBitwiseAnd,
    TwingNodeExpressionBinaryBitwiseOr,
    TwingNodeExpressionBinaryBitwiseXor,
    TwingNodeExpressionBinaryConcat,
    TwingNodeExpressionBinaryDiv,
    TwingNodeExpressionBinaryEqual,
    TwingNodeExpressionBinaryFloorDiv,
    TwingNodeExpressionBinaryGreater,
    TwingNodeExpressionBinaryGreaterEqual,
    TwingNodeExpressionBinaryLess,
    TwingNodeExpressionBinaryLessEqual,
    TwingNodeExpressionBinaryMod,
    TwingNodeExpressionBinaryMul,
    TwingNodeExpressionBinaryNotEqual,
    TwingNodeExpressionBinaryOr, TwingNodeExpressionBinaryPower, TwingNodeExpressionBinarySub,
    TwingNodeExpressionConditional,
    TwingNodeExpressionConstant,
    TwingNodeExpressionFunction,
    TwingNodeExpressionGetAttr,
    TwingNodeExpressionHash,
    TwingNodeExpressionMethodCall,
    TwingNodeExpressionName,
    TwingNodeExpressionUnary,
    TwingNodeExpressionUnaryNeg,
    TwingNodeExpressionUnaryNot,
    TwingNodeExpressionUnaryPos,
    TwingNodeFor,
    TwingNodeIf,
    TwingNodeImport,
    TwingNodeMacro,
    TwingNodeModule,
    TwingNodePrint,
    TwingNodeSet,
    TwingNodeText,
    TwingSource,
    TwingTemplate
} from 'twing';

export class Transpiler {
    protected readonly _functions: Set<string>;

    constructor() {
        this._functions = new Set();
    }

    protected transpileModuleNode(node: TwingNodeModule): string {
        const results: Array<string> = [];

        // we handle macros first, order matters and closures should be declared first
        const macrosNode = node.getNode('macros');

        for (let macroNode of macrosNode.getNodes().values()) {
            results.push(this.transpileMacroNode(macroNode as TwingNodeMacro));
        }

        for (let [name, child] of node.getNodes()) {
            if (name !== 'macros') {
                results.push(this.transpileNode(child));
            }
        }

        return results.join('');
    }

    protected transpileCommentNode(node: TwingNodeComment): string {
        let results = [];

        let parts = node.getAttribute("data").split('\n');

        results.push('<?php /*');

        let index: number = 0;

        for (let part of parts) {
            results.push(part);

            if (index < (parts.length - 1)) {
                results.push('\n');
            }

            index++;
        }

        results.push('*/ ?>');

        return results.join('');
    }

    protected transpileExpressionBinaryNode(node: TwingNodeExpressionBinary): string {
        let prefix: string = '';
        let suffix: string = '';
        let operator: string;

        if (node instanceof TwingNodeExpressionBinaryAdd) {
            operator = '+';
        }

        if (node instanceof TwingNodeExpressionBinaryAnd) {
            operator = '&&';
        }

        if (node instanceof TwingNodeExpressionBinaryBitwiseAnd) {
            operator = '&';
        }

        if (node instanceof TwingNodeExpressionBinaryBitwiseOr) {
            operator = '|';
        }

        if (node instanceof TwingNodeExpressionBinaryBitwiseXor) {
            operator = '^';
        }

        if (node instanceof TwingNodeExpressionBinaryConcat) {
            operator = '.';
        }

        if (node instanceof TwingNodeExpressionBinaryDiv) {
            operator = '/';
        }

        if (node instanceof TwingNodeExpressionBinaryEqual) {
            operator = '==';
        }

        if (node instanceof TwingNodeExpressionBinaryFloorDiv) {
            prefix = 'floor(';
            operator = '/';
            suffix = ')'
        }

        if (node instanceof TwingNodeExpressionBinaryGreater) {
            operator = '>';
        }

        if (node instanceof TwingNodeExpressionBinaryGreaterEqual) {
            operator = '>=';
        }

        if (node instanceof TwingNodeExpressionBinaryLess) {
            operator = '<';
        }

        if (node instanceof TwingNodeExpressionBinaryLessEqual) {
            operator = '<=';
        }

        if (node instanceof TwingNodeExpressionBinaryMod) {
            operator = '%';
        }

        if (node instanceof TwingNodeExpressionBinaryMul) {
            operator = '*';
        }

        if (node instanceof TwingNodeExpressionBinaryNotEqual) {
            operator = '!=';
        }

        if (node instanceof TwingNodeExpressionBinaryOr) {
            operator = '||';
        }

        if (node instanceof TwingNodeExpressionBinaryPower) {
            operator = '**';
        }

        if (node instanceof TwingNodeExpressionBinarySub) {
            operator = '-';
        }

        return `${prefix}(${this.transpileNode(node.getNode('left'))})${operator}(${this.transpileNode(node.getNode('right'))})${suffix}`;
    }

    protected transpileExpressionUnaryNode(node: TwingNodeExpressionUnary): string {
        let operator: string;

        if (node instanceof TwingNodeExpressionUnaryNeg) {
            operator = '-';
        }

        if (node instanceof TwingNodeExpressionUnaryNot) {
            operator = '!';
        }

        if (node instanceof TwingNodeExpressionUnaryPos) {
            operator = '+';
        }

        return `${operator}(${this.transpileNode(node.getNode('node'))})`;
    }

    protected transpileExpressionNameNode(node: TwingNodeExpressionName): string {
        return `$${node.getAttribute('name')}`;
    }

    protected transpileExpressionConstantNode(node: TwingNodeExpressionConstant, raw: boolean): string {
        let value = node.getAttribute('value');

        if (!raw && typeof value === 'string') {
            value = `"${value}"`;
        }

        return String(value);
    }

    protected transpileExpressionGetAttrNode(node: TwingNodeExpressionGetAttr): string {
        let results: Array<string> = [];

        results.push(this.transpileNode(node.getNode('node')));

        let type: string = node.getAttribute('type');
        let attribute: TwingNodeExpression = node.getNode('attribute');

        if (type === TwingTemplate.ANY_CALL || type == TwingTemplate.METHOD_CALL) {
            results.push('->');
            results.push(this.transpileNode(attribute, true));
        }

        if (type === TwingTemplate.ARRAY_CALL) {
            results.push('[');
            results.push(this.transpileNode(attribute));
            results.push(']');
        }

        if (type === TwingTemplate.METHOD_CALL) {
            results.push('(');

            // we can remove explicit typing when https://github.com/NightlyCommit/twing/issues/476 is fixed
            let argumentsNode: TwingNodeExpressionArray = node.getNode('arguments') as TwingNodeExpressionArray;
            let argumentsPairs = argumentsNode.getKeyValuePairs();
            let _arguments: Array<any> = [];

            for (let pair of argumentsPairs) {
                _arguments.push(this.transpileNode(pair.value));
            }

            results.push(_arguments.join(','));
            results.push(')');
        }

        return results.join('');
    }

    protected transpileExpressionArrayNode(node: TwingNodeExpressionArray): string {
        let results: Array<string> = [];

        results.push('[');

        let pairs = node.getKeyValuePairs();
        let values: Array<any> = [];

        for (let pair of pairs) {
            values.push(this.transpileNode(pair.key) + '=>' + this.transpileNode(pair.value));
        }

        results.push(values.join(','));
        results.push(']');

        return results.join('');
    }

    protected transpileForNode(node: TwingNodeFor): string {
        let results: Array<string> = [];

        results.push('<?php foreach (');
        results.push(this.transpileNode(node.getNode('seq')));
        results.push(' as ');
        results.push(`${this.transpileNode(node.getNode('key_target'))}`);
        results.push(' => ');
        results.push(`${this.transpileNode(node.getNode('value_target'))}`);
        results.push('): ?>');
        results.push(this.transpileNode(node.getNode('body')));
        results.push('<?php endforeach; ?>');

        return results.join('');
    }

    protected transpileIfNode(node: TwingNodeIf): string {
        let results = [];
        let testNodes = node.getNode('tests').getNodes() as Map<number, TwingNode>;
        let testIndex = 0;

        for (let [index, testNode] of testNodes) {
            if (index === 0) {
                results.push('<?php if (');
            } else if (index % 2 === 0) {
                results.push('<?php elseif (');
            }

            if (index % 2 === 0) {
                results.push(this.transpileNode(testNode));
                results.push('): ?>');
            } else {
                results.push(this.transpileNode(testNode, true));
            }

            testIndex++;
        }

        if (node.hasNode('else')) {
            results.push('<?php else: ?>');
            results.push(this.transpileNode(node.getNode('else'), true));
        }

        results.push('<?php endif; ?>');

        return results.join('');
    }

    protected transpilePrintNode(node: TwingNodePrint): string {
        return `<?=${this.transpileNode(node.getNode('expr'))}?>`;
    }

    protected transpileTextNode(node: TwingNodeText): string {
        return node.getAttribute('data');
    }

    protected transpileExpressionFunctionNode(node: TwingNodeExpressionFunction): string {
        let argumentsNode = node.getNode('arguments') as TwingNodeExpressionArray;

        return `${node.getAttribute('name')}(${this.transpileArguments(argumentsNode)})`;
    }

    protected transpileSetNode(node: TwingNodeSet): string {
        let results: Array<string> = [];

        const names = node.getNode('names');
        const values = node.getNode('values');

        if (node.hasAttribute('capture') && (node.getAttribute('capture') === true)) {
            for (let v of names.getNodes().values()) {
                results.push(`<?php ob_start(); ?>${this.transpileNode(values)}<?php $${v.getAttribute('name')} = ob_get_clean() ?>`);
            }
        } else {
            if (values instanceof TwingNodeExpressionConstant) {
                for (let v of names.getNodes().values()) {
                    results.push(`<?php $${v.getAttribute('name')} = ${this.transpileNode(values)} ?>`);
                }
            }
            else {
                for (let [k, v] of names.getNodes()) {
                    results.push(`<?php $${v.getAttribute('name')} = ${this.transpileNode(values.getNode(k))} ?>`);
                }
            }
        }

        return results.join('\n');
    }

    protected transpileExpressionConditionalNode(node: TwingNodeExpressionConditional): string {
        const expr1 = node.getNode('expr1');
        const expr2 = node.getNode('expr2');
        const expr3 = node.getNode('expr3');

        return `${this.transpileNode(expr1)} ? ${this.transpileNode(expr2)} : ${this.transpileNode(expr3)}`;
    }

    protected transpileExpressionMethodCallNode(node: TwingNodeExpressionMethodCall): string {
        let argumentsNode = node.getNode('arguments') as TwingNodeExpressionArray;

        return `$${node.getAttribute('method')}(${this.transpileArguments(argumentsNode)})`;
    }

    protected transpileMacroNode(node: TwingNodeMacro): string {
        const results: Array<string> = [];

        const name = node.getAttribute('name');
        const argumentsNode = node.getNode('arguments');
        const body = node.getNode('body');

        const macroArguments: Array<string> = [];

        for (let [name, value] of argumentsNode.getNodes()) {
            macroArguments.push(`$${name}=${this.transpileNode(value)}`);
        }

        results.push(`<?php $${name} = function(${macroArguments.join(',')}) use (&$${name}) { ?>\n`);
        results.push(this.transpileNode(body));
        results.push(`<?php } ?>\n`);

        return results.join('');
    }

    protected transpileArguments(node: TwingNode | TwingNodeExpressionArray): string {
        let values: Array<TwingNode>;

        if (node instanceof TwingNodeExpressionArray) {
            values = node.getKeyValuePairs().map((keyValuePair) => {
                return keyValuePair.value;
            });
        }
        else {
            values = [...node.getNodes().values()];
        }

        return values.map((value) => {
            return this.transpileNode(value);
        }).join(',');
    }

    protected transpileNode(node: TwingNode, raw: boolean = false): string {
        if (node instanceof TwingNodeModule) {
            return this.transpileModuleNode(node);
        }

        if (node instanceof TwingNodePrint) {
            return this.transpilePrintNode(node);
        }

        if (node instanceof TwingNodeText) {
            return this.transpileTextNode(node);
        }

        if (node instanceof TwingNodeExpressionName || node instanceof TwingNodeExpressionAssignName) {
            return this.transpileExpressionNameNode(node);
        }

        if (node instanceof TwingNodeExpressionConstant) {
            return this.transpileExpressionConstantNode(node, raw);
        }

        if (node instanceof TwingNodeExpressionArray || node instanceof TwingNodeExpressionHash) {
            return this.transpileExpressionArrayNode(node);
        }

        if (node instanceof TwingNodeFor) {
            return this.transpileForNode(node);
        }

        if (node instanceof TwingNodeIf) {
            return this.transpileIfNode(node);
        }

        if (node instanceof TwingNodeExpressionGetAttr) {
            return this.transpileExpressionGetAttrNode(node);
        }

        if (node instanceof TwingNodeExpressionBinary) {
            return this.transpileExpressionBinaryNode(node);
        }

        if (node instanceof TwingNodeExpressionUnary) {
            return this.transpileExpressionUnaryNode(node);
        }

        if (node instanceof TwingNodeComment) {
            return this.transpileCommentNode(node);
        }

        if (node instanceof TwingNodeExpressionFunction) {
            return this.transpileExpressionFunctionNode(node);
        }

        if (node instanceof TwingNodeSet) {
            return this.transpileSetNode(node);
        }

        if (node instanceof TwingNodeExpressionConditional) {
            return this.transpileExpressionConditionalNode(node);
        }

        if (node instanceof TwingNodeExpressionMethodCall) {
            return this.transpileExpressionMethodCallNode(node);
        }

        if (node instanceof TwingNodeImport) {
            return '';
        }

        let results: Array<string> = [];

        for (let child of node.getNodes().values()) {
            results.push(this.transpileNode(child));
        }

        return results.join('');
    }

    transpile(code: string): string {
        let env = new TwingEnvironment(new TwingLoaderArray({}), {
            autoescape: false
        });

        for (let functionName of this._functions) {
            env.addFunction(new TwingFunction(functionName, null, []))
        }

        let node = env.parse(env.tokenize(new TwingSource(code, '')));

        return this.transpileNode(node);
    }

    /**
     * Register a function to the transpiler.
     *
     * @param name
     */
    registerFunction(name: string): void {
        this._functions.add(name);
    }
}