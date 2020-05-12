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
    TwingNodeExpressionName,
    TwingNodeExpressionUnary,
    TwingNodeExpressionUnaryNeg,
    TwingNodeExpressionUnaryNot,
    TwingNodeExpressionUnaryPos,
    TwingNodeFor,
    TwingNodeIf,
    TwingNodePrint,
    TwingNodeSet,
    TwingNodeText,
    TwingNodeType,
    TwingSource,
    TwingTemplate
} from 'twing';

export class Transpiler {
    private readonly _functions: Set<string>;

    constructor() {
        this._functions = new Set();
    }

    private transpileCommentNode(node: TwingNodeComment): string {
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

    private transpileExpressionBinaryNode(node: TwingNodeExpressionBinary): string {
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

    private transpileExpressionUnaryNode(node: TwingNodeExpressionUnary): string {
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

    private transpileExpressionNameNode(node: TwingNodeExpressionName): string {
        return `$${node.getAttribute('name')}`;
    }

    private transpileExpressionAssignNameNode(node: TwingNodeExpressionAssignName): string {
        return node.getAttribute('name');
    }

    private transpileExpressionConstantNode(node: TwingNodeExpressionConstant, raw: boolean): string {
        let value = node.getAttribute('value');

        if (!raw && typeof value === 'string') {
            value = `"${value}"`;
        }

        return String(value);
    }

    private transpileExpressionGetAttrNode(node: TwingNodeExpressionGetAttr): string {
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

    private transpileExpressionArrayNode(node: TwingNodeExpressionArray): string {
        let results: Array<string> = [];

        results.push('[');

        // we can remove explicit typing when https://github.com/NightlyCommit/twing/issues/476 is fixed
        let pairs = node.getKeyValuePairs();
        let values: Array<any> = [];

        for (let pair of pairs) {
            values.push(this.transpileNode(pair.key) + '=>' + this.transpileNode(pair.value));
        }

        results.push(values.join(','));
        results.push(']');

        return results.join('');
    }

    private transpileForNode(node: TwingNodeFor): string {
        let results: Array<string> = [];

        results.push('<?php foreach (');
        results.push(this.transpileNode(node.getNode('seq')));
        results.push(' as ');
        results.push(`$${this.transpileNode(node.getNode('key_target'))}`);
        results.push(' => ');
        results.push(`$${this.transpileNode(node.getNode('value_target'))}`);
        results.push('): ?>');
        results.push(this.transpileNode(node.getNode('body')));
        results.push('<?php endforeach; ?>');

        return results.join('');
    }

    private transpileIfNode(node: TwingNodeIf): string {
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

    private transpilePrintNode(node: TwingNodePrint): string {
        return `<?=${this.transpileNode(node.getNode('expr'))}?>`;
    }

    private transpileTextNode(node: TwingNodeText): string {
        return node.getAttribute('data');
    }

    private transpileExpressionFunctionNode(node: TwingNodeExpressionFunction): string {
        let argumentsNode: TwingNode = node.getNode('arguments');

        let parameters: Array<any> = [...argumentsNode.getNodes().values()].map((value) => {
            return this.transpileNode(value);
        });

        return `${node.getAttribute('name')}(${parameters.join(',')})`;
    }

    private transpileSetNode(node: TwingNodeSet): string {
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

    private transpileExpressionConditionalNode(node: TwingNodeExpressionConditional): string {
        const expr1 = node.getNode('expr1');
        const expr2 = node.getNode('expr2');
        const expr3 = node.getNode('expr3');

        return `${this.transpileNode(expr1)} ? ${this.transpileNode(expr2)} : ${this.transpileNode(expr3)}`;
    }

    private transpileNode(node: TwingNode, raw: boolean = false): string {
        if (node.getType() === TwingNodeType.PRINT) {
            return this.transpilePrintNode(node as TwingNodePrint);
        }

        if (node.getType() === TwingNodeType.TEXT) {
            return this.transpileTextNode(node as TwingNodeText);
        }

        if (node.getType() === TwingNodeType.EXPRESSION_NAME) {
            return this.transpileExpressionNameNode(node as TwingNodeExpressionName);
        }

        if (node.getType() === TwingNodeType.EXPRESSION_CONSTANT) {
            return this.transpileExpressionConstantNode(node as TwingNodeExpressionConstant, raw);
        }

        if (node.getType() === TwingNodeType.EXPRESSION_ARRAY) {
            return this.transpileExpressionArrayNode(node as TwingNodeExpressionArray);
        }

        if (node.getType() === TwingNodeType.EXPRESSION_ASSIGN_NAME) {
            return this.transpileExpressionAssignNameNode(node as TwingNodeExpressionAssignName);
        }

        if (node.getType() === TwingNodeType.FOR) {
            return this.transpileForNode(node as TwingNodeFor);
        }

        if (node.getType() === TwingNodeType.IF) {
            return this.transpileIfNode(node as TwingNodeIf);
        }

        if (node.getType() === TwingNodeType.EXPRESSION_GET_ATTR) {
            return this.transpileExpressionGetAttrNode(node as TwingNodeExpressionGetAttr);
        }

        if (node instanceof TwingNodeExpressionBinary) {
            return this.transpileExpressionBinaryNode(node);
        }

        if (node instanceof TwingNodeExpressionUnary) {
            return this.transpileExpressionUnaryNode(node);
        }

        if (node.getType() === TwingNodeType.COMMENT) {
            return this.transpileCommentNode(node as TwingNodeComment);
        }

        if (node.getType() === TwingNodeType.EXPRESSION_FUNCTION) {
            return this.transpileExpressionFunctionNode(node as TwingNodeExpressionFunction);
        }

        if (node.getType() === TwingNodeType.SET) {
            return this.transpileSetNode(node as TwingNodeSet);
        }

        if (node instanceof TwingNodeExpressionConditional) {
            return this.transpileExpressionConditionalNode(node);
        }

        let results = [];

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