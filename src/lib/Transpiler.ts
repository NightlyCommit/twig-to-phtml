import {
    TwingNode,
    TwingNodeType,
    TwingNodeFor,
    TwingNodeIf,
    TwingNodeComment,
    TwingNodePrint,
    TwingNodeText,
    TwingNodeExpressionName,
    TwingNodeExpressionBinary,
    TwingNodeExpressionAssignName,
    TwingNodeExpressionGetAttr,
    TwingNodeExpressionConstant,
    TwingNodeExpressionArray,
    TwingTemplate,
    TwingNodeExpression,
    TwingEnvironment,
    TwingLoaderArray,
    TwingSource
} from 'twing';

export class Transpiler {
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
        return this.transpileNode(node.getNode('left')) + '==' + this.transpileNode(node.getNode('right'));
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
            results.push('<php else: ?>');
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

    transpileNode(node: TwingNode, raw: boolean = false): string {
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

        if (node.getType() === TwingNodeType.EXPRESSION_BINARY) {
            return this.transpileExpressionBinaryNode(node as TwingNodeExpressionBinary);
        }

        if (node.getType() === TwingNodeType.COMMENT) {
            return this.transpileCommentNode(node as TwingNodeComment);
        }

        let results = [];

        for (let [name, child] of node.getNodes()) {
            results.push(this.transpileNode(child));
        }

        return results.join('');
    }

    transpile(code: string): string {
        let env = new TwingEnvironment(new TwingLoaderArray({}), {
            autoescape: false
        });
        let node = env.parse(env.tokenize(new TwingSource(code, '')));

        return this.transpileNode(node);
    }
}